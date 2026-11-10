import { describe, expect, it } from 'vitest';
import { SPEED_MAX, SPEED_START, SPEED_STEPS, SPEED_STEP_TIME, SPEED_SURGE } from '../src/sim/config';
import { speedAt } from '../src/sim/speed';
import { SLOT_ANGLE, wrapSlot } from '../src/sim/tunnel';
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
  it('steps up every SPEED_STEP_TIME and keeps climbing for minutes', () => {
    expect(speedAt(SPEED_STEP_TIME - 0.1)).toBe(SPEED_START);
    expect(speedAt(SPEED_STEP_TIME * 2 + 3)).toBeGreaterThan(speedAt(SPEED_STEP_TIME + 3));
    expect(speedAt(150)).toBeGreaterThan(speedAt(120));
    expect(speedAt(SPEED_STEP_TIME * SPEED_STEPS + SPEED_SURGE)).toBeCloseTo(SPEED_MAX, 6);
  });
  it('never exceeds the cap', () => {
    expect(speedAt(100000)).toBeLessThanOrEqual(SPEED_MAX);
    expect(speedAt(100000)).toBeCloseTo(SPEED_MAX, 3);
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

  it('kid mode off: a cone hit ends the run', () => {
    const w = emptyRunning();
    w.kidMode = false;
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
      if (w.tube) {
        // Tube tunnel: same idea, around the ring of slots.
        const taken = new Set(ahead.map((e) => e.slot ?? e.lane - 1));
        if (taken.has(w.slot) && Math.abs(w.angle - w.slot * SLOT_ANGLE) < 0.05) {
          const free = [-3, -2, -1, 0, 1, 2, 3, 4].filter((k) => !taken.has(k))
            .sort((a, b) => Math.abs(wrapSlot(a - w.slot)) - Math.abs(wrapSlot(b - w.slot)))[0];
          if (free !== undefined) steer(w, wrapSlot(free - w.slot) > 0 ? 1 : -1);
        }
        step(w, DT);
        continue;
      }
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
