import { describe, expect, it } from 'vitest';
import { BATTERIES, HOVER_CHARGES_MAX, HOVER_CHARGES_START, HOVER_TIME, INTRO_CHASE_TIME } from '../src/sim/config';
import { createWorld, hover, policeClose, start, step, type Entity, type World } from '../src/sim/world';

const DT = 1 / 60;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const emptyRunning = () => { const w = createWorld(1); start(w); w.nextRowAt = Infinity; return w; };
const put = (w: World, kind: Entity['kind'], ahead: number, lane = 1) =>
  w.entities.push({ kind, lane, s: w.distance + ahead, alive: true });

describe('hover button', () => {
  it('a run starts with a charge; pressing spends it and hovers for HOVER_TIME', () => {
    const w = emptyRunning();
    expect(w.hoverCharges).toBe(HOVER_CHARGES_START);
    expect(hover(w)).toBe(true);
    expect(w.power).toBe('hover');
    expect(w.hoverCharges).toBe(HOVER_CHARGES_START - 1);
    run(w, HOVER_TIME - 0.2);
    expect(w.power).toBe('hover');
    run(w, 0.4);
    expect(w.power).toBe(null);
  });

  it('no charge, no hover', () => {
    const w = emptyRunning();
    w.hoverCharges = 0;
    expect(hover(w)).toBe(false);
    expect(w.power).toBe(null);
  });

  it('hover pickups bank charges up to the max instead of firing', () => {
    const w = emptyRunning();
    for (let i = 0; i < HOVER_CHARGES_MAX + 2; i++) put(w, 'hover', 3 + i * 4);
    const ev = run(w, 3);
    expect(ev).toContain('charge');
    expect(w.power).toBe(null);
    expect(w.hoverCharges).toBe(HOVER_CHARGES_MAX);
  });
});

describe('opening police chase', () => {
  it('police is close at the start and drops back', () => {
    const w = emptyRunning();
    expect(policeClose(w)).toBe(true);
    run(w, INTRO_CHASE_TIME + 0.1);
    expect(policeClose(w)).toBe(false);
  });

  it('a crash during the opening chase does not end the run', () => {
    const w = emptyRunning();
    put(w, 'cone', 5);
    expect(run(w, 1)).toContain('hit');
    expect(w.phase).toBe('running');
    expect(w.batteries).toBe(BATTERIES - 1);
    expect(w.chase).toBeGreaterThan(0);
  });
});
