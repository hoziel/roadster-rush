import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Code-built city blocks lining both sides of the road, on a looping strip like scenery.ts.
// One InstancedMesh per variant (4 draw calls, one shared material). Grey-box look until
// real models (e.g. a Kenney city kit) replace the variant builders below.
const SPAN = 220; // m of roadside that loops (treadmill)
const NEAR_Z = 20; // where a building leaves the screen behind the camera
const FRONT_X = 18; // m from the road centre to the shop fronts (behind cacti, poles, signs)
const RISE_FROM_Z = -165; // far end: buildings grow out of the haze here...
const RISE_TO_Z = -110; // ...and are full height here (keeps the Capitol vista clear)
const GAP: [number, number] = [1.5, 4]; // m between neighbours
const PLAZA_CHANCE = 0.16; // chance of a wide gap after a building, so landmarks show through
const PLAZA: [number, number] = [14, 22];

// Warm sunset Austin palette (walls take one per building).
const PALETTE = ['#d9734e', '#f2e3c6', '#3fa7a0', '#e0b03a', '#f08aa8', '#b49ad8', '#e8a77a', '#7cc3b0'];
const TRIM = '#f6ecd9';
const ROOF = '#5e4a5e';
const GLASS = '#6a80b4'; // window color by day
const DOOR = '#3a2a38';
const GLOW = '#ffc56e'; // window light at night
const LIT_MIN = 0.35; // dimmest per-building night glow

interface Variant { build: () => THREE.BufferGeometry; width: number; weight: number; stretchY: [number, number] }

const VARIANTS: Variant[] = [
  { build: buildShop, width: 10, weight: 0.34, stretchY: [1, 1] },
  { build: buildTwoStory, width: 12, weight: 0.3, stretchY: [0.95, 1.15] },
  { build: buildMidRise, width: 13, weight: 0.23, stretchY: [0.9, 1.25] },
  { build: buildTower, width: 12, weight: 0.13, stretchY: [0.9, 1.3] },
];

interface Slot { t: number; x: number; rotY: number; scale: number; stretchY: number }

export class Buildings {
  readonly group = new THREE.Group();
  private night = { value: 0 };
  private meshes: THREE.InstancedMesh[] = [];
  private slots: Slot[][] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor() {
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const glow = new THREE.Color(GLOW);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = this.night;
      shader.uniforms.uGlow = { value: glow };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 aCol; attribute float aTint; attribute float aGlow; attribute vec4 iCol;
          varying vec3 vBCol; varying float vBGlow;`)
        .replace('#include <color_vertex>', `#include <color_vertex>
          vBCol = mix(aCol, aCol * iCol.rgb, aTint);
          vBGlow = aGlow * iCol.a;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNight; uniform vec3 uGlow; varying vec3 vBCol; varying float vBGlow;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= vBCol;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += uGlow * vBGlow * uNight;`);
    };

    const layout = this.layout();
    const color = new THREE.Color();
    VARIANTS.forEach((v, vi) => {
      const slots = layout.filter((l) => l.variant === vi).map((l) => l.slot);
      this.slots.push(slots);
      if (slots.length === 0) return;
      const mesh = new THREE.InstancedMesh(v.build(), mat, slots.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      const icol = new Float32Array(slots.length * 4);
      slots.forEach((slot, i) => {
        color.set(PALETTE[Math.floor(hash(slot.t * 0.37 + slot.x) * PALETTE.length)]);
        icol.set([color.r, color.g, color.b, LIT_MIN + (1 - LIT_MIN) * hash(slot.t * 1.9 + slot.x * 0.3)], i * 4);
      });
      mesh.geometry.setAttribute('iCol', new THREE.InstancedBufferAttribute(icol, 4));
      this.meshes.push(mesh);
      this.group.add(mesh);
    });
  }

  /** Walk each side of the strip, dropping buildings with small gaps and the odd wide plaza. */
  private layout(): { variant: number; slot: Slot }[] {
    const out: { variant: number; slot: Slot }[] = [];
    for (const side of [-1, 1]) {
      let t = side < 0 ? 3 : 9; // stagger the two sides
      let n = side < 0 ? 0 : 100;
      for (;;) {
        n++;
        const r = hash(n * 4.13);
        let vi = 0;
        for (let acc = 0; vi < VARIANTS.length - 1; vi++) {
          acc += VARIANTS[vi].weight;
          if (r < acc) break;
        }
        const v = VARIANTS[vi];
        const scale = 0.9 + hash(n * 2.71) * 0.2;
        const width = v.width * scale;
        if (t + width > SPAN - GAP[0]) break;
        out.push({
          variant: vi,
          slot: {
            t: t + width / 2,
            x: side * FRONT_X,
            rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2, // fronts face the road
            scale,
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
    let k = 0;
    this.slots.forEach((slots) => {
      if (slots.length === 0) return;
      const mesh = this.meshes[k++];
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

// --- variant builders ---
// Local frame: frontage along x (centred), front face at z = 0 facing +z, depth towards -z, base at y = 0.

type Part = THREE.BufferGeometry;
const WALL = '#ffffff';

/** Tag a part with its base color, how much it takes the building's color, and night glow. */
function tag(g: THREE.BufferGeometry, col: string, tint: number, glow = 0): Part {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  geo.deleteAttribute('uv');
  const n = geo.attributes.position.count;
  const c = new THREE.Color(col);
  const cols = new Float32Array(n * 3), tints = new Float32Array(n), glows = new Float32Array(n);
  for (let i = 0; i < n; i++) { cols.set([c.r, c.g, c.b], i * 3); tints[i] = tint; glows[i] = glow; }
  geo.setAttribute('aCol', new THREE.BufferAttribute(cols, 3));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(glows, 1));
  return geo;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

/** Wall block with a parapet cap. */
function shell(w: number, h: number, d: number): Part[] {
  return [
    tag(box(w, h, d, 0, 0, -d / 2), WALL, 1),
    tag(box(w + 0.3, 0.45, d + 0.3, 0, h, -d / 2), TRIM, 0),
    tag(box(w - 0.6, 0.05, d - 0.6, 0, h + 0.45, -d / 2), ROOF, 0),
  ];
}

/** Window panes on the front and both end walls (ends face the oncoming camera on one side). */
function windows(w: number, d: number, rows: number[], frontCols: number, sideCols: number, ww: number, wh: number, seed: number): Part[] {
  const parts: Part[] = [];
  let k = 0;
  const lit = () => (hash(seed + k++ * 1.31) < 0.3 ? 0 : 0.55 + hash(seed + k * 2.7) * 0.45);
  for (const y of rows) {
    for (let i = 0; i < frontCols; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / frontCols;
      parts.push(tag(new THREE.PlaneGeometry(ww, wh).translate(x, y + wh / 2, 0.03), GLASS, 0, lit()));
    }
    for (const end of [-1, 1]) {
      for (let i = 0; i < sideCols; i++) {
        const z = -((i + 0.5) * d) / sideCols;
        const pane = new THREE.PlaneGeometry(ww, wh).rotateY(end * Math.PI / 2).translate(end * (w / 2 + 0.03), y + wh / 2, z);
        parts.push(tag(pane, GLASS, 0, lit()));
      }
    }
  }
  return parts;
}

/** Shop window band, door and a striped awning on the front. */
function storefront(w: number, stripeA: string, stripeB: string): Part[] {
  const parts: Part[] = [
    tag(new THREE.PlaneGeometry(w * 0.62, 2.1).translate(-w * 0.12, 0.6 + 1.05, 0.04), GLASS, 0, 1),
    tag(new THREE.PlaneGeometry(1.2, 2.4).translate(w * 0.34, 1.2, 0.04), DOOR, 0),
  ];
  const stripes = 6, sw = (w - 0.8) / stripes;
  for (let i = 0; i < stripes; i++) {
    const awning = new THREE.BoxGeometry(sw, 0.12, 1.5).rotateX(0.38).translate(-w / 2 + 0.4 + (i + 0.5) * sw, 3.15, 0.7);
    parts.push(tag(awning, i % 2 ? stripeA : stripeB, 0));
  }
  return parts;
}

function merge(parts: Part[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}

function buildShop(): THREE.BufferGeometry {
  const w = 10, h = 5, d = 8;
  return merge([
    ...shell(w, h, d),
    tag(box(w * 0.7, 1.1, 0.25, 0, h - 1.25, 0.12), TRIM, 0), // sign band
    ...storefront(w, '#ff6f91', '#fff3e0'),
    ...windows(w, d, [1.2], 0, 2, 1.4, 1.6, 11),
  ]);
}

function buildTwoStory(): THREE.BufferGeometry {
  const w = 12, h = 8, d = 10;
  return merge([
    ...shell(w, h, d),
    tag(box(w + 0.1, 0.3, 0.3, 0, 3.9, 0), TRIM, 0), // floor band
    ...storefront(w, '#2fb5a8', '#fff3e0'),
    ...windows(w, d, [4.8], 4, 3, 1.5, 1.9, 23),
    ...windows(w, d, [1.2], 0, 3, 1.5, 1.7, 29),
  ]);
}

function buildMidRise(): THREE.BufferGeometry {
  const w = 13, h = 14, d = 12;
  return merge([
    ...shell(w, h, d),
    ...storefront(w, '#e0b03a', '#7a3060'),
    ...windows(w, d, [4.6, 7.6, 10.6], 4, 4, 1.6, 1.9, 37),
    ...windows(w, d, [1.2], 0, 4, 1.6, 1.7, 41),
    tag(box(2.4, 1.4, 2.4, -2.5, h + 0.45, -d / 2 - 1), '#b8b0b8', 0), // AC unit
    tag(new THREE.CylinderGeometry(1, 1, 2.2, 8).translate(3, h + 1.6, -d / 2), '#8a6a50', 0), // water tank
    tag(new THREE.CylinderGeometry(1.15, 0.2, 0.7, 8).translate(3, h + 3.05, -d / 2), '#6a4a3a', 0),
  ]);
}

function buildTower(): THREE.BufferGeometry {
  const w = 12, h = 22, d = 12;
  const rows = [4.4, 7.2, 10, 12.8, 15.6, 18.4];
  return merge([
    ...shell(w, h, d),
    ...storefront(w, '#b49ad8', '#fff3e0'),
    ...windows(w, d, rows, 4, 4, 1.7, 1.9, 53),
    ...windows(w, d, [1.2], 0, 4, 1.7, 1.7, 59),
    tag(box(8, 4, 8, 0, h + 0.45, -d / 2), WALL, 1), // setback crown
    tag(box(8.3, 0.4, 8.3, 0, h + 4.45, -d / 2), TRIM, 0),
    ...windows(8, 8, [h + 1.5], 3, 0, 1.3, 1.6, 61).map((g) => g.translate(0, 0, 4 - d / 2)), // crown front face
    tag(new THREE.CylinderGeometry(0.12, 0.18, 4, 6).translate(0, h + 6.85, -d / 2), ROOF, 0), // mast
  ]);
}

/** Deterministic 0..1 noise so the layout is the same every run. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
