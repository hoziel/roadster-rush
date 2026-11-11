import { describe, expect, it } from 'vitest';
import { BALL_COINS, BALL_FIRST_AT, BALL_HEIGHT, BALL_SPOTS } from '../src/sim/config';
import { createWorld, jump, start, step, type Entity, type World } from '../src/sim/world';

const DT = 1 / 120;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
const balls = (w: World) => w.entities.filter((e) => e.alive && e.kind === 'ball');

describe('hobby balls', () => {
  it('none unless the driver has a sport', () => {
    const w = createWorld(5);
    start(w);
    run(w, 40);
    expect(w.entities.some((e) => e.kind === 'ball')).toBe(false);
  });

  it('volleys of balls cross the road every so often, after the first stretch', () => {
    const w = createWorld(5);
    w.balls = true;
    start(w);
    const seen = new Set<number>();
    for (let t = 0; t < 60; t += DT) {
      w.invuln = 99; // keep driving through whatever it hits
      step(w, DT);
      for (const e of balls(w)) seen.add(Math.round(e.s));
    }
    expect(seen.size).toBeGreaterThanOrEqual(BALL_SPOTS.length * 2);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(BALL_FIRST_AT);
    for (const e of w.entities.filter((x) => x.kind === 'ball')) expect(e.y).toBe(BALL_HEIGHT);
  });

  const lone = () => {
    const w = createWorld(1);
    start(w);
    w.nextRowAt = Infinity; // nothing else on the road
    w.entities.push({ kind: 'ball', lane: 1, s: 30, alive: true, y: BALL_HEIGHT } as Entity);
    return w;
  };

  it('driving under a ball misses it, at no cost', () => {
    const w = lone();
    const ev = run(w, 3);
    expect(ev).not.toContain('catch');
    expect(ev).not.toContain('hit');
    expect(w.coins).toBe(0);
    expect(w.batteries).toBeGreaterThan(0);
  });

  it('jumping into a ball catches it for bonus coins', () => {
    const w = lone();
    // Jump so the car is near the top of its arc as it reaches the ball.
    while (30 - w.distance > w.speed * 0.3) step(w, DT);
    jump(w);
    const ev = run(w, 1.5);
    expect(ev).toContain('catch');
    expect(w.coins).toBe(BALL_COINS);
    expect(balls(w).length).toBe(0);
  });
});
