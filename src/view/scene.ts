import * as THREE from 'three';
import { GRAVITY, JUMP_VELOCITY, LANE_COUNT, LANE_WIDTH } from '../sim/config';
import { isPower, type PowerKind } from '../sim/spawner';
import { laneX, type World } from '../sim/world';
import { buildCar, buildPolice, type CarParts } from './cars';
import { CarStyle } from './carStyle';
import { Scenery } from './scenery';
import { createSky } from './sky';
import { dayPhase } from '../sim/daycycle';
import { BatSwarm, coinRainLift } from './bats';
import { Buildings } from './buildings';
import { DayNight } from './daynight';
import { Landmarks } from './landmarks';
import { NightLights } from './nightlights';

const MAX_COINS = 160;
const MAX_CONES = 80;
const MAX_POWERS = 8;
const ROAD_LENGTH = 220;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH + 1.5;
const POLICE_FAR = 18; // behind the camera, out of view
const POLICE_CLOSE = 3.7; // just behind the player, in view
const TURNTABLE = { radius: 8.5, height: 3.2, spin: 0.6, lookY: 0.7, lift: 0.22 }; // garage preview camera

const C_BLACK = new THREE.Color('#000000');
const C_RED_ON = new THREE.Color('#ff2a3a'), C_RED_OFF = new THREE.Color('#4a0c12');
const C_BLUE_ON = new THREE.Color('#2a6bff'), C_BLUE_OFF = new THREE.Color('#0e1f4a');

export const POWER_COLORS: Record<PowerKind, string> = {
  ludicrous: '#ff4fd8',
  autopilot: '#35e0ff',
  supercharger: '#4cff6a',
  hover: '#b18cff',
};

/** Grey-box renderer: draws the sim state, owns nothing about the rules. */
const FLIP_TIME = (2 * JUMP_VELOCITY) / GRAVITY * 0.92; // land the flip just before touchdown
const FLIP_PIVOT = 0.5; // body centre height (m)

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1000);
  private baseFov = 62;
  private car: CarParts;
  /** Paint, driver, hat and plate on the player car. */
  readonly style: CarStyle;
  /** Garage open: orbit the camera around the parked car. */
  showcase = false;
  private police: ReturnType<typeof buildPolice>;
  private policeZ = POLICE_FAR;
  private policeX = 0;
  private hoverPad: THREE.Mesh;
  private coins: THREE.InstancedMesh;
  private cones: THREE.InstancedMesh;
  private powers: THREE.InstancedMesh;
  private laneTex: THREE.CanvasTexture;
  private sideTex: THREE.CanvasTexture;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private raycaster = new THREE.Raycaster();
  private scenery = new Scenery();
  private honkBounce = 0;
  private flipT = -1; // seconds into a jump's front flip; -1 = not flipping
  private shake = 0;
  private dayNight: DayNight;
  private nightLights = new NightLights();
  private landmarks: Landmarks;
  private batSwarm = new BatSwarm();
  private buildings = new Buildings();
  /** Last cycle phase drawn (for the debug overlay). */
  phase = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    const fog = new THREE.Fog('#e9784a', 40, 150);
    this.scene.fog = fog;
    const sky = createSky();
    this.scene.add(sky);
    const hemi = new THREE.HemisphereLight('#ffd9a8', '#4a2a6a', 1.4);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#ffb070', 1.8);
    sun.position.set(-4, 6, 3);
    this.scene.add(sun);

    this.laneTex = makeLaneTexture();
    this.laneTex.repeat.set(1, ROAD_LENGTH / 8);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH), new THREE.MeshLambertMaterial({ map: this.laneTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.z = -ROAD_LENGTH / 2 + 25;
    this.scene.add(road);

    this.sideTex = makeSideTexture();
    this.sideTex.repeat.set(20, ROAD_LENGTH / 10);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, ROAD_LENGTH), new THREE.MeshLambertMaterial({ map: this.sideTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -ROAD_LENGTH / 2 + 25);
    this.scene.add(ground);

    this.car = buildCar('#e8344e');
    this.scene.add(this.car.group);
    this.style = new CarStyle(this.car);
    this.police = buildPolice();
    this.police.group.position.z = POLICE_FAR;
    this.scene.add(this.police.group);

    this.hoverPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 0.12, 24),
      new THREE.MeshBasicMaterial({ color: POWER_COLORS.hover, transparent: true, opacity: 0.75 }),
    );
    this.hoverPad.visible = false;
    this.car.group.add(this.hoverPad);

    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20).rotateX(Math.PI / 2);
    this.coins = instanced(coinGeo, new THREE.MeshToonMaterial({ color: '#ffd23f', emissive: '#7a5200' }), MAX_COINS);
    const coneGeo = new THREE.ConeGeometry(0.42, 0.85, 16).translate(0, 0.425, 0);
    this.cones = instanced(coneGeo, new THREE.MeshToonMaterial({ color: '#ff6a1a' }), MAX_CONES);
    this.powers = instanced(new THREE.OctahedronGeometry(0.55), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_POWERS);
    // Create the per-instance color buffer up front so the shader compiles with it.
    for (let i = 0; i < MAX_POWERS; i++) this.powers.setColorAt(i, this.color.set('#ffffff'));
    this.scene.add(this.coins, this.cones, this.powers);

    this.scene.add(this.scenery.group);
    void this.scenery.load();
    this.dayNight = new DayNight({
      sky, fog, hemi, sun,
      coinMat: this.coins.material as THREE.MeshToonMaterial,
      coneMat: this.cones.material as THREE.MeshToonMaterial,
    });
    this.landmarks = new Landmarks(this.dayNight.silhouette);
    this.scene.add(this.nightLights.group, this.landmarks.group, this.batSwarm.group, this.buildings.group);

    window.addEventListener('resize', () => this.resize());
    // iOS can fire resize before the new size is known after rotating; visualViewport catches up.
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 0.8 ? 72 : 62; // portrait needs more vertical FOV to see all lanes
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  hitsCar(clientX: number, clientY: number): boolean {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.car.group, true).length > 0;
  }

  honk(): void { this.honkBounce = 1; }
  bump(): void { this.shake = 0.35; }

  render(w: World, dt: number, time: number): void {
    const car = this.car.group;
    const lean = THREE.MathUtils.clamp((car.position.x - w.x) * 0.5, -0.25, 0.25);
    // A normal jump (swipe up) does one front flip over the arc; hovering and landing from a hover don't.
    if (w.y <= 0) this.flipT = -1;
    else if (this.flipT < 0 && w.power !== 'hover' && w.vy > JUMP_VELOCITY * 0.9) this.flipT = 0;
    let flip = 0;
    if (this.flipT >= 0) {
      this.flipT += dt;
      const p = Math.min(1, this.flipT / FLIP_TIME);
      flip = -Math.PI * 2 * p * p * (3 - 2 * p); // smoothstep: wind up, spin, settle
    }
    // Spin around the body's middle, not the wheels, so the roof never dips into the road.
    car.position.set(w.x, w.y + FLIP_PIVOT * (1 - Math.cos(flip)), -FLIP_PIVOT * Math.sin(flip));
    car.rotation.set(flip !== 0 ? flip : w.y > 0 ? -0.08 : 0, 0, lean);
    this.honkBounce = Math.max(0, this.honkBounce - dt * 4);
    this.car.body.scale.y = 1 + Math.sin(this.honkBounce * Math.PI) * 0.25;
    // Blink during the post-crash grace period.
    car.visible = w.invuln <= 0 || Math.floor(time * 12) % 2 === 0;
    // Glow in the power-up's color.
    const rest = this.car.paint.userData as { glow?: string; glowIntensity?: number };
    if (w.power) this.car.paint.emissive.copy(this.powerColor(w.power));
    else if (rest.glow) this.car.paint.emissive.set(rest.glow);
    else this.car.paint.emissive.copy(C_BLACK);
    this.car.paint.emissiveIntensity = w.power ? 0.35 + Math.sin(time * 10) * 0.15 : rest.glowIntensity ?? 0;
    this.hoverPad.visible = w.power === 'hover';
    this.hoverPad.position.y = -w.y + 0.08 + Math.sin(time * 6) * 0.05;

    // Police: slides in close after a crash, drops back out of view otherwise.
    const targetZ = w.chase > 0 && w.phase !== 'ready' ? POLICE_CLOSE : POLICE_FAR;
    this.policeZ += (targetZ - this.policeZ) * Math.min(1, dt * (targetZ < this.policeZ ? 2.5 : 0.8));
    this.policeX += (w.x - this.policeX) * Math.min(1, dt * 3);
    this.police.group.position.set(this.policeX, 0, this.policeZ);
    this.police.group.visible = this.policeZ < POLICE_FAR - 1;
    const flash = Math.floor(time * 6) % 2 === 0;
    this.police.red.color.copy(flash ? C_RED_ON : C_RED_OFF);
    this.police.blue.color.copy(flash ? C_BLUE_OFF : C_BLUE_ON);

    // Camera trails the car; widens and shakes for speed and bumps.
    this.shake = Math.max(0, this.shake - dt);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(w.x * 0.6 + sx, 5 + sy + (w.power === 'hover' ? 0.6 : 0), 9.5);
    this.camera.lookAt(w.x * 0.4, 1, -12);
    if (this.showcase) this.turntable(w.x, time);
    else if (this.camera.view) this.camera.clearViewOffset();
    for (const m of [this.coins, this.cones, this.powers]) m.visible = !this.showcase;
    const fov = this.baseFov + (w.power === 'ludicrous' ? 10 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }

    this.scenery.update(w.distance);
    this.laneTex.offset.y = (w.distance / 8) % 1;
    this.sideTex.offset.y = (w.distance / 10) % 1;

    this.phase = dayPhase(w);
    this.dayNight.update(this.phase);
    this.nightLights.update(w.distance, this.dayNight.lights, time);
    this.landmarks.update(w.distance);
    this.buildings.update(w.distance, this.dayNight.lights);
    this.batSwarm.update(w, dt, time);

    let nc = 0, nk = 0, np = 0;
    for (const e of w.entities) {
      if (!e.alive) continue;
      const z = -(e.s - w.distance);
      const x = laneX(e.lane);
      if (e.kind === 'coin' && nc < MAX_COINS) {
        this.place(x, 0.9 + Math.sin(time * 4 + e.s) * 0.08 + coinRainLift(e.s, w), z, time * 3 + e.s);
        this.coins.setMatrixAt(nc++, this.dummy.matrix);
      } else if (e.kind === 'cone' && nk < MAX_CONES) {
        this.place(x, 0, z, 0);
        this.cones.setMatrixAt(nk++, this.dummy.matrix);
      } else if (isPower(e.kind) && np < MAX_POWERS) {
        this.place(x, 1.1 + Math.sin(time * 3) * 0.15, z, time * 2);
        this.powers.setMatrixAt(np, this.dummy.matrix);
        this.powers.setColorAt(np++, this.powerColor(e.kind));
      }
    }
    this.coins.count = nc;
    this.cones.count = nk;
    this.powers.count = np;
    this.coins.instanceMatrix.needsUpdate = true;
    this.cones.instanceMatrix.needsUpdate = true;
    this.powers.instanceMatrix.needsUpdate = true;
    if (this.powers.instanceColor) this.powers.instanceColor.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  /** Orbit the car; shift the view so it sits in the top part of the screen above the garage panel. */
  private turntable(x: number, time: number): void {
    const a = time * TURNTABLE.spin;
    this.camera.position.set(x + Math.sin(a) * TURNTABLE.radius, TURNTABLE.height, Math.cos(a) * TURNTABLE.radius);
    this.camera.lookAt(x, TURNTABLE.lookY, 0);
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.setViewOffset(w, h, 0, h * TURNTABLE.lift, w, h);
  }

  private powerColors = new Map<PowerKind, THREE.Color>();
  private powerColor(k: PowerKind): THREE.Color {
    let c = this.powerColors.get(k);
    if (!c) { c = new THREE.Color(POWER_COLORS[k]); this.powerColors.set(k, c); }
    return c;
  }

  private place(x: number, y: number, z: number, rotY: number): void {
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(0, rotY, 0);
    this.dummy.updateMatrix();
  }
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, max: number): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.count = 0;
  return m;
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
