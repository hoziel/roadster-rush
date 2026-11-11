// Sky lanes: while hovering, the car flies three aerial lanes above the rooftops. Rows of sky obstacles
// (birds, drones, helicopters) block one or two lanes, never all three, with coins in a free lane.
// Hitting one ends the hover early (the car drops back to the road); it never costs a battery.
// They hold their place along the lane (any motion is only drawn), so rows can never drift together.
import { LANE_COUNT } from './config';
import type { Rng } from './rng';

export type SkyKind = 'bird' | 'drone' | 'heli';
export const SKY_KINDS: readonly string[] = ['bird', 'drone', 'heli'];
export const isSky = (k: string): k is SkyKind => SKY_KINDS.includes(k);

/** m half-depth of each sky obstacle's hit zone along the lane (helicopters are long). */
export const SKY_DEPTH: Record<SkyKind, number> = { bird: 1.4, drone: 1.3, heli: 3.2 };

export interface SkyItem { kind: SkyKind | 'coin'; lane: number; s: number }

/** One row of the sky course at `s`: one or two blocked lanes, a short coin line in a free lane just before it. */
export function skyRow(rng: Rng, s: number, gap: number): SkyItem[] {
  const blocked = rng() < 0.15 ? 2 : 1;
  const lanes = [0, 1, 2].sort(() => rng() - 0.5);
  const r = rng();
  const kind: SkyKind = r < 0.45 ? 'bird' : r < 0.8 ? 'drone' : 'heli';
  const out: SkyItem[] = [];
  for (let i = 0; i < blocked; i++) out.push({ kind, lane: lanes[i], s });
  const free = lanes[blocked];
  for (let i = 0; i < 4; i++) out.push({ kind: 'coin', lane: free, s: s - gap * 0.55 + i * 2.6 });
  return out.filter((it) => it.lane >= 0 && it.lane < LANE_COUNT);
}
