import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANE_COUNT, LANE_WIDTH } from '../sim/config';
import type { World } from '../sim/world';

// Bat Swarm view: the bridge the road passes under, bats bursting out of it, and the
// coin rain lift. The coins themselves come from the sim (sim/batswarm.ts).
const ROAD_HALF = (LANE_COUNT * LANE_WIDTH + 1.5) / 2;
const BRIDGE_BEFORE = 3; // m the bridge sits before the coin rain starts
const BRIDGE_Y = 6.2; // underside height of the deck
const BRIDGE_DEPTH = 7; // m along the road
const BRIDGE_COLOR = '#8a7484';
const BRIDGE_VISIBLE_AHEAD = 230; // m; show it from beyond the fog

const BAT_COUNT = 70;
const BAT_COLOR = '#7a4fc4'; // friendly violet: the old near-black read as holes in the sky (Ofir: too dark)
const BAT_TRIGGER = 85; // m from the bridge when the bats burst out
const BAT_TIME = 7; // s the swarm lasts
const BAT_STAGGER = 1.6; // s spread of take-off times
const BAT_SPEED_MIN = -3, BAT_SPEED_MAX = 6; // m/s toward the camera relative to the bridge (which comes at car speed)
const BAT_RISE_MIN = 0.2, BAT_RISE_MAX = 1.6; // m/s up
const BAT_SPREAD = 4; // m/s sideways at most
const BAT_SCALE_MIN = 1.4, BAT_SCALE_MAX = 2.2;
const FLAP_SPEED = 19; // rad/s
const FLAP_ANGLE = 0.85; // rad
const BAT_PITCH = 0.9; // rad; tips the wing plane toward the camera so bats don't render edge-on

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
  private bats: THREE.InstancedMesh;
  private time = { value: 0 };
  private dummy = new THREE.Object3D();
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

    const mat = new THREE.MeshBasicMaterial({ color: BAT_COLOR, side: THREE.DoubleSide, fog: false });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.time;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        vec3 transformed = vec3(position);
        float wingR = abs(position.x);
        float flap = sin(uTime * ${FLAP_SPEED.toFixed(1)} + float(gl_InstanceID) * 1.7) * ${FLAP_ANGLE.toFixed(2)};
        transformed.x = sign(position.x) * wingR * cos(flap);
        transformed.y = position.y + wingR * sin(flap);`,
      );
    };
    this.bats = new THREE.InstancedMesh(buildBat(), mat, BAT_COUNT);
    this.bats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bats.frustumCulled = false;
    this.bats.count = 0;
    this.group.add(this.bats);

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

  update(w: World, dt: number, time: number): void {
    this.time.value = time;
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
    if (this.burstT < 0) { this.bats.count = 0; return; }
    if (w.phase === 'running') this.burstT += dt;
    if (this.burstT > BAT_TIME + BAT_STAGGER) { this.burstT = -1; this.bats.count = 0; return; }

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
      this.dummy.rotation.set(BAT_PITCH, this.side[i] * 0.05, sway * 0.35);
      this.dummy.scale.setScalar(this.size[i] * Math.min(1, t * 3));
      this.dummy.updateMatrix();
      this.bats.setMatrixAt(n++, this.dummy.matrix);
    }
    this.bats.count = n;
    this.bats.instanceMatrix.needsUpdate = true;
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

/** Low-poly bat: a small body and two wings in the XZ plane; the shader flaps |x| > 0. */
function buildBat(): THREE.BufferGeometry {
  const wing = [
    // inner front, tip, scallop / inner front, scallop, inner back
    0.06, 0, 0.2, 0.78, 0, 0.06, 0.42, 0, -0.12,
    0.06, 0, 0.2, 0.42, 0, -0.12, 0.06, 0, -0.2,
    // second scallop point to the tip for a jagged trailing edge
    0.42, 0, -0.12, 0.78, 0, 0.06, 0.66, 0, -0.16,
  ];
  const pos: number[] = [];
  for (let i = 0; i < wing.length; i += 3) pos.push(wing[i], wing[i + 1], wing[i + 2]);
  for (let i = 0; i < wing.length; i += 3) pos.push(-wing[i], wing[i + 1], wing[i + 2]);
  // body diamond and ears
  pos.push(0, 0, 0.34, 0.09, 0, 0, -0.09, 0, 0);
  pos.push(-0.09, 0, 0, 0.09, 0, 0, 0, 0, -0.3);
  pos.push(-0.07, 0, 0.3, -0.02, 0, 0.3, -0.06, 0, 0.42);
  pos.push(0.02, 0, 0.3, 0.07, 0, 0.3, 0.06, 0, 0.42);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
