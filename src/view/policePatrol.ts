import * as THREE from 'three';
import type { World } from '../sim/world';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';

// The hover police car. Before a run it floats beside the start line, next to the parked patrol cars.
// During a run it now and then sweeps across the sky above the road (a fly-by, view only: no gameplay).
// One car, so it costs no extra draw calls on the start screen.

/** Start-line spot (start-line metres, as in startline.ts). */
export const HOVER_SPOT = { x: -7.4, z: -60, rotY: 0.5, y: 1.6 };
const FLY = { y: 6, z: -20, span: 34, time: 4.8, bank: 0.25, scale: 1.25 }; // fly-by: height, depth, half-width crossed, seconds
const FIRST_AFTER = 14; // s into a run before the first fly-by
const EVERY = [28, 48]; // s between fly-bys
const HIDE_PAST = 140; // m driven before the start-line spot is behind the camera
const SIREN_HZ = 2.5;
const CAR_SCALE = 0.9;

/** Glowing hover pad under a car: a pulsing disc and two shock rings rolling outward (2 draw calls + 1). */
export class HoverGlow {
  readonly group = new THREE.Group();
  private disc: THREE.Mesh;
  private rings: THREE.Mesh[] = [];

  constructor(color = '#b18cff') {
    const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, opacity: 0.35, ...add }));
    this.group.add(this.disc);
    const ringGeo = new THREE.RingGeometry(0.9, 1.1, 40).rotateX(-Math.PI / 2).translate(0, 0.01, 0);
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#e6dcff', ...add }));
      this.rings.push(ring);
      this.group.add(ring);
    }
  }

  update(time: number): void {
    (this.disc.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 9) * 0.1;
    this.rings.forEach((r, i) => {
      const t = (time * 1.6 + i * 0.5) % 1;
      r.scale.setScalar(0.8 + t * 2.6);
      (r.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
    });
  }
}

type Emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, size?: number, life?: number) => void;

export class PolicePatrol {
  readonly group = new THREE.Group();
  /** Called as a fly-by starts (dir: +1 left to right, -1 right to left), for its sound. */
  onFlyby: ((dir: number) => void) | null = null;
  private car: PoliceRoadsterParts;
  private glow = new HoverGlow();
  private flyT = -1; // s into the current fly-by, -1 when none
  private dir = 1;
  private nextFly = FIRST_AFTER;
  private lastRunTime = 0;
  private puffAcc = 0;

  constructor(private emit: Emit) {
    this.car = buildPoliceRoadster();
    this.car.group.scale.setScalar(CAR_SCALE);
    this.car.setLights(true);
    this.group.add(this.car.group, this.glow.group);
  }

  /** Debug: start a fly-by now. */
  flyNow(): void { this.flyT = 0; this.dir = Math.random() < 0.5 ? 1 : -1; this.onFlyby?.(this.dir); }

  update(w: World, dt: number, time: number, showcase: boolean): void {
    const running = w.phase === 'running' && !showcase;
    // Schedule fly-bys on run time (a new run starts the clock again).
    if (w.time < this.lastRunTime) { this.nextFly = FIRST_AFTER; this.flyT = -1; }
    this.lastRunTime = w.time;
    if (running && this.flyT < 0 && !w.tube && w.time > this.nextFly) {
      this.nextFly = w.time + EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]);
      this.flyNow();
    }

    const bob = Math.sin(time * 2.2) * 0.12;
    const car = this.car.group;
    if (this.flyT >= 0 && running) {
      this.flyT += dt;
      const p = this.flyT / FLY.time;
      if (p >= 1) { this.flyT = -1; this.group.visible = false; return; }
      const x = this.dir * FLY.span * (p * 2 - 1);
      car.position.set(x, FLY.y + bob + Math.sin(p * Math.PI) * 1.5, FLY.z);
      car.rotation.set(0, -this.dir * Math.PI / 2, this.dir * FLY.bank);
      car.scale.setScalar(CAR_SCALE * FLY.scale);
      this.glow.group.visible = false;
      this.jets(car.position, dt);
      this.group.visible = true;
    } else {
      this.flyT = -1;
      // Parked over the start line, until the car has driven well past it.
      const z = HOVER_SPOT.z + w.distance;
      this.group.visible = w.distance < HIDE_PAST;
      if (!this.group.visible) return;
      car.position.set(HOVER_SPOT.x, HOVER_SPOT.y + bob, z);
      car.rotation.set(Math.sin(time * 1.7) * 0.03, HOVER_SPOT.rotY, Math.sin(time * 2.3) * 0.04);
      car.scale.setScalar(CAR_SCALE);
      this.glow.group.position.set(HOVER_SPOT.x, 0.03, z);
      this.glow.group.visible = true;
      this.glow.update(time);
      if (w.phase !== 'running') this.jets(car.position, dt);
    }
    this.car.updateLights(time * SIREN_HZ);
  }

  /** Air jets under the car: thin streams blasting down. */
  private jets(at: THREE.Vector3, dt: number): void {
    this.puffAcc += dt * 50;
    for (; this.puffAcc >= 1; this.puffAcc--) {
      const cx = (Math.random() < 0.5 ? -0.5 : 0.5), cz = (Math.random() < 0.5 ? -1 : 1);
      this.emit(at.x + cx, at.y - 0.1, at.z + cz, 0, -7, 0, 0.25, 0.35);
    }
  }
}
