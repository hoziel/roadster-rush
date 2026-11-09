import { HIT_DEPTH, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, SPEED_MAX } from './config';
import type { Rng } from './rng';
import data from './chunks/austin.json';

export interface ChunkRow {
  at: number;
  cones?: number[];
  coins?: { lane: number; count: number };
  power?: number;
}
export interface Chunk { id: string; difficulty: number; rows: ChunkRow[] }

export const CHUNK_LENGTH: number = data.length;
export const CHUNKS: Chunk[] = data.chunks;
const COIN_SPACING = 2.2;

/** How many lanes you can move across in a gap of `gap` metres at top speed. */
export function lanesReachable(gap: number): number {
  const t = Math.max(0, gap - 2 * HIT_DEPTH) / SPEED_MAX;
  return Math.floor((t * LANE_CHANGE_SPEED) / LANE_WIDTH);
}

/** Cone rows must sit this far from chunk edges so any chunk can follow any chunk. */
export const EDGE_GAP = 6;

/** Problems with a chunk, or [] if it's fair. Run over every chunk in tests. */
export function validateChunk(c: Chunk): string[] {
  const errs: string[] = [];
  const rows = [...c.rows].sort((a, b) => a.at - b.at);
  for (const r of rows) {
    if (r.at < 0 || r.at >= CHUNK_LENGTH) errs.push(`${c.id}: row at ${r.at} outside chunk`);
    const cones = r.cones ?? [];
    if (new Set(cones).size >= LANE_COUNT) errs.push(`${c.id}: row at ${r.at} blocks every lane`);
    if (cones.some((l) => l < 0 || l >= LANE_COUNT)) errs.push(`${c.id}: bad lane at ${r.at}`);
    if (r.coins && cones.includes(r.coins.lane)) errs.push(`${c.id}: coins on a cone lane at ${r.at}`);
    if (r.power !== undefined && cones.includes(r.power)) errs.push(`${c.id}: power on a cone lane at ${r.at}`);
  }
  const coneRows = rows.filter((r) => r.cones?.length);
  if (!coneRows.length) return errs;
  // Edges: the gap to the neighbouring chunk is at least 2 * EDGE_GAP, enough to reach any lane.
  if (lanesReachable(2 * EDGE_GAP) < LANE_COUNT - 1) errs.push('EDGE_GAP too small for a full lane sweep');
  if (coneRows[0].at < EDGE_GAP) errs.push(`${c.id}: first cone row at ${coneRows[0].at} is closer than ${EDGE_GAP} m to the start`);
  const last = coneRows[coneRows.length - 1].at;
  if (CHUNK_LENGTH - last < EDGE_GAP) errs.push(`${c.id}: last cone row at ${last} is closer than ${EDGE_GAP} m to the end`);
  // Reachability without jumping, at top speed: some free lane must always be reachable.
  const all = Array.from({ length: LANE_COUNT }, (_, i) => i);
  let reach = new Set(all);
  let prevAt = -Infinity;
  for (const r of coneRows) {
    const k = prevAt === -Infinity ? LANE_COUNT : lanesReachable(r.at - prevAt);
    const free = all.filter((l) => !(r.cones ?? []).includes(l));
    const next = free.filter((l) => [...reach].some((p) => Math.abs(p - l) <= k));
    if (!next.length) { errs.push(`${c.id}: no reachable free lane at ${r.at} without jumping`); break; }
    reach = new Set(next);
    prevAt = r.at;
  }
  return errs;
}

export interface PlacedItem { kind: 'coin' | 'cone' | 'power'; lane: number; s: number }

/** Pick a chunk for this difficulty (0..1) and lay it out starting at `s0`. Randomly mirrored. */
export function placeChunk(rng: Rng, difficulty: number, s0: number): { id: string; items: PlacedItem[] } {
  const tier = difficulty < 0.25 ? 0 : difficulty < 0.6 ? 1 : 2;
  // Mostly the current tier, sometimes an easier one for breathing room.
  const want = rng() < 0.25 ? Math.max(0, tier - 1) : tier;
  const pool = CHUNKS.filter((c) => c.difficulty === want);
  const chunk = pool[Math.floor(rng() * pool.length)];
  const mirror = rng() < 0.5;
  const lane = (l: number) => (mirror ? LANE_COUNT - 1 - l : l);
  const items: PlacedItem[] = [];
  for (const r of chunk.rows) {
    for (const c of r.cones ?? []) items.push({ kind: 'cone', lane: lane(c), s: s0 + r.at });
    if (r.coins) for (let i = 0; i < r.coins.count; i++) items.push({ kind: 'coin', lane: lane(r.coins.lane), s: s0 + r.at + i * COIN_SPACING });
    if (r.power !== undefined) items.push({ kind: 'power', lane: lane(r.power), s: s0 + r.at });
  }
  return { id: chunk.id, items };
}
