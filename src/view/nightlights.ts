import * as THREE from 'three';
import { LANE_COUNT, LANE_WIDTH } from '../sim/config';

// Roadside string lights (Sixth Street) and neon signs (SoCo) that switch on at night.
// Grey-box look: tune here.
const ROAD_HALF = (LANE_COUNT * LANE_WIDTH + 1.5) / 2;
const POLE_X = ROAD_HALF + 1.4; // m from the road centre
const POLE_SPACING = 12; // m between poles
const POLE_COUNT = 15; // per side; covers ~170 m, the far end hides in fog
const POLE_HEIGHT = 4.6;
const POLE_COLOR = '#3a3040';
const WIRE_COLOR = '#2a2230';
const WIRE_SAG = 0.9; // m the wire dips between poles
const BULBS_PER_SPAN = 7;
const BULB_RADIUS = 0.11;
const BULB_COLORS = ['#ffe9a8', '#ff7ab8', '#7ae8ff', '#ffd04a', '#a8ff8a'];
const BULB_DIM = 0.3; // brightness with the lights off
const NEON_DIM = 0.28;

const SIGN_LOOP = 230; // m; each sign comes back this often
const SIGN_NEAR = 14; // z where a sign leaves view (behind the camera)
const SIGN_X = POLE_X + 3.2;
const SIGN_Y = 3.6; // centre height
const SIGN_HEIGHT = 1.5;
const SIGN_TURN = 0.55; // rad, faces the oncoming car
const SIGN_POST_COLOR = '#2a2430';
const SIGNS = [
  { text: 'TACOS', color: '#ff4fa0', side: -1, offset: 0, on: 0.1 },
  { text: 'LIVE MUSIC', color: '#35e0ff', side: 1, offset: 60, on: 0.35 },
  { text: 'BBQ', color: '#ffb020', side: -1, offset: 120, on: 0.55 },
  { text: 'ICE CREAM', color: '#c08cff', side: 1, offset: 175, on: 0.75 },
];

export class NightLights {
  readonly group = new THREE.Group();
  private strand = new THREE.Group(); // poles, wires and bulbs scroll together
  private bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  private signs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; offset: number; side: number; on: number }[] = [];
  private posts: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor() {
    this.group.add(this.strand);
    this.buildStrand();

    this.posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.14, 1, 0.14).translate(0, 0.5, 0),
      new THREE.MeshLambertMaterial({ color: SIGN_POST_COLOR }),
      SIGNS.length * 2,
    );
    this.posts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.posts.frustumCulled = false;
    this.group.add(this.posts);

    for (const s of SIGNS) {
      const { tex, aspect } = neonTexture(s.text, s.color);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_HEIGHT * aspect, SIGN_HEIGHT), mat);
      mesh.rotation.y = -s.side * SIGN_TURN;
      this.group.add(mesh);
      this.signs.push({ mesh, mat, offset: s.offset, side: s.side, on: s.on });
    }
  }

  /** lights: 0 off .. 1 full night. */
  update(distance: number, lights: number, time: number): void {
    this.strand.position.z = distance % POLE_SPACING;
    this.bulbMat.color.setScalar(BULB_DIM + (1 - BULB_DIM) * lights);

    for (let i = 0; i < this.signs.length; i++) {
      const s = this.signs[i];
      const u = (s.offset + distance) % SIGN_LOOP;
      const z = SIGN_NEAR - (SIGN_LOOP - u);
      const x = s.side * SIGN_X;
      s.mesh.position.set(x, SIGN_Y, z);
      // Each sign switches on at its own point, with a short flicker.
      const over = lights - s.on * 0.9;
      const lit = over > 0.08 || (over > 0 && Math.sin(time * 47 + i * 3) > 0);
      s.mat.color.setScalar(lit ? 1 : NEON_DIM);
      // Two posts under each sign.
      const halfW = (s.mesh.geometry as THREE.PlaneGeometry).parameters.width * 0.35;
      const postH = SIGN_Y - SIGN_HEIGHT / 2;
      for (let k = 0; k < 2; k++) {
        const dx = (k === 0 ? -halfW : halfW) * Math.cos(SIGN_TURN);
        const dz = (k === 0 ? -halfW : halfW) * Math.sin(SIGN_TURN) * s.side;
        this.dummy.position.set(x + dx, 0, z + dz);
        this.dummy.scale.set(1, postH, 1);
        this.dummy.updateMatrix();
        this.posts.setMatrixAt(i * 2 + k, this.dummy.matrix);
      }
    }
    this.posts.instanceMatrix.needsUpdate = true;
  }

  private buildStrand(): void {
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.08, 0.1, POLE_HEIGHT, 6).translate(0, POLE_HEIGHT / 2, 0),
      new THREE.MeshLambertMaterial({ color: POLE_COLOR }),
      POLE_COUNT * 2,
    );
    const spans = POLE_COUNT - 1;
    const bulbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(BULB_RADIUS, 1), this.bulbMat, spans * 2 * BULBS_PER_SPAN);
    const wire: number[] = [];
    const color = new THREE.Color();
    const WIRE_STEPS = 8;
    let p = 0, b = 0;
    for (const side of [-1, 1]) {
      const x = side * POLE_X;
      for (let i = 0; i < POLE_COUNT; i++) {
        this.dummy.position.set(x, 0, POLE_SPACING - i * POLE_SPACING);
        this.dummy.updateMatrix();
        poles.setMatrixAt(p++, this.dummy.matrix);
      }
      for (let i = 0; i < spans; i++) {
        const z0 = POLE_SPACING - i * POLE_SPACING;
        const at = (t: number) => POLE_HEIGHT - WIRE_SAG * 4 * t * (1 - t); // parabola ~ catenary
        for (let k = 0; k < WIRE_STEPS; k++) {
          const t0 = k / WIRE_STEPS, t1 = (k + 1) / WIRE_STEPS;
          wire.push(x, at(t0), z0 - t0 * POLE_SPACING, x, at(t1), z0 - t1 * POLE_SPACING);
        }
        for (let k = 0; k < BULBS_PER_SPAN; k++) {
          const t = (k + 0.5) / BULBS_PER_SPAN;
          this.dummy.position.set(x, at(t) - BULB_RADIUS, z0 - t * POLE_SPACING);
          this.dummy.updateMatrix();
          bulbs.setMatrixAt(b, this.dummy.matrix);
          bulbs.setColorAt(b, color.set(BULB_COLORS[b % BULB_COLORS.length]));
          b++;
        }
      }
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: WIRE_COLOR }));
    for (const m of [poles, bulbs, wires]) m.frustumCulled = false;
    this.strand.add(poles, wires, bulbs);
  }
}

function neonTexture(text: string, color: string): { tex: THREE.CanvasTexture; aspect: number } {
  const h = 96, pad = 22;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = 'bold 54px Fredoka, system-ui, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = h;
  g.fillStyle = 'rgba(20,14,30,0.92)';
  roundRect(g, 3, 3, w - 6, h - 6, 16);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.shadowColor = color;
  g.shadowBlur = 14;
  roundRect(g, 8, 8, w - 16, h - 16, 12);
  g.stroke();
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(text, w / 2, h / 2 + 2);
  g.globalCompositeOperation = 'source-atop';
  g.shadowBlur = 0;
  g.globalAlpha = 0.55;
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
