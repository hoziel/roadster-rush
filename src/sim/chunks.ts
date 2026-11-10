import { HIT_DEPTH, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, SPEED_MAX } from './config';
import type { Rng } from './rng';
import type { ObstacleKind } from './spawner';
import { hitDepth } from './traffic';
import data from './chunks/austin.json';

export interface ChunkRow {
  at: number;
  cones?: number[];
  cars?: number[]; // low traffic: jump onto/over it or change lanes
  trucks?: number[]; // tall traffic: change lanes
  roof?: number[]; // car lanes with coins floating over the roof (collected mid-jump or riding the roof)
  coins?: { lane: number; count: number };
  power?: number;
}
/** traffic: a chunk of cars/trucks (and coins) that all drive at TRAFFIC_SPEED; never mixed with cones. */
export interface Chunk { id: string; difficulty: number; traffic?: boolean; rows: ChunkRow[] }

export const CHUNK_LENGTH: number = data.length;
export const CHUNKS: Chunk[] = data.chunks;
export const COIN_SPACING = 2.2;
const ROOF_COIN_STEP = 1.1; // m between the three coins over a car roof
const TRAFFIC_LURE_GAP = 3; // m of clear road between a coin line's end and the back of a car or truck in its lane

/**
 * How many lanes you can move across while `clear` metres of road go by with nothing level with the car,
 * at top speed. Moving traffic goes by slower than that (we only close on it at our speed minus its own),
 * so this is a safe bound for traffic chunks too.
 */
export function lanesAcross(clear: number): number {
  const t = Math.max(0, clear) / SPEED_MAX;
  return Math.floor((t * LANE_CHANGE_SPEED) / LANE_WIDTH + 1e-9);
}

/** How many lanes you can move across between two cone rows `gap` metres apart, at top speed. */
export const lanesReachable = (gap: number): number => lanesAcross(gap - 2 * HIT_DEPTH);

/** Obstacle rows must keep their hit zone this far (as for a cone row) from chunk edges so any chunk can follow any chunk. */
export const EDGE_GAP = 6;

interface ObstacleRow { at: number; lanes: Map<number, ObstacleKind>; depth: number }

function obstacleRow(r: ChunkRow): ObstacleRow {
  const lanes = new Map<number, ObstacleKind>();
  for (const l of r.cones ?? []) lanes.set(l, 'cone');
  for (const l of r.cars ?? []) lanes.set(l, 'car');
  for (const l of r.trucks ?? []) lanes.set(l, 'truck');
  let depth = 0;
  for (const k of lanes.values()) depth = Math.max(depth, hitDepth(k));
  return { at: r.at, lanes, depth };
}

/** Problems with a chunk, or [] if it's fair. Run over every chunk in tests. */
export function validateChunk(c: Chunk): string[] {
  const errs: string[] = [];
  const rows = [...c.rows].sort((a, b) => a.at - b.at);
  const obs = rows.map(obstacleRow);
  rows.forEach((r, i) => {
    const o = obs[i];
    if (r.at < 0 || r.at >= CHUNK_LENGTH) errs.push(`${c.id}: row at ${r.at} outside chunk`);
    const n = (r.cones?.length ?? 0) + (r.cars?.length ?? 0) + (r.trucks?.length ?? 0);
    if (n !== o.lanes.size) errs.push(`${c.id}: two obstacles in one lane at ${r.at}`);
    if (o.lanes.size >= LANE_COUNT) errs.push(`${c.id}: row at ${r.at} blocks every lane`);
    if ([...o.lanes.keys()].some((l) => l < 0 || l >= LANE_COUNT)) errs.push(`${c.id}: bad lane at ${r.at}`);
    if (r.coins && o.lanes.has(r.coins.lane)) errs.push(`${c.id}: coins on an obstacle lane at ${r.at}`);
    if (r.power !== undefined && o.lanes.has(r.power)) errs.push(`${c.id}: power on an obstacle lane at ${r.at}`);
    if (c.traffic && (r.cones?.length || r.power !== undefined)) errs.push(`${c.id}: traffic chunk with a cone or power slot at ${r.at}`);
    if (!c.traffic && (r.cars?.length || r.trucks?.length || r.roof?.length)) errs.push(`${c.id}: traffic in a cone chunk at ${r.at}`);
    for (const l of r.roof ?? []) if (o.lanes.get(l) !== 'car') errs.push(`${c.id}: roof coins without a car at ${r.at}`);
  });
  const blocking = obs.filter((o) => o.lanes.size);
  // A coin line must not run into an obstacle in its lane (it would lure kids into it). Traffic is closed on
  // slowly and fills the view, so a line must also stop a few metres short of a car's or truck's back.
  for (const r of rows) {
    if (!r.coins) continue;
    const from = r.at - HIT_DEPTH, to = r.at + (r.coins.count - 1) * COIN_SPACING + HIT_DEPTH;
    for (const o of blocking) {
      const k = o.lanes.get(r.coins.lane);
      if (k && o.at + hitDepth(k) >= from && o.at - hitDepth(k) <= to + (k === 'cone' ? 0 : TRAFFIC_LURE_GAP)) {
        errs.push(`${c.id}: coin line from ${r.at} runs into a ${k} at ${o.at}`);
      }
    }
  }
  if (!blocking.length) return errs;
  // Edges: the gap to the neighbouring chunk is at least 2 * EDGE_GAP, enough to reach any lane.
  if (lanesReachable(2 * EDGE_GAP) < LANE_COUNT - 1) errs.push('EDGE_GAP too small for a full lane sweep');
  const first = blocking[0], last = blocking[blocking.length - 1];
  if (first.at - first.depth < EDGE_GAP - HIT_DEPTH) errs.push(`${c.id}: first obstacle row at ${first.at} is too close to the start`);
  if (last.at + last.depth > CHUNK_LENGTH - EDGE_GAP + HIT_DEPTH) errs.push(`${c.id}: last obstacle row at ${last.at} is too close to the end`);
  // Reachability without jumping, at top speed: some free lane must always be reachable. Lane changes
  // only count in the clear road between two rows' hit zones (overlapping zones: stay in a lane free in both).
  const all = Array.from({ length: LANE_COUNT }, (_, i) => i);
  let reach = new Set(all);
  let prev: ObstacleRow | null = null;
  for (const o of blocking) {
    const k = prev ? lanesAcross(o.at - o.depth - (prev.at + prev.depth)) : LANE_COUNT;
    const free = all.filter((l) => !o.lanes.has(l));
    const next = free.filter((l) => [...reach].some((p) => Math.abs(p - l) <= k));
    if (!next.length) { errs.push(`${c.id}: no reachable free lane at ${o.at} without jumping`); break; }
    reach = new Set(next);
    prev = o;
  }
  return errs;
}

export interface PlacedItem {
  kind: 'coin' | 'power' | ObstacleKind;
  lane: number;
  s: number;
  y?: number; // coins floating over a car roof: 1 (the world sets the height)
}

/**
 * Pick a chunk for this difficulty (0..1) and lay it out starting at `s0`. Randomly mirrored.
 * `traffic` picks from the traffic chunks instead of the cone chunks.
 */
export function placeChunk(rng: Rng, difficulty: number, s0: number, traffic = false): { id: string; items: PlacedItem[] } {
  const tier = difficulty < 0.25 ? 0 : difficulty < 0.6 ? 1 : 2;
  // Mostly the current tier, sometimes an easier one for breathing room.
  const want = rng() < 0.25 ? Math.max(0, tier - 1) : tier;
  const kind = CHUNKS.filter((c) => !!c.traffic === traffic);
  const pool = kind.filter((c) => c.difficulty === want);
  const from = pool.length ? pool : kind;
  const chunk = from[Math.floor(rng() * from.length)];
  const mirror = rng() < 0.5;
  const lane = (l: number) => (mirror ? LANE_COUNT - 1 - l : l);
  const items: PlacedItem[] = [];
  for (const r of chunk.rows) {
    for (const c of r.cones ?? []) items.push({ kind: 'cone', lane: lane(c), s: s0 + r.at });
    for (const c of r.cars ?? []) items.push({ kind: 'car', lane: lane(c), s: s0 + r.at });
    for (const c of r.trucks ?? []) items.push({ kind: 'truck', lane: lane(c), s: s0 + r.at });
    for (const c of r.roof ?? []) for (let i = -1; i <= 1; i++) items.push({ kind: 'coin', lane: lane(c), s: s0 + r.at + i * ROOF_COIN_STEP, y: 1 });
    if (r.coins) for (let i = 0; i < r.coins.count; i++) items.push({ kind: 'coin', lane: lane(r.coins.lane), s: s0 + r.at + i * COIN_SPACING });
    if (r.power !== undefined) items.push({ kind: 'power', lane: lane(r.power), s: s0 + r.at });
  }
  return { id: chunk.id, items };
}
