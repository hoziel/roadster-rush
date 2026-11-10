import { HIT_DEPTH, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, ROOF_COIN_HEIGHT, SPEED_MAX } from './config';
import { deckLength, deckSurface, isDeck, type DeckKind } from './highroad';
import type { Rng } from './rng';
import { isTraffic, type ObstacleKind } from './spawner';
import { hitDepth } from './traffic';
import { lanesBlocked } from './longhorns';
import data from './chunks/austin.json';

export interface ChunkRow {
  at: number;
  cones?: number[];
  cars?: number[]; // low traffic: jump onto/over it or change lanes
  trucks?: number[]; // tall traffic: change lanes
  roof?: number[]; // lanes with three coins floating over what you jump there (a car roof; a cone, barrier, spike strip or parked police car)
  spikes?: number[]; // police stops: spike strips (low: jump them or steer round)
  police?: number[]; // police stops: the parked police roadster (steer round, or jump/land on it like a car)
  barriers?: number[]; // construction: low striped barriers (jump them or steer round)
  fences?: number[]; // construction: tall fences (steer round)
  diggers?: number[]; // construction: a parked digger (steer round)
  longhorns?: { from: number; to: number }[]; // longhorns crossing: each walks from lane `from` (-1/3: the verge) to `to`
  trailers?: number[]; // high road: a parked trailer with a ramp at its back (drive up it to ride the deck)
  flatbeds?: number[]; // high road: a deck with no ramp, parked nose to tail in front of another deck (or beside one)
  deck?: number[]; // trailer/flatbed lanes with a coin line all along the ramp and deck
  overheads?: number[]; // a beam to duck under (cone, construction and high road chunks)
  coins?: { lane: number; count: number };
  power?: number;
}
/** Which pool a chunk belongs to: plain cone chunks, moving traffic, a police stop or a construction zone. */
export type ChunkPool = 'cones' | 'traffic' | 'police' | 'construction' | 'longhorns' | 'highroad';
/**
 * traffic: a chunk of cars/trucks (and coins) that all drive at TRAFFIC_SPEED; never mixed with cones.
 * kind: a police stop or construction zone chunk, laid now and then by the world (never picked as a cone chunk).
 */
export interface Chunk {
  id: string; difficulty: number; traffic?: boolean; kind?: 'police' | 'construction' | 'longhorns' | 'highroad'; rows: ChunkRow[];
  length?: number; // m of road it takes (default CHUNK_LENGTH; a high road train is TRAIN_CHUNKS of them)
}

/** The pool a chunk is drawn from. */
export const poolOf = (c: Chunk): ChunkPool => (c.traffic ? 'traffic' : c.kind ?? 'cones');

export const CHUNK_LENGTH: number = data.length;
export const CHUNKS: Chunk[] = data.chunks as Chunk[];
export const chunkLength = (c: Chunk): number => c.length ?? CHUNK_LENGTH;
export const COIN_SPACING = 2.2;
export const COIN_LIFT = 0.9; // m: coins float this high over the road, or over a ramp or deck
const DECK_COIN_FROM = 1.2; // m past a deck piece's back end: its first deck coin (low on the ramp)
const DECK_COIN_TO = 1.0; // m short of its front: the last one
const NOSE_TO_TAIL = 1.5; // m: at most this gap between a deck's front and the next deck's back to roll straight on
const ROOF_COIN_STEP = 1.1; // m between the three coins over a car roof
/** What air coins (`roof`) may float over: things a jump clears or lands on. */
const JUMP_COIN_UNDER: readonly string[] = ['car', 'police', 'cone', 'barrier', 'spikes'];
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

/** Can the car get past this kind in its lane without jumping or steering (by ducking)? */
const duckable = (k: ObstacleKind): boolean => k === 'overhead';
/** Lanes of a row you can't drive through on the road without jumping. */
const walls = (o: ObstacleRow): number[] => [...o.lanes].filter(([, k]) => !duckable(k)).map(([l]) => l);

/** `skip`: leave out the deck piece in that lane (the one the car is riding). */
function obstacleRow(r: ChunkRow, skip?: number): ObstacleRow {
  const lanes = new Map<number, ObstacleKind>();
  for (const l of r.cones ?? []) lanes.set(l, 'cone');
  for (const l of r.cars ?? []) lanes.set(l, 'car');
  for (const l of r.trucks ?? []) lanes.set(l, 'truck');
  for (const l of r.spikes ?? []) lanes.set(l, 'spikes');
  for (const l of r.police ?? []) lanes.set(l, 'police');
  for (const l of r.barriers ?? []) lanes.set(l, 'barrier');
  for (const l of r.fences ?? []) lanes.set(l, 'fence');
  for (const l of r.diggers ?? []) lanes.set(l, 'digger');
  for (const a of r.longhorns ?? []) for (const l of lanesBlocked(a.from, a.to, hitDepth('longhorn'))) lanes.set(l, 'longhorn');
  for (const l of r.trailers ?? []) if (l !== skip) lanes.set(l, 'trailer');
  for (const l of r.flatbeds ?? []) if (l !== skip) lanes.set(l, 'flatbed');
  for (const l of r.overheads ?? []) lanes.set(l, 'overhead');
  let depth = 0;
  for (const k of lanes.values()) depth = Math.max(depth, hitDepth(k));
  return { at: r.at, lanes, depth };
}

/** Problems with a chunk, or [] if it's fair. Run over every chunk in tests. */
export function validateChunk(c: Chunk): string[] {
  const errs: string[] = [];
  const pool = poolOf(c);
  if (c.traffic && c.kind) errs.push(`${c.id}: a traffic chunk can't also be a ${c.kind} chunk`);
  if (pool === 'police') {
    // One parked car per stop (each is ~10 draw calls), and its spike strip.
    const cars = c.rows.reduce((n, r) => n + (r.police?.length ?? 0), 0);
    if (cars !== 1) errs.push(`${c.id}: a police stop needs exactly one parked police car (has ${cars})`);
    if (!c.rows.some((r) => r.spikes?.length)) errs.push(`${c.id}: a police stop needs a spike strip`);
  }
  if (pool === 'longhorns') {
    const n = c.rows.reduce((k, r) => k + (r.longhorns?.length ?? 0), 0);
    if (n < 1 || n > 3) errs.push(`${c.id}: a longhorn herd is 1-3 animals (has ${n})`);
  }
  if (pool === 'construction' && !c.rows.some((r) => r.barriers?.length || r.fences?.length || r.diggers?.length || r.overheads?.length)) {
    errs.push(`${c.id}: a construction chunk needs some road work`);
  }
  if (pool === 'highroad' && !c.rows.some((r) => r.trailers?.length)) errs.push(`${c.id}: a high road needs a trailer with a ramp`);
  const LEN = chunkLength(c);
  if (LEN % CHUNK_LENGTH !== 0) errs.push(`${c.id}: length ${LEN} is not a whole number of chunks`);
  const rows = [...c.rows].sort((a, b) => a.at - b.at);
  const obs = rows.map((r) => obstacleRow(r));
  rows.forEach((r, i) => {
    const o = obs[i];
    if (r.at < 0 || r.at >= LEN) errs.push(`${c.id}: row at ${r.at} outside chunk`);
    const n = (r.cones?.length ?? 0) + (r.cars?.length ?? 0) + (r.trucks?.length ?? 0) + (r.spikes?.length ?? 0)
      + (r.police?.length ?? 0) + (r.barriers?.length ?? 0) + (r.fences?.length ?? 0) + (r.diggers?.length ?? 0)
      + (r.longhorns ?? []).reduce((k, a) => k + lanesBlocked(a.from, a.to, hitDepth('longhorn')).length, 0)
      + (r.trailers?.length ?? 0) + (r.flatbeds?.length ?? 0) + (r.overheads?.length ?? 0);
    if (n !== o.lanes.size) errs.push(`${c.id}: two obstacles in one lane at ${r.at}`);
    // Every lane may be crossed by a beam (duck under it), but the road must stay open in at least one.
    if (walls(o).length >= LANE_COUNT) errs.push(`${c.id}: row at ${r.at} blocks every lane`);
    if (pool !== 'highroad' && (r.trailers?.length || r.flatbeds?.length || r.deck?.length)) errs.push(`${c.id}: trailers outside a high road chunk at ${r.at}`);
    if (r.overheads?.length && pool !== 'cones' && pool !== 'construction' && pool !== 'highroad') errs.push(`${c.id}: an overhead beam in a ${pool} chunk at ${r.at}`);
    for (const l of r.deck ?? []) if (!isDeck(o.lanes.get(l) ?? '')) errs.push(`${c.id}: deck coins without a trailer at ${r.at}`);
    if ([...o.lanes.keys()].some((l) => l < 0 || l >= LANE_COUNT)) errs.push(`${c.id}: bad lane at ${r.at}`);
    if (r.coins && o.lanes.has(r.coins.lane)) errs.push(`${c.id}: coins on an obstacle lane at ${r.at}`);
    if (r.power !== undefined && o.lanes.has(r.power)) errs.push(`${c.id}: power on an obstacle lane at ${r.at}`);
    if (c.traffic && (r.cones?.length || r.power !== undefined)) errs.push(`${c.id}: traffic chunk with a cone or power slot at ${r.at}`);
    if (!c.traffic && (r.cars?.length || r.trucks?.length)) errs.push(`${c.id}: traffic in a cone chunk at ${r.at}`);
    if (pool !== 'police' && (r.spikes?.length || r.police?.length)) errs.push(`${c.id}: police stop pieces outside a police chunk at ${r.at}`);
    if (pool !== 'construction' && (r.barriers?.length || r.fences?.length || r.diggers?.length)) errs.push(`${c.id}: road work outside a construction chunk at ${r.at}`);
    if (pool === 'police' && r.cones?.length) errs.push(`${c.id}: cones in a police chunk at ${r.at}`);
    if (pool !== 'longhorns' && r.longhorns?.length) errs.push(`${c.id}: longhorns outside a longhorns chunk at ${r.at}`);
    if (pool === 'longhorns' && (r.cones?.length || r.power !== undefined)) errs.push(`${c.id}: cones or a power slot in a longhorns chunk at ${r.at}`);
    for (const a of r.longhorns ?? []) {
      // `to` is a lane; `from` a lane or the verge just off the road; one lane's walk at most (a slow amble).
      if (!Number.isInteger(a.to) || a.to < 0 || a.to >= LANE_COUNT || a.from < -1 || a.from > LANE_COUNT || Math.abs(a.from - a.to) > 1) {
        errs.push(`${c.id}: bad longhorn walk ${a.from} -> ${a.to} at ${r.at}`);
      }
    }
    for (const l of r.roof ?? []) if (!JUMP_COIN_UNDER.includes(o.lanes.get(l) ?? 'none')) errs.push(`${c.id}: air coins over nothing to jump at ${r.at}`);
  });
  const blocking = obs.filter((o) => o.lanes.size);
  // Deck pieces: a flatbed (no ramp) must be reachable from another deck, nose to tail or alongside.
  const decks = rows.flatMap((r) => [
    ...(r.trailers ?? []).map((lane) => ({ r, lane, kind: 'trailer' as DeckKind })),
    ...(r.flatbeds ?? []).map((lane) => ({ r, lane, kind: 'flatbed' as DeckKind })),
  ]).map((d) => ({ ...d, back: d.r.at - deckLength(d.kind) / 2, front: d.r.at + deckLength(d.kind) / 2 }));
  const noseToTail = (a: typeof decks[number], b: typeof decks[number]) =>
    a.lane === b.lane && b.back - a.front >= 0 && b.back - a.front <= NOSE_TO_TAIL;
  for (const d of decks) {
    if (decks.some((p) => p !== d && p.lane === d.lane && p.back < d.front && d.back < p.front)) errs.push(`${c.id}: two decks overlap in lane ${d.lane} at ${d.r.at}`);
    if (d.kind !== 'flatbed') continue;
    const fed = decks.some((p) => p !== d && (noseToTail(p, d)
      || (Math.abs(p.lane - d.lane) === 1 && Math.min(p.front, d.front) - Math.max(p.back, d.back) >= 4)));
    if (!fed) errs.push(`${c.id}: flatbed at ${d.r.at} can't be reached from another deck`);
  }
  // A coin line must not run into an obstacle in its lane (it would lure kids into it). Traffic is closed on
  // slowly and fills the view, so a line must also stop a few metres short of a car's or truck's back.
  for (const r of rows) {
    if (!r.coins) continue;
    const from = r.at - HIT_DEPTH, to = r.at + (r.coins.count - 1) * COIN_SPACING + HIT_DEPTH;
    for (const o of blocking) {
      const k = o.lanes.get(r.coins.lane);
      if (k && o.at + hitDepth(k) >= from && o.at - hitDepth(k) <= to + (isTraffic(k) ? TRAFFIC_LURE_GAP : 0)) {
        errs.push(`${c.id}: coin line from ${r.at} runs into a ${k} at ${o.at}`);
      }
    }
  }
  if (!blocking.length) return errs;
  // Edges: the gap to the neighbouring chunk is at least 2 * EDGE_GAP, enough to reach any lane.
  if (lanesReachable(2 * EDGE_GAP) < LANE_COUNT - 1) errs.push('EDGE_GAP too small for a full lane sweep');
  const first = blocking[0], last = blocking[blocking.length - 1];
  if (Math.min(...blocking.map((o) => o.at - o.depth)) < EDGE_GAP - HIT_DEPTH) errs.push(`${c.id}: first obstacle row at ${first.at} is too close to the start`);
  if (Math.max(...blocking.map((o) => o.at + o.depth)) > LEN - EDGE_GAP + HIT_DEPTH) errs.push(`${c.id}: last obstacle row at ${last.at} is too close to the end`);
  // Reachability without jumping, at top speed: some free lane must always be reachable. Lane changes
  // only count in the clear road between two rows' hit zones (overlapping zones: stay in a lane free in both).
  // Beams don't block: you duck under them.
  const stuck = reachable(blocking, new Set(Array.from({ length: LANE_COUNT }, (_, i) => i)), -Infinity);
  if (stuck !== null) errs.push(`${c.id}: no reachable free lane at ${stuck} without jumping`);
  // Every deck has a safe way down: driving straight off its front (unless another deck carries on nose to
  // tail), the car can still reach a free lane of every row after, as on the road.
  for (const d of decks) {
    if (decks.some((p) => noseToTail(d, p))) continue;
    const after = rows.map((r) => obstacleRow(r, r === d.r ? d.lane : undefined))
      .filter((o) => o.lanes.size && o.at + o.depth > d.front);
    const at = reachable(after, new Set([d.lane]), d.front);
    if (at !== null) errs.push(`${c.id}: no safe way down off the deck in lane ${d.lane} at ${d.r.at} (blocked at ${at})`);
  }
  return errs;
}

/**
 * Walk the rows (sorted) from lanes `start`, clear of anything up to `from`: the `at` of the first row with no
 * reachable lane free of walls, or null if there's always one.
 */
function reachable(rows: ObstacleRow[], start: Set<number>, from: number): number | null {
  let reach = start;
  let end = from;
  for (const o of rows) {
    const k = end === -Infinity ? LANE_COUNT : lanesAcross(o.at - o.depth - end);
    const blocked = new Set(walls(o));
    const free = Array.from({ length: LANE_COUNT }, (_, i) => i).filter((l) => !blocked.has(l));
    const next = free.filter((l) => [...reach].some((p) => Math.abs(p - l) <= k));
    if (!next.length) return o.at;
    reach = new Set(next);
    end = Math.max(end, o.at + o.depth);
  }
  return null;
}

export interface PlacedItem {
  kind: 'coin' | 'power' | ObstacleKind;
  lane: number;
  s: number;
  y?: number; // coins up in the air (over a car roof, or along a ramp and deck): height (m)
  from?: number; // longhorns: the lane it walks from (lane is where it ends up)
}

/**
 * Pick a chunk for this difficulty (0..1) and lay it out starting at `s0`. Randomly mirrored.
 * `pool` picks the chunk type: cone chunks by default; `true` is short for the traffic chunks.
 * `only` narrows the pick (debug: a chunk with an overhead beam), if any chunk of the pool passes it.
 */
export function placeChunk(
  rng: Rng, difficulty: number, s0: number, pool: ChunkPool | boolean = 'cones', only?: (c: Chunk) => boolean,
): { id: string; items: PlacedItem[]; length: number } {
  const wanted: ChunkPool = pool === true ? 'traffic' : pool === false ? 'cones' : pool;
  const tier = difficulty < 0.25 ? 0 : difficulty < 0.6 ? 1 : 2;
  // Mostly the current tier, sometimes an easier one for breathing room.
  const want = rng() < 0.25 ? Math.max(0, tier - 1) : tier;
  const all = CHUNKS.filter((c) => poolOf(c) === wanted);
  const narrowed = only ? all.filter(only) : all;
  const kind = narrowed.length ? narrowed : all;
  const tierPool = kind.filter((c) => c.difficulty === want);
  const from = tierPool.length ? tierPool : kind;
  const chunk = from[Math.floor(rng() * from.length)];
  const mirror = rng() < 0.5;
  const lane = (l: number) => (mirror ? LANE_COUNT - 1 - l : l);
  const items: PlacedItem[] = [];
  for (const r of chunk.rows) {
    for (const c of r.cones ?? []) items.push({ kind: 'cone', lane: lane(c), s: s0 + r.at });
    for (const c of r.cars ?? []) items.push({ kind: 'car', lane: lane(c), s: s0 + r.at });
    for (const c of r.trucks ?? []) items.push({ kind: 'truck', lane: lane(c), s: s0 + r.at });
    for (const c of r.spikes ?? []) items.push({ kind: 'spikes', lane: lane(c), s: s0 + r.at });
    for (const c of r.police ?? []) items.push({ kind: 'police', lane: lane(c), s: s0 + r.at });
    for (const c of r.barriers ?? []) items.push({ kind: 'barrier', lane: lane(c), s: s0 + r.at });
    for (const c of r.fences ?? []) items.push({ kind: 'fence', lane: lane(c), s: s0 + r.at });
    for (const c of r.diggers ?? []) items.push({ kind: 'digger', lane: lane(c), s: s0 + r.at });
    for (const a of r.longhorns ?? []) items.push({ kind: 'longhorn', lane: lane(a.to), from: lane(a.from), s: s0 + r.at });
    for (const c of r.trailers ?? []) items.push({ kind: 'trailer', lane: lane(c), s: s0 + r.at });
    for (const c of r.flatbeds ?? []) items.push({ kind: 'flatbed', lane: lane(c), s: s0 + r.at });
    for (const c of r.overheads ?? []) items.push({ kind: 'overhead', lane: lane(c), s: s0 + r.at });
    for (const c of r.deck ?? []) {
      // A coin line up the ramp and all along the deck, floating over its surface.
      const k: DeckKind = r.trailers?.includes(c) ? 'trailer' : 'flatbed';
      const back = s0 + r.at - deckLength(k) / 2;
      for (let d = DECK_COIN_FROM; d <= deckLength(k) - DECK_COIN_TO + 1e-6; d += COIN_SPACING) {
        items.push({ kind: 'coin', lane: lane(c), s: back + d, y: deckSurface(k, d) + COIN_LIFT });
      }
    }
    for (const c of r.roof ?? []) for (let i = -1; i <= 1; i++) items.push({ kind: 'coin', lane: lane(c), s: s0 + r.at + i * ROOF_COIN_STEP, y: ROOF_COIN_HEIGHT });
    if (r.coins) for (let i = 0; i < r.coins.count; i++) items.push({ kind: 'coin', lane: lane(r.coins.lane), s: s0 + r.at + i * COIN_SPACING });
    if (r.power !== undefined) items.push({ kind: 'power', lane: lane(r.power), s: s0 + r.at });
  }
  return { id: chunk.id, items, length: chunkLength(chunk) };
}
