import { describe, expect, it } from 'vitest';
import { BATTERIES, CHASE_TIME, HOVER_HEIGHT } from '../src/sim/config';
import { createWorld, jump, start, step, steer, type Entity, type World } from '../src/sim/world';

const DT = 1 / 60;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const emptyRunning = () => {
  const w = createWorld(1);
  start(w);
  w.nextRowAt = Infinity;
  return w;
};
const put = (w: World, kind: Entity['kind'], ahead: number, lane = 1) =>
  w.entities.push({ kind, lane, s: w.distance + ahead, alive: true });

describe('kid mode', () => {
  it('a crash costs a battery instead of ending the run', () => {
    const w = emptyRunning();
    put(w, 'cone', 5);
    expect(run(w, 1)).toContain('hit');
    expect(w.phase).toBe('running');
    expect(w.batteries).toBe(BATTERIES - 1);
    expect(w.chase).toBeGreaterThan(0);
  });

  it('blinking grace: a second cone right after is smashed, not a crash', () => {
    const w = emptyRunning();
    put(w, 'cone', 5);
    put(w, 'cone', 9);
    const ev = run(w, 1.2);
    expect(ev).toContain('smash');
    expect(w.batteries).toBe(BATTERIES - 1);
  });

  it('the police catches you on a second crash while close', () => {
    const w = emptyRunning();
    put(w, 'cone', 5);
    run(w, 2); // crash, grace runs out, police still close
    put(w, 'cone', 5);
    expect(run(w, 1)).toContain('caught');
    expect(w.phase).toBe('over');
    expect(w.caught).toBe(true);
  });

  it('once the police drops back, a crash only costs a battery', () => {
    const w = emptyRunning();
    put(w, 'cone', 5);
    run(w, CHASE_TIME + 1);
    expect(w.chase).toBe(0);
    put(w, 'cone', 5);
    run(w, 1);
    expect(w.phase).toBe('running');
    expect(w.batteries).toBe(BATTERIES - 2);
  });

  it('the last battery ending the run is a normal finish', () => {
    const w = emptyRunning();
    w.batteries = 1;
    put(w, 'cone', 5);
    expect(run(w, 1)).toContain('crash');
    expect(w.phase).toBe('over');
    expect(w.caught).toBe(false);
  });
});

describe('power-ups', () => {
  it('supercharger refills a battery and shakes off the police', () => {
    const w = emptyRunning();
    w.batteries = 1;
    w.chase = 3;
    put(w, 'supercharger', 5);
    expect(run(w, 1)).toContain('battery');
    expect(w.batteries).toBe(2);
    expect(w.chase).toBe(0);
  });

  it('ludicrous boosts speed and smashes cones', () => {
    const w = emptyRunning();
    put(w, 'ludicrous', 3);
    run(w, 0.5);
    expect(w.power).toBe('ludicrous');
    const before = w.speed;
    expect(before).toBeGreaterThan(12 * 1.4);
    put(w, 'cone', 8);
    expect(run(w, 1)).toContain('smash');
    expect(w.batteries).toBe(BATTERIES);
  });

  it('hover floats over cones and still grabs coins', () => {
    const w = emptyRunning();
    put(w, 'hover', 3);
    run(w, 0.6);
    expect(w.power).toBe('hover');
    expect(w.y).toBeCloseTo(HOVER_HEIGHT);
    expect(jump(w)).toBe(false);
    put(w, 'cone', 8);
    put(w, 'coin', 10);
    const ev = run(w, 1);
    expect(ev).not.toContain('hit');
    expect(ev).toContain('coin');
  });

  it('hover lands when it runs out', () => {
    const w = emptyRunning();
    put(w, 'hover', 3);
    const ev = run(w, 7);
    expect(ev).toContain('power-end');
    expect(w.y).toBe(0);
  });

  it('autopilot steers out of a blocked lane and ignores swipes', () => {
    const w = emptyRunning();
    put(w, 'autopilot', 3);
    run(w, 0.5);
    expect(w.power).toBe('autopilot');
    expect(steer(w, 1)).toBe(false);
    put(w, 'cone', 15, 1);
    put(w, 'coin', 15, 2);
    run(w, 0.5);
    expect(w.lane).toBe(2);
  });
});
