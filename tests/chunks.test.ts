import { describe, expect, it } from 'vitest';
import { CHUNKS, lanesReachable, placeChunk, validateChunk } from '../src/sim/chunks';
import { LANE_COUNT } from '../src/sim/config';
import { createRng } from '../src/sim/rng';

describe('chunk library', () => {
  it('has easy, medium and hard chunks', () => {
    for (const d of [0, 1, 2]) expect(CHUNKS.filter((c) => c.difficulty === d).length).toBeGreaterThanOrEqual(4);
  });

  it('every chunk is fair (passable, spaced, nothing on cone lanes)', () => {
    const errors = CHUNKS.flatMap(validateChunk);
    expect(errors).toEqual([]);
  });

  it('ids are unique', () => {
    expect(new Set(CHUNKS.map((c) => c.id)).size).toBe(CHUNKS.length);
  });

  it('the validator catches a blocked row and an unreachable switch', () => {
    expect(validateChunk({ id: 'bad', difficulty: 0, rows: [{ at: 10, cones: [0, 1, 2] }] }).length).toBeGreaterThan(0);
    // Left lane only, then right lane only, too close together to cross two lanes.
    expect(lanesReachable(6)).toBeLessThan(2);
    expect(validateChunk({ id: 'bad2', difficulty: 0, rows: [{ at: 10, cones: [1, 2] }, { at: 16, cones: [0, 1] }] }).length).toBeGreaterThan(0);
  });

  it('placement mirrors lanes but keeps every row passable', () => {
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) {
      const { items } = placeChunk(rng, rng(), i * 40);
      const byRow = new Map<number, Set<number>>();
      for (const it of items.filter((x) => x.kind === 'cone')) {
        if (!byRow.has(it.s)) byRow.set(it.s, new Set());
        byRow.get(it.s)!.add(it.lane);
      }
      for (const lanes of byRow.values()) expect(lanes.size).toBeLessThan(LANE_COUNT);
    }
  });
});

describe('validator: coin lines', () => {
  it('flags a coin line that runs into a later cone in its lane', () => {
    const errs = validateChunk({ id: 'lure', difficulty: 0, rows: [{ at: 6, coins: { lane: 1, count: 6 } }, { at: 14, cones: [1] }] });
    expect(errs.some((e) => e.includes('coin line'))).toBe(true);
  });
});
