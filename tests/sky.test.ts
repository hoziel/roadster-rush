import { describe, expect, it } from 'vitest';
import { BATTERIES, HOVER_BOOST, HOVER_TIME, SKY_HEIGHT } from '../src/sim/config';
import { isSky } from '../src/sim/sky';
import { createWorld, hover, start, step, type Entity, type World } from '../src/sim/world';

const DT = 1 / 120;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const emptyRunning = (seed = 1) => {
  const w = createWorld(seed);
  start(w);
  w.nextRowAt = Infinity; // no road chunks: only what the hover lays
  return w;
};
const skyItems = (w: World) => w.entities.filter((e) => e.alive && isSky(e.kind));

describe('sky lanes', () => {
  it('a hover has just a couple of sky rows, each blocking one lane', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const w = emptyRunning(seed);
      expect(hover(w)).toBe(true);
      const rows = new Map<number, Set<number>>();
      for (const e of skyItems(w)) {
        const key = Math.round(e.s);
        if (!rows.has(key)) rows.set(key, new Set());
        rows.get(key)!.add(e.lane);
      }
      expect(rows.size).toBeGreaterThanOrEqual(1);
      expect(rows.size).toBeLessThanOrEqual(3);
      for (const lanes of rows.values()) expect(lanes.size).toBe(1);
    }
  });

  it('flying into a sky obstacle ends the hover and drops back, without losing a battery', () => {
    const w = emptyRunning();
    hover(w);
    run(w, 2); // up in the sky lanes
    expect(w.y).toBeCloseTo(SKY_HEIGHT);
    const first = skyItems(w).sort((a, b) => a.s - b.s)[0];
    w.lane = first.lane; w.x = (first.lane - 1) * 2.5; // fly straight at it
    const ev = run(w, 3);
    expect(ev).toContain('sky-hit');
    expect(w.power).toBe(null);
    expect(w.batteries).toBe(BATTERIES);
    expect(skyItems(w).length).toBe(0); // the rest of the course is cleared
    run(w, 3);
    expect(w.y).toBe(0);
    expect(w.phase).toBe('running');
  });

  it('a hover that dodges everything flies the whole course and lands safely', () => {
    const w = emptyRunning(3);
    hover(w);
    const ev: string[] = [];
    for (let t = 0; t < HOVER_TIME + 2.5; t += DT) {
      // Dodge: move to a free lane of the next row ahead.
      const ahead = skyItems(w).filter((e) => e.s > w.distance - 2).sort((a, b) => a.s - b.s);
      if (ahead.length) {
        const rowS = ahead[0].s;
        const blocked = new Set(ahead.filter((e) => Math.abs(e.s - rowS) < 0.5).map((e) => e.lane));
        const free = [1, 0, 2].find((l) => !blocked.has(l))!;
        w.lane = free;
      }
      ev.push(...step(w, DT));
    }
    expect(ev).not.toContain('sky-hit');
    expect(ev).toContain('coin');
    expect(w.y).toBe(0);
    expect(w.invuln).toBeGreaterThan(0); // still in the landing grace
  });

  it('hovering flies faster than driving, and back to normal after', () => {
    const w = emptyRunning();
    run(w, 0.1);
    const base = w.speed;
    hover(w);
    for (const e of w.entities) e.alive = false; // nothing to fly into
    run(w, 0.5);
    expect(w.speed).toBeCloseTo(base * HOVER_BOOST, 1);
    run(w, HOVER_TIME);
    expect(w.speed).toBeCloseTo(base, 1);
  });

  it('ground coins are not collected from up in the sky', () => {
    const w = emptyRunning();
    hover(w);
    run(w, 2);
    w.entities.push({ kind: 'coin', lane: w.lane, s: w.distance + 5, alive: true } as Entity);
    const coins = w.coins;
    run(w, 0.5);
    expect(w.coins).toBe(coins);
  });

  it('no hover while a tube tunnel is coming up', () => {
    const w = emptyRunning();
    w.tunnelAt = w.distance + 60; w.tunnelEnd = w.tunnelAt + 100;
    expect(hover(w)).toBe(false);
  });
});
