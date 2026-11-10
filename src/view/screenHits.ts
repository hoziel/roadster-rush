import * as THREE from 'three';
import { BAT_COLOR, buildBat } from './bats';
import { LEG_TOP, longhornGeometry } from './roadwork';
import { birdGeometry, droneGeometry } from './skyLanes';

// Kart-racer style: something you hit flies up at the camera, smacks into the screen with a comic impact star,
// sticks for a moment, then slowly slides down the glass, swaying, and drops away. A gull leaves feathers
// floating down, a drone sheds bits, and a bat just shakes itself off and flaps away.

export type ScreenHitKind = 'cone' | 'longhorn' | 'bird' | 'drone' | 'bat';

const FLY = 0.32; // s from where it was hit to the screen
const STICK = 0.45; // s stuck on the glass
const SLIDE = 2.6; // s slowly sliding down and off
const FLY_OFF = 1.1; // s for a bat to flap away
const DEPTH = 0.6; // m in front of the camera where the "glass" is
const POOL = 3; // per kind
const DEBRIS = 24;

interface Look {
  size: number; // scale on the glass
  centre: number; // model height of its middle (it spins round that)
  pose: THREE.Euler; // how it lies against the glass (before the tilt)
  away?: boolean; // flaps off instead of sliding down
  debris?: string; // colour of the bits that float down after the smack
}
const LOOKS: Record<ScreenHitKind, Look> = {
  cone: { size: 0.21, centre: 0.42, pose: new THREE.Euler(0.35, 0, Math.PI * 0.5) }, // on its side: the cone's profile
  longhorn: { size: 0.1, centre: 1.0, pose: new THREE.Euler(0.25, -Math.PI / 2, 0) }, // face first, horns across
  bird: { size: 0.12, centre: 0, pose: new THREE.Euler(Math.PI / 2, 0, 0), debris: '#fbfaf6' }, // splayed flat, wings spread, head up
  drone: { size: 0.12, centre: 0, pose: new THREE.Euler(1.1, 0.4, 0), debris: '#3a3f52' }, // top side, rotors showing
  bat: { size: 0.24, centre: 0, pose: new THREE.Euler(Math.PI / 2, 0, 0), away: true }, // flat on the glass, wings out
};

interface Flyer { kind: ScreenHitKind; mesh: THREE.Group; star: THREE.Mesh; t: number; from: THREE.Vector3; tx: number; ty: number; spin: number; tilt: number; sway: number; shed: boolean }
interface Bit { mesh: THREE.Mesh; t: number; x: number; y: number; vx: number; spin: number; life: number }

export class ScreenHits {
  readonly group = new THREE.Group();
  private flyers: Flyer[] = [];
  private bits: Bit[] = [];
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private e = new THREE.Euler();

  constructor(private camera: THREE.PerspectiveCamera) {
    const starMat = new THREE.MeshBasicMaterial({ map: starTexture(), transparent: true, depthTest: false, depthWrite: false, fog: false });
    const vc = new THREE.MeshLambertMaterial({ vertexColors: true });
    const bird = birdGeometry(), drone = droneGeometry(), bat = buildBat();
    const batMat = new THREE.MeshBasicMaterial({ color: BAT_COLOR, side: THREE.DoubleSide, fog: false });
    const make: Record<ScreenHitKind, () => THREE.Object3D> = {
      cone: coneModel(), longhorn: longhornModel(),
      bird: () => new THREE.Mesh(bird, vc), drone: () => new THREE.Mesh(drone, vc), bat: () => new THREE.Mesh(bat, batMat),
    };
    for (const kind of Object.keys(LOOKS) as ScreenHitKind[]) {
      for (let i = 0; i < POOL; i++) {
        const mesh = new THREE.Group();
        const model = make[kind]();
        model.position.y = -LOOKS[kind].centre;
        mesh.add(model);
        mesh.visible = false;
        const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), starMat.clone());
        star.renderOrder = 10;
        star.visible = false;
        this.group.add(mesh, star);
        this.flyers.push({ kind, mesh, star, t: -1, from: new THREE.Vector3(), tx: 0, ty: 0, spin: 0, tilt: 0, sway: 0, shed: false });
      }
    }
    // Feathers / bits: little flat flakes that see-saw down the screen.
    const flake = new THREE.PlaneGeometry(0.02, 0.007);
    for (let i = 0; i < DEBRIS; i++) {
      const mesh = new THREE.Mesh(flake, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, fog: false, depthTest: false }));
      mesh.renderOrder = 12;
      mesh.visible = false;
      this.group.add(mesh);
      this.bits.push({ mesh, t: -1, x: 0, y: 0, vx: 0, spin: 0, life: 1 });
    }
  }

  /** Something was hit at (x, y, z): send it at the screen. */
  hit(kind: ScreenHitKind, x: number, z: number, y = 0.5): void {
    const pool = this.flyers.filter((f) => f.kind === kind);
    const f = pool.find((g) => g.t < 0) ?? pool[0];
    f.t = 0;
    f.from.set(x, y, z);
    f.tx = (Math.random() - 0.5) * (kind === 'longhorn' ? 0.12 : 0.3);
    f.ty = 0.04 + Math.random() * 0.1;
    f.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 4);
    f.tilt = (Math.random() - 0.5) * (kind === 'cone' ? 1.2 : 0.5);
    f.sway = Math.random() * Math.PI * 2;
    f.shed = false;
    f.mesh.visible = true;
  }

  /** Call after the camera has been placed for the frame. */
  update(dt: number): void {
    this.camera.updateMatrixWorld();
    for (const f of this.flyers) {
      if (f.t < 0) continue;
      f.t += dt;
      const t = f.t, look = LOOKS[f.kind];
      let rotZ = f.tilt;
      if (t < FLY) {
        // From where it was hit up to the glass, growing, tumbling.
        const p = t / FLY, k = p * p;
        const glass = this.camera.localToWorld(this.v.set(f.tx, f.ty, -DEPTH));
        f.mesh.position.copy(f.from).lerp(glass, k);
        f.mesh.position.y += Math.sin(p * Math.PI) * 1.2;
        this.e.set(t * f.spin, t * f.spin * 0.7, 0);
        f.mesh.quaternion.copy(this.camera.quaternion).multiply(this.q.setFromEuler(this.e));
        f.mesh.scale.setScalar(THREE.MathUtils.lerp(1, look.size, k));
        continue;
      }
      const end = FLY + STICK + (look.away ? FLY_OFF : SLIDE);
      if (t < FLY + STICK) {
        // Smack: squashed flat against the glass, springing back; the impact star flashes.
        const p = (t - FLY) / STICK;
        this.v.set(f.tx, f.ty, -DEPTH);
        const squash = 1 - 0.35 * Math.exp(-p * 7) * Math.cos(p * 16);
        f.mesh.scale.set(look.size * (2 - squash), look.size * squash, look.size);
        f.star.visible = p < 0.55;
        f.star.position.copy(this.camera.localToWorld(this.w.set(f.tx, f.ty, -DEPTH - 0.02)));
        f.star.quaternion.copy(this.camera.quaternion);
        f.star.scale.setScalar(0.2 + p * 0.3);
        (f.star.material as THREE.MeshBasicMaterial).opacity = 1 - p / 0.55;
        if (!f.shed && look.debris) { f.shed = true; this.shed(f.tx, f.ty, look.debris); }
      } else if (t < end && look.away) {
        // A bat shakes itself off and flaps away up and out of the picture.
        const p = (t - FLY - STICK) / FLY_OFF;
        this.v.set(f.tx + p * p * 0.5 * Math.sign(f.tilt || 1), f.ty + p * p * 0.6, -DEPTH - p * 1.5);
        rotZ = f.tilt + Math.sin(t * 9) * 0.25;
        f.mesh.scale.set(look.size * (0.45 + 0.55 * Math.abs(Math.cos(t * 22))), look.size, look.size); // wing beats
        f.star.visible = false;
      } else if (t < end) {
        // Slowly slides down the glass, swaying side to side, and drops off the bottom.
        const p = (t - FLY - STICK) / SLIDE;
        const drop = p * 0.45 + p * p * 0.45;
        this.v.set(f.tx + Math.sin(f.sway + p * 7) * 0.03, f.ty - drop, -DEPTH);
        rotZ = f.tilt + Math.sin(f.sway + p * 7) * 0.12 + p * 0.5 * Math.sign(f.tilt || 1);
        f.mesh.scale.setScalar(look.size);
        f.star.visible = false;
      } else {
        f.t = -1;
        f.mesh.visible = false;
        f.star.visible = false;
        continue;
      }
      f.mesh.position.copy(this.camera.localToWorld(this.v));
      this.q2.setFromEuler(this.e.set(0, 0, rotZ));
      f.mesh.quaternion.copy(this.camera.quaternion).multiply(this.q2).multiply(this.q.setFromEuler(look.pose));
    }
    // Feathers and bits see-saw down the glass.
    for (const b of this.bits) {
      if (b.t < 0) continue;
      b.t += dt;
      if (b.t > b.life) { b.t = -1; b.mesh.visible = false; continue; }
      const swing = Math.sin(b.t * 5 + b.spin) * 0.03;
      b.mesh.position.copy(this.camera.localToWorld(this.v.set(b.x + b.vx * b.t + swing, b.y - b.t * 0.16, -DEPTH + 0.02)));
      this.e.set(0, 0, Math.sin(b.t * 5 + b.spin) * 0.9);
      b.mesh.quaternion.copy(this.camera.quaternion).multiply(this.q.setFromEuler(this.e));
    }
  }

  /** A puff of feathers (or bits) from the smack point. */
  private shed(x: number, y: number, color: string): void {
    let n = 0;
    for (const b of this.bits) {
      if (b.t >= 0 || n >= 8) continue;
      n++;
      b.t = 0;
      b.x = x + (Math.random() - 0.5) * 0.12;
      b.y = y + (Math.random() - 0.3) * 0.08;
      b.vx = (Math.random() - 0.5) * 0.08;
      b.spin = Math.random() * 6;
      b.life = 2 + Math.random() * 1.2;
      (b.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      b.mesh.visible = true;
    }
  }
}

function coneModel(): () => THREE.Object3D {
  const orange = new THREE.MeshToonMaterial({ color: '#ff6a1a' });
  const white = new THREE.MeshToonMaterial({ color: '#fff6e0' });
  const coneGeo = new THREE.ConeGeometry(0.42, 0.85, 18).translate(0, 0.425, 0);
  const stripeGeo = new THREE.CylinderGeometry(0.27, 0.32, 0.12, 18, 1, true).translate(0, 0.4, 0);
  const baseGeo = new THREE.BoxGeometry(0.9, 0.08, 0.9).translate(0, 0.04, 0);
  return () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(coneGeo, orange), new THREE.Mesh(stripeGeo, white), new THREE.Mesh(baseGeo, orange));
    return g;
  };
}

function longhornModel(): () => THREE.Object3D {
  const { body, legs } = longhornGeometry();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return () => {
    const g = new THREE.Group();
    const l = new THREE.Mesh(legs, mat);
    l.position.y = LEG_TOP;
    g.add(new THREE.Mesh(body, mat), l);
    return g;
  };
}

/** A comic impact star (white burst with a yellow middle). */
function starTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const spikes = 9;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? 26 : 62, a = (i / (spikes * 2)) * Math.PI * 2;
    g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#ffffff'; g.fill();
  g.lineWidth = 5; g.strokeStyle = '#3a1440'; g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
