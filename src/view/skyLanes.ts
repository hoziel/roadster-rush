import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANE_WIDTH, SKY_HEIGHT } from '../sim/config';
import { isSky } from '../sim/sky';
import { laneX, type World } from '../sim/world';

// The sky lanes, drawn while the car hovers above the rooftops: glowing floating lane markers and faint
// glass lane strips, clouds drifting by on both sides, and the sky obstacles (birds, drones, helicopters).
// About 9 draw calls, only while up there.

const MARK_EVERY = 6; // m between floating lane markers
const MARK_SPAN = 168; // m of markers ahead of the camera
const MARK_LINES = [-1.5, -0.5, 0.5, 1.5].map((k) => k * LANE_WIDTH); // lane edges
const CLOUDS = 30;
const CLOUD_SPAN = 240; // m of road the clouds are spread over (recycled behind the camera)
const MAX_BIRDS = 3 * 12, MAX_DRONES = 12, MAX_HELIS = 8;
const LANE_GLOW = '#8ff3ff';

type Colored = [THREE.BufferGeometry, string];
function colored(parts: Colored[]): THREE.BufferGeometry {
  const geos = parts.map(([g, color]) => {
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    return g;
  });
  const out = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  return out;
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** A friendly quadcopter: dark body, four arms with grey rotor discs, red/green lights, a camera pod. ~1.7 m across. */
export function droneGeometry(): THREE.BufferGeometry {
  const parts: Colored[] = [[box(0.62, 0.2, 0.62, 0, 0, 0), '#2d3140'], [box(0.28, 0.16, 0.22, 0, -0.17, -0.18), '#1b1d26']];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.push([box(0.09, 0.07, 0.95, 0, 0, 0).rotateY(Math.atan2(x, z)).translate(x * 0.3, 0.02, z * 0.3), '#3a3f52']);
    parts.push([new THREE.CylinderGeometry(0.34, 0.34, 0.03, 18).translate(x * 0.62, 0.12, z * 0.62), '#c9ced8']);
    parts.push([box(0.08, 0.06, 0.08, x * 0.62, 0.05, z * 0.62), z < 0 ? '#ff3b4e' : '#3bff8a']);
  }
  return colored(parts);
}

/** Gull body (facing -z): white, orange beak, grey tail. */
function birdBody(): THREE.BufferGeometry {
  return colored([
    [new THREE.SphereGeometry(0.22, 10, 8).scale(1, 0.85, 2.1), '#f7f5f0'],
    [new THREE.SphereGeometry(0.15, 10, 8).translate(0, 0.08, -0.45), '#f7f5f0'],
    [new THREE.ConeGeometry(0.06, 0.2, 6).rotateX(-Math.PI / 2).translate(0, 0.06, -0.66), '#ffb020'],
    [box(0.36, 0.04, 0.22, 0, 0, 0.5), '#c8ccd4'],
  ]);
}

/** One gull wing out to the side (-1 left, 1 right), dark tip. */
function birdWing(side: number): THREE.BufferGeometry {
  return colored([
    [box(0.85, 0.04, 0.38, side * 0.43, 0, 0), '#eef0f3'],
    [box(0.3, 0.045, 0.3, side * 0.95, 0, 0.04), '#3a3f52'],
  ]);
}

/** A whole gull with its wings spread (for the screen hits). */
export function birdGeometry(): THREE.BufferGeometry {
  const parts = [birdBody(), birdWing(-1), birdWing(1)];
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}

/** A cheerful news helicopter (facing -z): orange and cream cabin, dark glass, tail boom and fin, skids. ~6 m long. */
function heliGeometry(): THREE.BufferGeometry {
  return colored([
    [new THREE.SphereGeometry(1, 20, 14).scale(1.0, 0.95, 1.6).translate(0, 0, 0), '#ff8a3d'],
    [new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.92, 0.8, 1.1).rotateX(-Math.PI / 2.4).translate(0, 0.15, -0.75), '#1d2433'],
    [box(2.0, 0.22, 2.4, 0, -0.25, 0.2), '#f4e9d8'],
    [new THREE.CylinderGeometry(0.16, 0.32, 3.4, 10).rotateX(Math.PI / 2).translate(0, 0.25, 2.9), '#ff8a3d'],
    [box(0.12, 1.0, 0.6, 0, 0.75, 4.45), '#f4e9d8'],
    [box(1.2, 0.1, 0.4, 0, 0.35, 4.35), '#f4e9d8'],
    [new THREE.CylinderGeometry(0.16, 0.16, 0.35, 10).translate(0, 1.05, 0), '#3a3f52'],
    [box(0.1, 0.1, 2.8, -0.85, -1.25, 0), '#3a3f52'], [box(0.1, 0.1, 2.8, 0.85, -1.25, 0), '#3a3f52'],
    [box(0.08, 0.5, 0.08, -0.75, -1.0, -0.7), '#3a3f52'], [box(0.08, 0.5, 0.08, 0.75, -1.0, -0.7), '#3a3f52'],
    [box(0.08, 0.5, 0.08, -0.75, -1.0, 0.8), '#3a3f52'], [box(0.08, 0.5, 0.08, 0.75, -1.0, 0.8), '#3a3f52'],
  ]);
}

/** A puffy cloud: overlapping flat-shaded spheres, flat underside. ~3 x 1.6 x 2 at scale 1. */
function cloudGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blobs = [[0, 0.35, 0, 0.9], [0.85, 0.2, 0.15, 0.7], [-0.85, 0.2, -0.1, 0.72], [0.35, 0.75, -0.1, 0.62], [-0.4, 0.65, 0.2, 0.6], [1.45, 0.05, 0, 0.45], [-1.45, 0.05, 0.1, 0.48]];
  for (const [x, y, z, r] of blobs) parts.push(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z));
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}

export class SkyLanes {
  readonly group = new THREE.Group();
  private markers: THREE.InstancedMesh;
  private strips: THREE.Mesh;
  private stripMat: THREE.MeshBasicMaterial;
  private clouds: THREE.InstancedMesh;
  private cloudPos: THREE.Vector3[] = [];
  private cloudScale: number[] = [];
  private birdBody: THREE.InstancedMesh;
  private wingL: THREE.InstancedMesh;
  private wingR: THREE.InstancedMesh;
  private drones: THREE.InstancedMesh;
  private helis: THREE.InstancedMesh;
  private rotors: THREE.InstancedMesh;
  private lastDistance = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor() {
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
      return mesh;
    };
    const markerCount = MARK_LINES.length * Math.ceil(MARK_SPAN / MARK_EVERY);
    this.markers = inst(new THREE.OctahedronGeometry(0.22).scale(1, 1.6, 1), new THREE.MeshBasicMaterial({ color: LANE_GLOW }), markerCount);
    // Faint glass lanes: one strip per lane, glowing on the add.
    const stripGeo = mergeGeometries([0, 1, 2].map((l) => new THREE.PlaneGeometry(LANE_WIDTH - 0.35, MARK_SPAN).rotateX(-Math.PI / 2).translate(laneX(l), 0, -MARK_SPAN / 2 + 12)))!;
    this.stripMat = new THREE.MeshBasicMaterial({ color: LANE_GLOW, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    this.strips = new THREE.Mesh(stripGeo, this.stripMat);
    this.strips.position.y = SKY_HEIGHT - 0.4;
    this.group.add(this.strips);

    this.clouds = inst(cloudGeometry(), new THREE.MeshLambertMaterial({ color: '#fff4ec', emissive: '#ffb08a', emissiveIntensity: 0.35, flatShading: true }), CLOUDS);
    for (let i = 0; i < CLOUDS; i++) { this.cloudPos.push(new THREE.Vector3()); this.cloudScale.push(1); this.placeCloud(i, -Math.random() * CLOUD_SPAN + 20); }

    // Birds: a white gull body, wings that flap (separate left/right meshes).
    const vc = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.birdBody = inst(birdBody(), vc, MAX_BIRDS);
    this.wingL = inst(birdWing(-1), vc, MAX_BIRDS);
    this.wingR = inst(birdWing(1), vc, MAX_BIRDS);
    this.drones = inst(droneGeometry(), vc, MAX_DRONES);
    this.helis = inst(heliGeometry(), vc, MAX_HELIS);
    this.rotors = inst(
      mergeGeometries([box(7, 0.06, 0.28, 0, 0, 0), box(0.28, 0.06, 7, 0, 0, 0)])!,
      new THREE.MeshLambertMaterial({ color: '#3a3f52' }), MAX_HELIS,
    );
    this.group.visible = false;
  }

  /** k: 0..1 how far up into the sky lanes the car is. */
  update(w: World, k: number, time: number): void {
    const moved = w.distance - this.lastDistance;
    this.lastDistance = w.distance;
    this.group.visible = k > 0.01;
    if (!this.group.visible) return;

    // Lane markers: bobbing diamonds along the lane edges, scrolling with the road.
    const off = w.distance % MARK_EVERY;
    let n = 0;
    const pop = THREE.MathUtils.smoothstep(k, 0.3, 1);
    for (let j = 0; j * MARK_EVERY < MARK_SPAN; j++) {
      const z = 12 - j * MARK_EVERY + off;
      for (const x of MARK_LINES) {
        this.q.setFromEuler(this.e.set(0, time * 2 + j * 0.4, 0));
        this.m.compose(this.v.set(x, SKY_HEIGHT - 0.1 + Math.sin(time * 3 + j * 0.7) * 0.12, z), this.q, this.s.setScalar(pop));
        this.markers.setMatrixAt(n++, this.m);
      }
    }
    this.markers.count = n;
    this.markers.instanceMatrix.needsUpdate = true;
    this.stripMat.opacity = 0.12 * pop;
    this.strips.position.z = 0;

    // Clouds on both sides, drifting past (they move with the road and a little slower: far away).
    for (let i = 0; i < CLOUDS; i++) {
      const p = this.cloudPos[i];
      p.z += moved * 0.85;
      if (p.z > 40) this.placeCloud(i, p.z - CLOUD_SPAN);
      this.m.compose(p, this.q.identity(), this.s.set(this.cloudScale[i] * 1.3, this.cloudScale[i] * 0.8, this.cloudScale[i]));
      this.clouds.setMatrixAt(i, this.m);
    }
    this.clouds.count = CLOUDS;
    this.clouds.instanceMatrix.needsUpdate = true;

    // Sky obstacles.
    let nb = 0, nd = 0, nh = 0;
    for (const e of w.entities) {
      if (!e.alive || !isSky(e.kind)) continue;
      const z = -(e.s - w.distance);
      if (z < -230 || z > 30) continue;
      const x = laneX(e.lane), y = (e.y ?? SKY_HEIGHT) + 0.3, v = (e.variant ?? 0) % 1000;
      if (e.kind === 'bird') {
        // A little flock of three, wings flapping out of step.
        for (let b = 0; b < 3 && nb < MAX_BIRDS; b++) {
          const ph = time * 11 + v + b * 1.9;
          const bx = x + (b - 1) * 0.75, by = y + (b === 1 ? 0.35 : -0.05) + Math.sin(time * 2 + b) * 0.15, bz = z + (b === 1 ? -0.6 : 0.3);
          this.q.setFromEuler(this.e.set(0, Math.sin(time + b) * 0.15, Math.sin(ph * 0.5) * 0.12));
          this.m.compose(this.v.set(bx, by, bz), this.q, this.s.setScalar(1.25));
          this.birdBody.setMatrixAt(nb, this.m);
          const flap = Math.sin(ph) * 0.7;
          this.q.setFromEuler(this.e.set(0, Math.sin(time + b) * 0.15, flap));
          this.wingL.setMatrixAt(nb, this.m.compose(this.v, this.q, this.s));
          this.q.setFromEuler(this.e.set(0, Math.sin(time + b) * 0.15, -flap));
          this.wingR.setMatrixAt(nb, this.m.compose(this.v, this.q, this.s));
          nb++;
        }
      } else if (e.kind === 'drone' && nd < MAX_DRONES) {
        this.q.setFromEuler(this.e.set(Math.sin(time * 2.3 + v) * 0.08, time * 0.8 + v, Math.sin(time * 1.9 + v) * 0.08));
        this.m.compose(this.v.set(x, y + Math.sin(time * 2.6 + v) * 0.25, z), this.q, this.s.setScalar(1.3));
        this.drones.setMatrixAt(nd++, this.m);
      } else if (e.kind === 'heli' && nh < MAX_HELIS) {
        this.q.setFromEuler(this.e.set(0.08, Math.sin(time * 0.7 + v) * 0.1, Math.sin(time * 1.3 + v) * 0.05));
        this.m.compose(this.v.set(x, y + 0.6 + Math.sin(time * 1.8 + v) * 0.2, z), this.q, this.s.setScalar(0.62));
        this.helis.setMatrixAt(nh, this.m);
        this.q.setFromEuler(this.e.set(0, time * 22 + v, 0));
        this.v.y += 0.62 * 1.25;
        this.rotors.setMatrixAt(nh++, this.m.compose(this.v, this.q, this.s));
      }
    }
    for (const [mesh, c] of [[this.birdBody, nb], [this.wingL, nb], [this.wingR, nb], [this.drones, nd], [this.helis, nh], [this.rotors, nh]] as const) {
      mesh.count = c;
      mesh.visible = c > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private placeCloud(i: number, z: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const below = Math.random() < 0.3; // some float lower, between the lanes and the rooftops
    this.cloudPos[i].set(side * (7 + Math.random() * 26), SKY_HEIGHT + (below ? -9 - Math.random() * 6 : -3 + Math.random() * 9), z);
    this.cloudScale[i] = 2.2 + Math.random() * 3.2;
  }
}
