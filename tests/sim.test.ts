import { describe, expect, it } from 'vitest';
import { LANE_COUNT, SPEED_MAX, SPEED_START } from '../src/sim/config';
import { createRng } from '../src/sim/rng';
import { makeRow } from '../src/sim/spawner';
import { speedAt } from '../src/sim/speed';
import { createWorld, jump, laneX, start, steer, step, type World } from '../src/sim/world';

const DT = 1 / 60;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const emptyRunning = () => {
  const w = createWorld(1);
  start(w);
  w.nextRowAt = Infinity; // no random spawns
  return w;
};

describe('speed', () => {
  it('starts at SPEED_START and climbs', () => {
    expect(speedAt(0)).toBe(SPEED_START);
    expect(speedAt(60)).toBeGreaterThan(speedAt(30));
  });
  it('never exceeds the cap', () => {
    expect(speedAt(100000)).toBeLessThanOrEqual(SPEED_MAX);
    expect(speedAt(100000)).toBeCloseTo(SPEED_MAX, 3);
  });
});

describe('spawner', () => {
  it('always leaves at least one lane free of cones', () => {
    const rng = createRng(42);
    for (let i = 0; i < 5000; i++) {
      const cones = new Set(makeRow(rng, 1).filter((it) => it.kind === 'cone').map((it) => it.lane));
      expect(cones.size).toBeLessThan(LANE_COUNT);
    }
  });
  it('never puts coins on a cone lane', () => {
    const rng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      const row = makeRow(rng, 1);
      const coneLanes = row.filter((it) => it.kind === 'cone').map((it) => it.lane);
      for (const c of row.filter((it) => it.kind === 'coin')) expect(coneLanes).not.toContain(c.lane);
    }
  });
});

describe('world', () => {
  it('steers between lanes and clamps at the edges', () => {
    const w = emptyRunning();
    expect(steer(w, -1)).toBe(true);
    expect(steer(w, -1)).toBe(false);
    run(w, 0.5);
    expect(w.x).toBeCloseTo(laneX(0));
  });

  it('collects a coin in the lane', () => {
    const w = emptyRunning();
    w.entities.push({ kind: 'coin', lane: 1, s: 5, alive: true });
    expect(run(w, 1)).toContain('coin');
    expect(w.coins).toBe(1);
  });

  it('ends the run on a cone hit', () => {
    const w = emptyRunning();
    w.entities.push({ kind: 'cone', lane: 1, s: 5, alive: true });
    expect(run(w, 1)).toContain('crash');
    expect(w.phase).toBe('over');
  });

  it('jumping clears a cone', () => {
    const w = emptyRunning();
    w.entities.push({ kind: 'cone', lane: 1, s: 6, alive: true });
    jump(w);
    expect(run(w, 1)).not.toContain('crash');
    expect(w.phase).toBe('running');
  });

  it('changing lane avoids a cone', () => {
    const w = emptyRunning();
    w.entities.push({ kind: 'cone', lane: 1, s: 8, alive: true });
    steer(w, 1);
    run(w, 1);
    expect(w.phase).toBe('running');
  });

  it('restart reuses the pool and resets the run', () => {
    const w = createWorld(5);
    start(w);
    run(w, 5);
    const pool = w.entities.length;
    start(w);
    expect(w.distance).toBe(0);
    expect(w.entities.every((e) => !e.alive)).toBe(true);
    run(w, 5);
    expect(w.entities.length).toBeLessThanOrEqual(pool + 10);
  });

  it('a simple dodging bot survives two minutes at full speed', () => {
    const w = createWorld(3);
    start(w);
    w.time = 1000; // already at the speed cap
    for (let t = 0; t < 120; t += DT) {
      const ahead = w.entities.filter((e) => e.alive && e.kind === 'cone' && e.s - w.distance > 0 && e.s - w.distance < 14);
      const blocked = new Set(ahead.map((e) => e.lane));
      if (blocked.has(w.lane)) {
        const free = [0, 1, 2].filter((l) => !blocked.has(l)).sort((a, b) => Math.abs(a - w.lane) - Math.abs(b - w.lane))[0];
        if (free !== undefined) steer(w, free > w.lane ? 1 : -1);
        else jump(w);
      }
      step(w, DT);
    }
    expect(w.phase).toBe('running');
  });
});
