import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FanTheme } from './fanThemes';

// Big ad billboards for the driver's favourite things (Spurs and karate for Nevo, volleyball and gymnastics for
// Ori), standing along the roadside every so often, alternating sides, in place of the street trees there.
// Each has a chasing ring of marquee bulbs and a die-cut figure bursting out of its top (a dunk, a spike).
// A few boards are recycled ahead of the car; each shows the next ad and cut-out in the driver's set.
// Nothing shows for drivers without ads.
//
// Draw calls: 1 per board (frame, posts, ad and cut-out are one mesh painted from one canvas: the ad on top,
// the cut-out below it, a patch of frame colour beside that) plus 1 for every bulb.

const BOARDS = 3;
const GAP = [110, 170]; // m between boards
const FIRST = 90; // m into a run before the first
const X = 9.4; // m from the road centre: just past the sidewalk
const W = 12, H = 6, POST = 4.2; // panel size and height of its bottom edge (m)
const CUT_W = 5.2, CUT_H = CUT_W * 4 / 3; // die-cut figure (m), from a 3:4 canvas
const BULB_STEP = 0.8; // m between marquee bulbs
// Street trees kept clear: from a little behind a board to well in front of it, since seen from down the road
// the trees in front of a board (nearer the car) are the ones in the line of sight.
const CLEAR_BEHIND = 12, CLEAR_FRONT = 50; // m
const FRAME = '#ff3d8b';

// The canvas: ad 768x384 on top; below it the 384x512 cut-out on the left, frame colour on the right.
const AD_W = 768, AD_H = 384, CUT_PX_W = 384, CUT_PX_H = 512;
const CANVAS_W = AD_W, CANVAS_H = AD_H + CUT_PX_H;

interface Board { group: THREE.Group; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; s: number; side: number }

/** Map a geometry's 0..1 UVs into the canvas rectangle (x, y, w, h) in pixels (y down). */
function uvInto(geo: THREE.BufferGeometry, x: number, y: number, w: number, h: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (x + uv.getX(i) * w) / CANVAS_W, 1 - (y + (1 - uv.getY(i)) * h) / CANVAS_H);
  }
  return geo;
}

export class FanBoards {
  readonly group = new THREE.Group();
  private boards: Board[] = [];
  /** Each board's group (the sideline players stand under them). */
  get anchors(): THREE.Group[] { return this.boards.map((b) => b.group); }
  private ads: FanTheme['ads'] = [];
  private cutouts: FanTheme['cutouts'] = [];
  private nextAd = 0;
  private nextS = FIRST;
  private lastDistance = 0;
  private bulbs: THREE.InstancedMesh;
  private bulbSpots: THREE.Vector3[] = []; // in a board's space
  private bulbOn = new THREE.Color('#fff4c2');
  private bulbOff = new THREE.Color('#8a3a50');
  private m = new THREE.Matrix4();

  constructor() {
    // Frame and posts all take the frame-colour patch of the canvas.
    const solid = (g: THREE.BufferGeometry) => uvInto(g, CUT_PX_W + 40, AD_H + 40, 8, 8);
    const geo = mergeGeometries([
      solid(new THREE.BoxGeometry(W + 0.8, H + 0.8, 0.26).translate(0, POST + H / 2, -0.12)),
      solid(new THREE.BoxGeometry(0.34, POST, 0.34).translate(-W * 0.3, POST / 2, -0.25)),
      solid(new THREE.BoxGeometry(0.34, POST, 0.34).translate(W * 0.3, POST / 2, -0.25)),
      uvInto(new THREE.PlaneGeometry(W, H), 0, 0, AD_W, AD_H).translate(0, POST + H / 2, 0.03),
      // The cut-out stands on the board's lower left, its top half bursting out above the frame.
      uvInto(new THREE.PlaneGeometry(CUT_W, CUT_H), 0, AD_H, CUT_PX_W, CUT_PX_H)
        .translate(-W / 2 + CUT_W * 0.4, POST + H * 0.3 + CUT_H / 2, 0.5),
    ].map((g) => g.toNonIndexed()))!;
    for (let i = 0; i < BOARDS; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W; canvas.height = CANVAS_H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geo, mat));
      group.visible = false;
      this.group.add(group);
      this.boards.push({ group, canvas, tex, s: -1, side: i % 2 ? -1 : 1 });
    }
    // Marquee bulbs round the frame.
    for (let x = -W / 2 - 0.2; x <= W / 2 + 0.2 + 1e-6; x += BULB_STEP) {
      this.bulbSpots.push(new THREE.Vector3(x, POST + H + 0.2, 0.08), new THREE.Vector3(x, POST - 0.2, 0.08));
    }
    for (let y = POST - 0.2 + BULB_STEP; y < POST + H + 0.2 - 1e-6; y += BULB_STEP) {
      this.bulbSpots.push(new THREE.Vector3(-W / 2 - 0.2, y, 0.08), new THREE.Vector3(W / 2 + 0.2, y, 0.08));
    }
    this.bulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), this.bulbSpots.length * BOARDS,
    );
    this.bulbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bulbs.frustumCulled = false;
    for (let i = 0; i < this.bulbs.count; i++) this.bulbs.setColorAt(i, this.bulbOn);
    this.group.add(this.bulbs);
  }

  /** The driver's ads and cut-outs (no ads: no boards). Redraws the boards already standing. */
  setTheme(ads: FanTheme['ads'], cutouts: FanTheme['cutouts'] = []): void {
    this.ads = ads;
    this.cutouts = cutouts;
    this.nextAd = 0;
    for (const b of this.boards) if (b.s >= 0) this.paint(b);
  }

  /** Redraw after the web font loads. */
  refresh(): void { for (const b of this.boards) if (b.s >= 0) this.paint(b); }

  /** Is (x, z) (scene space) beside a standing board, where a street tree would hide it? */
  covers(x: number, z: number): boolean {
    if (!this.group.visible) return false;
    for (const b of this.boards) {
      if (b.s < 0 || x * b.side <= 0) continue;
      const dz = z - b.group.position.z; // + = nearer the car
      if (dz > -CLEAR_BEHIND && dz < CLEAR_FRONT) return true;
    }
    return false;
  }

  update(distance: number, visible: boolean, time = 0): void {
    if (distance < this.lastDistance) { // a new run
      this.nextS = FIRST;
      for (const b of this.boards) { b.s = -1; b.group.visible = false; }
    }
    this.lastDistance = distance;
    this.group.visible = visible && this.ads.length > 0;
    if (!this.group.visible) return;
    let n = 0;
    for (const b of this.boards) {
      if (b.s < 0 || distance - b.s > 40) {
        // Recycle behind the camera: next spot ahead, other side, next ad.
        if (this.nextS > distance + 260) { b.group.visible = false; b.s = -1; continue; }
        b.s = this.nextS;
        this.nextS += GAP[0] + Math.random() * (GAP[1] - GAP[0]);
        b.side = -b.side;
        this.paint(b);
      }
      b.group.position.set(b.side * X, 0, -(b.s - distance));
      b.group.rotation.y = b.side * -0.45; // turned toward the oncoming car
      b.group.visible = true;
      // Marquee bulbs: a chase of lit bulbs running round the board.
      b.group.updateMatrix();
      this.bulbSpots.forEach((p, i) => {
        this.m.makeTranslation(p.x, p.y, p.z).premultiply(b.group.matrix);
        this.bulbs.setMatrixAt(n, this.m);
        this.bulbs.setColorAt(n++, (i + Math.floor(time * 8)) % 3 === 0 ? this.bulbOff : this.bulbOn);
      });
    }
    this.bulbs.count = n;
    this.bulbs.instanceMatrix.needsUpdate = true;
    if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
  }

  private paint(b: Board): void {
    if (!this.ads.length) return;
    const g = b.canvas.getContext('2d')!;
    g.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const k = this.nextAd++;
    this.ads[k % this.ads.length](g, AD_W, AD_H);
    g.fillStyle = FRAME;
    g.fillRect(CUT_PX_W, AD_H, CANVAS_W - CUT_PX_W, CUT_PX_H);
    if (this.cutouts.length) {
      g.save();
      g.translate(0, AD_H);
      g.beginPath(); g.rect(0, 0, CUT_PX_W, CUT_PX_H); g.clip();
      this.cutouts[k % this.cutouts.length](g, CUT_PX_W, CUT_PX_H);
      g.restore();
    }
    b.tex.needsUpdate = true;
  }
}
