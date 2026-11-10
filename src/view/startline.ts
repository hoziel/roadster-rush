import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DriverBillboard } from './billboard';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';

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
const SHIRTS = ['#e8452c', '#2f7de1', '#ffd23f', '#3fbf7f', '#ff69b4', '#8a5bd6', '#f4e9d8', '#ff8a3d'];
const SKINS = ['#f2c7a5', '#e0a77e', '#b9774f', '#8a5434', '#f7d7bd'];
const SIGN_INKS = ['#3a1440', '#c0392b', '#1f2d6b', '#3a1440'];
const SIGN_BGS = ['#fff6e0', '#ffd23f', '#ffb3d1', '#a8dcff'];
const MESSAGES = (n: string) => [`GO ${n}!`, `${n} ROCKS!`, `WE ♥ ${n}`, `GO GO ${n}!`];
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
  private hasDriver = false;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private e = new THREE.Euler();

  constructor() {
    BILLBOARDS.forEach((b, i) => {
      const g = this.billboards[i].group;
      g.position.set(b.x, 0, b.z);
      g.rotation.y = b.rotY;
      g.scale.setScalar(BILLBOARD_SCALE);
      this.group.add(g);
    });
    this.police = parkedPolice();
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
      const shirt = new THREE.Color(SHIRTS[i % SHIRTS.length]);
      this.bodies.setColorAt(i, shirt);
      this.arms.setColorAt(i, shirt);
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
    this.drawSigns('');
    void document.fonts?.ready.then(() => this.drawSigns(this.name, true));
  }

  /** The chosen driver: picture on both billboards, name on the fans' signs ('' hides the billboards). */
  setDriver(url: string, name: string): void {
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

  private drawSigns(name: string, force = false): void {
    if (name === this.name && !force && name) return;
    this.name = name;
    const msgs = MESSAGES((name || 'Austin').toUpperCase());
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
function parkedPolice(): PoliceRoadsterParts {
  const cars = POLICE.map((p) => {
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

