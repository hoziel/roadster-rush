import * as THREE from 'three';
import { BALL_SPOTS } from '../sim/config';
import { laneX, type World } from '../sim/world';
import type { PlayerSpec } from './sideline';

// Hobby balls: the driver's teammates line both sidewalks and throw balls (basketballs for Nevo, volleyballs
// for Ori) across the road. Each ball waits in a thrower's hands, then arcs over the road so it crosses its
// lane at catch height just as the car gets there (jump to catch it), and flies on to a teammate on the
// other side. A soft shadow on the road marks its lane. For basketball, a very tall player soars right over
// the road and back. 2 draw calls (balls, shadows); the players are drawn by the Sideline.

export type Sport = 'basketball' | 'volleyball';

const MAX = 12;
const SIDE_X = 6.2; // m: where the teammates stand (on the sidewalk)
const HAND_Y = 2.4; // m: a ball held up, ready to throw
const LEAD = 42; // m ahead of the car when a ball is thrown
const ARC = 2.6; // m the throw rises above the straight line
const AFTER = 16; // m behind the car by when a missed ball reaches the far side
const RADIUS = 0.6;

/** Which side a ball is thrown from: alternating through the volley. */
const sideOf = (k: number): number => (k % 2 ? -1 : 1);

export class HobbyBalls {
  readonly group = new THREE.Group();
  /** Where the throwers stand: placed at the latest volley (the Sideline draws the players in its space). */
  readonly anchor = new THREE.Group();
  private balls: THREE.InstancedMesh;
  private shadows: THREE.InstancedMesh;
  private mat: THREE.MeshToonMaterial;
  private textures: Record<Sport, THREE.CanvasTexture>;
  private sport: Sport | null = null;
  private dummy = new THREE.Object3D();

  constructor() {
    this.textures = { basketball: ballTexture('basketball'), volleyball: ballTexture('volleyball') };
    this.mat = new THREE.MeshToonMaterial({ map: this.textures.basketball, emissive: '#3a2410' });
    this.balls = new THREE.InstancedMesh(new THREE.SphereGeometry(RADIUS, 18, 12), this.mat, MAX);
    this.shadows = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.75, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2a1030', transparent: true, opacity: 0.35, depthWrite: false }),
      MAX,
    );
    for (const m of [this.balls, this.shadows]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
    }
    this.group.add(this.balls, this.shadows, this.anchor);
    this.anchor.visible = false;
  }

  /** The driver's sport (null: no balls, no throwers). */
  setSport(sport: Sport | null): void {
    this.sport = sport;
    if (sport) { this.mat.map = this.textures[sport]; this.mat.needsUpdate = true; }
  }

  /** The teammates for a sport, in the anchor's space (the anchor sits at the volley's chunk start). */
  static players(sport: Sport | null): PlayerSpec[] {
    if (!sport) return [];
    const shirt = sport === 'basketball' ? { shirt: '#111214', legs: '#c4ced4' } : { shirt: '#2f6fdc', legs: '#ffffff' };
    const out: PlayerSpec[] = [];
    BALL_SPOTS.forEach((at, k) => {
      const side = sideOf(k);
      out.push({ activity: 'throw', x: side * SIDE_X, z: -at, yaw: side * Math.PI / 2, ...shirt, phase: k * 0.4 });
      out.push({ activity: 'cheer', x: -side * SIDE_X, z: -at, yaw: -side * Math.PI / 2, ...shirt, phase: k * 0.3 });
    });
    if (sport === 'basketball') {
      // The very tall one, soaring over the road between the throws.
      out.push({ activity: 'leap', x: -SIDE_X - 0.6, z: -(BALL_SPOTS[0] + BALL_SPOTS[1]) / 2, yaw: 0, ...shirt, target: [SIDE_X + 0.6, 0, -(BALL_SPOTS[1] + BALL_SPOTS[2]) / 2] });
    }
    return out;
  }

  update(w: World, time: number, visible: boolean): void {
    const on = visible && !!this.sport && !w.tube;
    const az = -(w.ballAt - w.distance);
    this.anchor.visible = on && w.ballAt >= 0 && az > -230 && az < 60;
    this.anchor.position.set(0, 0, az);
    let n = 0;
    if (on) {
      for (const e of w.entities) {
        if (!e.alive || e.kind !== 'ball' || n >= MAX) continue;
        const rel = e.s - w.distance;
        if (rel > 230) continue;
        const side = sideOf(e.variant ?? 0), lx = laneX(e.lane), y0 = e.y ?? 1.9;
        let x: number, y: number;
        if (rel >= LEAD) { x = side * (SIDE_X - 0.5); y = HAND_Y + Math.sin(time * 4 + e.s) * 0.05; } // held, ready
        else if (rel >= 0) { // the throw: crosses the lane at catch height as the car arrives
          const p = 1 - rel / LEAD;
          x = THREE.MathUtils.lerp(side * (SIDE_X - 0.5), lx, p);
          y = THREE.MathUtils.lerp(HAND_Y, y0, p) + Math.sin(p * Math.PI) * ARC;
        } else { // missed: on to the teammate across the road
          const q = Math.min(1, -rel / AFTER);
          x = THREE.MathUtils.lerp(lx, -side * (SIDE_X - 0.5), q);
          y = THREE.MathUtils.lerp(y0, HAND_Y, q) + Math.sin(q * Math.PI) * 1.2;
        }
        const z = -rel;
        this.dummy.position.set(x, y, z);
        this.dummy.rotation.set(time * 6 + e.s, 0, time * 2);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.balls.setMatrixAt(n, this.dummy.matrix);
        // Shadow on the road: dark and small under a low ball, faint and wide under a high one.
        const lift = Math.max(0, y - 0.4);
        this.dummy.position.set(x, 0.03, z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(Math.max(0.5, 1.2 - lift * 0.12));
        this.dummy.updateMatrix();
        this.shadows.setMatrixAt(n++, this.dummy.matrix);
      }
    }
    for (const m of [this.balls, this.shadows]) { m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; }
  }
}

/** A ball's surface, wrapped round the sphere (u around, v top to bottom). */
function ballTexture(sport: Sport): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  if (sport === 'basketball') {
    g.fillStyle = '#f08a24'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#2a1206'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke(); // equator
    for (const u of [0, 128, 256]) { g.beginPath(); g.moveTo(u, 0); g.lineTo(u, 128); g.stroke(); }
    for (const u of [64, 192]) { // the curved seams
      g.beginPath(); g.ellipse(u, 64, 26, 70, 0, 0, Math.PI * 2); g.stroke();
    }
  } else {
    const bands = ['#ffd23f', '#ffffff', '#2f6fdc', '#ffffff', '#ffd23f', '#ffffff', '#2f6fdc', '#ffffff'];
    bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 32, 0, 32, 128); });
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 110, 256, 18);
    g.strokeStyle = '#1f2d6b'; g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 18); g.lineTo(i * 32, 110); g.stroke(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
