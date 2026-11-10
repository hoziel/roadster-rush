import * as THREE from 'three';
import { LEG_TOP, longhornGeometry } from './roadwork';

// Kart-racer style: hit a cone or a longhorn and it flies up at the camera, smacks into the screen with a
// comic impact star, sticks for a moment, then slowly slides down the glass, swaying, and drops away.

export type ScreenHitKind = 'cone' | 'longhorn';

const FLY = 0.32; // s from the road to the screen
const STICK = 0.45; // s stuck on the glass
const SLIDE = 2.6; // s slowly sliding down and off
const DEPTH = 0.6; // m in front of the camera where the "glass" is
const POOL = 3; // per kind

interface Look {
  size: number; // scale on the glass
  centre: number; // model height of its middle (it spins round that)
  pose: THREE.Euler; // how it lies against the glass (before the tilt)
}
const LOOKS: Record<ScreenHitKind, Look> = {
  cone: { size: 0.21, centre: 0.42, pose: new THREE.Euler(0.35, 0, Math.PI * 0.5) }, // on its side: the cone's profile, tip to one side
  longhorn: { size: 0.1, centre: 1.0, pose: new THREE.Euler(0.25, -Math.PI / 2, 0) }, // face first, horns spread across
};

interface Flyer { kind: ScreenHitKind; mesh: THREE.Group; star: THREE.Mesh; t: number; from: THREE.Vector3; tx: number; ty: number; spin: number; tilt: number; sway: number }

export class ScreenHits {
  readonly group = new THREE.Group();
  private flyers: Flyer[] = [];
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private e = new THREE.Euler();

  constructor(private camera: THREE.PerspectiveCamera) {
    const starTex = starTexture();
    const starMat = new THREE.MeshBasicMaterial({ map: starTex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const make: Record<ScreenHitKind, () => THREE.Object3D> = { cone: coneModel(), longhorn: longhornModel() };
    for (const kind of ['cone', 'longhorn'] as ScreenHitKind[]) {
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
        this.flyers.push({ kind, mesh, star, t: -1, from: new THREE.Vector3(), tx: 0, ty: 0, spin: 0, tilt: 0, sway: 0 });
      }
    }
  }

  /** Something was hit at (x, z) on the road: send it at the screen. */
  hit(kind: ScreenHitKind, x: number, z: number, y = 0.5): void {
    const pool = this.flyers.filter((f) => f.kind === kind);
    const f = pool.find((g) => g.t < 0) ?? pool[0];
    f.t = 0;
    f.from.set(x, y, z);
    f.tx = (Math.random() - 0.5) * (kind === 'cone' ? 0.36 : 0.12);
    f.ty = 0.04 + Math.random() * 0.1;
    f.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 4);
    f.tilt = (Math.random() - 0.5) * (kind === 'cone' ? 1.2 : 0.5);
    f.sway = Math.random() * Math.PI * 2;
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
        // From the road up to the glass, growing, tumbling.
        const p = t / FLY, k = p * p;
        const glass = this.camera.localToWorld(this.v.set(f.tx, f.ty, -DEPTH));
        f.mesh.position.copy(f.from).lerp(glass, k);
        f.mesh.position.y += Math.sin(p * Math.PI) * 1.2;
        this.e.set(t * f.spin, t * f.spin * 0.7, 0);
        f.mesh.quaternion.copy(this.camera.quaternion).multiply(this.q.setFromEuler(this.e));
        f.mesh.scale.setScalar(THREE.MathUtils.lerp(1, look.size, k));
        continue;
      }
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
      } else if (t < FLY + STICK + SLIDE) {
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
