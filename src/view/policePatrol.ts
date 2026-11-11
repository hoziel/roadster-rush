import * as THREE from 'three';
import type { World } from '../sim/world';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';
import { HoverJets, type Puffs } from './puffs';

// The hover police car. Before a run it floats beside the start line, next to the parked patrol cars.
// During a run it now and then sweeps across the sky above the road (a fly-by, view only: no gameplay).
// One car, so it costs no extra draw calls on the start screen.

/** Start-line spot (start-line metres, as in startline.ts). */
export const HOVER_SPOT = { x: 7.4, z: 60, rotY: 0.5 + Math.PI, y: 1.6 }; // behind the parked car (the start screen looks back down the road)
const FLY = { y: 6, z: -20, span: 34, time: 4.8, bank: 0.25, scale: 1.25 }; // fly-by: height, depth, half-width crossed, seconds
const FIRST_AFTER = 14; // s into a run before the first fly-by
const EVERY = [28, 48]; // s between fly-bys
const HIDE_PAST = 140; // m driven before the start-line spot is behind the camera
const SIREN_HZ = 2.5;
const CAR_SCALE = 0.9;


export class PolicePatrol {
  readonly group = new THREE.Group();
  /** Called as a fly-by starts (dir: +1 left to right, -1 right to left), for its sound. */
  onFlyby: ((dir: number) => void) | null = null;
  private car: PoliceRoadsterParts;
  private flyT = -1; // s into the current fly-by, -1 when none
  private dir = 1;
  private nextFly = FIRST_AFTER;
  private lastRunTime = 0;
  private jets: HoverJets;

  constructor(puffs: Puffs) {
    this.jets = new HoverJets(puffs, CAR_SCALE);
    this.car = buildPoliceRoadster();
    this.car.group.scale.setScalar(CAR_SCALE);
    this.car.setLights(true);
    this.group.add(this.car.group);
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
      this.jets.update(car.position.x, car.position.y, car.position.z, 0, dt, time);
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
      if (w.phase !== 'running') this.jets.update(car.position.x, car.position.y, car.position.z, 0, dt, time, 0.5);
    }
    this.car.updateLights(time * SIREN_HZ);
  }
}
