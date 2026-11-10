import * as THREE from 'three';

const MAX = 40;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Thruster gas puffs for the kickflip: a pooled, single-draw-call cloud of soft white blobs.
 * Puffs drift with the road (the world scrolls toward +z) and swell, then shrink away.
 */
export class Puffs {
  readonly mesh: THREE.InstancedMesh;
  private pos = Array.from({ length: MAX }, () => new THREE.Vector3());
  private vel = Array.from({ length: MAX }, () => new THREE.Vector3());
  private age = new Float32Array(MAX).fill(1);
  private life = new Float32Array(MAX).fill(1);
  private size = new Float32Array(MAX);
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();

  constructor() {
    const mat = new THREE.MeshLambertMaterial({ color: '#f6f0ff', emissive: '#4a3a66', transparent: true, opacity: 0.85, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, MAX);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, HIDDEN);
  }

  /** One puff at (x, y, z) blowing along (vx, vy, vz). */
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size = 0.35, life = 0.5): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos[i].set(x, y, z);
    this.vel[i].set(vx + (Math.random() - 0.5) * 0.8, vy, vz + (Math.random() - 0.5) * 0.8);
    this.age[i] = 0;
    this.life[i] = life * (0.8 + Math.random() * 0.4);
    this.size[i] = size * (0.8 + Math.random() * 0.4);
  }

  /** A downward blast from the four corners of a car at (x, y). */
  corners(x: number, y: number, size = 0.35): void {
    for (const cx of [-0.7, 0.7]) for (const cz of [-1.2, 1.2]) this.emit(x + cx, y + 0.15, cz, cx * 2, -3, 0, size);
  }

  update(dt: number, roadSpeed: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      if (k >= 1) { this.mesh.setMatrixAt(i, HIDDEN); continue; }
      const p = this.pos[i], v = this.vel[i];
      v.multiplyScalar(Math.max(0, 1 - dt * 4)); // gas slows fast
      p.addScaledVector(v, dt);
      p.z += roadSpeed * dt; // left behind on the road
      if (p.y < 0.1) p.y = 0.1;
      this.s.setScalar(this.size[i] * (0.6 + 1.6 * k) * (1 - k * k));
      this.mesh.setMatrixAt(i, this.m.compose(p, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
