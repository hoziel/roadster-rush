// Bat Swarm (Austin): at dusk, a bridge stretch where bats burst out and coins rain
// across every lane. This file is the layout and the fairness check; world.ts decides when.
import { HIT_DEPTH, LANE_COUNT, SWARM_COIN_SPACING, SWARM_LENGTH, SWARM_PAD } from './config';

/** Road the swarm takes up in place of a chunk: pad, coin rain, pad. */
export const SWARM_SPAN = SWARM_PAD * 2 + SWARM_LENGTH;

export interface SwarmCoin { lane: number; s: number }

/** Coin lines in every lane for a swarm whose span starts at `s0`. */
export function swarmCoins(s0: number): SwarmCoin[] {
  const out: SwarmCoin[] = [];
  const start = s0 + SWARM_PAD;
  for (let d = 0; d <= SWARM_LENGTH + 1e-6; d += SWARM_COIN_SPACING) {
    for (let lane = 0; lane < LANE_COUNT; lane++) out.push({ lane, s: start + d });
  }
  return out;
}

/** True if any live obstacle (cone, car, truck) sits on (or within a cone's hitbox of) the stretch [from, to]. */
export function conesIn(
  entities: readonly { kind: string; s: number; alive: boolean }[], from: number, to: number,
): boolean {
  return entities.some((e) => e.alive && (e.kind === 'cone' || e.kind === 'car' || e.kind === 'truck') && e.s >= from - HIT_DEPTH && e.s <= to + HIT_DEPTH);
}
