import * as THREE from 'three';
import type { FanTheme } from './fanThemes';
import type { PlayerSpec } from './sideline';
import { hoop, net } from './startline';

// Fan spots along the road: every few hundred metres, on the sidewalk, the driver's favourite sport is being
// played (Nevo: a hoop with players shooting and dribbling and karate kids; Ori: a volleyball net with a
// rally and a cartwheeling gymnast) next to a cheer sign with the driver's name. The players themselves are
// drawn by Sideline, anchored to each spot's prop.

const SPOTS = 2; // recycled (two in view at most: keeps the draw calls in budget)
const GAP: [number, number] = [120, 190]; // m between spots: one every few seconds, all run long
const FIRST = 110; // m into a run before the first (the start line has its own)
const X = 6.4; // m from the road centre: the prop on the sidewalk by the kerb, in clear view from the chase camera
const TURN = 0.3; // rad the spot is turned toward the oncoming car
export const SPOT_SCALE = 1.3; // props, sign and players a bit bigger than life, to read from the car
const KERB = 5.1; // m: no player stands closer to the road centre than this (the road edge is 4.5)
const AHEAD = 230;

interface Spot { group: THREE.Group; hoop: THREE.Group; net: THREE.Group; sign: THREE.Mesh; posts: THREE.Mesh; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; s: number; side: number }

export class FanSpots {
  readonly group = new THREE.Group();
  private spots: Spot[] = [];
  private theme: FanTheme | null = null;
  private name = '';
  private nextS = FIRST;
  private lastDistance = 0;
  private signIdx = 0;
  private nextSide = 1;
  private players: PlayerSpec[][] = []; // each spot's players, re-laid (mirrored) when the spot changes side

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
      this.spots.push({ group, hoop: h, net: n, sign, posts, canvas, tex, s: -1, side: i % 2 ? 1 : -1 });
      this.players.push([]);
    }
  }

  /** Each spot's anchors for the sideline players (the hoop or the net: whichever this driver has). */
  anchors(): THREE.Group[] { return this.spots.map((sp) => (this.theme?.prop === 'net' ? sp.net : sp.hoop)); }

  /** Each spot's players (arrays kept and refilled in place, so the sideline always reads the current side). */
  playerLists(): PlayerSpec[][] { return this.players; }

  /** Lay a spot's players mostly on the side of its prop away from the road (local +x points away on the right, toward it on the left). */
  private layPlayers(i: number): void {
    const list = this.players[i], side = this.spots[i].side;
    list.length = 0;
    const base = this.theme?.startPlayers ?? [];
    // Mirror the whole group (pairs stay paired) when most of it would stand on the road side.
    const flip = Math.sign(base.reduce((a, p) => a + p.x, 0)) === -side;
    const laid = base.map((p) => (flip ? { ...p, x: -p.x, yaw: -p.yaw, target: p.target && ([-p.target[0], p.target[1], p.target[2]] as [number, number, number]) } : { ...p }));
    // Then slide the group away from the road until every player is on the sidewalk.
    const th = side * -TURN, c = Math.cos(th), sn = Math.sin(th);
    const k = SPOT_SCALE;
    const short = Math.max(0, ...laid.map((p) => KERB - X - side * k * (p.x * c + p.z * sn))) / k;
    for (const p of laid) {
      p.x += (side * short) / c;
      if (p.target && p.activity !== 'shoot') p.target = [p.target[0] + (side * short) / c, p.target[1], p.target[2]];
      list.push(p);
    }
  }

  setTheme(theme: FanTheme, name: string): void {
    this.theme = theme;
    this.name = name;
    this.spots.forEach((sp, i) => {
      sp.hoop.visible = theme.prop === 'hoop';
      sp.net.visible = theme.prop === 'net';
      this.paint(sp);
      this.layPlayers(i);
    });
  }

  update(distance: number, visible: boolean): void {
    if (distance < this.lastDistance) { this.nextS = FIRST; for (const sp of this.spots) { sp.s = -1; sp.group.visible = false; } }
    this.lastDistance = distance;
    this.group.visible = visible && !!this.theme?.prop;
    if (!this.group.visible) return;
    this.spots.forEach((sp, i) => {
      if (sp.s < 0 || distance - sp.s > 45) {
        if (this.nextS > distance + AHEAD) { sp.group.visible = false; sp.s = -1; return; }
        sp.s = this.nextS;
        this.nextS += GAP[0] + Math.random() * (GAP[1] - GAP[0]);
        sp.side = this.nextSide; this.nextSide = -this.nextSide; // alternate sides along the road
        // The cheer sign stands on the far side of the prop, away from the road.
        sp.sign.position.x = sp.side * 4.2; sp.sign.rotation.y = sp.side * -0.35; sp.posts.position.x = sp.side * 4.2;
        this.paint(sp);
        this.layPlayers(i);
      }
      sp.group.position.set(sp.side * X, 0, -(sp.s - distance));
      sp.group.scale.setScalar(SPOT_SCALE);
      sp.group.rotation.y = sp.side * -TURN; // facing the oncoming car, turned a little toward the road
      sp.group.visible = true;
    });
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
