import {
  COIN_VALUE, CONE_HEIGHT, DESPAWN_BEHIND, GRAVITY, HIT_DEPTH, HIT_HALF_WIDTH,
  JUMP_VELOCITY, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, ROW_SPACING_MAX,
  ROW_SPACING_MIN, SPAWN_AHEAD, SPEED_MAX, SPEED_START,
} from './config';
import { createRng, type Rng } from './rng';
import { makeRow, type EntityKind } from './spawner';
import { speedAt } from './speed';

export interface Entity {
  kind: EntityKind;
  lane: number;
  s: number; // absolute distance along the road
  alive: boolean;
}

export type SimEvent = 'coin' | 'crash';
export type Phase = 'ready' | 'running' | 'over';

export interface World {
  phase: Phase;
  time: number; // s driven this run
  distance: number; // m driven this run
  speed: number;
  lane: number; // target lane 0..LANE_COUNT-1
  x: number; // current sideways position (m), 0 = centre lane
  y: number; // height above road (m)
  vy: number;
  coins: number;
  entities: Entity[]; // pooled: dead entries are reused
  nextRowAt: number;
  rng: Rng;
}

export const laneX = (lane: number): number => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

export function createWorld(seed = Date.now()): World {
  return {
    phase: 'ready', time: 0, distance: 0, speed: SPEED_START,
    lane: 1, x: 0, y: 0, vy: 0, coins: 0,
    entities: [], nextRowAt: 40, rng: createRng(seed),
  };
}

export function score(w: World): number {
  return Math.floor(w.distance) + w.coins * COIN_VALUE;
}

/** Start a fresh run, keeping the entity pool. */
export function start(w: World): void {
  for (const e of w.entities) e.alive = false;
  Object.assign(w, {
    phase: 'running', time: 0, distance: 0, speed: SPEED_START,
    lane: 1, x: 0, y: 0, vy: 0, coins: 0, nextRowAt: 40,
  });
}

export function steer(w: World, dir: -1 | 1): boolean {
  if (w.phase !== 'running') return false;
  const next = Math.max(0, Math.min(LANE_COUNT - 1, w.lane + dir));
  if (next === w.lane) return false;
  w.lane = next;
  return true;
}

export function jump(w: World): boolean {
  if (w.phase !== 'running' || w.y > 0) return false;
  w.vy = JUMP_VELOCITY;
  w.y = 0.0001;
  return true;
}

export function step(w: World, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  if (w.phase !== 'running') return events;

  w.time += dt;
  w.speed = speedAt(w.time);
  w.distance += w.speed * dt;

  const dx = laneX(w.lane) - w.x;
  w.x += Math.sign(dx) * Math.min(Math.abs(dx), LANE_CHANGE_SPEED * dt);

  if (w.y > 0) {
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
    } else if (w.y < CONE_HEIGHT) {
      w.phase = 'over';
      events.push('crash');
      break;
    }
  }
  return events;
}

function spawn(w: World): void {
  while (w.nextRowAt < w.distance + SPAWN_AHEAD) {
    const difficulty = (w.speed - SPEED_START) / (SPEED_MAX - SPEED_START);
    for (const item of makeRow(w.rng, difficulty)) {
      const s = w.nextRowAt + item.offset;
      const slot = w.entities.find((e) => !e.alive);
      if (slot) Object.assign(slot, { kind: item.kind, lane: item.lane, s, alive: true });
      else w.entities.push({ kind: item.kind, lane: item.lane, s, alive: true });
    }
    w.nextRowAt += ROW_SPACING_MIN + w.rng() * (ROW_SPACING_MAX - ROW_SPACING_MIN);
  }
}
