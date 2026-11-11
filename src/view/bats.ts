import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANE_COUNT, LANE_WIDTH } from '../sim/config';
import type { World } from '../sim/world';
import { buildBat as buildBatModel, type BatParts } from './batModel';

// Bat Swarm view: the bridge the road passes under, bats bursting out of it, and the
// coin rain lift. The coins themselves come from the sim (sim/batswarm.ts).
const ROAD_HALF = (LANE_COUNT * LANE_WIDTH + 1.5) / 2;
const BRIDGE_BEFORE = 3; // m the bridge sits before the coin rain starts
const BRIDGE_Y = 6.2; // underside height of the deck
const BRIDGE_DEPTH = 7; // m along the road
const BRIDGE_COLOR = '#8a7484';
const BRIDGE_VISIBLE_AHEAD = 230; // m; show it from beyond the fog

const BAT_COUNT = 70;
const BAT_TRIGGER = 85; // m from the bridge when the bats burst out
const BAT_TIME = 7; // s the swarm lasts
const BAT_STAGGER = 1.6; // s spread of take-off times
const BAT_SPEED_MIN = -3, BAT_SPEED_MAX = 6; // m/s toward the camera relative to the bridge (which comes at car speed)
const BAT_RISE_MIN = 0.2, BAT_RISE_MAX = 1.6; // m/s up
const BAT_SPREAD = 4; // m/s sideways at most
const BAT_SCALE_MIN = 2.6, BAT_SCALE_MAX = 4; // the model is 0.8 m across: 2-3 m wingspans read from the car
const FLAP_SPEED = 14; // rad/s of the wing beat
const FLAP_ANGLE = 0.82; // rad each wing swings about its shoulder
const BAT_PITCH = -0.25; // rad; tips the face down a little toward the car below

// Coins in a swarm stretch fall from the sky as they come closer.
const RAIN_LAND = 14; // m ahead where a coin reaches its normal height
const RAIN_SLOPE = 0.4; // m of lift per m further ahead
const RAIN_MAX = 13; // m

/** Extra height for a coin at road position `s` (0 outside a swarm). */
export function coinRainLift(s: number, w: World): number {
  if (w.swarmAt < 0 || s < w.swarmAt - 0.5 || s > w.swarmEnd + 0.5) return 0;
  return Math.min(RAIN_MAX, Math.max(0, (s - w.distance - RAIN_LAND) * RAIN_SLOPE));
}

export class BatSwarm {
  readonly group = new THREE.Group();
  private bridge: THREE.Mesh;
  private model: BatParts;
  private parts: THREE.InstancedMesh[]; // body, left wing, right wing
  private dummy = new THREE.Object3D();
  private mb = new THREE.Matrix4(); private ml = new THREE.Matrix4(); private mr = new THREE.Matrix4();
  private burstFor = -1; // swarmAt the current burst belongs to
  private burstT = -1; // s since the burst, -1 = none
  // per-bat random parameters, made once
  private x0 = new Float32Array(BAT_COUNT);
  private delay = new Float32Array(BAT_COUNT);
  private fwd = new Float32Array(BAT_COUNT);
  private rise = new Float32Array(BAT_COUNT);
  private side = new Float32Array(BAT_COUNT);
  private wobble = new Float32Array(BAT_COUNT);
  private size = new Float32Array(BAT_COUNT);

  constructor() {
    this.bridge = new THREE.Mesh(buildBridge(), new THREE.MeshLambertMaterial({ color: BRIDGE_COLOR }));
    this.bridge.visible = false;
    this.group.add(this.bridge);

    // Codex's bat: three parts drawn as instances (3 draw calls for the whole swarm); each bat's wings beat on their own.
    this.model = buildBatModel();
    this.model.material.fog = false; // stays bright against the dusk sky
    const g = this.model.geometries;
    this.parts = [g.body, g.leftWing, g.rightWing].map((geo) => {
      const mesh = new THREE.InstancedMesh(geo, this.model.material, BAT_COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
      return mesh;
    });

    for (let i = 0; i < BAT_COUNT; i++) {
      this.x0[i] = (Math.random() * 2 - 1) * (ROAD_HALF + 1);
      this.delay[i] = Math.random() * BAT_STAGGER;
      this.fwd[i] = BAT_SPEED_MIN + Math.random() * (BAT_SPEED_MAX - BAT_SPEED_MIN);
      this.rise[i] = BAT_RISE_MIN + Math.random() * (BAT_RISE_MAX - BAT_RISE_MIN);
      this.side[i] = (Math.random() * 2 - 1) * BAT_SPREAD;
      this.wobble[i] = Math.random() * Math.PI * 2;
      this.size[i] = BAT_SCALE_MIN + Math.random() * (BAT_SCALE_MAX - BAT_SCALE_MIN);
    }
  }

  private setCount(n: number): void { for (const m of this.parts) { m.count = n; m.instanceMatrix.needsUpdate = true; } }

  update(w: World, dt: number, time: number): void {
    const bridgeS = w.swarmAt - BRIDGE_BEFORE;
    const rel = bridgeS - w.distance;
    const has = w.swarmAt >= 0 && rel > -BRIDGE_DEPTH * 3 && rel < BRIDGE_VISIBLE_AHEAD;
    this.bridge.visible = has;
    if (has) this.bridge.position.z = -rel;

    if (w.swarmAt >= 0 && w.swarmAt !== this.burstFor && rel < BAT_TRIGGER && rel > 0) {
      this.burstFor = w.swarmAt;
      this.burstT = 0;
    }
    if (w.distance < 1) { this.burstT = -1; this.burstFor = -1; } // new run
    if (this.burstT < 0) { this.setCount(0); return; }
    if (w.phase === 'running') this.burstT += dt;
    if (this.burstT > BAT_TIME + BAT_STAGGER) { this.burstT = -1; this.setCount(0); return; }

    let n = 0;
    for (let i = 0; i < BAT_COUNT; i++) {
      const t = this.burstT - this.delay[i];
      if (t < 0) continue;
      const z = -rel + this.fwd[i] * t;
      if (z > 12) continue; // passed the camera
      const sway = Math.sin(t * 1.6 + this.wobble[i]);
      const x = this.x0[i] + this.side[i] * t + sway * 1.5;
      const y = BRIDGE_Y - 1.2 + this.rise[i] * t + Math.sin(t * 2.3 + this.wobble[i]) * 0.6;
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(BAT_PITCH, Math.PI + this.side[i] * 0.08, sway * 0.35); // facing the camera (the model faces -z)
      this.dummy.scale.setScalar(this.size[i] * Math.min(1, t * 3));
      this.dummy.updateMatrix();
      const flap = Math.sin(time * FLAP_SPEED + i * 1.7) * FLAP_ANGLE;
      this.model.writeInstanceMatrices(this.dummy.matrix, flap, this.mb, this.ml, this.mr);
      this.parts[0].setMatrixAt(n, this.mb); this.parts[1].setMatrixAt(n, this.ml); this.parts[2].setMatrixAt(n, this.mr);
      n++;
    }
    this.setCount(n);
  }
}

/** A plain bridge deck over the road with a pier each side and three low arches. */
function buildBridge(): THREE.BufferGeometry {
  const span = ROAD_HALF * 2 + 10;
  const pierX = ROAD_HALF + 2.2;
  const parts = [
    new THREE.BoxGeometry(span, 1.4, BRIDGE_DEPTH).translate(0, BRIDGE_Y + 0.7, 0),
    new THREE.BoxGeometry(span, 0.8, 0.4).translate(0, BRIDGE_Y + 1.8, BRIDGE_DEPTH / 2 - 0.2), // parapet
    new THREE.BoxGeometry(span, 0.8, 0.4).translate(0, BRIDGE_Y + 1.8, -BRIDGE_DEPTH / 2 + 0.2),
    new THREE.BoxGeometry(2.4, BRIDGE_Y, BRIDGE_DEPTH - 1).translate(-pierX, BRIDGE_Y / 2, 0),
    new THREE.BoxGeometry(2.4, BRIDGE_Y, BRIDGE_DEPTH - 1).translate(pierX, BRIDGE_Y / 2, 0),
  ];
  // Arch ribs under the deck on the near face.
  for (const x of [-pierX * 0.5, pierX * 0.5]) {
    parts.push(new THREE.BoxGeometry(0.7, 1.2, BRIDGE_DEPTH - 0.6).translate(x, BRIDGE_Y - 0.4, 0));
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}
