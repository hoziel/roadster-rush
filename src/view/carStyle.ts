import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Driver } from '../ui/drivers';
import type { PaintLook } from '../ui/paints';
import type { CarParts } from './cars';

// Grey-box sizes and colors for the driver, hat and plate. Retune with the art direction.
const HEAD_R = 0.27;
const HEAD_POS = new THREE.Vector3(0, 1.22, 0.35); // in the seat, above the cabin box
const HAT_COLOR = '#8a5a2b';
const EYE_COLOR = '#1b1b22';
const PLATE_W = 0.72, PLATE_H = 0.28;
const PLATE_BG = '#f6f1e3', PLATE_INK = '#1f2d6b', PLATE_EDGE = '#c0392b';
const NEON_GLOW = 0.55; // emissive intensity for neon paints
const METALLIC_STEPS = [70, 150, 205, 255]; // toon gradient bands: harder, shinier highlights

export interface CarLook { paint: PaintLook; driver: Driver; hat: boolean }

/**
 * Dresses the player car: paint finish, driver head with hair, cowboy hat, name plate.
 * Adds ~6 draw calls (head, hair, eyes, hat, plate, accent when shown).
 */
export class CarStyle {
  private skin = new THREE.MeshToonMaterial();
  private hair = new THREE.MeshToonMaterial();
  private accent = new THREE.MeshToonMaterial();
  private stripe: THREE.Mesh;
  private lower: THREE.Mesh;
  private hat: THREE.Mesh;
  private plateCanvas = document.createElement('canvas');
  private plateTex: THREE.CanvasTexture;
  private metalMap: THREE.DataTexture;
  private plateName = '';

  constructor(private car: CarParts) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), this.skin);
    head.position.copy(HEAD_POS);
    // Hair/cap blob: a squashed sphere sitting on the back and top of the head.
    const hair = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), this.hair);
    hair.position.copy(HEAD_POS).add(new THREE.Vector3(0, 0.03, 0.03));
    hair.scale.set(1, 0.85, 1);
    // Eyes face forward (-z), seen on the turntable.
    const eyeGeo = mergeGeometries([
      new THREE.SphereGeometry(0.045, 8, 6).translate(-0.09, 0.03, -HEAD_R + 0.02),
      new THREE.SphereGeometry(0.045, 8, 6).translate(0.09, 0.03, -HEAD_R + 0.02),
    ]);
    const eyes = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: EYE_COLOR }));
    eyes.position.copy(HEAD_POS);
    // Cowboy hat: brim + crown in one mesh.
    const hatGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.5, 0.5, 0.04, 22),
      new THREE.CylinderGeometry(0.2, 0.25, 0.26, 18).translate(0, 0.13, 0),
    ]);
    this.hat = new THREE.Mesh(hatGeo, new THREE.MeshToonMaterial({ color: HAT_COLOR }));
    this.hat.position.copy(HEAD_POS).add(new THREE.Vector3(0, HEAD_R * 0.7, 0));
    this.hat.rotation.x = -0.12; // tipped back a little
    car.group.add(head, hair, eyes, this.hat);

    // Paint accents and plate ride on the body so they squash with the honk bounce.
    this.stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 3.02), this.accent);
    this.lower = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 3.02), this.accent);
    this.lower.position.y = -0.115;
    this.plateCanvas.width = 256; this.plateCanvas.height = 100;
    this.plateTex = new THREE.CanvasTexture(this.plateCanvas);
    this.plateTex.colorSpace = THREE.SRGBColorSpace;
    this.plateTex.anisotropy = 4;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), new THREE.MeshBasicMaterial({ map: this.plateTex }));
    plate.position.set(0, 0, 1.52); // the back of the car, facing the chase camera
    car.body.add(this.stripe, this.lower, plate);

    const data = new Uint8Array(METALLIC_STEPS.flatMap((v) => [v, v, v, 255]));
    this.metalMap = new THREE.DataTexture(data, METALLIC_STEPS.length, 1, THREE.RGBAFormat);
    this.metalMap.minFilter = this.metalMap.magFilter = THREE.NearestFilter;
    this.metalMap.needsUpdate = true;
  }

  set(look: CarLook): void {
    const { paint, driver } = look;
    const mat = this.car.paint;
    mat.color.set(paint.color);
    const map = paint.finish === 'metallic' ? this.metalMap : null;
    if (mat.gradientMap !== map) { mat.gradientMap = map; mat.needsUpdate = true; }
    // GameView reads these as the resting glow (power-ups override it).
    mat.userData.glow = paint.finish === 'neon' ? paint.color : '#000000';
    mat.userData.glowIntensity = paint.finish === 'neon' ? NEON_GLOW : 0;
    this.accent.color.set(paint.accent ?? paint.color);
    this.stripe.visible = paint.finish === 'stripe';
    this.lower.visible = paint.finish === 'twoTone';

    this.skin.color.set(driver.skin);
    this.hair.color.set(driver.hair);
    this.hat.visible = look.hat;
    if (driver.name !== this.plateName) this.drawPlate(driver.name);
  }

  private drawPlate(name: string): void {
    this.plateName = name;
    const c = this.plateCanvas, g = c.getContext('2d')!;
    g.fillStyle = PLATE_BG;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = PLATE_EDGE;
    g.lineWidth = 8;
    g.strokeRect(4, 4, c.width - 8, c.height - 8);
    g.fillStyle = PLATE_INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const text = name.toUpperCase();
    let size = 62;
    g.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
    while (g.measureText(text).width > c.width - 30 && size > 20) {
      size -= 4;
      g.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
    }
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    this.plateTex.needsUpdate = true;
  }

  /** Redraw the plate once the web font has loaded (the first draw may use a fallback). */
  refreshPlate(): void {
    const name = this.plateName;
    this.plateName = '';
    if (name) this.drawPlate(name);
  }
}
