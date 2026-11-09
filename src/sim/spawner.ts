import { LANE_COUNT } from './config';
import type { Rng } from './rng';

export type PowerKind = 'ludicrous' | 'autopilot' | 'supercharger' | 'hover';
export const POWER_KINDS: PowerKind[] = ['ludicrous', 'autopilot', 'supercharger', 'hover'];
export type EntityKind = 'coin' | 'cone' | PowerKind;
export const isPower = (k: EntityKind): k is PowerKind => (POWER_KINDS as string[]).includes(k);

export interface SpawnItem {
  kind: EntityKind | 'power'; // 'power' is resolved to a concrete kind by the world
  lane: number; // 0..LANE_COUNT-1
  offset: number; // m along the road from the row start
}

/**
 * One row of track content. Never blocks every lane with cones,
 * so there is always a lane you can drive through without jumping.
 */
export function makeRow(rng: Rng, difficulty: number, powerChance = 0): SpawnItem[] {
  const items: SpawnItem[] = [];
  const lanes = shuffle(Array.from({ length: LANE_COUNT }, (_, i) => i), rng);
  const maxCones = difficulty > 0.5 ? 2 : 1;
  const cones = rng() < 0.15 ? 0 : 1 + Math.floor(rng() * maxCones);
  const blocked = lanes.slice(0, Math.min(cones, LANE_COUNT - 1));
  for (const lane of blocked) items.push({ kind: 'cone', lane, offset: 0 });

  const free = lanes.filter((l) => !blocked.includes(l));
  if (free.length === 0) return items;
  const lane = free[Math.floor(rng() * free.length)];
  if (rng() < powerChance) {
    items.push({ kind: 'power', lane, offset: 0 });
  } else if (rng() < 0.7) {
    const count = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) items.push({ kind: 'coin', lane, offset: -4 + i * 2.2 });
  }
  return items;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
