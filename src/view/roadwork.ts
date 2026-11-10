import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANE_COUNT, LANE_WIDTH, LONGHORN_WALK } from '../sim/config';
import { laneX, type Entity, type World } from '../sim/world';
import { loadModel, modelGeometry } from './models';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';

// Police stops, construction zones and longhorn crossings (src/sim: kinds spikes, police, barrier, fence,
// digger, longhorn). Everything is instanced (one draw call per model) except the parked police roadsters, which
// are full cars (~10 draw calls each): there's a pool of two, and the sim spaces stops 400+ m apart, so normally
// only one is ever drawn. Big props knocked by a shield get the same "boing" as traffic.

const POOL = 24; // per instanced model (a construction zone is at most two chunks of a few pieces)
const CAR_SCALE = 0.9; // as the player's and the chasing police roadster
const POLICE_ANGLE = 0.14; // rad: parked a little askew across its lane
const SIREN_HZ = 2.5;
const VIEW_FAR = -230, VIEW_NEAR = 30; // z window worth drawing (the fog hides the rest)
const ROAD_EDGE = (LANE_COUNT * LANE_WIDTH + 1.5) / 2;
const SIGN_X = ROAD_EDGE + 0.7; // roadside warning signs, on the right
const SIGN_LEAD = 24; // m before the zone's first chunk
const EDGE_CONE_STEP = 5; // m between the decorative cones lining a construction zone

interface ModelSpec {
  kind: 'barrier' | 'fence' | 'digger' | 'edgeCone' | 'light';
  file: string;
  size: [number, number, number]; // target size (x across the road, y up, z along it), m
  turn?: boolean; // rotate 90° first (the kit's barrier and fence run along z)
}
const MODELS: ModelSpec[] = [
  { kind: 'barrier', file: 'construction-barrier.glb', size: [2.1, 0.75, 0.55], turn: true },
  { kind: 'fence', file: 'construction-fence.glb', size: [2.2, 2.1, 0.45], turn: true },
  { kind: 'digger', file: 'digger.glb', size: [2.0, 2.2, 3.6] },
  { kind: 'edgeCone', file: 'construction-cone.glb', size: [0.55, 0.75, 0.55] },
  { kind: 'light', file: 'construction-light.glb', size: [0.26, 0.6, 0.26] },
];

interface Loaded { mesh: THREE.InstancedMesh; spec: ModelSpec; n: number; top: number }

export class HazardView {
  readonly group = new THREE.Group();
  private models = new Map<ModelSpec['kind'], Loaded>();
  private spikes: THREE.InstancedMesh;
  private lamps: THREE.InstancedMesh; // amber blinkers on the barrier lights, shown at dusk and night
  private lampMat = new THREE.MeshBasicMaterial({ color: '#ffb300' });
  private herd: THREE.InstancedMesh; // longhorn bodies (with the still pair of legs)
  private herdLegs: THREE.InstancedMesh; // the swinging pair of legs
  private police: PoliceRoadsterParts[] = [];
  private workSign: THREE.Mesh;
  private herdSign: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private m = new THREE.Matrix4();
  private m2 = new THREE.Matrix4();

  constructor() {
    this.spikes = instanced(spikeStripGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), POOL);
    this.lamps = instanced(new THREE.SphereGeometry(0.1, 8, 6), this.lampMat, POOL * 2);
    const herdMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const { body, legs } = longhornGeometry();
    this.herd = instanced(body, herdMat, 8);
    this.herdLegs = instanced(legs, herdMat, 8);
    this.workSign = warningSign(drawRoadWork);
    this.herdSign = warningSign(drawCattle);
    this.group.add(this.spikes, this.lamps, this.herd, this.herdLegs, this.workSign, this.herdSign);
    for (let i = 0; i < 2; i++) {
      const car = buildPoliceRoadster();
      car.group.scale.setScalar(CAR_SCALE);
      car.group.visible = false;
      this.police.push(car);
      this.group.add(car.group);
    }
  }

  async load(): Promise<void> {
    const results = await Promise.allSettled(MODELS.map((m) => loadModel(m.file)));
    results.forEach((r, i) => {
      const spec = MODELS[i];
      if (r.status !== 'fulfilled') { console.warn(`roadwork: failed to load ${spec.file}`, r.reason); return; }
      const { geometry, material } = modelGeometry(r.value);
      if (spec.turn) geometry.rotateY(Math.PI / 2);
      if (spec.kind === 'digger') geometry.rotateY(Math.PI); // face away from the camera, like traffic
      geometry.computeBoundingBox();
      const b = geometry.boundingBox!;
      geometry.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      geometry.scale(spec.size[0] / (b.max.x - b.min.x), spec.size[1] / (b.max.y - b.min.y), spec.size[2] / (b.max.z - b.min.z));
      const map = (material as THREE.MeshStandardMaterial).map ?? null;
      material.dispose();
      const mesh = instanced(geometry, new THREE.MeshLambertMaterial({ map }), spec.kind === 'edgeCone' ? 40 : spec.kind === 'light' ? POOL * 2 : POOL);
      this.models.set(spec.kind, { mesh, spec, n: 0, top: spec.size[1] });
      this.group.add(mesh);
    });
  }

  /** Draw everything live; `lights` 0..1 is how dark it is (the barrier blinkers glow). */
  update(w: World, lights: number, time: number, visible: boolean): void {
    this.group.visible = visible;
    for (const l of this.models.values()) l.n = 0;
    let ns = 0, nl = 0, nh = 0, np = 0;
    const blink = Math.floor(time * 2.2) % 2 === 0;
    this.lampMat.color.set(blink ? '#ffc21a' : '#5a3a00');
    for (const e of w.entities) {
      if (!e.alive) continue;
      const k = e.kind;
      if (k !== 'spikes' && k !== 'police' && k !== 'barrier' && k !== 'fence' && k !== 'digger' && k !== 'longhorn') continue;
      const z = -(e.s - w.distance);
      if (z < VIEW_FAR || z > VIEW_NEAR) continue;
      if (k === 'longhorn') { if (nh < 8) this.placeLonghorn(w, e, z, time, nh++); continue; }
      const x = laneX(e.lane);
      if (k === 'spikes') {
        if (ns < POOL) this.spikes.setMatrixAt(ns++, this.pose(w, e, x, z, 0).matrix);
        continue;
      }
      if (k === 'police') {
        if (np >= this.police.length) continue;
        const car = this.police[np++];
        const tilt = (e.variant ?? 0) % 2 ? POLICE_ANGLE : -POLICE_ANGLE;
        const d = this.pose(w, e, x, z, tilt);
        car.group.position.copy(d.position);
        car.group.rotation.copy(d.rotation);
        car.group.scale.set(CAR_SCALE * d.scale.x, CAR_SCALE * d.scale.y, CAR_SCALE * d.scale.z);
        car.group.visible = true;
        car.updateLights(time * SIREN_HZ + np * 0.37);
        continue;
      }
      const model = this.models.get(k);
      if (!model || model.n >= POOL) continue;
      const tilt = k === 'digger' ? ((e.variant ?? e.s) % 2 ? 0.08 : -0.08) : 0;
      const d = this.pose(w, e, x, z, tilt);
      model.mesh.setMatrixAt(model.n++, d.matrix);
      if (k === 'barrier') {
        // A blinker on each end of the barrier.
        const light = this.models.get('light');
        for (const side of [-0.8, 0.8]) {
          this.m.makeTranslation(side, model.top, 0).premultiply(d.matrix);
          if (light && light.n < POOL * 2) light.mesh.setMatrixAt(light.n++, this.m);
          if (nl < POOL * 2) { this.m2.makeTranslation(0, light?.top ?? 0.5, 0).premultiply(this.m); this.lamps.setMatrixAt(nl++, this.m2); }
        }
      }
    }
    // Hide the police roadsters nobody needs.
    for (let i = np; i < this.police.length; i++) this.police[i].group.visible = false;
    // Construction zone: cones lining both road edges, and the ROAD WORK sign before it.
    const cones = this.models.get('edgeCone');
    if (cones && w.workAt >= 0) {
      for (let s = w.workAt; s <= w.workEnd && cones.n < 40; s += EDGE_CONE_STEP) {
        const z = -(s - w.distance);
        if (z < VIEW_FAR || z > VIEW_NEAR) continue;
        for (const side of [-1, 1]) {
          if (cones.n >= 40) break;
          this.dummy.position.set(side * (ROAD_EDGE - 0.35), 0, z);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.setScalar(1);
          this.dummy.updateMatrix();
          cones.mesh.setMatrixAt(cones.n++, this.dummy.matrix);
        }
      }
    }
    placeSign(this.workSign, w.workAt, w.distance);
    placeSign(this.herdSign, w.herdAt, w.distance);
    for (const l of this.models.values()) { l.mesh.count = l.n; l.mesh.instanceMatrix.needsUpdate = true; }
    this.spikes.count = ns;
    this.lamps.count = nl;
    this.lamps.visible = lights > 0.02;
    this.herd.count = nh;
    this.herdLegs.count = nh;
    for (const m of [this.spikes, this.lamps, this.herd, this.herdLegs]) m.instanceMatrix.needsUpdate = true;
  }

  /** Place the dummy at (x, 0, z) turned by `rotY`, with the shield "boing" if the prop was knocked. */
  private pose(w: World, e: Entity, x: number, z: number, rotY: number): THREE.Object3D {
    let y = 0, rz = 0, sy = 1, sxz = 1;
    if (e.bumped !== undefined) {
      const t = w.time - e.bumped;
      const dir = Math.sign(x - w.x) || ((e.variant ?? 0) % 2 ? 1 : -1);
      if (t < 0.14) { const k = Math.sin((t / 0.14) * Math.PI); sy = 1 - 0.4 * k; sxz = 1 + 0.2 * k; }
      const air = Math.max(0, t - 0.08);
      y = Math.max(0, 7 * air - 12 * air * air);
      x += dir * Math.min(8, 11 * air);
      rotY += dir * Math.min(air, 0.6) * 7;
      rz = -dir * Math.sin((Math.min(air, 0.58) / 0.58) * Math.PI) * 0.5;
    }
    const d = this.dummy;
    d.position.set(x, y, z);
    d.rotation.set(0, rotY, rz);
    d.scale.set(sxz, sy, sxz);
    d.updateMatrix();
    return d;
  }

  /** A longhorn: standing at `from` (grazing), then walking across as the car closes in; legs swing while it walks. */
  private placeLonghorn(w: World, e: Entity, z: number, time: number, i: number): void {
    const from = e.from ?? e.lane, to = e.lane;
    const rel = e.s - w.distance;
    // Past the car it keeps walking (unclamped); before its walk it stands still.
    const f = Math.min(1, 1 - rel / LONGHORN_WALK);
    const walking = f > 0;
    const lane = from + (to - from) * Math.max(0, f);
    const dir = to === from ? ((e.variant ?? 0) % 2 ? 1 : -1) : Math.sign(to - from);
    const phase = time * 7 + (e.variant ?? 0);
    const d = this.pose(w, e, laneX(lane), z, dir > 0 ? 0 : Math.PI);
    if (e.bumped === undefined) {
      // Walk bob and waddle, or a slow graze.
      d.position.y += walking ? Math.abs(Math.sin(phase)) * 0.06 : 0;
      d.rotation.x = walking ? Math.sin(phase) * 0.04 : 0;
      d.updateMatrix();
    }
    this.herd.setMatrixAt(i, d.matrix);
    // The swinging pair hangs from the hips (y = LEG_TOP) and swings about the across-the-body axis.
    const swing = walking && e.bumped === undefined ? Math.sin(phase) * 0.45 : 0;
    this.m.makeTranslation(0, LEG_TOP, 0).multiply(this.m2.makeRotationZ(swing)).premultiply(d.matrix);
    this.herdLegs.setMatrixAt(i, this.m);
  }
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, max: number): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

/** One coloured box (or other part) for a merged vertex-coloured model. */
function part(g: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const geo = (g.index ? g.toNonIndexed() : g).translate(x, y, z);
  geo.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** The spike strip: a flat yellow/black striped band across the lane with rows of little steel spikes (0.15 m). */
function spikeStripGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const W = 2.2, D = 0.55, H = 0.05, SEG = 8;
  for (let i = 0; i < SEG; i++) {
    const x = -W / 2 + (i + 0.5) * (W / SEG);
    parts.push(part(new THREE.BoxGeometry(W / SEG, H, D), i % 2 ? '#1c1c22' : '#ffd23f', x, H / 2, 0));
  }
  const spike = new THREE.ConeGeometry(0.05, 0.1, 4);
  for (let i = 0; i < 12; i++) for (const zz of [-0.14, 0.14]) {
    parts.push(part(spike.clone(), '#c9ced8', -W / 2 + 0.1 + i * ((W - 0.2) / 11) + (zz > 0 ? 0.08 : 0), H + 0.05, zz));
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

export const LEG_TOP = 0.75; // m: where the legs meet the body

/**
 * A stylized low-poly Texas longhorn, body along +x (head at +x): boxy tan/brown body, white face, very wide
 * curved horns. Split in two so one pair of legs can swing: `body` (with the other pair) and `legs`
 * (hanging from y = 0, placed at LEG_TOP).
 */
export function longhornGeometry(): { body: THREE.BufferGeometry; legs: THREE.BufferGeometry } {
  const TAN = '#c98a4b', BROWN = '#7a4a26', WHITE = '#f4ede0', HORN = '#efe2c0', TIP = '#3a2a1e', HOOF = '#2b2018';
  const b: THREE.BufferGeometry[] = [];
  b.push(part(new THREE.BoxGeometry(1.75, 0.72, 0.82), TAN, 0, 1.08, 0)); // barrel
  b.push(part(new THREE.BoxGeometry(0.7, 0.74, 0.86), BROWN, -0.35, 1.09, 0)); // brown patch on the rump
  b.push(part(new THREE.BoxGeometry(0.5, 0.3, 0.6), TAN, 0.55, 1.5, 0)); // shoulder hump
  b.push(part(new THREE.BoxGeometry(0.42, 0.45, 0.5), TAN, 0.98, 1.2, 0)); // neck
  b.push(part(new THREE.BoxGeometry(0.5, 0.42, 0.42), WHITE, 1.28, 1.2, 0)); // face
  b.push(part(new THREE.BoxGeometry(0.2, 0.22, 0.34), '#e7b9a0', 1.55, 1.08, 0)); // muzzle
  for (const s of [-1, 1]) {
    b.push(part(new THREE.BoxGeometry(0.08, 0.08, 0.06), '#1a1410', 1.53, 1.3, s * 0.18)); // eyes
    b.push(part(new THREE.BoxGeometry(0.14, 0.1, 0.22), BROWN, 1.18, 1.36, s * 0.3)); // ears
    // Horns: very wide, sweeping out then curving up at the tips.
    let x = 1.24, y = 1.44, zz = s * 0.2;
    const steps: [number, number, number, string][] = [[0.02, 0.04, 0.36, HORN], [0.04, 0.08, 0.36, HORN], [0.04, 0.17, 0.26, HORN], [0.02, 0.22, 0.12, TIP]];
    for (const [dx, dy, dz, col] of steps) {
      const nx = x + dx, ny = y + dy, nz = zz + s * dz;
      const len = Math.hypot(dx, dy, dz);
      const seg = new THREE.BoxGeometry(0.14, 0.14, len + 0.08);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, dy, s * dz).normalize());
      seg.applyQuaternion(q);
      b.push(part(seg, col, (x + nx) / 2, (y + ny) / 2, (zz + nz) / 2));
      x = nx; y = ny; zz = nz;
    }
  }
  b.push(part(new THREE.BoxGeometry(0.06, 0.55, 0.06), BROWN, -0.9, 1.0, 0)); // tail
  b.push(part(new THREE.BoxGeometry(0.1, 0.14, 0.1), '#2b1d12', -0.9, 0.7, 0));
  const leg = (x: number, z: number, y0: number, out: THREE.BufferGeometry[]) => {
    out.push(part(new THREE.BoxGeometry(0.18, LEG_TOP - 0.1, 0.18), TAN, x, y0 - (LEG_TOP - 0.1) / 2, z));
    out.push(part(new THREE.BoxGeometry(0.2, 0.1, 0.2), HOOF, x, y0 - LEG_TOP + 0.05, z));
  };
  // Still pair (front right, back left) in the body; swinging pair (front left, back right) on its own.
  leg(0.62, 0.26, LEG_TOP, b);
  leg(-0.62, -0.26, LEG_TOP, b);
  const l: THREE.BufferGeometry[] = [];
  leg(0.62, -0.26, 0, l);
  leg(-0.62, 0.26, 0, l);
  const body = mergeGeometries(b), legs = mergeGeometries(l);
  body.computeVertexNormals();
  legs.computeVertexNormals();
  return { body, legs };
}

/** A roadside warning sign: a diamond on a post, drawn on one transparent canvas (one draw call). */
function warningSign(draw: (g: CanvasRenderingContext2D, cx: number, cy: number) => void): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8f99';
  g.fillRect(60, 110, 8, 146); // post
  const cx = 64, cy = 62, r = 60;
  g.fillStyle = '#1e1a16';
  diamond(g, cx, cy, r);
  draw(g, cx, cy);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 3.2).translate(0, 1.6, 0),
    new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
  );
  mesh.visible = false;
  mesh.rotation.y = -0.35; // turned a little toward the road
  return mesh;
}

function diamond(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  g.beginPath();
  g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
  g.closePath();
  g.fill();
}

function drawRoadWork(g: CanvasRenderingContext2D, cx: number, cy: number): void {
  g.fillStyle = '#ff8a1a';
  diamond(g, cx, cy, 54);
  g.fillStyle = '#1e1a16';
  g.font = 'bold 19px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('ROAD', cx, cy - 11);
  g.fillText('WORK', cx, cy + 11);
}

function drawCattle(g: CanvasRenderingContext2D, cx: number, cy: number): void {
  g.fillStyle = '#ffd23f';
  diamond(g, cx, cy, 54);
  // A longhorn silhouette: body, legs, head and the wide horns.
  g.fillStyle = '#1e1a16';
  g.fillRect(cx - 24, cy - 6, 36, 18); // body
  for (const x of [-22, -14, 2, 9]) g.fillRect(cx + x, cy + 10, 5, 14); // legs
  g.fillRect(cx + 10, cy - 12, 12, 12); // head
  g.fillRect(cx - 30, cy - 4, 6, 3); // tail
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx - 2, cy - 22); g.quadraticCurveTo(cx + 16, cy - 8, cx + 34, cy - 22);
  g.stroke();
}

/** Stand a sign SIGN_LEAD m before the zone starting at `at` (hidden when there's none in view). */
function placeSign(sign: THREE.Mesh, at: number, distance: number): void {
  const z = -(at - SIGN_LEAD - distance);
  sign.visible = at >= 0 && z > VIEW_FAR && z < VIEW_NEAR;
  sign.position.set(SIGN_X, 0, z);
}
