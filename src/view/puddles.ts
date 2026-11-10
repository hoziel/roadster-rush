import * as THREE from 'three';
import { laneX, type World } from '../sim/world';

// Puddles on the road (mud ones in road-work zones). Harmless and view-only: drive through one and it
// splashes the screen (src/ui/splash.ts). They're laid in a random lane every so often along the road.

export type SplashKind = 'water' | 'mud';

const GAP: [number, number] = [70, 150]; // m between puddles
const FIRST = 120; // m into a run before the first
const AHEAD = 220; // m laid out ahead of the car
const MAX = 6;
const HIT_X = 1.3; // m: close enough sideways to drive through it
const WATER = '#7fa9c9', MUD = '#6b4526';

interface Puddle { s: number; lane: number; kind: SplashKind; rot: number; size: number; done: boolean }

export class Puddles {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private puddles: Puddle[] = [];
  private nextS = FIRST;
  private lastDistance = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(private onSplash: (kind: SplashKind) => void) {
    // A blobby puddle: a squashed disc with a wobbly edge.
    const shape = new THREE.Shape();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = 1 + Math.sin(a * 3) * 0.12 + Math.sin(a * 5 + 1) * 0.07;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).scale(0.9, 1, 1.6).translate(0, 0.02, 0);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#203040', emissiveIntensity: 0.25 }), MAX);
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, this.c.set(WATER));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.group.add(this.mesh);
  }

  update(w: World): void {
    if (w.distance < this.lastDistance) { this.puddles = []; this.nextS = FIRST; } // a new run
    this.lastDistance = w.distance;
    const running = w.phase === 'running';
    // Lay new ones ahead (none in a tube tunnel); mud inside road-work zones.
    while (this.nextS < w.distance + AHEAD && this.puddles.length < MAX) {
      const s = this.nextS;
      this.nextS += GAP[0] + Math.random() * (GAP[1] - GAP[0]);
      if (w.tunnelAt >= 0 && s > w.tunnelAt - 10 && s < w.tunnelEnd + 10) continue;
      const mud = w.workAt >= 0 && s >= w.workAt - 20 && s <= w.workEnd + 20;
      this.puddles.push({ s, lane: Math.floor(Math.random() * 3), kind: mud ? 'mud' : 'water', rot: Math.random() * 0.6 - 0.3, size: 0.9 + Math.random() * 0.35, done: false });
    }
    let n = 0;
    this.puddles = this.puddles.filter((p) => p.s > w.distance - 20);
    for (const p of this.puddles) {
      const rel = p.s - w.distance;
      // Drive through it: splash (once), only on the road surface.
      if (running && !p.done && rel < 0.5 && rel > -1.5 && !w.tube && w.y < 0.4 && Math.abs(laneX(p.lane) - w.x) < HIT_X) {
        p.done = true;
        this.onSplash(p.kind);
      }
      this.q.setFromAxisAngle(this.up, p.rot);
      this.m.compose(this.v.set(laneX(p.lane), 0, -rel), this.q, this.s.setScalar(p.size));
      this.mesh.setMatrixAt(n, this.m);
      this.mesh.setColorAt(n, this.c.set(p.kind === 'mud' ? MUD : WATER));
      n++;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0 && !w.tube;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
