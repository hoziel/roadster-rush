import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DECK_HEIGHT, FLATBED_LENGTH, LANE_WIDTH, OVERHEAD_BOTTOM, OVERHEAD_TOP, RAMP_LENGTH, TRAILER_LENGTH } from '../sim/config';
import { laneX, type Entity, type World } from '../sim/world';

// The high road (src/sim kinds trailer, flatbed) and overhead beams (overhead). All code-built, vertex-coloured
// and instanced: one draw call per model (trailer, flatbed, beam frame, beam board), however many are in view.
// Sizes come from src/sim/config.ts so what you see is what you ride: the deck top is DECK_HEIGHT and the ramp
// rises over RAMP_LENGTH at the trailer's back (the end facing the camera).

const POOL = 12; // per deck model: a train chunk has at most five pieces
const BEAMS = 16; // beam instances (one per lane crossed)
const VIEW_FAR = -230, VIEW_NEAR = 40; // z window worth drawing (trailers are long: keep them past the camera a bit)
const WIDTH = 2.3; // m across (lanes are 2.5)
const SLAB = 0.3; // deck thickness

export class HighroadView {
  readonly group = new THREE.Group();
  private trailers: THREE.InstancedMesh;
  private flatbeds: THREE.InstancedMesh;
  private beams: THREE.InstancedMesh;
  private boards: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.trailers = instanced(deckGeometry(TRAILER_LENGTH, true), mat, POOL);
    this.flatbeds = instanced(deckGeometry(FLATBED_LENGTH, false), mat, POOL);
    this.beams = instanced(beamGeometry(), mat, BEAMS);
    const board = new THREE.PlaneGeometry(LANE_WIDTH - 0.1, OVERHEAD_TOP - BEAM_TOP).translate(0, (OVERHEAD_TOP + BEAM_TOP) / 2, 0.14);
    this.boards = instanced(board, new THREE.MeshLambertMaterial({ map: boardTexture(), side: THREE.DoubleSide }), BEAMS);
    this.group.add(this.trailers, this.flatbeds, this.beams, this.boards);
  }

  update(w: World, visible: boolean): void {
    this.group.visible = visible;
    let nt = 0, nf = 0, nb = 0;
    for (const e of w.entities) {
      if (!e.alive || (e.kind !== 'trailer' && e.kind !== 'flatbed' && e.kind !== 'overhead')) continue;
      const z = -(e.s - w.distance);
      if (z < VIEW_FAR || z > VIEW_NEAR) continue;
      const d = this.pose(w, e, laneX(e.lane), z);
      if (e.kind === 'trailer') { if (nt < POOL) this.trailers.setMatrixAt(nt++, d.matrix); }
      else if (e.kind === 'flatbed') { if (nf < POOL) this.flatbeds.setMatrixAt(nf++, d.matrix); }
      else if (nb < BEAMS) { this.beams.setMatrixAt(nb, d.matrix); this.boards.setMatrixAt(nb++, d.matrix); }
    }
    this.trailers.count = nt;
    this.flatbeds.count = nf;
    this.beams.count = nb;
    this.boards.count = nb;
    for (const m of [this.trailers, this.flatbeds, this.beams, this.boards]) m.instanceMatrix.needsUpdate = true;
  }

  /** Place the dummy at (x, 0, z), with the shield "boing" if it was knocked (as traffic and road work). */
  private pose(w: World, e: Entity, x: number, z: number): THREE.Object3D {
    let y = 0, rz = 0, ry = 0, sy = 1, sxz = 1;
    if (e.bumped !== undefined) {
      const t = w.time - e.bumped;
      const dir = Math.sign(x - w.x) || ((e.variant ?? 0) % 2 ? 1 : -1);
      if (t < 0.14) { const k = Math.sin((t / 0.14) * Math.PI); sy = 1 - 0.3 * k; sxz = 1 + 0.1 * k; }
      const air = Math.max(0, t - 0.08);
      y = Math.max(0, 6 * air - 12 * air * air);
      x += dir * Math.min(9, 10 * air);
      ry = dir * Math.min(air, 0.6) * 3;
      rz = -dir * Math.sin((Math.min(air, 0.58) / 0.58) * Math.PI) * 0.4;
    }
    const d = this.dummy;
    d.position.set(x, y, z);
    d.rotation.set(0, ry, rz);
    d.scale.set(sxz, sy, sxz);
    d.updateMatrix();
    return d;
  }
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, max: number): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

/** One coloured part for a merged vertex-coloured model. */
function part(g: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const geo = (g.index ? g.toNonIndexed() : g).translate(x, y, z);
  geo.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

const STEEL = '#46566e', DARK = '#23232b', TYRE = '#18181d', HUB = '#9aa3b2', WOOD_A = '#a77b4f', WOOD_B = '#8f6640';
const YELLOW = '#ffd23f', RED = '#e8344e', WHITE = '#f4ede0';

/**
 * A parked trailer (with its loading ramp at the back, +z) or a flatbed, `len` m bumper to back, centred on z = 0:
 * a plank deck on a steel frame, tandem wheels at the back of the deck, landing legs at the front, red and white
 * reflective tape down the sides, and a yellow and black striped ramp.
 */
function deckGeometry(len: number, ramp: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  const back = len / 2, front = -len / 2;
  const deckBack = ramp ? back - RAMP_LENGTH : back; // where the flat deck ends (the ramp takes over)
  const deckLen = deckBack - front, deckZ = (deckBack + front) / 2;
  const top = DECK_HEIGHT;
  p.push(part(new THREE.BoxGeometry(WIDTH, SLAB - 0.04, deckLen), STEEL, 0, top - SLAB / 2 - 0.02, deckZ));
  // Planks across the deck, alternating shades.
  const planks = Math.round(deckLen / 0.9);
  for (let i = 0; i < planks; i++) {
    const pz = front + (i + 0.5) * (deckLen / planks);
    p.push(part(new THREE.BoxGeometry(WIDTH - 0.16, 0.04, deckLen / planks - 0.03), i % 2 ? WOOD_A : WOOD_B, 0, top - 0.02, pz));
  }
  // Reflective tape along both sides and across the front (and the back of a flatbed).
  const tape = Math.round(deckLen / 1.1);
  for (const s of [-1, 1]) for (let i = 0; i < tape; i++) {
    p.push(part(new THREE.BoxGeometry(0.03, 0.12, deckLen / tape), i % 2 ? RED : WHITE, s * (WIDTH / 2 + 0.015), top - 0.17, front + (i + 0.5) * (deckLen / tape)));
  }
  for (const end of ramp ? [front] : [front, back]) for (let i = 0; i < 6; i++) {
    p.push(part(new THREE.BoxGeometry(WIDTH / 6, 0.12, 0.03), i % 2 ? RED : WHITE, -WIDTH / 2 + (i + 0.5) * (WIDTH / 6), top - 0.17, end + Math.sign(end) * 0.015));
  }
  if (!ramp) for (const s of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.3, 0.14, 0.04), '#ff2a3a', s * 0.8, top - 0.42, back + 0.03)); // tail lights
  // Frame rails under the deck.
  for (const s of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.22, 0.42, deckLen - 0.4), DARK, s * 0.62, top - SLAB - 0.21, deckZ));
  // Tandem wheels near the back of the deck, landing legs near the front.
  const wheel = new THREE.CylinderGeometry(0.52, 0.52, 0.36, 16).rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.24, 0.24, 0.38, 10).rotateZ(Math.PI / 2);
  for (const wz of [deckBack - 2.0, deckBack - 3.2]) for (const s of [-1, 1]) {
    p.push(part(wheel.clone(), TYRE, s * 0.92, 0.52, wz));
    p.push(part(hub.clone(), HUB, s * 0.92, 0.52, wz));
  }
  p.push(part(new THREE.BoxGeometry(WIDTH - 0.3, 0.16, 2.8), DARK, 0, top - SLAB - 0.5, deckBack - 2.6)); // axle frame
  for (const s of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(0.14, top - SLAB - 0.1, 0.14), '#5f6672', s * 0.7, (top - SLAB) / 2, front + 1.6));
    p.push(part(new THREE.BoxGeometry(0.4, 0.08, 0.4), DARK, s * 0.7, 0.04, front + 1.6));
  }
  if (ramp) {
    // The ramp: a striped slab from the road up to the deck, on two side plates.
    const theta = Math.atan2(top, RAMP_LENGTH), slope = Math.hypot(top, RAMP_LENGTH);
    const seg = 10;
    for (let i = 0; i < seg; i++) {
      const dd = (i + 0.5) * (slope / seg);
      const g = new THREE.BoxGeometry(WIDTH - 0.1, 0.1, slope / seg).rotateX(theta);
      p.push(part(g, i % 2 ? YELLOW : DARK, 0, dd * Math.sin(theta) - 0.05 * Math.cos(theta), back - dd * Math.cos(theta)));
    }
    const shape = new THREE.Shape();
    shape.moveTo(back, 0); shape.lineTo(deckBack, 0); shape.lineTo(deckBack, top - 0.06); shape.closePath();
    for (const s of [-1, 1]) {
      const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }).rotateY(-Math.PI / 2);
      p.push(part(plate, STEEL, s * (WIDTH / 2 - 0.05) + 0.04, 0, 0));
    }
  }
  const g = mergeGeometries(p);
  g.computeVertexNormals();
  return g;
}

const BEAM_TOP = OVERHEAD_BOTTOM + 0.4; // the striped beam; the LOW board sits on it up to OVERHEAD_TOP

/** One lane's span of an overhead barrier: two posts and a red and white striped beam, OVERHEAD_BOTTOM up. */
function beamGeometry(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  const half = LANE_WIDTH / 2;
  for (const s of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(0.16, OVERHEAD_TOP + 0.1, 0.16), '#c9ced8', s * (half - 0.08), (OVERHEAD_TOP + 0.1) / 2, 0));
    p.push(part(new THREE.BoxGeometry(0.4, 0.1, 0.4), DARK, s * (half - 0.08), 0.05, 0));
  }
  const n = 6;
  for (let i = 0; i < n; i++) {
    p.push(part(new THREE.BoxGeometry(LANE_WIDTH / n, BEAM_TOP - OVERHEAD_BOTTOM, 0.24), i % 2 ? WHITE : RED,
      -half + (i + 0.5) * (LANE_WIDTH / n), (OVERHEAD_BOTTOM + BEAM_TOP) / 2, 0));
  }
  p.push(part(new THREE.BoxGeometry(LANE_WIDTH, OVERHEAD_TOP - BEAM_TOP, 0.2), '#1e1a16', 0, (OVERHEAD_TOP + BEAM_TOP) / 2, 0));
  const g = mergeGeometries(p);
  g.computeVertexNormals();
  return g;
}

/** The board over the beam: yellow, with big "duck" chevrons pointing down. */
function boardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1a16';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = YELLOW;
  g.fillRect(8, 8, 240, 112);
  g.fillStyle = '#1e1a16';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('LOW', 128, 46);
  for (const x of [40, 216]) chevron(g, x, 64);
  chevron(g, 128, 96, 0.7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chevron(g: CanvasRenderingContext2D, x: number, y: number, k = 1): void {
  g.beginPath();
  g.moveTo(x - 24 * k, y - 18 * k); g.lineTo(x, y + 8 * k); g.lineTo(x + 24 * k, y - 18 * k);
  g.lineTo(x + 24 * k, y - 2 * k); g.lineTo(x, y + 24 * k); g.lineTo(x - 24 * k, y - 2 * k);
  g.closePath();
  g.fill();
}
