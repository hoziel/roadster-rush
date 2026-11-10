import * as THREE from 'three';
import type { FanTheme } from './fanThemes';
import { hoop, net } from './startline';

// Fan spots along the road: every few hundred metres, on the sidewalk, the driver's favourite sport is being
// played (Nevo: a hoop with players shooting and dribbling and karate kids; Ori: a volleyball net with a
// rally and a cartwheeling gymnast) next to a cheer sign with the driver's name. The players themselves are
// drawn by Sideline, anchored to each spot's prop.

const SPOTS = 2; // recycled
const GAP: [number, number] = [280, 420]; // m between spots
const FIRST = 260; // m into a run before the first (the start line has its own)
const X = 7.6; // m from the road centre: on the sidewalk, right by the road
const AHEAD = 230;

interface Spot { group: THREE.Group; hoop: THREE.Group; net: THREE.Group; sign: THREE.Mesh; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; s: number; side: number }

export class FanSpots {
  readonly group = new THREE.Group();
  private spots: Spot[] = [];
  private theme: FanTheme | null = null;
  private name = '';
  private nextS = FIRST;
  private lastDistance = 0;
  private signIdx = 0;

  constructor() {
    const postMat = new THREE.MeshLambertMaterial({ color: '#3a2d4a' });
    for (let i = 0; i < SPOTS; i++) {
      const group = new THREE.Group();
      const h = hoop(), n = net();
      // Each prop stands in the spot's space the way it does at the start line (facing +z, the road side).
      for (const p of [h, n]) { p.position.set(0, 0, 0); p.rotation.y = 0; group.add(p); }
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(4.2, 2.6, 1.5);
      sign.rotation.y = -0.35;
      const posts = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12).translate(0, 1, 0), postMat);
      posts.position.set(4.2, 0, 1.45);
      group.add(sign, posts);
      group.visible = false;
      this.group.add(group);
      this.spots.push({ group, hoop: h, net: n, sign, canvas, tex, s: -1, side: i % 2 ? 1 : -1 });
    }
  }

  /** Each spot's anchors for the sideline players (the hoop or the net: whichever this driver has). */
  anchors(): THREE.Group[] { return this.spots.map((sp) => (this.theme?.prop === 'net' ? sp.net : sp.hoop)); }

  setTheme(theme: FanTheme, name: string): void {
    this.theme = theme;
    this.name = name;
    for (const sp of this.spots) {
      sp.hoop.visible = theme.prop === 'hoop';
      sp.net.visible = theme.prop === 'net';
      this.paint(sp);
    }
  }

  update(distance: number, visible: boolean): void {
    if (distance < this.lastDistance) { this.nextS = FIRST; for (const sp of this.spots) { sp.s = -1; sp.group.visible = false; } }
    this.lastDistance = distance;
    this.group.visible = visible && !!this.theme?.prop;
    if (!this.group.visible) return;
    for (const sp of this.spots) {
      if (sp.s < 0 || distance - sp.s > 45) {
        if (this.nextS > distance + AHEAD) { sp.group.visible = false; sp.s = -1; continue; }
        sp.s = this.nextS;
        this.nextS += GAP[0] + Math.random() * (GAP[1] - GAP[0]);
        sp.side = -sp.side;
        this.paint(sp);
      }
      sp.group.position.set(sp.side * X, 0, -(sp.s - distance));
      sp.group.rotation.y = sp.side * -0.55; // facing the oncoming car, turned a little toward the road
      sp.group.visible = true;
    }
  }

  /** The cheer sign: the next of the driver's sign lines, in their colours. */
  private paint(sp: Spot): void {
    const t = this.theme;
    if (!t) return;
    const k = this.signIdx++ % 4;
    const text = t.signs((this.name || 'Austin').toUpperCase())[k];
    const g = sp.canvas.getContext('2d')!;
    g.fillStyle = t.signBgs[k]; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = t.signInks[k]; g.lineWidth = 16; g.strokeRect(8, 8, 496, 240);
    g.fillStyle = t.signInks[k]; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 120;
    g.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
    while (g.measureText(text).width > 460 && size > 30) { size -= 6; g.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`; }
    g.fillText(text, 256, 134);
    sp.tex.needsUpdate = true;
  }
}
