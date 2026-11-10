import * as THREE from 'three';
import { loadModel, modelGeometry } from './models';

// City blocks lining both sides of the road, on a looping strip like scenery.ts. Kenney City Kit
// Commercial and Suburban models (CC0), one InstancedMesh per model, so one draw call each.
// Their white walls take a per-building color from the warm Austin palette, and the blue window
// panes light up at night.
const SPAN = 220; // m of roadside that loops (treadmill)
const NEAR_Z = 20; // where a building leaves the screen behind the camera
const FRONT_X = 18; // m from the road centre to the shop fronts (behind cacti, poles, signs)
const RISE_FROM_Z = -165; // far end: buildings grow out of the haze here...
const RISE_TO_Z = -110; // ...and are full height here (keeps the Capitol vista clear)
const GAP: [number, number] = [1.5, 4]; // m between neighbours
const PLAZA_CHANCE = 0.16; // chance of a wide gap after a building, so landmarks show through
const PLAZA: [number, number] = [14, 22];

// Warm sunset Austin palette (white walls take one per building).
const PALETTE = ['#d9734e', '#f2e3c6', '#3fa7a0', '#e0b03a', '#f08aa8', '#b49ad8', '#e8a77a', '#7cc3b0'];
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
  { file: 'skyscraper-a.glb', weight: 0.1, scale: 10, stretchY: [0.9, 1.15] },
  { file: 'skyscraper-e.glb', weight: 0.08, scale: 10, stretchY: [0.85, 1.05] },
  { file: 'house-d.glb', weight: 0.12, scale: 9, stretchY: [1, 1.1] }, // bungalow-ish houses
  { file: 'house-h.glb', weight: 0.1, scale: 9, stretchY: [1, 1.15] },
];

interface Slot { t: number; x: number; rotY: number; scale: number; stretchY: number }
interface Model { variant: Variant; geometry: THREE.BufferGeometry; map: THREE.Texture | null; width: number }

export class Buildings {
  readonly group = new THREE.Group();
  private night = { value: 0 };
  private glow = { value: new THREE.Color(GLOW) };
  private meshes: THREE.InstancedMesh[] = [];
  private slots: Slot[][] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor() {
    void this.load();
  }

  /** Loads the models, then lays out the strip. Renders nothing until then. */
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

    const layout = this.layout(models);
    const color = new THREE.Color();
    models.forEach((model, mi) => {
      const slots = layout.filter((l) => l.model === mi).map((l) => l.slot);
      if (slots.length === 0) return;
      const mesh = new THREE.InstancedMesh(model.geometry, this.material(model.map), slots.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      const icol = new Float32Array(slots.length * 4);
      slots.forEach((slot, i) => {
        color.set(PALETTE[Math.floor(hash(slot.t * 0.37 + slot.x) * PALETTE.length)]);
        icol.set([color.r, color.g, color.b, LIT_MIN + (1 - LIT_MIN) * hash(slot.t * 1.9 + slot.x * 0.3)], i * 4);
      });
      mesh.geometry.setAttribute('iCol', new THREE.InstancedBufferAttribute(icol, 4));
      this.slots.push(slots);
      this.meshes.push(mesh);
      this.group.add(mesh);
    });
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

  /** Walk each side of the strip, dropping buildings with small gaps and the odd wide plaza. */
  private layout(models: Model[]): { model: number; slot: Slot }[] {
    const out: { model: number; slot: Slot }[] = [];
    const totalWeight = models.reduce((s, m) => s + m.variant.weight, 0);
    for (const side of [-1, 1]) {
      let t = side < 0 ? 3 : 9; // stagger the two sides
      let n = side < 0 ? 0 : 100;
      let prev = -1;
      for (;;) {
        n++;
        let mi = pick(models, hash(n * 4.13) * totalWeight);
        if (mi === prev) mi = (mi + 1) % models.length; // no twins side by side
        prev = mi;
        const model = models[mi];
        const v = model.variant;
        const jitter = 0.92 + hash(n * 2.71) * 0.16;
        const width = model.width * jitter;
        if (t + width > SPAN - GAP[0]) break;
        out.push({
          model: mi,
          slot: {
            t: t + width / 2,
            x: side * FRONT_X,
            rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2, // fronts face the road
            scale: v.scale * jitter,
            stretchY: v.stretchY[0] + hash(n * 6.37) * (v.stretchY[1] - v.stretchY[0]),
          },
        });
        const plaza = hash(n * 8.91) < PLAZA_CHANCE;
        const [g0, g1] = plaza ? PLAZA : GAP;
        t += width + g0 + hash(n * 3.17) * (g1 - g0);
      }
    }
    return out;
  }

  /** distance: world.distance; lights: night factor 0..1 from DayNight. */
  update(distance: number, lights: number): void {
    this.night.value = lights;
    this.slots.forEach((slots, k) => {
      const mesh = this.meshes[k];
      slots.forEach((slot, i) => {
        const z = NEAR_Z - SPAN + ((slot.t + distance) % SPAN);
        const u = Math.min(1, Math.max(0, (z - RISE_FROM_Z) / (RISE_TO_Z - RISE_FROM_Z)));
        const rise = u * u * (3 - 2 * u);
        this.q.setFromAxisAngle(this.up, slot.rotY);
        this.s.set(slot.scale, slot.scale * slot.stretchY * Math.max(0.001, rise), slot.scale);
        this.m.compose(this.p.set(slot.x, 0, z), this.q, this.s);
        mesh.setMatrixAt(i, this.m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}

/** Index of the model whose cumulative weight passes r. */
function pick(models: Model[], r: number): number {
  let acc = 0;
  for (let i = 0; i < models.length - 1; i++) {
    acc += models[i].variant.weight;
    if (r < acc) return i;
  }
  return models.length - 1;
}

/** Deterministic 0..1 noise so the layout is the same every run. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
