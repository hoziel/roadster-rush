import * as THREE from 'three';

const MAX = 400; // enough for the hover's steady jets plus a kickflip blast

/**
 * Thruster vapor for the kickflip and landings: a pooled, single-draw-call cloud of soft round billboards
 * (shader after Codex's thruster-vapor study in art/mockups/01-player-roadster). No textures, no allocations.
 * Puffs drift with the road (the world scrolls toward +z), swell and fade.
 */
export class Puffs {
  readonly mesh: THREE.InstancedMesh;
  private pos = Array.from({ length: MAX }, () => new THREE.Vector3());
  private vel = Array.from({ length: MAX }, () => new THREE.Vector3());
  private age = new Float32Array(MAX).fill(1);
  private life = new Float32Array(MAX).fill(1);
  private size = new Float32Array(MAX);
  private alpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.alpha.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('vaporAlpha', this.alpha);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `attribute float vaporAlpha;
        varying vec2 vUv; varying float vAlpha;
        void main(){
          vUv = uv; vAlpha = vaporAlpha;
          vec4 center = modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
          center.xy += position.xy * length(instanceMatrix[0].xyz);
          gl_Position = projectionMatrix * center;
        }`,
      fragmentShader: `varying vec2 vUv; varying float vAlpha;
        void main(){
          vec2 p = vUv * 2. - 1.; float r = dot(p, p);
          float a = pow(max(0., 1. - r), 2.) * vAlpha;
          if (a < .003) discard;
          gl_FragColor = vec4(mix(vec3(.78, .8, .9), vec3(1.), max(0., 1. - r)), a);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  /** One puff at (x, y, z) blowing along (vx, vy, vz). */
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size = 0.35, life = 0.5): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos[i].set(x, y, z);
    this.vel[i].set(vx + (Math.random() - 0.5) * 1.2, vy, vz + (Math.random() - 0.5) * 1.2);
    this.age[i] = 0;
    this.life[i] = life * (0.8 + Math.random() * 0.5);
    this.size[i] = size * (0.8 + Math.random() * 0.5);
  }

  /** A blast from the car's four thrusters at (x, y) that spreads out over the road. */
  corners(x: number, y: number, size = 0.35): void {
    for (const cx of [-0.55, 0.55]) for (const cz of [-1.24, 1.24]) {
      for (let n = 0; n < 9; n++) {
        const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
        this.emit(x + cx, y + 0.15, cz, Math.cos(a) * sp + cx * 2, -2.5 + Math.random(), Math.sin(a) * sp, size * 1.6, 0.9);
      }
    }
  }

  update(dt: number, roadSpeed: number): void {
    let top = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= this.life[i]) { this.alpha.setX(i, 0); this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0)); continue; }
      top = i + 1;
      this.age[i] += dt;
      const k = Math.min(1, this.age[i] / this.life[i]);
      const p = this.pos[i], v = this.vel[i];
      v.multiplyScalar(Math.max(0, 1 - dt * 3)); // gas slows fast
      p.addScaledVector(v, dt);
      p.z += roadSpeed * dt; // left behind on the road
      if (p.y < 0.1) { p.y = 0.1; v.y = 0.2; }
      this.s.setScalar(this.size[i] * (1 + 2.2 * k));
      this.mesh.setMatrixAt(i, this.m.compose(p, this.q, this.s));
      this.alpha.setX(i, 0.75 * Math.pow(1 - k, 1.5));
    }
    this.mesh.count = top;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }
}
