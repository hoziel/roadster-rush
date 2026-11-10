import {
  AUTOPILOT_LOOKAHEAD, AUTOPILOT_TIME, BATTERIES, CHASE_TIME, COIN_VALUE, CONE_HEIGHT,
  DESPAWN_BEHIND, GRAVITY, HIT_DEPTH, HIT_HALF_WIDTH, HOVER_CHARGES_MAX, HOVER_CHARGES_START, HOVER_HEIGHT, HOVER_RISE, HOVER_TIME,
  INTRO_CHASE_TIME,
  INVULN_TIME, JUMP_VELOCITY, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, LUDICROUS_BOOST,
  LUDICROUS_TIME, POWER_CHANCE, POWER_START_AFTER, SPAWN_AHEAD, SPEED_MAX, SPEED_START, STUMBLE_SLOWDOWN, STUMBLE_TIME,
  SWARM_CHANCE, SWARM_LENGTH, SWARM_MIN_GAP, SWARM_PAD,
} from './config';
import { SWARM_SPAN, conesIn, swarmCoins } from './batswarm';
import { dayPhase, isDusk } from './daycycle';
import { createRng, type Rng } from './rng';
import { CHUNK_LENGTH, placeChunk } from './chunks';
import { isPower, type EntityKind, type PowerKind } from './spawner';
import { speedAt } from './speed';

export type { PowerKind } from './spawner';

export interface Entity {
  kind: EntityKind;
  lane: number;
  s: number; // absolute distance along the road
  alive: boolean;
}

export type SimEvent =
  | 'coin' | 'hit' | 'smash' | 'crash' | 'caught' | 'battery'
  | 'power' | 'power-end' | 'swarm' | 'charge';
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
  coins: number;
  batteries: number;
  invuln: number; // s of post-crash grace left
  stumble: number; // s of post-crash slowdown left
  chase: number; // s the police stays close (a crash now ends the run)
  intro: number; // s of the harmless opening chase left (police shown close, crashes don't end the run)
  hoverCharges: number; // banked hover-button presses
  power: PowerKind | null; // timed power-up in effect
  powerTime: number; // s left on it
  lastPower: PowerKind | null; // last picked up (for UI events)
  caught: boolean; // run ended by the police
  entities: Entity[]; // pooled: dead entries are reused
  nextRowAt: number;
  dayOffset: number; // shifts the sunset-to-night cycle (debug jumps); kept across runs
  swarmAt: number; // s where the current/last Bat Swarm coin rain starts, -1 if none
  swarmEnd: number; // s where it ends
  swarmSeen: boolean; // 'swarm' event already sent for it
  nextSwarmAt: number; // no new swarm laid before this s
  swarmQueued: boolean; // lay one at the next chunk slot whatever the time of day
  rng: Rng;
}

export const laneX = (lane: number): number => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

const runState = () => ({
  time: 0, distance: 0, speed: SPEED_START, lane: 1, x: 0, y: 0, vy: 0, coins: 0,
  batteries: BATTERIES, invuln: 0, stumble: 0, chase: 0, intro: INTRO_CHASE_TIME,
  hoverCharges: HOVER_CHARGES_START,
  power: null, powerTime: 0, lastPower: null, caught: false, nextRowAt: 40,
  swarmAt: -1, swarmEnd: -1, swarmSeen: true, nextSwarmAt: 0, swarmQueued: false,
});

export function createWorld(seed = Date.now()): World {
  return { phase: 'ready', kidMode: true, ...runState(), dayOffset: 0, entities: [], rng: createRng(seed) };
}

export function score(w: World): number {
  return Math.floor(w.distance) + w.coins * COIN_VALUE;
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
  const next = Math.max(0, Math.min(LANE_COUNT - 1, w.lane + dir));
  if (next === w.lane) return false;
  w.lane = next;
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
  if (w.phase !== 'running' || w.y > 0 || w.power === 'hover') return false;
  w.vy = JUMP_VELOCITY;
  w.y = 0.0001;
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
  w.chase = Math.max(0, w.chase - dt);
  w.intro = Math.max(0, w.intro - dt);
  if (w.power) {
    w.powerTime -= dt;
    if (w.powerTime <= 0) { w.power = null; w.powerTime = 0; events.push('power-end'); }
  }

  let speed = speedAt(w.time);
  if (w.stumble > 0) speed *= 1 - STUMBLE_SLOWDOWN * (w.stumble / STUMBLE_TIME);
  if (w.power === 'ludicrous') speed *= LUDICROUS_BOOST;
  w.speed = speed;
  w.distance += speed * dt;
  if (!w.swarmSeen && w.swarmAt >= 0 && w.distance >= w.swarmAt) { w.swarmSeen = true; events.push('swarm'); }

  if (w.power === 'autopilot') autopilot(w);
  const dx = laneX(w.lane) - w.x;
  w.x += Math.sign(dx) * Math.min(Math.abs(dx), LANE_CHANGE_SPEED * dt);

  if (w.power === 'hover') {
    w.vy = 0;
    w.y = Math.min(HOVER_HEIGHT, w.y + HOVER_RISE * dt);
  } else if (w.y > 0) {
    // Falls back down after a hover ends; otherwise a normal jump arc.
    w.vy -= GRAVITY * dt;
    w.y += w.vy * dt;
    if (w.y <= 0) { w.y = 0; w.vy = 0; }
  }

  spawn(w);

  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (rel < -DESPAWN_BEHIND) { e.alive = false; continue; }
    if (Math.abs(rel) > HIT_DEPTH || Math.abs(laneX(e.lane) - w.x) > HIT_HALF_WIDTH) continue;

    if (e.kind === 'coin') {
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
    } else if (w.y >= CONE_HEIGHT) {
      continue; // jumped or hovering over it
    } else if (isShielded(w)) {
      e.alive = false;
      events.push('smash');
    } else {
      e.alive = false;
      if (crash(w)) { events.push(w.caught ? 'caught' : 'crash'); break; }
      events.push('hit');
    }
  }
  return events;
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
    if (rel < 0 || rel > AUTOPILOT_LOOKAHEAD) continue;
    if (e.kind === 'cone') scores[e.lane] -= 100 / (1 + rel * 0.1);
    else scores[e.lane] += e.kind === 'coin' ? 1 : 3;
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
    if (layBatSwarm(w)) continue;
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

function add(w: World, kind: EntityKind, lane: number, s: number): void {
  const slot = w.entities.find((e) => !e.alive);
  if (slot) Object.assign(slot, { kind, lane, s, alive: true });
  else w.entities.push({ kind, lane, s, alive: true });
}
