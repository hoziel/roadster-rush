// Longhorns crossing: Texas longhorns ambling across the road. Each animal walks from lane `from` to lane `to`
// while the car closes the last LONGHORN_WALK metres to it, so its sideways position depends only on how far
// ahead it is, never on time. That makes the crossing as predictable as a row of cones: where each animal
// stands when the car reaches it is fixed by the layout, and the chunk validator checks exactly those lanes.
import { LANE_COUNT, LANE_WIDTH, LONGHORN_HIT_X, LONGHORN_WALK } from './config';

/** How far along its walk an animal is (0 = still at `from`, 1 = at `to`), with it `rel` metres ahead of the car. */
export function walkFraction(rel: number): number {
  return Math.min(1, Math.max(0, 1 - rel / LONGHORN_WALK));
}

/** The animal's (fractional) lane `rel` metres ahead of the car. */
export const herdLane = (from: number, to: number, rel: number): number => from + (to - from) * walkFraction(rel);

/** Sideways position (m, 0 = centre lane) of a fractional lane. */
const laneCentre = (lane: number): number => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

/**
 * Lanes an animal walking `from` → `to` can block while the car is within `depth` metres of it (its hit zone):
 * every lane whose centre comes within LONGHORN_HIT_X of the animal over that stretch.
 */
export function lanesBlocked(from: number, to: number, depth: number): number[] {
  const a = laneCentre(herdLane(from, to, depth)), b = laneCentre(herdLane(from, to, -depth));
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const out: number[] = [];
  for (let l = 0; l < LANE_COUNT; l++) {
    const x = laneCentre(l);
    const d = x < lo ? lo - x : x > hi ? x - hi : 0;
    if (d < LONGHORN_HIT_X) out.push(l);
  }
  return out;
}
