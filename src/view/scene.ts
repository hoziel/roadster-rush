import * as THREE from 'three';
import { GRAVITY, JUMP_VELOCITY, LANE_COUNT, LANE_WIDTH, SPEED_MAX, SKY_HEIGHT, SPEED_START, TUNNEL_RADIUS } from '../sim/config';
import { SLOT_ANGLE } from '../sim/tunnel';
import { isPower, type PowerKind } from '../sim/spawner';
import { isDucking, laneX, policeClose, rampSlope, type World } from '../sim/world';
import { buildRoadster, type RoadsterParts } from './roadster';
import { buildPoliceRoadster } from './policeRoadster';
import { CarStyle } from './carStyle';
import { Scenery } from './scenery';
import { createSky } from './sky';
import { dayPhase } from '../sim/daycycle';
import { BatSwarm, coinRainLift } from './bats';
import { HoverJets, Puffs } from './puffs';
import { Buildings } from './buildings';
import { DayNight } from './daynight';
import { Landmarks } from './landmarks';
import { NightLights } from './nightlights';
import { TUBE_CY, TunnelView, tubeBlend } from './tunnel';
import { TrafficView } from './traffic';
import { StartLine, WaitingPolice } from './startline';
import { SkyLanes } from './skyLanes';
import { BustScene } from './bust';
import { FanBoards } from './fanBoards';
import { FanSpots, SPOT_SCALE } from './fanSpots';
import { themeFor } from './fanThemes';
import { Sideline } from './sideline';
import { HobbyBalls } from './hobbyBalls';
import { ScreenHits, type ScreenHitKind } from './screenHits';
import { Puddles, type SplashKind } from './puddles';
import { PolicePatrol } from './policePatrol';
import { HazardView } from './roadwork';
import { HighroadView } from './highroad';

const MAX_COINS = 240;
const MAX_CONES = 80;
const MAX_POWERS = 8;
const ROAD_LENGTH = 320; // 220 m ahead of the car plus 100 m behind (seen from the start-screen orbit)
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH + 1.5;
const WALK_WIDTH = 6; // m of sidewalk each side (street trees, lights and scooters stand on it)
const POLICE_FAR = 18; // behind the camera, out of view
const POLICE_CLOSE = 4.6; // just behind the player, in view (bottom of the screen, not covering the car)
const POLICE_HOVER_Z = 2; // tailing a hovering player: one lane over, a little behind (flanking, not covering the car)
const POLICE_HOVER_LIFT = 0.8; // m the chase car floats while the player hovers
const FLANK = 2.1; // m to the side of the player (a bit under a lane, so it stays on a phone screen)
// Garage Driver tab: behind-left of the car, looking past its open driver's door at the billboard.
const DRIVER_CAM = { dx: -2.5, y: 2.2, z: 6.5, lookDx: 1.3, lookY: 0.5, lookZ: -2.8, lift: 0 }; // car and billboard on one sight line; aimed low so both sit above the panel
const CAM_EASE = 3; // 1/s: how fast the camera glides between the run, garage and driver views
const TURNTABLE = { radius: 8.5, height: 3.2, spin: 0.35, lookY: 0.7, lift: 0.22, idle: 2.5 }; // garage orbit; auto-spins after `idle` s
// Start screen: the same orbit, a bit higher and further back, seen from in front of the car on its left, looking
// back down the road (it runs off to the upper left) at the start line and the police lined up behind; drag to spin it.
const START_ORBIT = { radius: 9, height: 3.6, lookY: 1.2, angle: 2.75 };
// Game over: a wider, higher circle so the police cars boxing the car in are all in view.
const BUST_ORBIT = { radius: 14, height: 6.5, spin: 0.32 };
const TUMBLE_TIME = 1.1; // s of the hard-crash tumble
const DRAG_TURN = 0.012; // rad per pixel of horizontal drag

const C_BLACK = new THREE.Color('#000000');
const CAR_SCALE = 0.9; // both roadsters: ~1.7 m wide in 2.5 m lanes
const SIREN_HZ = 2.5; // police light-bar alternation
const FLAT_TIME = 1.0; // s of flat-tyre wobble after a puncture
const DUCK_SQUASH = 0.45; // ducking flattens the car to this much less of its height (and a little wider)
const DUCK_EASE = 22; // 1/s: how fast it squashes down and pops back up
const CAM_DECK_LIFT = 0.7; // the camera rises this fraction of the floor height (riding a deck or a roof)

export const POWER_COLORS: Record<PowerKind, string> = {
  ludicrous: '#ff4fd8',
  autopilot: '#35e0ff',
  supercharger: '#4cff6a',
  hover: '#b18cff',
};

/** Grey-box renderer: draws the sim state, owns nothing about the rules. */
// Kickflip (swipe up), after the real Roadster's thruster stunt: the car pops up level on a puff of gas,
// rolls once along its length mid-air, and lands flat in another puff.
const AIR_TIME = (2 * JUMP_VELOCITY) / GRAVITY;
const ROLL_START = 0.12; // fraction of the airtime spent rising level before the roll
const FLIP_THRUST = 0.5; // fraction of the airtime the thrusters blast under the car
const ROLL_END = 0.82; // roll finished, wheels down, before touchdown
const FLIP_PIVOT = 0.5; // body centre height (m): roll around the middle so the roof never hits the road
// Inside a tube tunnel the camera rides closer and lower, and rolls with the car around the ring.
const TUBE_CAM = { height: 2.9, back: 7.5, lookY: 1.3 };
const TUBE_ANGLE_EASE = 16; // 1/s: smooths the sim's steady slot-to-slot turn into a soft start and stop

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1000);
  private baseFov = 62;
  private car: RoadsterParts;
  /** Parent of the car: placed on the tube wall (and rolled) inside a tunnel, plain lane offset outside. */
  private carMount = new THREE.Group();
  /** Parent of the thruster puffs: rolls around the tube axis with the car so puffs blow off the wall. */
  private puffFrame = new THREE.Group();
  private tunnel = new TunnelView();
  private tubeAngle = 0; // eased angle around the ring (rad) used for the car, camera, puffs
  /** Paint, driver, hat and plate on the player car. */
  readonly style: CarStyle;
  /** Garage open: orbit the camera around the parked car. */
  showcase = false;
  private police: ReturnType<typeof buildPoliceRoadster>;
  private policeZ = POLICE_FAR;
  private policeX = 0;
  private policeHover = 0; // 0..1 eased: the chase car floats while the player hovers
  private coins: THREE.InstancedMesh;
  private cones: THREE.InstancedMesh;
  private powers: THREE.InstancedMesh;
  private laneTex: THREE.CanvasTexture;
  private sideTex: THREE.CanvasTexture;
  private walkTex!: THREE.CanvasTexture;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private raycaster = new THREE.Raycaster();
  private scenery = new Scenery();
  private honkBounce = 0;
  private flipT = -1; // seconds into a kickflip; -1 = not flipping
  private flipDir = 1; // roll direction: toward the last lane change
  private rollPuffed = false;
  private prevX = 0; // car's sideways position last frame (lean and roll direction); follows the ring in a tube
  private puffs = new Puffs();
  /** The hover police car: floats at the start line, flies across the sky now and then during a run. */
  readonly patrol = new PolicePatrol(this.puffs);
  private bust = new BustScene(this.puffs);
  private overBlend = 0;
  private tumbleT = -1; // s into the hard-crash tumble, -1 when none
  private tumbleY = 0;
  private tumbleDir = 1;
  private hoverJets = new HoverJets(this.puffs, CAR_SCALE);
  private policeJets = new HoverJets(this.puffs, CAR_SCALE);
  private flipJets = new HoverJets(this.puffs, CAR_SCALE);
  private shake = 0;
  private flatT = 0; // s left of the flat-tyre wobble after a puncture
  private hazards = new HazardView();
  private highroad = new HighroadView();
  private duckK = 0; // 0..1 eased squash while ducking
  private pitch = 0; // nose up (rad) while climbing a ramp
  private camLift = 0; // eased camera rise with the floor
  private skyLift = 0; // eased camera rise with the car up to the sky lanes
  private skyK = 0; // 0..1 how far up into the sky lanes
  private skyLanes = new SkyLanes();
  private dayNight: DayNight;
  private nightLights = new NightLights();
  private landmarks: Landmarks;
  private batSwarm = new BatSwarm();
  private buildings = new Buildings();
  private traffic = new TrafficView();
  /** Last cycle phase drawn (for the debug overlay). */
  phase = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    const fog = new THREE.Fog('#e9784a', 65, 195); // far enough that cars 100+ m ahead still read
    this.scene.fog = fog;
    this.fog = fog;
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
    road.position.z = -ROAD_LENGTH / 2 + 125;
    this.scene.add(road);

    this.sideTex = makeSideTexture();
    this.sideTex.repeat.set(20, ROAD_LENGTH / 10);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, ROAD_LENGTH), new THREE.MeshLambertMaterial({ map: this.sideTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -ROAD_LENGTH / 2 + 125);
    this.scene.add(ground);
    // Sidewalks along both sides (lighter concrete, slab joints) and a curb at the road's edge.
    this.walkTex = makeWalkTexture();
    this.walkTex.repeat.set(1, ROAD_LENGTH / 2.5);
    const walkMat = new THREE.MeshLambertMaterial({ map: this.walkTex });
    const curbMat = new THREE.MeshLambertMaterial({ color: '#d8d2c6' });
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(WALK_WIDTH, ROAD_LENGTH), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * (ROAD_WIDTH / 2 + WALK_WIDTH / 2), 0.04, -ROAD_LENGTH / 2 + 125);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, ROAD_LENGTH), curbMat);
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.05), 0.06, -ROAD_LENGTH / 2 + 125);
      this.scene.add(walk, curb);
    }

    this.car = buildRoadster('#e8344e', { liveDoors: true });
    this.car.group.scale.setScalar(CAR_SCALE);
    this.carMount.add(this.car.group);
    this.scene.add(this.carMount);
    this.style = new CarStyle(this.car);
    this.police = buildPoliceRoadster();
    this.police.group.scale.setScalar(CAR_SCALE);
    this.police.group.position.z = POLICE_FAR;
    this.scene.add(this.police.group, this.patrol.group);


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
    this.puffFrame.add(this.puffs.mesh);
    this.puffs.mesh.position.y = -TUBE_CY; // frame origin sits on the tube axis
    this.puffFrame.position.y = TUBE_CY;
    this.screenHits = new ScreenHits(this.camera);
    this.scene.add(this.screenHits.group, this.puddles.group);
    this.scene.add(this.startLine.group, this.waitingPolice.group, this.skyLanes.group, this.bust.group, this.fanBoards.group, this.fanSpots.group, this.sideline.group, this.hobbyBalls.group);
    this.scenery.hideAt = (x, z) => this.fanBoards.covers(x, z);
    void document.fonts?.ready.then(() => this.fanBoards.refresh());
    this.scene.add(this.traffic.group);
    void this.traffic.load();
    this.scene.add(this.hazards.group, this.highroad.group);
    void this.hazards.load();
    this.scene.add(this.nightLights.group, this.landmarks.group, this.batSwarm.group, this.buildings.group, this.puffFrame, this.tunnel.group);

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
  /** A cone or longhorn was hit: it flies up and smacks into the screen (from the car's lane, just ahead). */
  toScreen(kind: ScreenHitKind, x: number, y = 0.5): void { this.screenHits.hit(kind, x, -1.8, y); }
  /** A run starts: lay a fresh random roadside (buildings and props). */
  newRun(): void { this.buildings.newRun(); this.scenery.newRun(); this.bust.end(); this.tumbleT = -1; }
  /**
   * Game over: police cars close in from every side and the camera circles. hard (ran out of batteries):
   * the car tumbles and lands on its roof; caught by the police: it stays on its wheels.
   */
  busted(x: number, y: number, hard: boolean): void {
    this.bust.begin(x);
    this.orbitA = 0; // start the circle from behind the car, where the chase camera is
    if (hard) { this.tumbleT = 0; this.tumbleY = y; this.tumbleDir = Math.random() < 0.5 ? -1 : 1; }
  }
  /** Drove over a spike strip: the car wobbles and sags on a flat tyre for a second, air hissing from the wheels. */
  puncture(): void {
    this.flatT = FLAT_TIME;
    for (const cx of [-0.7, 0.7]) for (const cz of [-1.15, 1.15]) {
      for (let n = 0; n < 6; n++) this.puffs.emit(this.prevX + cx, 0.25, cz, cx * 5, 1.2 + Math.random(), (Math.random() - 0.5) * 2, 0.3, 0.6);
    }
  }

  render(w: World, dt: number, time: number): void {
    this.clock = time;
    const car = this.car.group;
    // Tube tunnel: ease the ring angle (and catch the sim's full-turn wraps), blend road <-> wall at the ends.
    if (w.tube) {
      if (w.angle - this.tubeAngle > Math.PI) this.tubeAngle += Math.PI * 2;
      else if (this.tubeAngle - w.angle > Math.PI) this.tubeAngle -= Math.PI * 2;
      this.tubeAngle += (w.angle - this.tubeAngle) * Math.min(1, dt * TUBE_ANGLE_EASE);
    } else this.tubeAngle = 0;
    const k = tubeBlend(w);
    const ang = this.tubeAngle * k; // roll of the car, camera and puffs around the tube axis
    // Sideways position for lean and roll direction: in a tube, distance around the ring in lane units.
    const lat = w.tube ? (this.tubeAngle / SLOT_ANGLE) * LANE_WIDTH : w.x;
    const dLat = Math.abs(this.prevX - lat) < 4 ? this.prevX - lat : 0;
    const lean = THREE.MathUtils.clamp(dLat * 0.5, -0.25, 0.25);
    if (Math.abs(dLat) > 0.001) this.flipDir = dLat > 0 ? 1 : -1;
    this.prevX = lat;
    const px = w.x * (1 - k); // car's x in the rolled puff frame (0 on the wall, lane x on the road)
    // A normal jump (swipe up) is a kickflip; hovering and landing from a hover aren't.
    if (w.y <= w.floor) {
      if (this.flipT >= 0 && this.flipT < AIR_TIME * ROLL_END) {
        // Landed on a car roof before the roll was done: finish it in a blink.
        this.flipT = Math.max(this.flipT, AIR_TIME * ROLL_END - 0.08);
      } else {
        if (this.flipT >= 0) this.puffs.corners(px, w.floor, 0.5); // touchdown
        this.flipT = -1;
      }
    } else if (this.flipT < 0 && w.power !== 'hover' && w.vy > JUMP_VELOCITY * 0.9) {
      this.flipT = 0;
      this.rollPuffed = false;
      this.puffs.corners(px, w.y, 0.7); // lift-off blast
      this.puffs.corners(px, w.floor, 0.6);
    }
    let roll = 0;
    if (this.flipT >= 0) {
      this.flipT += dt;
      // Thrust: the hover jets fire hard under the car while it climbs, fading out near the top.
      const thrust = 1 - this.flipT / (AIR_TIME * FLIP_THRUST);
      if (thrust > 0 && w.phase === 'running') this.flipJets.update(px, w.y, 0, w.speed, dt, time, 1.8 * thrust);
      const p = THREE.MathUtils.clamp((this.flipT / AIR_TIME - ROLL_START) / (ROLL_END - ROLL_START), 0, 1);
      roll = this.flipDir * Math.PI * 2 * p * p * (3 - 2 * p);
      if (p > 0 && !this.rollPuffed) {
        // Side thrusters kick the roll off: puffs from the side that pushes up.
        this.rollPuffed = true;
        for (const cz of [-1.24, -0.6, 0, 0.6, 1.24]) for (let n = 0; n < 3; n++) this.puffs.emit(px + this.flipDir * 0.8, w.y + 0.3, cz, this.flipDir * 3.5, -2, 0, 0.32, 0.55);
      }
    }
    // Mount: lane offset on the road, a point on the tube wall (wheels to the wall) inside, blended between.
    const wallX = TUNNEL_RADIUS * Math.sin(this.tubeAngle), wallY = TUBE_CY - TUNNEL_RADIUS * Math.cos(this.tubeAngle);
    this.carMount.position.set(THREE.MathUtils.lerp(w.x, wallX, k), wallY * k, 0);
    this.carMount.rotation.z = ang;
    this.puffFrame.rotation.z = ang;
    car.position.set(FLIP_PIVOT * Math.sin(roll), w.y + FLIP_PIVOT * (1 - Math.cos(roll)), 0);
    // Nose up while rolling up a ramp, level again on the deck.
    this.pitch += (Math.atan(rampSlope(w)) - this.pitch) * Math.min(1, dt * 18);
    car.rotation.set((w.y > w.floor && roll === 0 ? -0.06 : 0) + this.pitch, 0, lean + roll);
    if (this.tumbleT >= 0 && !this.showcase) {
      // Hard crash: a hop, a barrel roll and a half, and it ends upside down on its roof, skidded round.
      this.tumbleT += dt;
      const p = Math.min(1, this.tumbleT / TUMBLE_TIME), ease = 1 - Math.pow(1 - p, 2);
      const r = Math.PI * 3 * ease * this.tumbleDir;
      car.rotation.set(0, 0.7 * ease * this.tumbleDir, r);
      car.position.set(FLIP_PIVOT * Math.sin(r) + 0.8 * ease * this.tumbleDir, this.tumbleY * (1 - p) + Math.sin(p * Math.PI) * 2.2 + FLIP_PIVOT * (1 - Math.cos(r)) + 0.08 * ease, 0);
      if (p >= 1 && this.tumbleT < TUMBLE_TIME + 1.5 && Math.random() < 0.5) this.puffs.emit(px + (Math.random() - 0.5) * 1.6, 0.4, (Math.random() - 0.5) * 2.5, 0, 1.2, 0, 0.35, 1.2); // smoke
    }
    if (this.flatT > 0) {
      // Flat tyre: sag onto the front-left wheel and wobble, easing off; a thin hiss of air keeps leaking.
      this.flatT = Math.max(0, this.flatT - dt);
      const k = this.flatT / FLAT_TIME;
      car.position.y -= 0.12 * Math.min(1, k * 3);
      car.rotation.z += (0.07 + Math.sin(this.flatT * 38) * 0.06) * k;
      car.rotation.x += 0.05 * k;
      if (Math.random() < k * 0.6) this.puffs.emit(px - 0.7, 0.2, -1.15, -2.5, 0.8, 0, 0.18, 0.4);
    }
    if (w.power === 'hover' && w.phase === 'running') {
      // Hover: air bursts blast down from under the car and roll out over the road in puffs.
      car.rotation.z += Math.sin(time * 3.1) * 0.035;
      car.rotation.x += Math.sin(time * 2.3) * 0.025;
      this.hoverJets.update(px, w.y, 0, w.speed, dt, time);
    }
    this.puffs.update(dt, w.phase === 'running' ? w.speed : 0);
    this.honkBounce = Math.max(0, this.honkBounce - dt * 4);
    // Ducking (swipe down): squash flat and a little wider, then pop back up.
    this.duckK += ((isDucking(w) && w.phase === 'running' ? 1 : 0) - this.duckK) * Math.min(1, dt * DUCK_EASE);
    const squash = 1 - DUCK_SQUASH * this.duckK, widen = 1 + 0.12 * this.duckK;
    car.scale.set(CAR_SCALE * widen, CAR_SCALE * squash * (1 + Math.sin(this.honkBounce * Math.PI) * 0.25), CAR_SCALE * widen);
    // Blink during the post-crash grace period.
    car.visible = w.invuln <= 0 || Math.floor(time * 12) % 2 === 0;
    // Glow in the power-up's color.
    const rest = this.car.paint.userData as { glow?: string; glowIntensity?: number };
    if (w.power) this.car.paint.emissive.copy(this.powerColor(w.power));
    else if (rest.glow) this.car.paint.emissive.set(rest.glow);
    else this.car.paint.emissive.copy(C_BLACK);
    this.car.paint.emissiveIntensity = w.power ? 0.35 + Math.sin(time * 10) * 0.15 : rest.glowIntensity ?? 0;

    // Police: slides in close after a crash, drops back out of view otherwise. When the player hovers,
    // the police hovers too and tails them (a playful chase, no siren).
    const hovering = w.phase === 'running' && w.power === 'hover' && !w.tube;
    this.policeHover += ((hovering ? 1 : 0) - this.policeHover) * Math.min(1, dt * 2);
    const targetZ = policeClose(w) && w.phase === 'running' ? POLICE_CLOSE : hovering ? POLICE_HOVER_Z : POLICE_FAR;
    this.policeZ += (targetZ - this.policeZ) * Math.min(1, dt * (targetZ < this.policeZ ? 2.5 : 0.8));
    // Hover chase: one lane toward the middle (the left lane from the centre lane).
    const flank = this.policeHover > 0.5 && !policeClose(w) ? (w.x > 0.1 ? -FLANK : FLANK) : 0;
    this.policeX += (w.x + flank - this.policeX) * Math.min(1, dt * 3);
    this.police.group.position.set(this.policeX, 0, this.policeZ);
    this.police.group.rotation.z = 0;
    if (k > 0) {
      // In a tube the police rides the bottom of the ring too, so it never sinks into the curved wall.
      const pa = (this.policeX / LANE_WIDTH) * SLOT_ANGLE;
      this.police.group.position.set(
        THREE.MathUtils.lerp(this.policeX, TUNNEL_RADIUS * Math.sin(pa), k), (TUBE_CY - TUNNEL_RADIUS * Math.cos(pa)) * k, this.policeZ);
      this.police.group.rotation.z = pa * k;
    }
    const ph = smooth(this.policeHover);
    this.police.group.position.y += ph * (POLICE_HOVER_LIFT + Math.sin(time * 2.6) * 0.1);
    this.police.group.rotation.x = ph * Math.sin(time * 1.9) * 0.04;
    if (ph > 0.02) {
      this.policeJets.update(this.policeX, this.police.group.position.y, this.policeZ, w.speed, dt, time, ph); // same bursts as the player
    }
    this.police.group.visible = this.policeZ < POLICE_FAR - 1 && !this.bust.active; // the bust fleet takes over
    if (this.police.group.visible) this.police.updateLights(time * SIREN_HZ);
    this.patrol.update(w, dt, time, this.showcase);
    if (this.bust.active) this.patrol.group.visible = false;

    // Camera trails the car; widens and shakes for speed and bumps.
    this.shake = Math.max(0, this.shake - dt);
    const rumble = w.phase === 'running' && w.power === 'ludicrous' ? 0.07 : 0; // a light, steady shake through Ludicrous
    const sx = (Math.random() - 0.5) * (this.shake + rumble), sy = (Math.random() - 0.5) * (this.shake + rumble);
    const hov = w.power === 'hover' ? 0.6 : 0;
    this.camLift += ((w.tube ? 0 : w.floor * CAM_DECK_LIFT) - this.camLift) * Math.min(1, dt * 4);
    // Sky lanes: the camera climbs with the car, looking a little down at the city below.
    const skyY = w.tube ? 0 : Math.max(0, w.y - 2);
    this.skyLift += (skyY - this.skyLift) * Math.min(1, dt * 5);
    this.skyK = THREE.MathUtils.clamp((this.skyLift - 4) / (SKY_HEIGHT - 10), 0, 1);
    this.camera.position.set(w.x * 0.6 + sx, 5 + sy + hov + this.camLift + this.skyLift + this.skyK * 1.2, 9.5 + this.skyK * 1.5);
    this.camTarget.set(w.x * 0.4, 1 + this.camLift + this.skyLift - this.skyK * 1.5, -12);
    this.camera.up.set(0, 1, 0);
    if (k > 0) {
      // Inside the tube: the camera sits behind the car in the car's rolled frame, so the car stays
      // upright on screen and the tunnel spins around it.
      const c = Math.cos(ang), s = Math.sin(ang);
      const roll = (x: number, y: number, out: THREE.Vector3, z: number) =>
        out.set(x * c - (y - TUBE_CY) * s, TUBE_CY + x * s + (y - TUBE_CY) * c, z);
      roll(sx, TUBE_CAM.height + sy + hov, this.tmpV, TUBE_CAM.back);
      this.camera.position.lerp(this.tmpV, k);
      roll(0, TUBE_CAM.lookY, this.tmpV, -12);
      this.camTarget.lerp(this.tmpV, k);
      this.camera.up.set(-s, c, 0);
    }
    // Start screen and garage: an orbit round the car you can drag; the Driver tab frames car + billboard.
    // Every switch glides (not cuts), including back to the run camera when the run starts.
    const ease = Math.min(1, dt * CAM_EASE);
    if (this.showcase && this.bust.active) this.bust.end();
    // Two hover police fly alongside after a hit, while the chase is on (not in a tunnel or up in the sky).
    const escort = w.phase === 'running' && w.chase > 0 && !w.tube && w.y < 4 && !this.showcase;
    this.bust.update(dt, time, escort, w.x, w.floor, w.speed);
    this.overBlend += ((w.phase === 'over' && this.bust.active ? 1 : 0) - this.overBlend) * Math.min(1, dt * 2);
    const o = smooth(this.overBlend);
    if (this.bust.active && !this.showcase) this.orbitA += dt * BUST_ORBIT.spin;
    if (w.phase === 'ready' && this.lastPhase !== 'ready') {
      this.orbitGoal = START_ORBIT.angle;
      this.orbitA = START_ORBIT.angle + Math.atan2(Math.sin(this.orbitA - START_ORBIT.angle), Math.cos(this.orbitA - START_ORBIT.angle)); // the short way round
    }
    this.lastPhase = w.phase;
    if (this.orbitGoal !== null && !this.showcase && w.phase === 'ready') {
      this.orbitA += (this.orbitGoal - this.orbitA) * Math.min(1, dt * 2.5);
      if (Math.abs(this.orbitGoal - this.orbitA) < 0.001) this.orbitGoal = null;
    }
    const orbiting = this.showcase || w.phase === 'ready' || this.bust.active;
    if (!orbiting && this.camBlend > 0.001) {
      // Leaving the orbit (a run starts): swing round behind the car while gliding, never through it.
      const a = Math.atan2(Math.sin(this.orbitA), Math.cos(this.orbitA));
      this.orbitA = a - a * Math.min(1, dt * CAM_EASE * 2);
    }
    this.camBlend += ((orbiting ? 1 : 0) - this.camBlend) * ease;
    this.focusBlend += ((this.showcase && this.driverFocus ? 1 : 0) - this.focusBlend) * ease;
    this.garageBlend += ((this.showcase ? 1 : 0) - this.garageBlend) * ease;
    const e = smooth(this.camBlend), f = smooth(this.focusBlend), g = smooth(this.garageBlend);
    if (this.showcase && !this.driverFocus && time - this.lastDrag > TURNTABLE.idle) this.orbitA += dt * TURNTABLE.spin;
    if (e > 0.001) {
      const a = this.orbitA;
      const r = THREE.MathUtils.lerp(THREE.MathUtils.lerp(START_ORBIT.radius, BUST_ORBIT.radius, o), TURNTABLE.radius, g);
      const h = THREE.MathUtils.lerp(THREE.MathUtils.lerp(START_ORBIT.height, BUST_ORBIT.height, o), TURNTABLE.height, g);
      this.tmpV.set(w.x + Math.sin(a) * r, h, Math.cos(a) * r);
      this.tmpV.lerp(this.tmpV2.set(w.x + DRIVER_CAM.dx, DRIVER_CAM.y, DRIVER_CAM.z), f);
      this.camera.position.lerp(this.tmpV, e);
      this.tmpV.set(w.x, THREE.MathUtils.lerp(START_ORBIT.lookY, TURNTABLE.lookY, g), 0).lerp(this.tmpV2.set(w.x + DRIVER_CAM.lookDx, DRIVER_CAM.lookY, DRIVER_CAM.lookZ), f);
      this.camTarget.lerp(this.tmpV, e);
      this.camera.up.set(0, 1, 0);
    }
    this.camera.lookAt(this.camTarget);
    if (e > 0.001) {
      const vw = window.innerWidth, vh = window.innerHeight;
      this.camera.setViewOffset(vw, vh, 0, vh * THREE.MathUtils.lerp(TURNTABLE.lift, DRIVER_CAM.lift, f) * g * e, vw, vh); // keep the car above the garage panel
    } else if (this.camera.view) this.camera.clearViewOffset();
    // Doors: tap the car to open/close both (start screen, garage); the Driver tab opens the driver's door.
    // They always close for the run.
    const parked = w.phase !== 'running';
    const wantL = parked && (this.doorsOpen || (this.showcase && this.driverFocus)) ? 1 : 0;
    const wantR = parked && this.doorsOpen ? 1 : 0;
    this.doorL += (wantL - this.doorL) * Math.min(1, dt * 2.5);
    this.doorR += (wantR - this.doorR) * Math.min(1, dt * 2.5);
    if (!parked) this.doorsOpen = false;
    this.car.setDoorOpen(smooth(this.doorL), smooth(this.doorR));
    // The start line (billboards, crowd, parked police) is part of the road: the car drives past it.
    this.startLine.update(w.distance, time);
    this.waitingPolice.update(w.distance, w.phase === 'ready', time);
    for (const m of [this.coins, this.cones, this.powers]) m.visible = !this.showcase;
    // Widen the view as speed builds (more road rushing past the edges reads as faster), plus a kick for Ludicrous.
    const speedK = w.phase === 'running' ? THREE.MathUtils.clamp((w.speed - SPEED_START) / (SPEED_MAX - SPEED_START), 0, 1.5) : 0;
    const fov = this.baseFov + speedK * 7 + (w.power === 'ludicrous' ? 6 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }

    this.scenery.update(w.distance);
    this.laneTex.offset.y = (w.distance / 8) % 1;
    this.sideTex.offset.y = (w.distance / 10) % 1;
    this.walkTex.offset.y = (w.distance / 2.5) % 1;

    this.phase = dayPhase(w);
    this.dayNight.update(this.phase);
    this.nightLights.update(w.distance, this.dayNight.lights, time);
    this.landmarks.update(w.distance);
    this.buildings.update(w.distance, this.dayNight.lights);
    this.batSwarm.update(w, dt, time);
    this.skyLanes.update(w, this.skyK, time);
    this.fanBoards.update(w.distance, !w.tube, time);
    this.hobbyBalls.update(w, time, !this.showcase);
    this.fanSpots.update(w.distance, !w.tube && !this.showcase);
    this.sideline.update(time);
    this.puddles.update(w);
    this.tunnel.update(w, this.dayNight.lights, time);
    this.traffic.update(w, this.dayNight.lights, time, !this.showcase);
    this.hazards.update(w, this.dayNight.lights, time, !this.showcase);
    this.highroad.update(w, !this.showcase);

    let nc = 0, nk = 0, np = 0;
    for (const e of w.entities) {
      if (!e.alive) continue;
      const z = -(e.s - w.distance);
      const x = laneX(e.lane);
      if (e.slot !== undefined) {
        // Tube contents stand on the wall at their slot's angle.
        if (e.kind === 'coin' && nc < MAX_COINS) {
          this.placeOnRing(e.slot * SLOT_ANGLE, 0.9 + Math.sin(time * 4 + e.s) * 0.08, z, time * 3 + e.s);
          this.coins.setMatrixAt(nc++, this.dummy.matrix);
        } else if (e.kind === 'cone' && nk < MAX_CONES) {
          this.placeOnRing(e.slot * SLOT_ANGLE, 0, z, 0);
          this.cones.setMatrixAt(nk++, this.dummy.matrix);
        }
        continue;
      }
      if (e.kind === 'coin' && nc < MAX_COINS) {
        this.place(x, (e.y ?? 0.9) + Math.sin(time * 4 + e.s) * 0.08 + coinRainLift(e.s, w), z, time * 3 + e.s);
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

    this.screenHits.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** The chosen driver: picture on the start-line billboards, name on the fans' signs ('' hides the billboards). */
  setDriver(url: string, name = '', id = ''): void {
    this.startLine.setDriver(url, name, id);
    const theme = themeFor(id);
    this.fanBoards.setTheme(theme.ads, theme.cutouts);
    this.hobbyBalls.setSport(theme.sport);
    this.fanSpots.setTheme(theme, name);
    const prop = theme.prop ? this.startLine.props[theme.prop] : null;
    this.sideline.setScenes([
      ...(prop ? [{ anchor: prop, players: theme.startPlayers }] : []),
      ...(prop ? this.fanSpots.anchors().map((anchor, i) => ({ anchor, players: this.fanSpots.playerLists()[i], size: SPOT_SCALE })) : []),
      ...this.fanBoards.anchors.map((anchor, i) => ({ anchor, players: theme.boardPlayers[i % Math.max(1, theme.boardPlayers.length)] ?? [] })),
      { anchor: this.hobbyBalls.anchor, players: HobbyBalls.players(theme.sport), size: 1.25 },
    ]);
  }
  /** Garage Driver tab: frame the car (driver's door open) in front of the billboard. */
  focusDriver(on: boolean): void { this.driverFocus = on; }
  private startLine = new StartLine();
  private waitingPolice = new WaitingPolice();
  private fanBoards = new FanBoards();
  private fanSpots = new FanSpots();
  private sideline = new Sideline();
  private hobbyBalls = new HobbyBalls();
  private screenHits!: ScreenHits;
  /** Drove through a puddle (water) or mud: main shows the splash on the screen. */
  onSplash: ((kind: SplashKind) => void) | null = null;
  private puddles = new Puddles((k) => this.onSplash?.(k));
  private driverFocus = false;
  private camBlend = 0;
  private focusBlend = 0;
  private doorL = 0;
  private doorR = 0;
  private doorsOpen = false;
  private garageBlend = 0;
  private orbitA = START_ORBIT.angle;
  private fog!: THREE.Fog;
  /** HD graphics (a switch in the Sound panel): render at the screen's full sharpness and see further down the road. */
  setHD(on: boolean): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, on ? 3 : 2));
    this.fog.near = on ? 90 : 65;
    this.fog.far = on ? 215 : 195;
    this.resize();
  }
  private orbitGoal: number | null = null; // eases the orbit back to the start angle when the start screen opens
  private lastPhase = '';
  private lastDrag = -100;
  private clock = 0;
  /** Drag on the start screen or in the garage: spin the camera round the car. */
  orbitBy(dxPixels: number): void { this.orbitA -= dxPixels * DRAG_TURN; this.lastDrag = this.clock; this.orbitGoal = null; }
  /** Tap the parked car: open or close its doors. */
  toggleDoors(): void { this.doorsOpen = !this.doorsOpen; }
  private tmpV2 = new THREE.Vector3();

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

  /** Like place, on the tube wall at angle `a` (0 = bottom), `lift` metres in from the wall, rolled to face the axis. */
  private placeOnRing(a: number, lift: number, z: number, rotY: number): void {
    const r = TUNNEL_RADIUS - lift;
    this.dummy.position.set(r * Math.sin(a), TUBE_CY - r * Math.cos(a), z);
    this.dummy.rotation.set(0, rotY, a, 'ZYX'); // spin about the wall normal, then roll onto the wall
    this.dummy.updateMatrix();
    this.dummy.rotation.order = 'XYZ';
  }

  private camTarget = new THREE.Vector3();
  private tmpV = new THREE.Vector3();
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

/** Downtown pavement: warm grey concrete paving slabs with darker joints (was desert sand). */
function makeSideTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b9b0a2';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#b1a798';
  g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  g.fillStyle = '#9b9183';
  g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sidewalk: pale concrete with a joint line across every slab and a darker tree-pit strip near the curb. */
function makeWalkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d3cbbd'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#c4bcad'; g.fillRect(0, 0, 128, 2); // joint
  g.fillStyle = '#c9c1b2'; g.fillRect(0, 0, 3, 32); g.fillRect(125, 0, 3, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smooth(k: number): number { return k * k * (3 - 2 * k); }
