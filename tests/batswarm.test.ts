import { describe, expect, it } from 'vitest';
import { DAY_CYCLE, LANE_COUNT, SWARM_LENGTH, SWARM_MIN_GAP, SWARM_PAD } from '../src/sim/config';
import { SWARM_SPAN, conesIn, swarmCoins } from '../src/sim/batswarm';
import { dayLabel, dayPhase, isDusk, offsetFor } from '../src/sim/daycycle';
import { createWorld, queueSwarm, start, step, type World } from '../src/sim/world';

const DT = 1 / 60;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const alive = (w: World, kind: string) => w.entities.filter((e) => e.alive && e.kind === kind);

describe('day cycle', () => {
  it('starts at sunset and loops', () => {
    const w = createWorld(1);
    expect(dayPhase(w)).toBe(0);
    expect(dayLabel(0)).toBe('sunset');
    w.time = DAY_CYCLE * 0.3;
    expect(dayLabel(dayPhase(w))).toBe('dusk');
    w.time = DAY_CYCLE * 0.6;
    expect(dayLabel(dayPhase(w))).toBe('night');
    w.time = DAY_CYCLE * 1.05;
    expect(dayPhase(w)).toBeCloseTo(0.05);
  });

  it('offsetFor jumps to a phase', () => {
    const w = createWorld(1);
    w.time = 37;
    w.dayOffset = offsetFor(w, 0.6);
    expect(dayPhase(w)).toBeCloseTo(0.6);
  });
});

describe('bat swarm layout', () => {
  it('lays coin lines in every lane over the swarm length', () => {
    const coins = swarmCoins(100);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const s = coins.filter((c) => c.lane === lane).map((c) => c.s);
      expect(Math.min(...s)).toBeCloseTo(100 + SWARM_PAD);
      expect(Math.max(...s) - Math.min(...s)).toBeGreaterThan(SWARM_LENGTH - 2.5);
      expect(Math.max(...s)).toBeLessThanOrEqual(100 + SWARM_SPAN - SWARM_PAD + 1e-6);
    }
  });

  it('detects cones on the stretch', () => {
    const ents = [{ kind: 'cone', s: 50, alive: true }, { kind: 'coin', s: 120, alive: true }];
    expect(conesIn(ents, 100, 140)).toBe(false);
    expect(conesIn(ents, 30, 60)).toBe(true);
    expect(conesIn([{ kind: 'cone', s: 50, alive: false }], 30, 60)).toBe(false);
  });
});

describe('bat swarm in the world', () => {
  it('never happens outside dusk', () => {
    const w = createWorld(3);
    start(w);
    w.time = 0; // sunset: phase stays well before dusk for this short run
    const events = run(w, 10);
    expect(events).not.toContain('swarm');
    expect(w.swarmAt).toBe(-1);
  });

  it('happens at dusk, on cone-free road, with coins across all lanes', () => {
    let found = false;
    for (let seed = 1; seed <= 20 && !found; seed++) {
      const w = createWorld(seed);
      start(w);
      w.dayOffset = offsetFor(w, 0.25);
      for (let t = 0; t < 20 && w.swarmAt < 0; t += DT) step(w, DT);
      if (w.swarmAt < 0) continue;
      found = true;
      expect(isDusk(dayPhase(w))).toBe(true);
      const stretch = w.entities.filter((e) => e.alive && e.s >= w.swarmAt && e.s <= w.swarmEnd);
      expect(stretch.some((e) => e.kind === 'cone')).toBe(false);
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        expect(stretch.filter((e) => e.kind === 'coin' && e.lane === lane).length).toBeGreaterThan(10);
      }
      // No cones within the padding either side, so every lane is safe to enter and leave.
      expect(conesIn(w.entities, w.swarmAt - SWARM_PAD + 1, w.swarmEnd + SWARM_PAD - 1)).toBe(false);
      expect(w.nextSwarmAt).toBeGreaterThanOrEqual(w.swarmEnd + SWARM_MIN_GAP);
    }
    expect(found).toBe(true);
  });

  it('a queued swarm sends one swarm event when the car reaches it', () => {
    const w = createWorld(5);
    start(w);
    queueSwarm(w);
    let events: string[] = [];
    for (let t = 0; t < 30 && !events.includes('swarm'); t += DT) events = events.concat(step(w, DT));
    expect(events.filter((e) => e === 'swarm')).toHaveLength(1);
    expect(w.distance).toBeGreaterThanOrEqual(w.swarmAt);
    expect(run(w, 1)).not.toContain('swarm');
  });

  it('waits while cones block the stretch', () => {
    const w = createWorld(5);
    start(w);
    w.entities.push({ kind: 'cone', lane: 1, s: w.nextRowAt + 10, alive: true });
    w.swarmQueued = true;
    const s0 = w.nextRowAt;
    // spawn fills up to SPAWN_AHEAD; the blocked slot must get a normal chunk instead
    step(w, DT);
    expect(w.swarmAt === -1 || w.swarmAt > s0 + 10).toBe(true);
    expect(alive(w, 'cone').some((e) => e.s === s0 + 10)).toBe(true);
  });
});
