// Tube tunnel: a round tunnel where the three lanes become slots around a ring and the car can drive
// up the walls and upside down (after the real Roadster's suction-fan stunt). This file holds the ring
// maths, the layout and its fairness check; world.ts decides when a tunnel happens and drives the car.
import {
  HIT_DEPTH, LANE_CHANGE_SPEED, LANE_WIDTH, SPEED_MAX, TUNNEL_ENTRY, TUNNEL_EXIT, TUNNEL_LENGTH, TUNNEL_SLOTS,
} from './config';
import type { Rng } from './rng';

export const SLOT_ANGLE = (Math.PI * 2) / TUNNEL_SLOTS;
/** rad/s around the ring: one slot takes as long as one lane change on the road. */
export const TUBE_TURN_SPEED = (LANE_CHANGE_SPEED / LANE_WIDTH) * SLOT_ANGLE;
const HALF = TUNNEL_SLOTS / 2;

/** The slot a car in `lane` enters at: lanes 0/1/2 sit at slots -1/0/+1 around the bottom. */
export const laneToSlot = (lane: number): number => lane - 1;

/** Any slot index folded into -(HALF-1)..HALF (for 8 slots: -3..4, 4 = straight up). */
export function wrapSlot(k: number): number {
  const m = ((k % TUNNEL_SLOTS) + TUNNEL_SLOTS) % TUNNEL_SLOTS;
  return m > HALF ? m - TUNNEL_SLOTS : m;
}

/** Nearest bottom slot (-1, 0 or +1) to slot `k`: where the car slides to before leaving. */
export const exitSlot = (k: number): number => Math.max(-1, Math.min(1, wrapSlot(k)));

/** Lane the car leaves in from bottom slot `k`. */
export const slotToLane = (k: number): number => exitSlot(k) + 1;

/** Shortest angle between two angles, 0..π. */
export function angleGap(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/** Steps around the ring between two slots, the short way. */
export const slotGap = (a: number, b: number): number => Math.abs(wrapSlot(a - b));

/** How many slots you can move around the ring in a gap of `gap` metres at top speed. */
export function slotsReachable(gap: number): number {
  const t = Math.max(0, gap - 2 * HIT_DEPTH) / SPEED_MAX;
  return Math.floor((t * TUBE_TURN_SPEED) / SLOT_ANGLE + 1e-9);
}

export interface TunnelItem { kind: 'coin' | 'cone'; slot: number; s: number }

const COIN_STEP = 2.2; // m between coins along a line
const SPIRAL_PITCH = 6; // m per slot: followable at top speed (one slot every ~4.4 m)
const PIECE_GAP = 7; // m between pieces, so coins never lead straight into a cone
/** Last s (relative to the tunnel start) where anything is laid. */
export const CONTENT_END = TUNNEL_LENGTH - TUNNEL_EXIT - 4;

/**
 * Lay a tunnel's contents for a tunnel starting at `s0`: rings and spirals of coins up the walls,
 * with a few cone rows between them. Cone rows that would make the run unfair are dropped.
 */
export function tunnelItems(rng: Rng, s0: number): TunnelItem[] {
  const items: TunnelItem[] = [];
  const pick = (n: number) => Math.floor(rng() * n);
  let at = TUNNEL_ENTRY - 4; // welcome ring just inside the mouth (coins only)
  let piece = 'ring';
  let lastConeAt = 0; // relative s of the last cone row (0 = the mouth: the car is at a bottom slot)
  let reach = new Set([-1, 0, 1].map(wrapSlot));
  while (at < CONTENT_END) {
    if (piece === 'ring') {
      // Two hoops of coins all the way round: any slot gets some.
      if (at + COIN_STEP > CONTENT_END) break;
      for (const d of [0, COIN_STEP]) for (let k = 0; k < TUNNEL_SLOTS; k++) items.push({ kind: 'coin', slot: wrapSlot(k), s: s0 + at + d });
      at += COIN_STEP;
    } else if (piece === 'spiral') {
      // One full turn up one wall, over the roof and down the other, back to the bottom.
      const dir = rng() < 0.5 ? -1 : 1;
      const start = pick(3) - 1;
      const steps = Math.min(TUNNEL_SLOTS, Math.floor((CONTENT_END - at) / SPIRAL_PITCH));
      if (steps < 3) break;
      let d = 0;
      for (let i = 0; i <= steps; i++) {
        for (let c = 0; c < 3 && d <= CONTENT_END - at; c++, d += SPIRAL_PITCH / 3) {
          items.push({ kind: 'coin', slot: wrapSlot(start + dir * i), s: s0 + at + d });
        }
      }
      at += d - SPIRAL_PITCH / 3;
    } else {
      // Two cone rows 14 m apart, 2-3 cones each, with a coin reward on a free slot after each.
      for (let row = 0; row < 2 && at < CONTENT_END - 3; row++) {
        const want = 2 + pick(2);
        let cones: number[] = [];
        while (cones.length < want) {
          const k = wrapSlot(pick(TUNNEL_SLOTS));
          if (!cones.includes(k)) cones.push(k);
        }
        // Drop cones until some free slot is reachable from where the car could be.
        let next = reachable(reach, cones, slotsReachable(at - lastConeAt));
        while (!next.length && cones.length) { cones = cones.slice(1); next = reachable(reach, cones, slotsReachable(at - lastConeAt)); }
        if (cones.length) {
          for (const k of cones) items.push({ kind: 'cone', slot: k, s: s0 + at });
          reach = new Set(next);
          lastConeAt = at;
          const free = next[pick(next.length)];
          for (let c = 1; c <= 2 && at + c * COIN_STEP <= CONTENT_END; c++) items.push({ kind: 'coin', slot: free, s: s0 + at + c * COIN_STEP });
        }
        at += 14;
      }
      at -= 14;
    }
    at += PIECE_GAP;
    const r = rng();
    piece = piece === 'cones' ? (r < 0.6 ? 'spiral' : 'ring') : r < 0.55 ? 'cones' : piece === 'spiral' ? 'ring' : 'spiral';
  }
  return items;
}

/** Free slots (not in `cones`) within `k` steps of some slot in `reach`. */
function reachable(reach: Set<number>, cones: number[], k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < TUNNEL_SLOTS; i++) {
    const slot = wrapSlot(i);
    if (cones.includes(slot)) continue;
    for (const p of reach) if (slotGap(p, slot) <= k) { out.push(slot); break; }
  }
  return out;
}

/** Problems with a tunnel's contents laid from `s0`, or [] if it's fair. Run over many seeds in tests. */
export function validateTunnel(items: TunnelItem[], s0: number): string[] {
  const errs: string[] = [];
  const cones = items.filter((i) => i.kind === 'cone');
  for (const it of items) {
    const rel = it.s - s0;
    if (rel < 0 || rel > CONTENT_END + 1e-6) errs.push(`${it.kind} at ${rel.toFixed(1)} outside the tunnel's content stretch`);
    if (wrapSlot(it.slot) !== it.slot) errs.push(`unwrapped slot ${it.slot}`);
  }
  for (const c of cones) {
    if (c.s - s0 < TUNNEL_ENTRY) errs.push(`cone at ${(c.s - s0).toFixed(1)} inside the cone-free entry`);
    // Coins must not lure the car into a cone just ahead in the same slot.
    for (const k of items) {
      if (k.kind === 'coin' && k.slot === c.slot && k.s >= c.s - 4 && k.s <= c.s + HIT_DEPTH * 2) {
        errs.push(`coin at ${(k.s - s0).toFixed(1)} leads into a cone at ${(c.s - s0).toFixed(1)} (slot ${c.slot})`);
      }
    }
  }
  // Reachability without jumping, at top speed, from any bottom slot at the mouth.
  const rows = [...new Set(cones.map((c) => c.s))].sort((a, b) => a - b);
  let reach = new Set([-1, 0, 1]);
  let prev = s0;
  for (const s of rows) {
    const rowCones = cones.filter((c) => c.s === s).map((c) => c.slot);
    const next = reachable(reach, rowCones, slotsReachable(s - prev));
    if (!next.length) { errs.push(`no reachable free slot at ${(s - s0).toFixed(1)} without jumping`); break; }
    reach = new Set(next);
    prev = s;
  }
  return errs;
}
