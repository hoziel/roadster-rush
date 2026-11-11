import * as THREE from 'three';
import { blossomTexture, projectSideUVs } from './blossom';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Driver } from '../ui/drivers';
import type { PaintLook } from '../ui/paints';
import { lowerGeometry, stripeGeometry, type RoadsterParts } from './roadster';

// Driver, hat and plate sizes. The head sits in the left seat, under the see-through canopy.
const HEAD_R = 0.17;
const HAT_SCALE = 0.42; // small enough to clear the roof
const HAT_COLOR = '#8a5a2b';
const EYE_COLOR = '#1b1b22';
const PLATE_W = 0.5, PLATE_H = 0.195;
const PLATE_POS = new THREE.Vector3(0, 0.43, 1.795); // rear panel, below the brake light
const PLATE_BG = '#f6f1e3', PLATE_INK = '#1f2d6b', PLATE_EDGE = '#c0392b';
const NEON_GLOW = 0.55; // emissive intensity for neon paints
const METALLIC_STEPS = [70, 150, 205, 255]; // toon gradient bands: harder, shinier highlights

export interface CarLook { paint: PaintLook; driver: Driver; hat: boolean }

/**
 * Dresses the player car: paint finish, driver head with hair, cowboy hat, name plate.
 * On the car it adds only the stripe / two-tone accent (1 draw call when shown).
 */
export class CarStyle {
  private blossomTex: THREE.CanvasTexture | null = null;
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

  constructor(private car: RoadsterParts) {
    const HEAD_POS = car.seat;
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), this.skin);
    head.position.copy(HEAD_POS);
    // Hair/cap blob: a squashed sphere sitting on the back and top of the head.
    const hair = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), this.hair);
    hair.position.copy(HEAD_POS).add(new THREE.Vector3(0, 0.012, 0.045));
    hair.scale.set(1, 0.85, 1);
    // Eyes face forward (-z), seen on the turntable.
    const eyeGeo = mergeGeometries([
      new THREE.SphereGeometry(0.03, 8, 6).translate(-0.06, 0.02, -HEAD_R + 0.02),
      new THREE.SphereGeometry(0.03, 8, 6).translate(0.06, 0.02, -HEAD_R + 0.02),
    ]);
    const eyes = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: EYE_COLOR }));
    eyes.position.copy(HEAD_POS);
    // Cowboy hat: brim + crown in one mesh.
    const hatGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.5, 0.5, 0.04, 22),
      new THREE.CylinderGeometry(0.2, 0.25, 0.26, 18).translate(0, 0.13, 0),
    ]);
    this.hat = new THREE.Mesh(hatGeo, new THREE.MeshToonMaterial({ color: HAT_COLOR }));
    this.hat.scale.setScalar(HAT_SCALE);
    this.hat.position.copy(HEAD_POS).add(new THREE.Vector3(0, HEAD_R * 0.7, 0));
    this.hat.rotation.x = -0.12; // tipped back a little
    // Ofir wants Codex's car untouched: the driver, hat and plate are built but not mounted on it.
    void head; void hair; void eyes;

    // Paint accents and plate (the whole car squashes for the honk bounce).
    this.stripe = new THREE.Mesh(stripeGeometry(), this.accent);
    this.lower = new THREE.Mesh(lowerGeometry(), this.accent);
    this.plateCanvas.width = 256; this.plateCanvas.height = 100;
    this.plateTex = new THREE.CanvasTexture(this.plateCanvas);
    this.plateTex.colorSpace = THREE.SRGBColorSpace;
    this.plateTex.anisotropy = 4;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), new THREE.MeshBasicMaterial({ map: this.plateTex }));
    plate.position.copy(PLATE_POS); // the back of the car, facing the chase camera
    car.group.add(this.stripe, this.lower);
    void plate;

    const data = new Uint8Array(METALLIC_STEPS.flatMap((v) => [v, v, v, 255]));
    this.metalMap = new THREE.DataTexture(data, METALLIC_STEPS.length, 1, THREE.RGBAFormat);
    this.metalMap.minFilter = this.metalMap.magFilter = THREE.NearestFilter;
    this.metalMap.needsUpdate = true;
  }

  set(look: CarLook): void {
    const { paint, driver } = look;
    const mat = this.car.paint;
    mat.color.set(paint.color);
    const blossom = paint.finish === 'blossom';
    if (blossom && !this.blossomTex) { projectSideUVs(this.car.group, mat); this.blossomTex = blossomTexture(); }
    const pattern = blossom ? this.blossomTex : null;
    if (mat.map !== pattern) { mat.map = pattern; mat.needsUpdate = true; }
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
