import * as THREE from 'three';
import { LANE_COUNT, LANE_WIDTH } from '../sim/config';
import type { World } from '../sim/world';
import { createSky } from './sky';

const MAX_COINS = 160;
const MAX_CONES = 80;
const ROAD_LENGTH = 220;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH + 1.5;

/** Grey-box renderer: draws the sim state, owns nothing about the rules. */
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1000);
  private car = new THREE.Group();
  private carBody!: THREE.Mesh;
  private coins: THREE.InstancedMesh;
  private cones: THREE.InstancedMesh;
  private laneTex: THREE.CanvasTexture;
  private sideTex: THREE.CanvasTexture;
  private dummy = new THREE.Object3D();
  private raycaster = new THREE.Raycaster();
  private honkBounce = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog('#e9784a', 40, 150);
    this.scene.add(createSky());
    this.scene.add(new THREE.HemisphereLight('#ffd9a8', '#4a2a6a', 1.4));
    const sun = new THREE.DirectionalLight('#ffb070', 1.8);
    sun.position.set(-4, 6, 3);
    this.scene.add(sun);

    // Road with scrolling lane markings (one draw call).
    this.laneTex = makeLaneTexture();
    this.laneTex.repeat.set(1, ROAD_LENGTH / 8);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
      new THREE.MeshLambertMaterial({ map: this.laneTex }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -ROAD_LENGTH / 2 + 15;
    this.scene.add(road);

    // Ground on both sides, with a scrolling stripe pattern so speed reads.
    this.sideTex = makeSideTexture();
    this.sideTex.repeat.set(20, ROAD_LENGTH / 10);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, ROAD_LENGTH),
      new THREE.MeshLambertMaterial({ map: this.sideTex }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -ROAD_LENGTH / 2 + 15);
    this.scene.add(ground);

    this.buildCar();

    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20).rotateX(Math.PI / 2);
    this.coins = new THREE.InstancedMesh(coinGeo, new THREE.MeshToonMaterial({ color: '#ffd23f', emissive: '#7a5200' }), MAX_COINS);
    this.coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coins.frustumCulled = false;
    this.scene.add(this.coins);

    const coneGeo = new THREE.ConeGeometry(0.42, 0.85, 16).translate(0, 0.425, 0);
    this.cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshToonMaterial({ color: '#ff6a1a' }), MAX_CONES);
    this.cones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cones.frustumCulled = false;
    this.scene.add(this.cones);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private buildCar(): void {
    const paint = new THREE.MeshToonMaterial({ color: '#e8344e' });
    const glass = new THREE.MeshToonMaterial({ color: '#2b2f4a' });
    const tyre = new THREE.MeshToonMaterial({ color: '#1b1b22' });
    this.carBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 3.0), paint);
    this.carBody.position.y = 0.45;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.3), glass);
    cabin.position.set(0, 0.85, 0.2);
    this.car.add(this.carBody, cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14).rotateZ(Math.PI / 2);
    for (const [x, z] of [[-0.75, -1.0], [0.75, -1.0], [-0.75, 1.0], [0.75, 1.0]]) {
      const w = new THREE.Mesh(wheelGeo, tyre);
      w.position.set(x, 0.32, z);
      this.car.add(w);
    }
    this.scene.add(this.car);
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait phones need a wider vertical FOV to see all three lanes.
    this.camera.fov = w / h < 0.8 ? 72 : 62;
    this.camera.updateProjectionMatrix();
  }

  /** True if a screen tap hit the car. */
  hitsCar(clientX: number, clientY: number): boolean {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.car, true).length > 0;
  }

  honk(): void { this.honkBounce = 1; }

  render(w: World, dt: number, time: number): void {
    // Car follows the sim; tilts into lane changes and bounces on honk.
    const lean = THREE.MathUtils.clamp((this.car.position.x - w.x) * 0.5, -0.25, 0.25);
    this.car.position.set(w.x, w.y, 0);
    this.car.rotation.set(w.y > 0 ? -0.08 : 0, 0, lean);
    this.honkBounce = Math.max(0, this.honkBounce - dt * 4);
    this.carBody.scale.y = 1 + Math.sin(this.honkBounce * Math.PI) * 0.25;

    // Camera trails the car a little sideways.
    this.camera.position.set(w.x * 0.6, 5, 9.5);
    this.camera.lookAt(w.x * 0.4, 1, -12);

    // Treadmill: scroll textures instead of moving geometry.
    this.laneTex.offset.y = (w.distance / 8) % 1;
    this.sideTex.offset.y = (w.distance / 10) % 1;

    let nc = 0, nk = 0;
    for (const e of w.entities) {
      if (!e.alive) continue;
      const z = -(e.s - w.distance);
      const x = (e.lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
      if (e.kind === 'coin' && nc < MAX_COINS) {
        this.dummy.position.set(x, 0.9 + Math.sin(time * 4 + e.s) * 0.08, z);
        this.dummy.rotation.set(0, time * 3 + e.s, 0);
        this.dummy.updateMatrix();
        this.coins.setMatrixAt(nc++, this.dummy.matrix);
      } else if (e.kind === 'cone' && nk < MAX_CONES) {
        this.dummy.position.set(x, 0, z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.cones.setMatrixAt(nk++, this.dummy.matrix);
      }
    }
    this.coins.count = nc;
    this.cones.count = nk;
    this.coins.instanceMatrix.needsUpdate = true;
    this.cones.instanceMatrix.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

function makeLaneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4a4458';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f4e9d8';
  const edge = (0.75 / ROAD_WIDTH) * 128;
  g.fillRect(edge - 2, 0, 4, 128);
  g.fillRect(128 - edge - 2, 0, 4, 128);
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = edge + (i * (128 - 2 * edge)) / LANE_COUNT;
    g.fillRect(x - 2, 0, 4, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeSideTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9a26b';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#b88f5a';
  g.fillRect(0, 0, 64, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
