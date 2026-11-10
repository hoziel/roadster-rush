import * as THREE from 'three';
import { loadModel, modelGeometry } from './models';

// City blocks lining both sides of the road, streamed endlessly at random (a fresh layout every
// run). Kenney City Kit Commercial and Suburban models (CC0), one InstancedMesh per model, so one
// draw call each; each mesh is a fixed-size pool that buildings are recycled through.
// Their white walls take a per-building color from the warm Austin palette, and the blue window
// panes light up at night.
const SPAN = 220; // m of roadside kept laid out ahead of the camera
const BEHIND = 80; // m kept behind the car too, so the parked-car orbit looks down an endless road
const NEAR_Z = 20; // where a building leaves the screen behind the camera
const FRONT_X = 18; // m from the road centre to the shop fronts (behind cacti, poles, signs)
const RISE_FROM_Z = -165; // far end: buildings grow out of the haze here...
const RISE_TO_Z = -110; // ...and are full height here (keeps the Capitol vista clear)
const GAP: [number, number] = [1.5, 4]; // m between neighbours
const PLAZA_CHANCE = 0.16; // chance of a wide gap after a building, so landmarks show through
const PLAZA: [number, number] = [14, 22];
const JITTER: [number, number] = [0.92, 1.08]; // per-building width/scale jitter
const POOL_MARGIN = 2; // spare instances per model on top of the worst case

// Downtown Austin palette (white walls take one per building): limestone, red brick, terracotta,
// the Capitol's pink granite, sandstone, a few painted 6th Street fronts.
const PALETTE = ['#eadfc6', '#b5523b', '#c96f4a', '#c98f80', '#d8c39a', '#f2ece0', '#9c4a3c', '#3fa7a0', '#e0b03a', '#8fa6b8'];
const GLOW = '#ffc56e'; // window light at night
const GLOW_GAIN = 4; // the kit's panes are small: push them hard so they read through the night fog
const LIT_MIN = 0.5; // dimmest per-building night glow
const DARK_WINDOWS = 0.22; // share of window rows left dark at night

// Kenney models are about 1 unit per storey-and-a-bit; scale is metres per model unit.
interface Variant { file: string; weight: number; scale: number; stretchY: [number, number] }

const VARIANTS: Variant[] = [
  { file: 'building-c.glb', weight: 0.13, scale: 10.5, stretchY: [1, 1.1] }, // low shop
  { file: 'building-e.glb', weight: 0.13, scale: 10.5, stretchY: [1, 1.1] }, // wide two-storey
  { file: 'building-i.glb', weight: 0.13, scale: 10.5, stretchY: [0.95, 1.1] },
  { file: 'building-l.glb', weight: 0.12, scale: 10.5, stretchY: [0.95, 1.1] }, // green roof cap
  { file: 'building-n.glb', weight: 0.09, scale: 10.5, stretchY: [0.95, 1.05] }, // wide mid-rise
  // Downtown is towers among the low historic fronts (no houses): more and taller glass towers.
  { file: 'skyscraper-a.glb', weight: 0.2, scale: 10, stretchY: [1.1, 1.6] },
  { file: 'skyscraper-e.glb', weight: 0.18, scale: 10, stretchY: [1.0, 1.4] },
];

interface Model { variant: Variant; geometry: THREE.BufferGeometry; map: THREE.Texture | null; width: number }

/**
 * One model's fixed-capacity pool. Live buildings are packed at instance indices 0..n-1
 * (mesh.count = n), so nothing past them is drawn; recycling one moves the last into its slot.
 */
interface Pool {
  model: Model;
  mesh: THREE.InstancedMesh;
  icol: THREE.InstancedBufferAttribute;
  n: number;
  a: Float32Array; // road position of the building's centre (m): z = NEAR_Z - (a - distance)
  x: Float32Array;
  rotY: Float32Array;
  scale: Float32Array;
  stretchY: Float32Array;
}

/** Each side of the road streams its own row from a frontier ahead of the car. */
interface Side { dir: number; frontier: number; prev: number }

export class Buildings {
  readonly group = new THREE.Group();
  private night = { value: 0 };
  private glow = { value: new THREE.Color(GLOW) };
  private pools: Pool[] = [];
  private totalWeight = 0;
  private sides: Side[] = [{ dir: -1, frontier: 0, prev: -1 }, { dir: 1, frontier: 0, prev: -1 }];
  private lastDistance = 0;
  private needsReset = true;
  private color = new THREE.Color();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor() {
    void this.load();
  }

  /** A fresh random roadside for the next run (laid out on the next update). */
  newRun(): void {
    this.needsReset = true;
  }

  /** Loads the models and makes one pooled InstancedMesh per model. Renders nothing until then. */
  private async load(): Promise<void> {
    const results = await Promise.allSettled(VARIANTS.map((v) => loadModel(v.file)));
    const models: Model[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') { console.warn(`buildings: failed to load ${VARIANTS[i].file}`, r.reason); return; }
      const { geometry, material } = modelGeometry(r.value);
      // Local frame: frontage along x (centred), front face at z = 0 facing +z, base at y = 0.
      geometry.computeBoundingBox();
      const b = geometry.boundingBox!;
      geometry.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -b.max.z);
      const map = (material as THREE.MeshStandardMaterial).map ?? null;
      material.dispose();
      models.push({ variant: VARIANTS[i], geometry, map, width: (b.max.x - b.min.x) * VARIANTS[i].scale });
    });
    if (models.length === 0) return;

    this.totalWeight = models.reduce((s, m) => s + m.variant.weight, 0);
    const maxWidth = Math.max(...models.map((m) => m.width)) * JITTER[1];
    const live = SPAN + BEHIND + 2 * maxWidth; // road one side's live buildings can cover at once
    for (const model of models) {
      // Twins never stand side by side, so a model is at most every other building on a side.
      const others = models.filter((o) => o !== model);
      const otherMin = others.length ? Math.min(...others.map((o) => o.width)) : model.width;
      const period = others.length ? (model.width + otherMin) * JITTER[0] + 2 * GAP[0] : model.width * JITTER[0] + GAP[0];
      const capacity = 2 * (Math.floor(live / period) + 1) + POOL_MARGIN;
      const mesh = new THREE.InstancedMesh(model.geometry, this.material(model.map), capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.visible = false;
      const icol = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
      icol.setUsage(THREE.DynamicDrawUsage);
      mesh.geometry.setAttribute('iCol', icol);
      this.pools.push({
        model, mesh, icol, n: 0,
        a: new Float32Array(capacity), x: new Float32Array(capacity), rotY: new Float32Array(capacity),
        scale: new Float32Array(capacity), stretchY: new Float32Array(capacity),
      });
      this.group.add(mesh);
    }
    this.needsReset = true;
  }

  /**
   * Lambert with the Kenney colormap. Pixels that are near-white (walls) are multiplied by the
   * building's palette color; blue pixels (window glass) glow at night, a few rows left dark.
   */
  private material(map: THREE.Texture | null): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ map });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = this.night;
      shader.uniforms.uGlow = this.glow;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec4 iCol; varying vec4 vICol; varying vec3 vLocal;`)
        .replace('#include <color_vertex>', `#include <color_vertex>
          vICol = iCol; vLocal = position;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNight; uniform vec3 uGlow; varying vec4 vICol; varying vec3 vLocal;
          float bHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 tex = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)); // back to sRGB for the tests
          float hi = max(tex.r, max(tex.g, tex.b)), lo = min(tex.r, min(tex.g, tex.b));
          float wall = smoothstep(0.62, 0.8, hi) * (1.0 - smoothstep(0.07, 0.14, hi - lo));
          float glass = smoothstep(0.08, 0.2, tex.b - tex.r) * smoothstep(0.0, 0.06, tex.b - tex.g);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vICol.rgb, wall);
          float row = floor(vLocal.y * 3.2) + floor((vLocal.x + vLocal.z) * 1.6) * 5.0;
          float winGlow = glass * vICol.a * step(${DARK_WINDOWS.toFixed(2)}, bHash(row + vICol.a * 91.0));`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += uGlow * winGlow * uNight * ${GLOW_GAIN.toFixed(1)}; diffuseColor.rgb *= 1.0 - glass * uNight * 0.6;`);
    };
    mat.customProgramCacheKey = () => 'kenney-building';
    return mat;
  }

  /** Empty every pool and restart both frontiers at the car. */
  private reset(distance: number): void {
    for (const pool of this.pools) pool.n = 0;
    for (const side of this.sides) {
      side.frontier = distance - BEHIND + (side.dir < 0 ? 3 : 9); // stagger the two sides
      side.prev = -1;
    }
  }

  /** True if pool mi can take the next building on this side (has room, and isn't a twin). */
  private fits(mi: number, side: Side): boolean {
    const pool = this.pools[mi];
    return pool.n < pool.a.length && (mi !== side.prev || this.pools.length === 1);
  }

  /** Drop the next building on a side (random model, width jitter, stretch, colour), then a gap. */
  private place(side: Side): void {
    const pools = this.pools;
    let mi = pick(pools, Math.random() * this.totalWeight);
    if (mi === side.prev) mi = (mi + 1) % pools.length; // no twins side by side
    // Pools are sized for the worst case; if one is still full, take the next model with room.
    for (let k = 0; k < pools.length && !this.fits(mi, side); k++) mi = (mi + 1) % pools.length;
    if (!this.fits(mi, side)) { side.frontier += GAP[1]; return; }
    side.prev = mi;
    const pool = pools[mi];
    const v = pool.model.variant;
    const jitter = JITTER[0] + Math.random() * (JITTER[1] - JITTER[0]);
    const width = pool.model.width * jitter;
    const i = pool.n++;
    pool.a[i] = side.frontier + width / 2;
    pool.x[i] = side.dir * FRONT_X;
    pool.rotY[i] = side.dir < 0 ? Math.PI / 2 : -Math.PI / 2; // fronts face the road
    pool.scale[i] = v.scale * jitter;
    pool.stretchY[i] = v.stretchY[0] + Math.random() * (v.stretchY[1] - v.stretchY[0]);
    this.color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    pool.icol.setXYZW(i, this.color.r, this.color.g, this.color.b, LIT_MIN + (1 - LIT_MIN) * Math.random());
    pool.icol.needsUpdate = true;
    const [g0, g1] = Math.random() < PLAZA_CHANCE ? PLAZA : GAP; // the odd wide plaza lets landmarks show through
    side.frontier += width + g0 + Math.random() * (g1 - g0);
  }

  /** Move pool slot `from` into slot `to` (keeps the live buildings packed after one is recycled). */
  private move(pool: Pool, from: number, to: number): void {
    pool.a[to] = pool.a[from];
    pool.x[to] = pool.x[from];
    pool.rotY[to] = pool.rotY[from];
    pool.scale[to] = pool.scale[from];
    pool.stretchY[to] = pool.stretchY[from];
    const c = pool.icol;
    c.setXYZW(to, c.getX(from), c.getY(from), c.getZ(from), c.getW(from));
    c.needsUpdate = true;
  }

  /** distance: world.distance; lights: night factor 0..1 from DayNight. */
  update(distance: number, lights: number): void {
    this.night.value = lights;
    if (this.pools.length === 0) return;
    // A new run (distance went back) or a big jump ahead: lay a fresh roadside from here.
    if (this.needsReset || distance < this.lastDistance || distance - this.lastDistance > SPAN) {
      this.reset(distance);
      this.needsReset = false;
    }
    this.lastDistance = distance;

    // Recycle buildings that have passed behind the camera (z beyond NEAR_Z).
    for (const pool of this.pools) {
      for (let i = pool.n - 1; i >= 0; i--) {
        if (pool.a[i] < distance - BEHIND) {
          pool.n--;
          if (i !== pool.n) this.move(pool, pool.n, i);
        }
      }
    }
    // Stream new ones in at the far end (they start flat and rise out of the haze).
    for (const side of this.sides) {
      while (side.frontier < distance + SPAN) this.place(side);
    }

    for (const pool of this.pools) {
      const mesh = pool.mesh;
      for (let i = 0; i < pool.n; i++) {
        const z = NEAR_Z - (pool.a[i] - distance);
        const u = Math.min(1, Math.max(0, (z - RISE_FROM_Z) / (RISE_TO_Z - RISE_FROM_Z)));
        const rise = u * u * (3 - 2 * u);
        this.q.setFromAxisAngle(this.up, pool.rotY[i]);
        const sc = pool.scale[i];
        this.s.set(sc, sc * pool.stretchY[i] * Math.max(0.001, rise), sc);
        this.m.compose(this.p.set(pool.x[i], 0, z), this.q, this.s);
        mesh.setMatrixAt(i, this.m);
      }
      mesh.count = pool.n;
      mesh.visible = pool.n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/** Index of the pool whose cumulative model weight passes r. */
function pick(pools: Pool[], r: number): number {
  let acc = 0;
  for (let i = 0; i < pools.length - 1; i++) {
    acc += pools[i].model.variant.weight;
    if (r < acc) return i;
  }
  return pools.length - 1;
}
