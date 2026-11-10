import {
  AUTOPILOT_LOOKAHEAD, AUTOPILOT_TIME, BATTERIES, CAR_CLEAR, CAR_ROOF, CHASE_TIME, COIN_VALUE,
  DESPAWN_BEHIND, GRAVITY, JUMP_BUFFER, SLAM_VELOCITY, HIT_DEPTH, HIT_HALF_WIDTH, HOVER_CHARGES_MAX, HOVER_CHARGES_START, HOVER_HEIGHT, HOVER_RISE, HOVER_TIME,
  INTRO_CHASE_TIME,
  INVULN_TIME, JUMP_VELOCITY, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, LUDICROUS_BOOST,
  LUDICROUS_TIME, POWER_CHANCE, POWER_START_AFTER, SPAWN_AHEAD, SPEED_MAX, SPEED_START, STUMBLE_SLOWDOWN, STUMBLE_TIME,
  SWARM_CHANCE, SWARM_LENGTH, SWARM_MIN_GAP, SWARM_PAD,
  ROOF_COIN_HEIGHT, ROOF_COIN_REACH, TRAFFIC_CHANCE, TRAFFIC_FIRST_AT, TRAFFIC_GHOST_DIST, TRAFFIC_RUN, TRAFFIC_SLACK,
  TRAFFIC_SPEED,
  TUNNEL_CHANCE, TUNNEL_EXIT, TUNNEL_FIRST_AT, TUNNEL_LENGTH, TUNNEL_MIN_GAP, TUNNEL_RADIUS, TUNNEL_SLOTS,
} from './config';
import {
  SLOT_ANGLE, TUBE_TURN_SPEED, angleGap, exitSlot, laneToSlot, slotToLane, tunnelItems, wrapSlot,
} from './tunnel';
import { SWARM_SPAN, conesIn, swarmCoins } from './batswarm';
import { dayPhase, isDusk } from './daycycle';
import { createRng, type Rng } from './rng';
import { CHUNK_LENGTH, placeChunk, type PlacedItem } from './chunks';
import { isObstacle, isPower, isTraffic, type EntityKind, type PowerKind } from './spawner';
import { catchTime, catchTimeAtLeast, clearHeight, hitDepth } from './traffic';
import { speedAt, speedLevel } from './speed';

export type { PowerKind } from './spawner';

export interface Entity {
  kind: EntityKind;
  lane: number;
  s: number; // absolute distance along the road
  alive: boolean;
  slot?: number; // set for tunnel contents: slot around the tube's ring (-3..4, 0 = bottom); lane is unused
  v?: number; // m/s along the road: traffic (and the coins of a traffic chunk) drive at TRAFFIC_SPEED
  y?: number; // coins floating over a car roof: height (m); collected only when the car is up there too
  variant?: number; // traffic: which model the view draws (any non-negative integer)
  bumped?: number; // traffic knocked aside by a crash or a shield: run time it happened (no more collisions)
}

export type SimEvent =
  | 'coin' | 'hit' | 'smash' | 'boing' | 'crash' | 'caught' | 'battery'
  | 'power' | 'power-end' | 'swarm' | 'charge' | 'faster' | 'tunnel' | 'jump';
export type Phase = 'ready' | 'running' | 'over';

export const POWER_TIME: Record<PowerKind, number> = {
  ludicrous: LUDICROUS_TIME, autopilot: AUTOPILOT_TIME, hover: HOVER_TIME, supercharger: 0,
};

export interface World {
  phase: Phase;
  kidMode: boolean;
  time: number; // s driven this run
  distance: number; // m driven this run
  speed: number;
  lane: number; // target lane 0..LANE_COUNT-1
  x: number; // current sideways position (m), 0 = centre lane
  y: number; // height above road (m)
  vy: number;
  floor: number; // what the car stands on: 0 = road, CAR_ROOF = riding a car's roof
  coins: number;
  batteries: number;
  invuln: number; // s of post-crash grace left
  stumble: number; // s of post-crash slowdown left
  jumpBuffer: number; // s left on a jump swiped while still in the air
  chase: number; // s the police stays close (a crash now ends the run)
  intro: number; // s of the harmless opening chase left (police shown close, crashes don't end the run)
  hoverCharges: number; // banked hover-button presses
  speedLevel: number; // speed-up steps reached this run ('faster' fires on each)
  power: PowerKind | null; // timed power-up in effect
  powerTime: number; // s left on it
  lastPower: PowerKind | null; // last picked up (for UI events)
  caught: boolean; // run ended by the police
  entities: Entity[]; // pooled: dead entries are reused
  nextRowAt: number;
  dayOffset: number; // shifts the sunset-to-night cycle (debug jumps); kept across runs
  trafficRun: number; // traffic chunks still to lay in the current run of traffic
  swarmAt: number; // s where the current/last Bat Swarm coin rain starts, -1 if none
  swarmEnd: number; // s where it ends
  swarmSeen: boolean; // 'swarm' event already sent for it
  nextSwarmAt: number; // no new swarm laid before this s
  swarmQueued: boolean; // lay one at the next chunk slot whatever the time of day
  tunnelAt: number; // s where the current/last tube tunnel starts, -1 if none
  tunnelEnd: number; // s where it ends
  nextTunnelAt: number; // no new tunnel laid before this s
  tunnelQueued: boolean; // lay one at the next chunk slot (debug)
  tube: boolean; // driving inside a tunnel: steering moves around the ring
  slot: number; // target slot around the ring while in the tube (-3..4, 0 = bottom)
  angle: number; // current angle around the ring (rad, 0 = bottom, + = right); eases toward the slot
  rng: Rng;
}

export const laneX = (lane: number): number => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

const runState = () => ({
  time: 0, distance: 0, speed: SPEED_START, lane: 1, x: 0, y: 0, vy: 0, floor: 0, coins: 0, trafficRun: 0,
  batteries: BATTERIES, invuln: 0, stumble: 0, jumpBuffer: 0, chase: 0, intro: INTRO_CHASE_TIME,
  hoverCharges: HOVER_CHARGES_START, speedLevel: 0,
  power: null, powerTime: 0, lastPower: null, caught: false, nextRowAt: 40,
  swarmAt: -1, swarmEnd: -1, swarmSeen: true, nextSwarmAt: 0, swarmQueued: false,
  tunnelAt: -1, tunnelEnd: -1, nextTunnelAt: TUNNEL_FIRST_AT, tunnelQueued: false, tube: false, slot: 0, angle: 0,
});

export function createWorld(seed = Date.now()): World {
  return { phase: 'ready', kidMode: true, ...runState(), dayOffset: 0, entities: [], rng: createRng(seed) };
}

/** Big Subway Surfers-style numbers: 100 points per metre, 1,000 per coin; counts up smoothly. */
export const SCORE_SCALE = 100;
export function score(w: World): number {
  return Math.floor(w.distance * SCORE_SCALE) + w.coins * COIN_VALUE * SCORE_SCALE;
}

/** Start a fresh run, keeping the entity pool and settings. */
export function start(w: World): void {
  for (const e of w.entities) e.alive = false;
  Object.assign(w, runState(), { phase: 'running' });
}

/** Can't be hurt right now (grace period or a protective power-up). */
export const isShielded = (w: World): boolean =>
  w.invuln > 0 || w.power === 'ludicrous' || w.power === 'autopilot' || w.power === 'hover';

export function steer(w: World, dir: -1 | 1): boolean {
  if (w.phase !== 'running' || w.power === 'autopilot') return false;
  if (w.tube) return turnSlot(w, dir);
  const next = Math.max(0, Math.min(LANE_COUNT - 1, w.lane + dir));
  if (next === w.lane) return false;
  w.lane = next;
  return true;
}

/** Swipe down: in the air, slam straight back down (Subway Surfers' quick drop). */
export function slam(w: World): boolean {
  if (w.phase !== 'running' || w.power === 'hover' || w.y <= w.floor + 0.05) return false;
  w.vy = Math.min(w.vy, -SLAM_VELOCITY);
  return true;
}

/** Hover button: spend a banked charge to hover for HOVER_TIME. */
export function hover(w: World): boolean {
  if (w.phase !== 'running' || w.hoverCharges <= 0 || w.power === 'hover') return false;
  w.hoverCharges--;
  activate(w, 'hover');
  return true;
}

/** Police is shown right behind the car (after a crash, or the opening chase). */
export const policeClose = (w: World): boolean => w.chase > 0 || w.intro > 0;

export function jump(w: World): boolean {
  if (w.phase !== 'running' || w.power === 'hover') return false;
  if (w.y > w.floor + 1e-6) { w.jumpBuffer = JUMP_BUFFER; return false; } // fires on touchdown
  w.vy = JUMP_VELOCITY;
  w.y = w.floor + 0.0001;
  return true;
}

const EVENTS: SimEvent[] = [];
const SCORES: number[] = new Array(LANE_COUNT).fill(0);

export function step(w: World, dt: number): SimEvent[] {
  const events = EVENTS;
  events.length = 0; // reused every step (120 Hz): callers must consume before the next step
  if (w.phase !== 'running') return events;

  w.time += dt;
  w.invuln = Math.max(0, w.invuln - dt);
  w.stumble = Math.max(0, w.stumble - dt);
  w.jumpBuffer = Math.max(0, w.jumpBuffer - dt);
  w.chase = Math.max(0, w.chase - dt);
  w.intro = Math.max(0, w.intro - dt);
  if (w.power) {
    w.powerTime -= dt;
    if (w.powerTime <= 0) { w.power = null; w.powerTime = 0; events.push('power-end'); }
  }

  const level = speedLevel(w.time);
  if (level > w.speedLevel) { w.speedLevel = level; events.push('faster'); }
  let speed = speedAt(w.time);
  if (w.stumble > 0) speed *= 1 - STUMBLE_SLOWDOWN * (w.stumble / STUMBLE_TIME);
  if (w.power === 'ludicrous') speed *= LUDICROUS_BOOST;
  w.speed = speed;
  w.distance += speed * dt;
  if (!w.swarmSeen && w.swarmAt >= 0 && w.distance >= w.swarmAt) { w.swarmSeen = true; events.push('swarm'); }

  if (!w.tube && w.tunnelAt >= 0 && w.distance >= w.tunnelAt && w.distance < w.tunnelEnd) {
    enterTube(w);
    events.push('tunnel');
  }
  if (w.tube) driveTube(w, dt);
  else {
    if (w.power === 'autopilot') autopilot(w);
    const dx = laneX(w.lane) - w.x;
    w.x += Math.sign(dx) * Math.min(Math.abs(dx), LANE_CHANGE_SPEED * dt);
  }

  // Traffic drives on; a car under us (once we're up at its roof) is the floor we ride on.
  for (const e of w.entities) if (e.alive && e.v) e.s += e.v * dt;
  w.floor = roofUnder(w);
  if (w.power === 'hover') {
    w.vy = 0;
    w.y = Math.min(HOVER_HEIGHT, w.y + HOVER_RISE * dt);
  } else if (w.y > w.floor || w.vy > 0) {
    // Falls back down after a hover ends or off the front of a car; otherwise a normal jump arc.
    w.vy -= GRAVITY * dt;
    w.y += w.vy * dt;
    if (w.y <= w.floor) {
      w.y = w.floor; w.vy = 0;
      if (w.jumpBuffer > 0 && jump(w)) { w.jumpBuffer = 0; events.push('jump'); }
    }
  } else {
    w.y = w.floor; // landed on (or stepped up onto) a roof
    w.vy = 0;
  }

  spawn(w);

  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (rel < -DESPAWN_BEHIND) { e.alive = false; continue; }
    if (e.bumped !== undefined) continue;
    if (Math.abs(rel) > (isObstacle(e.kind) ? hitDepth(e.kind) : HIT_DEPTH) || !sideOverlap(w, e)) continue;

    if (e.kind === 'coin') {
      if (e.y !== undefined && w.y < e.y - ROOF_COIN_REACH) continue; // floating over a roof: jump for it
      e.alive = false;
      w.coins++;
      events.push('coin');
    } else if (isPower(e.kind)) {
      e.alive = false;
      if (e.kind === 'hover') {
        // Hover pickups charge the hover button instead of firing right away.
        w.hoverCharges = Math.min(HOVER_CHARGES_MAX, w.hoverCharges + 1);
        events.push('charge');
        continue;
      }
      activate(w, e.kind);
      events.push(e.kind === 'supercharger' ? 'battery' : 'power');
    } else if (w.y >= clearHeight(e.kind)) {
      continue; // jumped or hovering over it, or riding a car's roof
    } else if (isShielded(w)) {
      knockAside(w, e);
      events.push(isTraffic(e.kind) ? 'boing' : 'smash');
    } else {
      knockAside(w, e);
      if (crash(w)) { events.push(w.caught ? 'caught' : 'crash'); break; }
      events.push('hit');
    }
  }
  return events;
}

/** Cones are flattened; traffic gets a "boing" and pops aside (the view animates it), harmless from then on. */
function knockAside(w: World, e: Entity): void {
  if (isTraffic(e.kind)) e.bumped = w.time;
  else e.alive = false;
}

/** CAR_ROOF if the car is up level with a car's roof that's under it, else 0 (the road). */
function roofUnder(w: World): number {
  if (w.tube || w.y < CAR_CLEAR) return 0;
  for (const e of w.entities) {
    if (!e.alive || e.kind !== 'car' || e.bumped !== undefined) continue;
    if (Math.abs(e.s - w.distance) <= hitDepth('car') && sideOverlap(w, e)) return CAR_ROOF;
  }
  return 0;
}

/** Is the car level with `e` across the road (or around the tube's ring)? */
function sideOverlap(w: World, e: Entity): boolean {
  if (w.tube) {
    // Inside the tube, compare angles; road items count as the bottom slot of their lane.
    const slot = e.slot ?? laneToSlot(e.lane);
    return angleGap(w.angle, slot * SLOT_ANGLE) * TUNNEL_RADIUS <= HIT_HALF_WIDTH;
  }
  if (e.slot !== undefined) {
    // Tube item met on the road (only at the very mouth): bottom slots only.
    if (Math.abs(e.slot) > 1) return false;
    return Math.abs(laneX(slotToLane(e.slot)) - w.x) <= HIT_HALF_WIDTH;
  }
  return Math.abs(laneX(e.lane) - w.x) <= HIT_HALF_WIDTH;
}

/** In the exit stretch, only the bottom slots are allowed: the car slides back down to leave in a lane. */
const inTubeExit = (w: World): boolean => w.distance >= w.tunnelEnd - TUNNEL_EXIT;

/** Move one slot around the ring; it wraps, so a kid can keep going all the way round. */
function turnSlot(w: World, dir: number): boolean {
  let next = w.slot + dir;
  if (inTubeExit(w)) next = Math.max(-1, Math.min(1, next));
  if (next === w.slot) return false;
  w.slot = next;
  // Keep slot in -3..4; shift the angle by a full turn with it so nothing visibly jumps.
  if (w.slot > TUNNEL_SLOTS / 2) { w.slot -= TUNNEL_SLOTS; w.angle -= Math.PI * 2; }
  if (w.slot < 1 - TUNNEL_SLOTS / 2) { w.slot += TUNNEL_SLOTS; w.angle += Math.PI * 2; }
  return true;
}

function enterTube(w: World): void {
  w.tube = true;
  w.angle = (w.x / LANE_WIDTH) * SLOT_ANGLE; // lane positions map straight onto the bottom slots
  w.slot = laneToSlot(w.lane);
}

function driveTube(w: World, dt: number): void {
  if (inTubeExit(w)) w.slot = exitSlot(w.slot);
  if (w.power === 'autopilot') tubeAutopilot(w);
  const da = w.slot * SLOT_ANGLE - w.angle;
  w.angle += Math.sign(da) * Math.min(Math.abs(da), TUBE_TURN_SPEED * dt);
  // x follows the angle near the bottom (police, entry/exit blend), clamped to the road.
  w.x = Math.max(laneX(0), Math.min(laneX(LANE_COUNT - 1), (w.angle / SLOT_ANGLE) * LANE_WIDTH));
  if (w.distance >= w.tunnelEnd) {
    w.tube = false;
    w.lane = slotToLane(w.slot);
    w.angle = 0;
    w.slot = 0;
  }
}

const SLOT_SCORES: number[] = new Array(TUNNEL_SLOTS).fill(0);
const SLOT_CONE: number[] = new Array(TUNNEL_SLOTS).fill(0);

/**
 * Tube autopilot: head for the slot with the most coins and no cones ahead, by a way round that
 * doesn't cross a slot with a cone coming up before the car is past it.
 */
function tubeAutopilot(w: World): void {
  if (angleGap(w.angle, w.slot * SLOT_ANGLE) > 0.1) return; // finish the current move first
  const exit = inTubeExit(w);
  const scores = SLOT_SCORES, cone = SLOT_CONE;
  const idx = (slot: number) => wrapSlot(slot) + TUNNEL_SLOTS / 2 - 1; // -3..4 -> 0..7
  for (let i = 0; i < TUNNEL_SLOTS; i++) { scores[i] = 0; cone[i] = Infinity; }
  scores[idx(w.slot)] = 0.5;
  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (rel < -HIT_DEPTH || rel > AUTOPILOT_LOOKAHEAD) continue;
    const i = idx(e.slot ?? laneToSlot(e.lane));
    if (e.kind === 'cone') { cone[i] = Math.min(cone[i], rel); if (rel >= 0) scores[i] -= 100 / (1 + rel * 0.1); }
    else if (rel >= 0) scores[i] += e.kind === 'coin' ? 1 : 3;
  }
  const stepDist = (w.speed * SLOT_ANGLE) / TUBE_TURN_SPEED; // m driven while moving one slot
  let bestDir = 0, bestScore = scores[idx(w.slot)];
  for (const dir of [-1, 1]) {
    for (let n = 1; n <= TUNNEL_SLOTS / 2; n++) {
      const slot = w.slot + dir * n;
      // Passing through (or stopping on) a slot whose cone arrives before we're clear of it: path blocked.
      if (cone[idx(slot)] < (n + 1) * stepDist + HIT_DEPTH * 2) break;
      if (exit && Math.abs(slot) > 1) break;
      const score = scores[idx(slot)] - 0.2 * n;
      if (score > bestScore) { bestScore = score; bestDir = dir; }
    }
  }
  if (bestDir) turnSlot(w, bestDir);
}

/** Returns true if this crash ends the run. */
function crash(w: World): boolean {
  const close = w.chase > 0; // the harmless opening chase doesn't count
  w.batteries--;
  if (!w.kidMode || close || w.batteries <= 0) {
    w.caught = close;
    w.phase = 'over';
    return true;
  }
  w.invuln = INVULN_TIME;
  w.stumble = STUMBLE_TIME;
  w.chase = CHASE_TIME;
  w.intro = 0;
  return false;
}

function activate(w: World, kind: PowerKind): void {
  w.lastPower = kind;
  if (kind === 'supercharger') {
    w.batteries = Math.min(BATTERIES, w.batteries + 1);
    w.chase = 0; // a fresh battery also shakes off the police
    w.intro = 0;
    return;
  }
  w.power = kind;
  w.powerTime = POWER_TIME[kind];
}

/** Steer toward the lane with the most coins and no cones ahead. */
function autopilot(w: World): void {
  if (Math.abs(w.x - laneX(w.lane)) > 0.15) return; // finish the current lane change first
  const scores = SCORES;
  for (let l = 0; l < LANE_COUNT; l++) scores[l] = l === w.lane ? 0.5 : 0;
  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (isObstacle(e.kind)) {
      // Cones, cars and trucks: anything ahead, or still level with us (no swerving into a car's side).
      if (e.bumped !== undefined) continue;
      const h = hitDepth(e.kind);
      if (rel + h < 0 || rel - h > AUTOPILOT_LOOKAHEAD) continue;
      scores[e.lane] -= 100 / (1 + Math.max(0, rel - h) * 0.1);
      continue;
    }
    if (rel < 0 || rel > AUTOPILOT_LOOKAHEAD) continue;
    scores[e.lane] += e.kind === 'coin' ? 1 : 3;
  }
  let best = w.lane;
  for (let l = 0; l < LANE_COUNT; l++) if (scores[l] > scores[best]) best = l;
  if (best !== w.lane) w.lane += Math.sign(best - w.lane);
}

function pickPower(w: World): PowerKind {
  const options: PowerKind[] = ['ludicrous', 'autopilot', 'hover'];
  if (w.batteries < BATTERIES) options.push('supercharger', 'supercharger');
  return options[Math.floor(w.rng() * options.length)];
}

function spawn(w: World): void {
  while (w.nextRowAt < w.distance + SPAWN_AHEAD) {
    const difficulty = (speedAt(w.time) - SPEED_START) / (SPEED_MAX - SPEED_START);
    if (layBatSwarm(w) || layTunnel(w)) continue;
    if (wantTraffic(w)) { layTraffic(w, placeChunk(w.rng, difficulty, w.nextRowAt, true).items); continue; }
    const powersOk = w.time > POWER_START_AFTER && !w.power;
    for (const item of placeChunk(w.rng, difficulty, w.nextRowAt).items) {
      let kind: EntityKind;
      if (item.kind === 'power') {
        // Power slots only sometimes hold a power-up; otherwise a short coin line.
        if (powersOk && w.rng() < POWER_CHANCE * 4) kind = pickPower(w);
        else { for (let i = 0; i < 3; i++) add(w, 'coin', item.lane, item.s + i * 2.2); continue; }
      } else kind = item.kind;
      add(w, kind, item.lane, item.s);
    }
    w.nextRowAt += CHUNK_LENGTH;
  }
}

/** Is the next chunk slot a traffic chunk? Traffic comes in runs of a few chunks, between cone chunks. */
function wantTraffic(w: World): boolean {
  // Not straight after a tunnel or Bat Swarm: traffic can't be pulled back into them, so it would be met late.
  if (w.nextRowAt < TRAFFIC_FIRST_AT || w.nextRowAt < Math.max(w.tunnelEnd, w.swarmEnd + SWARM_PAD) + 60) return false;
  if (w.trafficRun > 0) { w.trafficRun--; return true; }
  const first = w.nextRowAt < TRAFFIC_FIRST_AT + CHUNK_LENGTH; // the first slot that may have traffic always does
  if (!first && w.rng() >= TRAFFIC_CHANCE) return false;
  const [lo, hi] = TRAFFIC_RUN;
  w.trafficRun = lo + Math.floor(w.rng() * (hi - lo + 1));
  return true;
}

/**
 * Lay a traffic chunk (cars, trucks and their coins, all driving at TRAFFIC_SPEED) in the slot at nextRowAt.
 *
 * Fairness: the chunk moves as one rigid piece, so its own layout never changes (the chunk validator checks
 * it at top speed, which is stricter than closing on traffic). What must not happen is traffic meeting the
 * car at the same time as static cones. So:
 * - Behind it: the chunk is pulled back by `shift`, at most what the traffic drives before even the fastest
 *   possible car (speed steps, plus any Ludicrous that could be picked up) reaches it. So every vehicle is
 *   met at or beyond its spot in the slot, never back among the cones before the slot.
 * - Ahead of it: the next slot starts only past where the last vehicle can be when the slowest car
 *   (stumbling after crashes, allowed for by TRAFFIC_SLACK) gets past it.
 * Without the pull-back, the car would need ages to catch traffic laid SPAWN_AHEAD away; with it, the
 * traffic is met roughly where the chunk was designed to be, like a cone chunk.
 */
function layTraffic(w: World, items: PlacedItem[]): void {
  const s0 = w.nextRowAt, v = TRAFFIC_SPEED;
  const depth = (it: PlacedItem) => (isObstacle(it.kind) ? hitDepth(it.kind) : 0);
  const movers = items.filter((it) => isObstacle(it.kind));
  const firstZone = Math.min(...movers.map((it) => it.s - depth(it)));
  let boost = w.power === 'ludicrous' ? w.powerTime : 0;
  for (const e of w.entities) if (e.alive && e.kind === 'ludicrous' && e.s > w.distance) boost += LUDICROUS_TIME;
  const fastest = (tau: number) => (tau < boost ? LUDICROUS_BOOST : 1);
  let shift = v * catchTimeAtLeast(w.time, firstZone - w.distance, 0, fastest);
  // Never pulled back into a tunnel or Bat Swarm, or over older cones close enough to see it drive through them.
  const clear = hitDepth('truck');
  const blockEnd = Math.max(w.tunnelEnd, w.swarmEnd + SWARM_PAD);
  for (const it of items) shift = Math.min(shift, it.s - blockEnd - clear);
  const p = speedAt(w.time);
  for (const it of movers) {
    for (const e of w.entities) {
      if (!e.alive || e.kind !== 'cone' || e.lane !== it.lane || e.slot !== undefined || e.s >= it.s) continue;
      const seen = e.s - w.distance - TRAFFIC_GHOST_DIST; // > 0: still deep in the fog when traffic reaches it
      const minStart = seen > 0 ? e.s - clear - (v * seen) / p : e.s + clear;
      shift = Math.min(shift, it.s - minStart);
    }
  }
  shift = Math.max(0, shift);
  for (const it of items) {
    if (it.kind === 'power') continue; // traffic chunks have none; the validator enforces it
    const y = it.y ? ROOF_COIN_HEIGHT : undefined;
    add(w, it.kind, it.lane, it.s - shift, undefined, v, y, isTraffic(it.kind) ? Math.floor(w.rng() * 1000) : undefined);
  }
  // Keep the road after the chunk clear of whatever the slowest car could still meet there.
  const lastZone = Math.max(...movers.map((it) => it.s + depth(it))) - shift;
  const stumble = w.stumble;
  const slowest = (tau: number) => 1 - (STUMBLE_SLOWDOWN * Math.max(0, stumble - tau)) / STUMBLE_TIME;
  const drift = v * (catchTime(w.time, lastZone - w.distance, v, slowest) + TRAFFIC_SLACK) - shift;
  w.nextRowAt = s0 + CHUNK_LENGTH + Math.max(0, drift);
}

/** Ask for a Bat Swarm at the next chunk slot, whatever the time of day (debug). */
export function queueSwarm(w: World): void { w.swarmQueued = true; }

/** At dusk, sometimes lay a Bat Swarm in place of the next chunk. Only on cone-free road. */
function layBatSwarm(w: World): boolean {
  const s0 = w.nextRowAt;
  if (!w.swarmQueued) {
    if (!isDusk(dayPhase(w)) || s0 < w.nextSwarmAt || w.rng() >= SWARM_CHANCE) return false;
  }
  if (conesIn(w.entities, s0, s0 + SWARM_SPAN)) return false;
  for (const c of swarmCoins(s0)) add(w, 'coin', c.lane, c.s);
  w.swarmAt = s0 + SWARM_PAD;
  w.swarmEnd = w.swarmAt + SWARM_LENGTH;
  w.swarmSeen = false;
  w.swarmQueued = false;
  w.nextRowAt += SWARM_SPAN;
  w.nextSwarmAt = w.nextRowAt + SWARM_MIN_GAP;
  return true;
}

/** Ask for a tube tunnel at the next chunk slot (debug). */
export function queueTunnel(w: World): void { w.tunnelQueued = true; }

/** Every so often, lay a tube tunnel in place of the next chunks. Only on cone-free road. */
function layTunnel(w: World): boolean {
  const s0 = w.nextRowAt;
  if (w.tunnelAt >= 0 && w.distance < w.tunnelEnd) return false; // one tunnel at a time
  if (s0 < w.swarmEnd + SWARM_PAD) return false; // never over a Bat Swarm
  if (!w.tunnelQueued && (s0 < w.nextTunnelAt || w.rng() >= TUNNEL_CHANCE)) return false;
  if (conesIn(w.entities, s0, s0 + TUNNEL_LENGTH)) return false;
  for (const it of tunnelItems(w.rng, s0)) add(w, it.kind, 1, it.s, it.slot);
  w.tunnelAt = s0;
  w.tunnelEnd = s0 + TUNNEL_LENGTH;
  w.tunnelQueued = false;
  w.nextRowAt += TUNNEL_LENGTH;
  w.nextTunnelAt = w.nextRowAt + TUNNEL_MIN_GAP;
  return true;
}

function add(
  w: World, kind: EntityKind, lane: number, s: number, slot?: number, v?: number, y?: number, variant?: number,
): void {
  const e: Entity = { kind, lane, s, alive: true, slot, v, y, variant, bumped: undefined };
  const free = w.entities.find((x) => !x.alive);
  if (free) Object.assign(free, e);
  else w.entities.push(e);
}
