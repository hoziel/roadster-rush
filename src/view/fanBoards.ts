import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FanTheme } from './fanThemes';

// Ad billboards for the driver's favourite things (Spurs and karate for Nevo, volleyball and gymnastics for Ori),
// standing along the roadside every so often, alternating sides. A few boards are recycled ahead of the car;
// each shows the next ad in the driver's set. Nothing shows for drivers without ads.

const BOARDS = 4;
const GAP = [65, 115]; // m between boards (often: the driver's favourites all along the road)
const FIRST = 90; // m into a run before the first
const X = 8.4; // m from the road centre: over the sidewalk, close enough to read
const W = 8.4, H = 4.2, POST = 3.4; // panel size and height of its bottom edge (m)
const CANVAS_W = 768, CANVAS_H = 384;

interface Board { group: THREE.Group; mat: THREE.MeshBasicMaterial; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; s: number; side: number }

export class FanBoards {
  readonly group = new THREE.Group();
  private boards: Board[] = [];
  /** Each board's group (the sideline players stand under them). */
  get anchors(): THREE.Group[] { return this.boards.map((b) => b.group); }
  private ads: FanTheme['ads'] = [];
  private nextAd = 0;
  private nextS = FIRST;
  private lastDistance = 0;

  constructor() {
    const frameGeo = mergeGeometries([
      new THREE.BoxGeometry(W + 0.3, H + 0.3, 0.16).translate(0, POST + H / 2, -0.06),
      new THREE.BoxGeometry(0.22, POST, 0.22).translate(-W * 0.3, POST / 2, -0.2),
      new THREE.BoxGeometry(0.22, POST, 0.22).translate(W * 0.3, POST / 2, -0.2),
    ])!;
    const frameMat = new THREE.MeshLambertMaterial({ color: '#3a2d4a' });
    const panelGeo = new THREE.PlaneGeometry(W, H).translate(0, POST + H / 2, 0.03);
    for (let i = 0; i < BOARDS; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W; canvas.height = CANVAS_H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(frameGeo, frameMat), new THREE.Mesh(panelGeo, mat));
      group.visible = false;
      this.group.add(group);
      this.boards.push({ group, mat, canvas, tex, s: -1, side: i % 2 ? -1 : 1 });
    }
  }

  /** The driver's ads (none: no boards). Redraws the boards already standing. */
  setTheme(ads: FanTheme['ads']): void {
    this.ads = ads;
    this.nextAd = 0;
    for (const b of this.boards) if (b.s >= 0) this.paint(b);
  }

  /** Redraw after the web font loads. */
  refresh(): void { for (const b of this.boards) if (b.s >= 0) this.paint(b); }

  update(distance: number, visible: boolean): void {
    if (distance < this.lastDistance) { // a new run
      this.nextS = FIRST;
      for (const b of this.boards) { b.s = -1; b.group.visible = false; }
    }
    this.lastDistance = distance;
    this.group.visible = visible && this.ads.length > 0;
    if (!this.group.visible) return;
    for (const b of this.boards) {
      if (b.s < 0 || distance - b.s > 40) {
        // Recycle behind the camera: next spot ahead, other side, next ad.
        if (this.nextS > distance + 260) { b.group.visible = false; b.s = -1; continue; }
        b.s = this.nextS;
        this.nextS += GAP[0] + Math.random() * (GAP[1] - GAP[0]);
        b.side = -b.side;
        this.paint(b);
      }
      const z = -(b.s - distance);
      b.group.position.set(b.side * X, 0, z);
      b.group.rotation.y = b.side * -0.45; // turned toward the oncoming car
      b.group.visible = true;
    }
  }

  private paint(b: Board): void {
    if (!this.ads.length) return;
    const g = b.canvas.getContext('2d')!;
    g.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.ads[this.nextAd++ % this.ads.length](g, CANVAS_W, CANVAS_H);
    b.tex.needsUpdate = true;
  }
}
