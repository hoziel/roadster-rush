import * as THREE from 'three';
import { buildPoliceRoadster, type PoliceRoadsterParts } from './policeRoadster';
import { HoverJets, type Puffs } from './puffs';

// After a hit, two hover police fly alongside the car while the chase is on (they use the same instances).
// Game over: police cars race in from every side (two drop down from the sky, hovering) and box the car in,
// lights flashing, while the camera circles. Each comes straight in along its own spoke toward the car,
// so none crosses another or the car. One police model instanced: ~17 draw calls for the whole fleet.

const CAR_SCALE = 0.9;
/** Where each police car ends up round the player (x, z, y, facing toward the car), and where it comes from. */
const SPOTS = [
  { a: 0.0, r: 6.4, y: 0 }, // ahead
  { a: Math.PI, r: 6.6, y: 0 }, // behind
  { a: Math.PI * 0.3, r: 7, y: 0 }, // front right
  { a: -Math.PI * 0.7, r: 7, y: 0 }, // back left
  { a: Math.PI / 2, r: 3.4, y: 1.9 }, // hovering right next to the car
  { a: -Math.PI / 2, r: 3.4, y: 2.3 }, // hovering right next to it on the other side
];
// After a hit (while the police chase is on): two hover police fly alongside, one each side.
const ESCORT = { dx: 2.6, z: -3, y: 2.5, from: 22, ease: 2.5 }; // a little ahead of the car, so both stay on a phone screen
const FROM = 45; // m out along its spoke where each starts
const ARRIVE = 1.25; // s to drive in
const STAGGER = 0.15; // s between arrivals
const SIREN_HZ = 2.5;

export class BustScene {
  readonly group = new THREE.Group();
  private parts: { mesh: THREE.InstancedMesh; base: THREE.Matrix4 }[] = [];
  private lights: PoliceRoadsterParts;
  private jets: HoverJets[];
  private t = -1; // s since the bust began, -1 when off
  private escortK = 0; // 0..1 eased: the two hover police alongside after a hit
  private cx = 0;
  private m = new THREE.Matrix4();
  private car = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);

  constructor(puffs: Puffs) {
    // Bake each part of one police car (with its scale) and draw all the cars as instances of it.
    this.lights = buildPoliceRoadster();
    this.lights.setLights(true);
    const root = this.lights.group;
    root.scale.setScalar(CAR_SCALE);
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mesh = new THREE.InstancedMesh(o.geometry, o.material, SPOTS.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.parts.push({ mesh, base: o.matrixWorld.clone() });
      this.group.add(mesh);
    });
    this.jets = SPOTS.map(() => new HoverJets(puffs, CAR_SCALE));
    this.group.visible = false;
  }

  /** Start the bust round the car at sideways position x. */
  begin(x: number): void { this.t = 0; this.cx = x; }
  /** Clear it (a new run, or the garage opened). */
  end(): void { this.t = -1; this.group.visible = false; }
  get active(): boolean { return this.t >= 0; }

  /**
   * Every frame. escort: show the two hover police alongside (after a hit); x, carY: the car; speed: road speed.
   */
  update(dt: number, time: number, escort = false, x = 0, carY = 0, speed = 0): void {
    if (this.t < 0) { this.escort(dt, time, escort, x, carY, speed); return; }
    this.escortK = 0;
    this.t += dt;
    this.group.visible = true;
    this.lights.updateLights(time * SIREN_HZ);
    SPOTS.forEach((s, i) => {
      const p = THREE.MathUtils.clamp((this.t - i * STAGGER) / ARRIVE, 0, 1);
      const k = 1 - Math.pow(1 - p, 3); // ease out: fast in, brakes hard
      const dx = Math.sin(s.a), dz = -Math.cos(s.a); // spoke direction (a = 0 is ahead, -z)
      const r = THREE.MathUtils.lerp(FROM, s.r, k);
      const hover = s.y > 0;
      const bob = hover ? Math.sin(time * 2.2 + i) * 0.15 : 0;
      const y = hover ? THREE.MathUtils.lerp(28, s.y, k) + bob : 0;
      // Nose toward the car while driving in, swinging a little sideways as it brakes.
      // The model's nose is -z: rotation atan2(dx, dz) points it back down the spoke at the car.
      const face = Math.atan2(dx, dz) + k * (i % 2 ? 0.45 : -0.45);
      this.e.set(hover ? Math.sin(time * 1.7 + i) * 0.03 : 0, face, hover ? Math.sin(time * 2.1 + i) * 0.04 : 0);
      this.q.setFromEuler(this.e);
      this.v.set(this.cx + dx * r, y, dz * r);
      this.car.compose(this.v, this.q, this.one);
      for (const part of this.parts) part.mesh.setMatrixAt(i, this.m.multiplyMatrices(this.car, part.base));
      if (hover && p > 0) this.jets[i].update(this.v.x, this.v.y, this.v.z, 0, dt, time, 0.8);
    });
    for (const part of this.parts) { part.mesh.count = SPOTS.length; part.mesh.instanceMatrix.needsUpdate = true; }
  }

  private escort(dt: number, time: number, on: boolean, x: number, carY: number, speed: number): void {
    this.escortK += ((on ? 1 : 0) - this.escortK) * Math.min(1, dt * ESCORT.ease);
    this.group.visible = this.escortK > 0.01;
    if (!this.group.visible) return;
    this.lights.updateLights(time * SIREN_HZ);
    const k = this.escortK;
    for (let i = 0; i < 2; i++) {
      const side = i ? -1 : 1;
      const bob = Math.sin(time * 2.3 + i * 1.7) * 0.15;
      this.v.set(x + side * ESCORT.dx, carY + ESCORT.y + bob, THREE.MathUtils.lerp(ESCORT.from, ESCORT.z + i * 0.8, k));
      this.e.set(Math.sin(time * 1.7 + i) * 0.03, 0, side * -0.06 + Math.sin(time * 2.1 + i) * 0.04);
      this.q.setFromEuler(this.e);
      this.car.compose(this.v, this.q, this.one);
      for (const part of this.parts) part.mesh.setMatrixAt(i, this.m.multiplyMatrices(this.car, part.base));
      this.jets[i].update(this.v.x, this.v.y, this.v.z, speed, dt, time, k);
    }
    for (const part of this.parts) { part.mesh.count = 2; part.mesh.instanceMatrix.needsUpdate = true; }
  }
}
