import * as THREE from 'three';
import { TUNNEL_LENGTH, TUNNEL_RADIUS, TUNNEL_SLOTS } from '../sim/config';
import type { World } from '../sim/world';

/** Height of the tube's axis: its floor sits just above the road so the road never shows through. */
export const TUBE_CY = TUNNEL_RADIUS + 0.03;
const BLEND = 7; // m at each end where the car and camera ease between the flat road and the wall
const BAND = 8; // m between ring lights
const SEGMENTS = 40; // around the ring
const FAR_Z = -230; // hide the tube until its mouth is this close (beyond fog)
const NEAR_Z = 20; // and once its end is behind the camera
const RIM_COLOR = '#ff4fd8';
const FACADE_COLOR = '#d6bf94';

const smooth = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** 0 on the road, 1 inside the tube: eases in over the first metres and out over the last. */
export function tubeBlend(w: World): number {
  if (w.tunnelAt < 0) return 0;
  const d = w.distance;
  if (d < w.tunnelAt || d > w.tunnelEnd) return 0;
  return smooth((d - w.tunnelAt) / BLEND) * smooth((w.tunnelEnd - d) / BLEND);
}

/**
 * Round tube tunnel: an open cylinder (stripes and ring lights inside), a neon rim at both mouths and a
 * limestone portal facade at the entry. 3 draw calls, only drawn while a tunnel is near.
 */
export class TunnelView {
  readonly group = new THREE.Group();
  private tube: THREE.Mesh;
  private tubeMat: THREE.MeshLambertMaterial;
  private rims: THREE.InstancedMesh;
  private rimMat: THREE.MeshLambertMaterial;
  private facade: THREE.Mesh;
  private m = new THREE.Matrix4();

  constructor() {
    const { map, glow } = tubeTextures();
    this.tubeMat = new THREE.MeshLambertMaterial({
      map, emissiveMap: glow, emissive: '#ffffff', emissiveIntensity: 0.6, side: THREE.DoubleSide,
    });
    // Cylinder axis along z; after the rotation, u = 0 is the bottom of the ring and grows toward +x,
    // so each texture tile spans one slot from its centre line.
    const geo = new THREE.CylinderGeometry(TUNNEL_RADIUS + 0.02, TUNNEL_RADIUS + 0.02, TUNNEL_LENGTH, SEGMENTS, 1, true)
      .rotateX(Math.PI / 2);
    this.tube = new THREE.Mesh(geo, this.tubeMat);
    this.tube.frustumCulled = false;

    this.rimMat = new THREE.MeshLambertMaterial({ color: '#3a1a40', emissive: RIM_COLOR, emissiveIntensity: 0.5 });
    this.rims = new THREE.InstancedMesh(new THREE.TorusGeometry(TUNNEL_RADIUS + 0.25, 0.32, 8, 48), this.rimMat, 2);
    this.rims.frustumCulled = false;

    const shape = new THREE.Shape();
    const hw = 8, top = 11.5;
    shape.moveTo(-hw, -0.3).lineTo(hw, -0.3).lineTo(hw, top - 1.2).lineTo(hw - 1.2, top).lineTo(-hw + 1.2, top).lineTo(-hw, top - 1.2).closePath();
    const hole = new THREE.Path();
    hole.absarc(0, TUBE_CY, TUNNEL_RADIUS + 0.05, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    this.facade = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), new THREE.MeshLambertMaterial({ map: facadeTexture() }));
    this.facade.frustumCulled = false;

    this.group.add(this.tube, this.rims, this.facade);
    this.group.visible = false;
  }

  update(w: World, lights: number, time: number): void {
    const zStart = w.distance - w.tunnelAt; // the mouth, in view space (the car sits at z = 0)
    const zEnd = zStart - TUNNEL_LENGTH;
    this.group.visible = w.tunnelAt >= 0 && zStart > FAR_Z && zEnd < NEAR_Z;
    if (!this.group.visible) return;
    this.tube.position.set(0, TUBE_CY, zStart - TUNNEL_LENGTH / 2);
    this.facade.position.set(0, 0, zStart + 0.05);
    this.rims.setMatrixAt(0, this.m.makeTranslation(0, TUBE_CY, zStart + 0.1));
    this.rims.setMatrixAt(1, this.m.makeTranslation(0, TUBE_CY, zEnd));
    this.rims.instanceMatrix.needsUpdate = true;
    // Ring lights glow brighter at night; the rims pulse a little.
    this.tubeMat.emissiveIntensity = 0.55 + 0.9 * lights;
    this.rimMat.emissiveIntensity = 0.5 + 0.9 * lights + Math.sin(time * 4) * 0.12;
  }
}

// Wall panel colors for the upper slots (2, 3, 4 = roof, -3, -2): teal on the right wall, orange on
// the roof, pink on the left, so it shows which way up you are.
const PANELS: Record<number, string> = { 2: '#3f8f9a', 3: '#5a5ab0', 4: '#e08a3c', [-3]: '#8a4fa0', [-2]: '#c0507a' };
const FLOOR = '#4a4458'; // the road's asphalt: the bottom slots read as "the road"

/**
 * The whole ring (u = 0 at the bottom, growing toward +x), one light band long: a road-coloured floor
 * with lane lines on the bottom slots, coloured wall panels above, and a ring light across.
 */
function tubeTextures(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const W = 512, H = 128, slotW = W / TUNNEL_SLOTS;
  const xOf = (slotPos: number) => ((slotPos * slotW) % W + W) % W; // slot position -> canvas x
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const e = document.createElement('canvas');
  e.width = W; e.height = H;
  const ge = e.getContext('2d')!;
  ge.fillStyle = '#141018'; // faint self-glow so the tube is never pitch dark
  ge.fillRect(0, 0, W, H);

  for (let k = -3; k <= 4; k++) {
    const x0 = xOf(k - 0.5);
    for (const x of x0 + slotW > W ? [x0, x0 - W] : [x0]) {
      g.fillStyle = Math.abs(k) <= 1 ? FLOOR : PANELS[k];
      g.fillRect(x, 0, slotW, H);
      if (Math.abs(k) > 1) {
        g.fillStyle = 'rgba(255,255,255,0.14)'; // panel seam halfway along, so the motion reads
        g.fillRect(x, H / 2, slotW, 3);
      }
    }
  }
  // Floor: dashed lane lines between the bottom slots, double edge lines where the walls start.
  g.fillStyle = '#f4e9d8';
  for (const p of [-0.5, 0.5]) g.fillRect(xOf(p) - 2, 16, 4, H / 2 - 16);
  for (const p of [-1.5, 1.5]) { g.fillRect(xOf(p) - 6, 0, 4, H); g.fillRect(xOf(p) + 2, 0, 4, H); }
  // Walls: dark seams between panels that glow softly at night.
  for (const p of [2.5, 3.5, 4.5, 5.5]) {
    g.fillStyle = '#2a2236';
    g.fillRect(xOf(p) - 2, 0, 4, H);
    ge.fillStyle = '#6a3a7a';
    ge.fillRect(xOf(p) - 1.5, 0, 3, H);
  }
  // Ring light across the whole circle.
  g.fillStyle = '#fff4d8';
  g.fillRect(0, 0, W, 9);
  ge.fillStyle = '#ffe8b0';
  ge.fillRect(0, 0, W, 9);

  const make = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, TUNNEL_LENGTH / BAND);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: make(c), glow: make(e) };
}

/** Limestone blocks for the portal (ShapeGeometry UVs are metres, so one tile = 2 m). */
function facadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#a88c62';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = FACADE_COLOR;
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 32 : 0;
    for (let col = -1; col < 2; col++) g.fillRect(off + col * 64 + 3, row * 32 + 3, 58, 26);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.5, 0.5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
