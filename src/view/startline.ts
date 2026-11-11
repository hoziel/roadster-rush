import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DriverBillboard } from './billboard';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';
import { DEFAULT_THEME, themeFor, type FanTheme } from './fanThemes';

// The start line: two giant billboards of the chosen driver, a cheering crowd with name signs,
// and police cars parked in the distance with their lights going (plus one hovering: policePatrol.ts). It sits on the road at the
// start of every run (moves with world.distance) so the car drives past it as the run begins.

/** Billboards, one each side of the road (start-line metres: z < 0 is ahead of the parked car). */
const BILLBOARDS = [
  { x: 7.6, z: -21, rotY: -0.6 },
  { x: -7.6, z: -21, rotY: 0.6 },
];
const BILLBOARD_SCALE = 2.8; // ~6.7 x 9 m picture, top ~13 m up
const POLICE = [
  { x: 7.2, z: -52, rotY: -0.6 },
  // (-7.4, -60) is the hover police car's spot: policePatrol.ts.
  { x: 7.6, z: -72, rotY: -0.4 },
];
const SIREN_HZ = 2.5;
const CAR_SCALE = 0.9;
// Crowd: two rows of fans along both shoulders, behind a low barrier.
const CROWD = { perSide: 12, zFrom: -4, zTo: -26, x: [6.1, 7.4], barrierX: 5.4, signEvery: 2 };
const FAN_FACING = 0.6; // rad turned from facing the road toward the oncoming car
const SIGN_W = 1.6, SIGN_H = 0.8, SIGN_Y = 2.05;
const SKINS = ['#f2c7a5', '#e0a77e', '#b9774f', '#8a5434', '#f7d7bd'];
const HIDE_PAST = 140; // m driven before the whole start line is behind the camera

interface Fan { x: number; z: number; rotY: number; scale: number; phase: number; hop: number; sign: number }

export class StartLine {
  readonly group = new THREE.Group();
  private billboards = BILLBOARDS.map(() => new DriverBillboard());
  private police: PoliceRoadsterParts;
  private fans: Fan[] = [];
  private bodies: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private arms: THREE.InstancedMesh;
  private signs: THREE.InstancedMesh[] = [];
  private signCanvas = document.createElement('canvas');
  private signTex: THREE.CanvasTexture;
  private name = '';
  private theme: FanTheme = DEFAULT_THEME;
  private tmpColor = new THREE.Color();
  /** Start-line props (Nevo's hoop, Ori's net): the sideline players play round them. */
  props!: { hoop: THREE.Group; net: THREE.Group };
  private hasDriver = false;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private e = new THREE.Euler();

  constructor() {
    // The start screen looks at the car from the front, back down the road, so the whole start line is turned
    // round to sit behind the car (start-line z < 0 below ends up behind it, facing the camera).
    this.group.rotation.y = Math.PI;
    BILLBOARDS.forEach((b, i) => {
      const g = this.billboards[i].group;
      g.position.set(b.x, 0, b.z);
      g.rotation.y = b.rotY;
      g.scale.setScalar(BILLBOARD_SCALE);
      this.group.add(g);
    });
    this.police = parkedPolice(POLICE);
    this.group.add(this.police.group);

    // Fans: alternating rows, a sign held up by every other one.
    let signIdx = 0;
    for (const side of [1, -1]) {
      for (let i = 0; i < CROWD.perSide; i++) {
        const t = i / (CROWD.perSide - 1);
        const back = i % 2;
        const holds = i % CROWD.signEvery === 0;
        this.fans.push({
          x: side * (back ? CROWD.x[1] : CROWD.x[0]) + (Math.random() - 0.5) * 0.3,
          z: THREE.MathUtils.lerp(CROWD.zFrom, CROWD.zTo, t) + (Math.random() - 0.5) * 0.8,
          rotY: side * (-Math.PI / 2 + FAN_FACING),
          scale: (back ? 1.05 : 0.8) + Math.random() * 0.2, // kids in front, grown-ups behind
          phase: Math.random() * Math.PI * 2,
          hop: 0.12 + Math.random() * 0.12,
          sign: holds ? signIdx++ % 4 : -1,
        });
      }
    }
    const n = this.fans.length;
    const toon = () => new THREE.MeshToonMaterial({ color: '#ffffff' });
    this.bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 1.1, 10).translate(0, 0.55, 0), toon(), n);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 12, 10).translate(0, 1.33, 0), toon(), n);
    // Both arms up in a V, hands at the sign's lower corners.
    const arm = (sx: number) => {
      const g = new THREE.CylinderGeometry(0.06, 0.06, 0.62, 6).translate(0, 0.31, 0);
      g.rotateZ(-sx * 0.42);
      return g.translate(sx * 0.2, 1.0, 0);
    };
    this.arms = new THREE.InstancedMesh(mergeGeometries([arm(1), arm(-1)]), toon(), n);
    this.fans.forEach((_f, i) => {
      this.heads.setColorAt(i, new THREE.Color(SKINS[(i * 3) % SKINS.length]));
    });

    // Signs: one atlas (4 rows), one instanced mesh per message (UVs pick its row).
    this.signCanvas.width = 512; this.signCanvas.height = 1024;
    this.signTex = new THREE.CanvasTexture(this.signCanvas);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    this.signTex.anisotropy = 4;
    const signMat = new THREE.MeshBasicMaterial({ map: this.signTex, side: THREE.DoubleSide });
    for (let k = 0; k < 4; k++) {
      const geo = new THREE.PlaneGeometry(SIGN_W, SIGN_H).translate(0, SIGN_Y, 0.05);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      for (let j = 0; j < uv.count; j++) uv.setY(j, 1 - (k + 1 - uv.getY(j)) / 4);
      const holders = this.fans.filter((f) => f.sign === k).length;
      const mesh = new THREE.InstancedMesh(geo, signMat, Math.max(1, holders));
      mesh.count = holders;
      this.signs.push(mesh);
    }
    for (const mesh of [this.bodies, this.heads, this.arms, ...this.signs]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.group.add(barriers());
    this.paintShirts();
    this.props = { hoop: hoop(), net: net() };
    this.props.hoop.position.set(-6.4, 0, -40); this.props.hoop.rotation.y = 0.75; // past the crowd, under the billboard's line of sight
    this.props.net.position.set(7.6, 0, -40); this.props.net.rotation.y = -0.5;
    this.group.add(this.props.hoop, this.props.net);
    this.drawSigns('');
    void document.fonts?.ready.then(() => this.drawSigns(this.name, true));
  }

  /** The chosen driver: picture on both billboards, name on the fans' signs ('' hides the billboards). */
  setDriver(url: string, name: string, id = ''): void {
    const theme = themeFor(id);
    if (theme !== this.theme) { this.theme = theme; this.paintShirts(); this.name = '\u0000'; }
    this.props.hoop.visible = theme.prop === 'hoop';
    this.props.net.visible = theme.prop === 'net';
    this.hasDriver = !!url;
    for (const b of this.billboards) b.show(url || null);
    this.drawSigns(name);
  }

  update(distance: number, time: number): void {
    this.group.position.z = distance;
    this.group.visible = distance < HIDE_PAST;
    if (!this.group.visible) return;
    for (const b of this.billboards) b.group.visible = this.hasDriver;
    this.police.updateLights(time * SIREN_HZ);

    const counts = [0, 0, 0, 0];
    this.fans.forEach((f, i) => {
      const beat = time * 6 + f.phase;
      const lift = Math.max(0, Math.sin(beat)) * f.hop; // little hops
      const sway = Math.sin(beat * 0.5) * 0.12;
      this.q.setFromEuler(this.e.set(0, f.rotY, sway));
      this.m.compose(this.v.set(f.x, lift, f.z), this.q, this.s.setScalar(f.scale));
      this.bodies.setMatrixAt(i, this.m);
      this.heads.setMatrixAt(i, this.m);
      if (f.sign >= 0) {
        this.signs[f.sign].setMatrixAt(counts[f.sign]++, this.m);
        this.arms.setMatrixAt(i, this.m);
      } else {
        // No sign: arms wave on their own.
        this.q.setFromEuler(this.e.set(0, f.rotY, sway + Math.sin(beat * 1.5) * 0.25));
        this.arms.setMatrixAt(i, this.m.compose(this.v, this.q, this.s));
      }
    });
    for (const mesh of [this.bodies, this.heads, this.arms, ...this.signs]) mesh.instanceMatrix.needsUpdate = true;
  }

  /** Crowd shirts in the driver's theme colours (arms match). */
  private paintShirts(): void {
    const shirts = this.theme.shirts;
    this.fans.forEach((_f, i) => {
      const c = this.tmpColor.set(shirts[i % shirts.length]);
      this.bodies.setColorAt(i, c);
      this.arms.setColorAt(i, c);
    });
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.arms.instanceColor) this.arms.instanceColor.needsUpdate = true;
  }

  private drawSigns(name: string, force = false): void {
    if (name === this.name && !force && name) return;
    this.name = name;
    const msgs = this.theme.signs((name || 'Austin').toUpperCase());
    const SIGN_BGS = this.theme.signBgs, SIGN_INKS = this.theme.signInks;
    const c = this.signCanvas, g = c.getContext('2d')!;
    const rowH = c.height / 4;
    msgs.forEach((text, k) => {
      const y0 = k * rowH;
      g.fillStyle = SIGN_BGS[k];
      g.fillRect(0, y0, c.width, rowH);
      g.strokeStyle = SIGN_INKS[k];
      g.lineWidth = 12;
      g.strokeRect(6, y0 + 6, c.width - 12, rowH - 12);
      g.fillStyle = SIGN_INKS[k];
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let size = 130;
      const font = () => `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
      g.font = font();
      while (g.measureText(text).width > c.width - 50 && size > 30) { size -= 6; g.font = font(); }
      g.fillText(text, c.width / 2, y0 + rowH / 2 + 6);
    });
    this.signTex.needsUpdate = true;
  }
}

/**
 * The parked police cars, merged into one car's worth of meshes (one draw call per material, ~17
 * for all three instead of ~51). The first car's materials are kept, so its updateLights flashes all three.
 */
function parkedPolice(spots: { x: number; z: number; rotY: number }[]): PoliceRoadsterParts {
  const cars = spots.map((p) => {
    const car = buildPoliceRoadster();
    car.group.scale.setScalar(CAR_SCALE);
    car.group.position.set(p.x, 0, p.z);
    car.group.rotation.y = p.rotY;
    car.group.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    car.group.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
    return { car, meshes };
  });
  const first = cars[0];
  const group = new THREE.Group();
  first.meshes.forEach((mesh, k) => {
    const geos = cars.map(({ meshes }) => meshes[k].geometry.clone().applyMatrix4(meshes[k].matrixWorld));
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    if (merged) group.add(new THREE.Mesh(merged, mesh.material));
  });
  for (const { meshes } of cars) for (const m of meshes) m.geometry.dispose();
  return { ...first.car, group };
}

/** Police cars lined up on the road behind the parked car, lights going, ready to give chase: on every start screen (also the one after a run). */
const WAITING = [
  { x: -2.5, z: 14, rotY: 0.08 },
  { x: 2.5, z: 17, rotY: -0.08 },
  { x: 0, z: 23, rotY: 0 },
];

export class WaitingPolice {
  readonly group: THREE.Group;
  private parts = parkedPolice(WAITING);
  private anchor = 0; // distance where the car was parked on the start screen

  constructor() { this.group = this.parts.group; }

  update(distance: number, ready: boolean, time: number): void {
    if (ready) this.anchor = distance;
    const behind = distance - this.anchor;
    this.group.position.z = behind;
    this.group.visible = behind < HIDE_PAST;
    if (this.group.visible) this.parts.updateLights(time * SIREN_HZ);
  }
}

/** Nevo's basketball hoop by the start line: pole, backboard, orange rim, a net (1 group, 4 draw calls). */
export function hoop(): THREE.Group {
  const g = new THREE.Group();
  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.6, 10).translate(0, 1.8, 0), toon('#3a3f52'));
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.08).translate(0, 3.75, 0.25), toon('#ffffff'));
  const square = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.45, 0.02).translate(0, 3.55, 0.3), toon('#111214'));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20).rotateX(Math.PI / 2).translate(0, 3.25, 0.6), toon('#f08a24'));
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.42, 12, 1, true).translate(0, 3.03, 0.6), new THREE.MeshToonMaterial({ color: '#ffffff', wireframe: true }));
  g.add(pole, board, square, rim, net);
  g.scale.setScalar(1.3);
  g.visible = false;
  return g;
}

/** Ori's volleyball net by the start line: two posts, a blue-trimmed net, a ball on top of a post. */
export function net(): THREE.Group {
  const g = new THREE.Group();
  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c });
  const posts = new THREE.Mesh(mergeGeometries([
    new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8).translate(-2.6, 1.3, 0),
    new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8).translate(2.6, 1.3, 0),
  ]), toon('#2f6fdc'));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.9, 16, 4).translate(0, 2.0, 0), new THREE.MeshBasicMaterial({ color: '#f4f4f4', wireframe: true }));
  const tape = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 0.03).translate(0, 2.45, 0), toon('#ffffff'));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10).translate(-2.6, 2.84, 0), toon('#ffd23f'));
  g.add(posts, mesh, tape, ball);
  g.scale.setScalar(1.25);
  g.visible = false;
  return g;
}

/** Low cream-and-red crowd barriers along both shoulders (one draw call). */
function barriers(): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const len = Math.abs(CROWD.zTo - CROWD.zFrom) + 4;
  const zMid = (CROWD.zFrom + CROWD.zTo) / 2;
  for (const side of [1, -1]) {
    const x = side * CROWD.barrierX;
    parts.push(new THREE.BoxGeometry(0.12, 0.35, len).translate(x, 0.75, zMid));
    for (let z = CROWD.zFrom + 2; z >= CROWD.zTo - 2; z -= 2.5) parts.push(new THREE.BoxGeometry(0.1, 0.9, 0.1).translate(x, 0.45, z));
  }
  const geo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: '#e8452c' }));
}

