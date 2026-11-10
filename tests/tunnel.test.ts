import { describe, expect, it } from 'vitest';
import { LANE_COUNT, TUNNEL_ENTRY, TUNNEL_EXIT, TUNNEL_LENGTH, TUNNEL_SLOTS } from '../src/sim/config';
import { createRng } from '../src/sim/rng';
import {
  CONTENT_END, SLOT_ANGLE, angleGap, exitSlot, laneToSlot, slotToLane, slotsReachable, tunnelItems, validateTunnel, wrapSlot,
} from '../src/sim/tunnel';
import { createWorld, laneX, queueTunnel, start, steer, step, type World } from '../src/sim/world';

const DT = 1 / 120;
const runUntil = (w: World, cond: () => boolean, max = 60) => {
  const events: string[] = [];
  for (let t = 0; t < max && !cond(); t += DT) events.push(...step(w, DT));
  return events;
};
/** A running world that has just entered a queued tunnel, with its contents cleared. */
function inTunnel(seed = 1, lane = 1): World {
  const w = createWorld(seed);
  start(w);
  w.intro = 0;
  w.lane = lane;
  w.x = laneX(lane);
  queueTunnel(w);
  runUntil(w, () => w.tube);
  for (const e of w.entities) e.alive = false;
  return w;
}

describe('tunnel ring maths', () => {
  it('maps lanes 0/1/2 to slots -1/0/+1 around the bottom', () => {
    expect([0, 1, 2].map(laneToSlot)).toEqual([-1, 0, 1]);
  });

  it('wraps slots into -3..4', () => {
    expect(wrapSlot(5)).toBe(-3);
    expect(wrapSlot(-4)).toBe(4);
    expect(wrapSlot(8)).toBe(0);
    expect(wrapSlot(-9)).toBe(-1);
  });

  it('exits to the nearest bottom slot and lane', () => {
    expect([-3, -2, -1, 0, 1, 2, 3].map(exitSlot)).toEqual([-1, -1, -1, 0, 1, 1, 1]);
    expect(slotToLane(-1)).toBe(0);
    expect(slotToLane(3)).toBe(2);
    expect(slotToLane(4)).toBeGreaterThanOrEqual(0);
    expect(slotToLane(4)).toBeLessThan(LANE_COUNT);
  });

  it('measures angle gaps the short way round', () => {
    expect(angleGap(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2);
    expect(angleGap(-SLOT_ANGLE * 3, SLOT_ANGLE * 4)).toBeCloseTo(SLOT_ANGLE);
  });

  it('the cone-free entry is long enough to reach any of the near slots', () => {
    expect(slotsReachable(TUNNEL_ENTRY)).toBeGreaterThanOrEqual(2);
  });
});

describe('tunnel layout', () => {
  it('is fair for many seeds: entry/exit clear, a free slot always reachable, no coin lures', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const items = tunnelItems(createRng(seed), 1000);
      expect(validateTunnel(items, 1000), `seed ${seed}`).toEqual([]);
      expect(items.every((i) => i.s - 1000 <= TUNNEL_LENGTH - TUNNEL_EXIT)).toBe(true);
    }
  });

  it('rewards going up the walls: coins on upper slots and on the roof', () => {
    let roof = 0, cones = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const items = tunnelItems(createRng(seed), 0);
      roof += items.filter((i) => i.kind === 'coin' && i.slot === 4).length;
      cones += items.filter((i) => i.kind === 'cone').length;
      expect(items.filter((i) => i.kind === 'coin' && Math.abs(i.slot) >= 2).length).toBeGreaterThan(5);
    }
    expect(roof).toBeGreaterThan(50);
    expect(cones).toBeGreaterThan(0);
  });

  it('the validator catches an unfair ring', () => {
    const wall = Array.from({ length: TUNNEL_SLOTS }, (_, k) => ({ kind: 'cone' as const, slot: wrapSlot(k), s: 40 }));
    expect(validateTunnel(wall, 0).length).toBeGreaterThan(0);
    expect(validateTunnel([{ kind: 'cone', slot: 0, s: 5 }], 0).length).toBeGreaterThan(0);
    expect(validateTunnel([{ kind: 'coin', slot: 2, s: 38 }, { kind: 'cone', slot: 2, s: 40 }], 0).length).toBeGreaterThan(0);
    expect(validateTunnel([{ kind: 'coin', slot: 0, s: CONTENT_END + 5 }], 0).length).toBeGreaterThan(0);
  });
});

describe('tunnel in the world', () => {
  it('a queued tunnel is laid on cone-free road and sends one tunnel event on entry', () => {
    const w = createWorld(7);
    start(w);
    w.intro = 0;
    queueTunnel(w);
    const events = runUntil(w, () => w.tube);
    expect(events.filter((e) => e === 'tunnel')).toHaveLength(1);
    expect(w.tunnelEnd - w.tunnelAt).toBe(TUNNEL_LENGTH);
    const inside = w.entities.filter((e) => e.alive && e.s >= w.tunnelAt && e.s <= w.tunnelEnd);
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.every((e) => e.slot !== undefined)).toBe(true);
  });

  it('enters at the slot matching the lane', () => {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const w = inTunnel(3, lane);
      expect(w.slot).toBe(lane - 1);
      expect(w.angle).toBeCloseTo((lane - 1) * SLOT_ANGLE);
    }
  });

  it('steering wraps all the way round the ring, upside down and back to the bottom', () => {
    const w = inTunnel(4, 1);
    for (let i = 0; i < TUNNEL_SLOTS; i++) {
      expect(steer(w, -1)).toBe(true);
      runUntil(w, () => angleGap(w.angle, w.slot * SLOT_ANGLE) < 1e-6, 1);
      if (i === 3) expect(Math.abs(Math.cos(w.angle) + 1)).toBeLessThan(1e-6); // slot 4: upside down
    }
    expect(w.slot).toBe(0);
    expect(angleGap(w.angle, 0)).toBeLessThan(1e-6);
    expect(Math.abs(w.angle)).toBeLessThan(Math.PI * 2); // stays bounded however many laps
  });

  it('collides by slot: a cone on the roof hits only a car on the roof', () => {
    const w = inTunnel(5, 1);
    w.entities.push({ kind: 'cone', lane: 1, s: w.distance + 3, alive: true, slot: 4 });
    runUntil(w, () => false, 0.5);
    expect(w.batteries).toBe(3);

    const v = inTunnel(5, 1);
    for (let i = 0; i < 4; i++) steer(v, 1);
    runUntil(v, () => false, 1);
    expect(v.slot).toBe(4);
    v.entities.push({ kind: 'cone', lane: 1, s: v.distance + 3, alive: true, slot: 4 });
    v.entities.push({ kind: 'coin', lane: 1, s: v.distance + 6, alive: true, slot: 4 });
    const events = runUntil(v, () => false, 1.2);
    expect(events).toContain('hit');
    expect(events).toContain('coin');
  });

  it('slides back down near the exit and leaves in a lane', () => {
    const w = inTunnel(6, 1);
    for (let i = 0; i < 4; i++) steer(w, -1); // up and over to the roof
    runUntil(w, () => w.distance >= w.tunnelEnd - TUNNEL_EXIT + 1);
    expect(Math.abs(w.slot)).toBeLessThanOrEqual(1);
    expect(steer(w, -1) && Math.abs(w.slot) <= 1).toBe(true);
    runUntil(w, () => !w.tube);
    expect(w.tube).toBe(false);
    expect(w.lane).toBeGreaterThanOrEqual(0);
    expect(w.lane).toBeLessThan(LANE_COUNT);
    expect(Math.abs(w.x - laneX(w.lane))).toBeLessThan(0.05);
  });

  it('autopilot keeps working in the tube and never hits a cone', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = createWorld(seed);
      start(w);
      w.intro = 0;
      queueTunnel(w);
      runUntil(w, () => w.tube);
      w.power = 'autopilot';
      w.powerTime = 999;
      w.invuln = 0;
      const cones = w.entities.filter((e) => e.alive && e.kind === 'cone' && e.slot !== undefined).length;
      const events = runUntil(w, () => !w.tube);
      expect(events.filter((e) => e === 'smash' || e === 'hit').length, `seed ${seed} (${cones} cones)`).toBe(0);
      expect(events.filter((e) => e === 'coin').length).toBeGreaterThan(5);
    }
  });

  it('happens on its own after the first stretch, never two at once', () => {
    let found = false;
    for (let seed = 1; seed <= 10 && !found; seed++) {
      const w = createWorld(seed);
      start(w);
      w.kidMode = true;
      w.batteries = 99;
      runUntil(w, () => w.tunnelAt >= 0, 120);
      if (w.tunnelAt < 0) continue;
      found = true;
      expect(w.tunnelAt).toBeGreaterThanOrEqual(500);
      expect(w.nextTunnelAt).toBeGreaterThanOrEqual(w.tunnelEnd);
    }
    expect(found).toBe(true);
  });
});
