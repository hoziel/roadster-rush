import { describe, expect, it } from 'vitest';
import { CHUNKS, EDGE_GAP, validateChunk } from '../src/sim/chunks';
import {
  CAR_ROOF, HIT_DEPTH, JUMP_VELOCITY, GRAVITY, ROOF_COIN_HEIGHT, SPEED_MAX, SPEED_START, SWARM_PAD, TRAFFIC_SPEED,
} from '../src/sim/config';
import { createRng } from '../src/sim/rng';
import { isObstacle } from '../src/sim/spawner';
import { hitDepth } from '../src/sim/traffic';
import { POWER_TIME, createWorld, jump, start, steer, step, type Entity, type World } from '../src/sim/world';
import { dodge } from './bot';

const DT = 1 / 120;
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
  return events;
};
/** A running world with no random spawns, at the start speed or (top) at the speed cap. */
const empty = (top = false) => {
  const w = createWorld(1);
  start(w);
  w.nextRowAt = Infinity;
  w.intro = 0;
  if (top) w.time = 1000;
  return w;
};
const putTraffic = (w: World, kind: 'car' | 'truck', ahead: number, lane = 1) => {
  const e: Entity = { kind, lane, s: w.distance + ahead, alive: true, v: TRAFFIC_SPEED, variant: 0 };
  w.entities.push(e);
  return e;
};
/** Run until the car's nose reaches `gapM` metres (in closing time) before the traffic's hit zone. */
const driveUntilZoneIn = (w: World, e: Entity, seconds: number) => {
  for (let i = 0; i < 100000; i++) {
    const zone = e.s - hitDepth(e.kind as 'car') - w.distance;
    if (zone <= (w.speed - TRAFFIC_SPEED) * seconds) return;
    step(w, DT);
  }
};

describe('traffic chunks', () => {
  const traffic = CHUNKS.filter((c) => c.traffic);

  it('exist at every difficulty and are fair', () => {
    for (const d of [0, 1, 2]) expect(traffic.filter((c) => c.difficulty === d).length).toBeGreaterThanOrEqual(3);
    expect(traffic.flatMap(validateChunk)).toEqual([]);
  });

  it('never block all three lanes, and always leave a lane without a truck', () => {
    for (const c of traffic) for (const r of c.rows) {
      expect((r.cars?.length ?? 0) + (r.trucks?.length ?? 0)).toBeLessThan(3);
      expect(r.trucks?.length ?? 0).toBeLessThan(3);
    }
  });

  it('the validator counts a vehicle\'s length, not a cone\'s', () => {
    // Trucks 10 m apart in lanes 0+1 then 1+2: fine for cones, but trucks leave no room to cross.
    expect(validateChunk({ id: 'ok-cones', difficulty: 0, rows: [{ at: 9, cones: [0, 1] }, { at: 24, cones: [1, 2] }] })).toEqual([]);
    expect(validateChunk({ id: 'bad', difficulty: 0, traffic: true, rows: [{ at: 9, trucks: [0, 1] }, { at: 19, trucks: [1, 2] }] }).length).toBeGreaterThan(0);
    expect(validateChunk({ id: 'wall', difficulty: 0, traffic: true, rows: [{ at: 15, trucks: [0, 1, 2] }] }).length).toBeGreaterThan(0);
    // A truck's back must keep the edge gap like a cone row does.
    expect(validateChunk({ id: 'edge', difficulty: 0, traffic: true, rows: [{ at: EDGE_GAP, trucks: [0] }] }).length).toBeGreaterThan(0);
    // Coins leading into the back of a car.
    expect(validateChunk({ id: 'lure', difficulty: 0, traffic: true, rows: [{ at: 8, coins: { lane: 1, count: 3 } }, { at: 16, cars: [1] }] }).length).toBeGreaterThan(0);
    // No cones in traffic chunks, no traffic in cone chunks.
    expect(validateChunk({ id: 'mix', difficulty: 0, traffic: true, rows: [{ at: 10, cones: [0] }, { at: 25, cars: [1] }] }).length).toBeGreaterThan(0);
  });
});

describe('traffic', () => {
  it('drives the same way, slower than us, so we overtake it', () => {
    const w = empty();
    const car = putTraffic(w, 'car', 30, 0);
    run(w, 1);
    expect(car.s).toBeCloseTo(w.distance - SPEED_START + 30 + TRAFFIC_SPEED, 0);
    run(w, 5);
    expect(car.s).toBeLessThan(w.distance); // passed it
  });

  it('a car hit head-on costs a battery and the car pops aside (not destroyed)', () => {
    const w = empty();
    const car = putTraffic(w, 'car', 20);
    const events = run(w, 2); // long enough to hit, short enough that it isn't despawned behind us
    expect(events).toContain('hit');
    expect(car.alive).toBe(true);
    expect(car.bumped).toBeDefined();
  });

  for (const [label, top] of [['start', false], ['top', true]] as const) {
    it(`a jump clears a car at ${label} speed (landing on its roof, riding it, dropping off the front)`, () => {
      // Any take-off from 0.2 s to 0.5 s before reaching the car works: a forgiving window for kids.
      for (const lead of [0.2, 0.3, 0.4, 0.5]) {
        const w = empty(top);
        const car = putTraffic(w, 'car', 40);
        driveUntilZoneIn(w, car, lead);
        expect(jump(w)).toBe(true);
        let maxY = 0, rode = false;
        const events: string[] = [];
        for (let t = 0; t < 2; t += DT) {
          events.push(...step(w, DT));
          maxY = Math.max(maxY, w.y);
          if (w.floor === CAR_ROOF) rode = true;
        }
        expect(events, `lead ${lead}`).not.toContain('hit');
        expect(car.bumped).toBeUndefined();
        expect(rode || maxY > CAR_ROOF).toBe(true);
        expect(w.y).toBe(0); // back on the road
      }
    });
  }

  it('a jump can\'t clear a truck', () => {
    const w = empty();
    const truck = putTraffic(w, 'truck', 40);
    driveUntilZoneIn(w, truck, 0.3);
    jump(w);
    expect(run(w, 2)).toContain('hit');
  });

  it('you can jump again from a car roof', () => {
    const w = empty();
    const car = putTraffic(w, 'car', 40);
    driveUntilZoneIn(w, car, 0.3);
    jump(w);
    for (let i = 0; i < 1000 && w.floor !== CAR_ROOF; i++) step(w, DT);
    expect(w.floor).toBe(CAR_ROOF);
    for (let i = 0; i < 1000 && w.vy !== 0; i++) step(w, DT);
    expect(jump(w)).toBe(true);
    expect(w.vy).toBe(JUMP_VELOCITY);
  });

  it('changing lanes into the side of a car is a hit', () => {
    const w = empty();
    putTraffic(w, 'car', 0.5, 2); // right beside us
    steer(w, 1);
    expect(run(w, 0.5)).toContain('hit');
  });

  it('changing lanes into the side of a car from up on a roof lands on it', () => {
    const w = empty();
    const a = putTraffic(w, 'car', 40, 1);
    putTraffic(w, 'car', 41.5, 2);
    driveUntilZoneIn(w, a, 0.3);
    jump(w);
    for (let i = 0; i < 1000 && w.floor !== CAR_ROOF; i++) step(w, DT);
    steer(w, 1);
    expect(run(w, 1.5)).not.toContain('hit');
  });

  it('hover flies up over traffic', () => {
    const w = empty();
    w.power = 'hover'; w.powerTime = POWER_TIME.hover;
    for (const lane of [0, 1, 2]) putTraffic(w, 'truck', 25, lane);
    const events = run(w, 3);
    expect(events).not.toContain('hit');
    expect(w.batteries).toBe(3);
  });

  it('shields (grace, Ludicrous, Autopilot) knock traffic aside harmlessly', () => {
    for (const power of ['ludicrous', 'autopilot', null] as const) {
      const w = empty();
      if (power) { w.power = power; w.powerTime = POWER_TIME[power]; } else w.invuln = 10;
      const truck = putTraffic(w, 'truck', 25, 1);
      putTraffic(w, 'truck', 25, 0);
      putTraffic(w, 'truck', 25, 2);
      const events = run(w, 3);
      expect(events).toContain('boing');
      expect(events).not.toContain('hit');
      expect(truck.bumped).toBeDefined();
      expect(w.batteries).toBe(3);
    }
  });

  it('autopilot steers around cars and trucks', () => {
    const w = empty();
    w.power = 'autopilot'; w.powerTime = 100;
    putTraffic(w, 'truck', 30, 1);
    putTraffic(w, 'car', 60, 0);
    putTraffic(w, 'car', 60, 2);
    putTraffic(w, 'truck', 90, 0);
    const events = run(w, 10);
    expect(events).not.toContain('boing');
  });

  it('roof coins are collected mid-jump, not by driving under them', () => {
    const w = empty();
    w.entities.push({ kind: 'coin', lane: 1, s: 10, alive: true, y: ROOF_COIN_HEIGHT });
    run(w, 1.5);
    expect(w.coins).toBe(0);
    const w2 = empty();
    w2.entities.push({ kind: 'coin', lane: 1, s: 6, alive: true, y: ROOF_COIN_HEIGHT });
    jump(w2);
    run(w2, 1.5);
    expect(w2.coins).toBe(1);
  });

  it('peak jump height clears the car with room to spare', () => {
    expect((JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY)).toBeGreaterThan(CAR_ROOF + 0.3);
  });
});

describe('traffic in real runs', () => {
  /**
   * The whole point of how traffic is laid: moving traffic never shares the road with static cones. Over
   * many runs (with sloppy driving that crashes, so the car stumbles), the stretches of road where the car
   * is level with traffic and with cones stay at least two edge gaps apart, and traffic never shows up in a
   * tube tunnel or a Bat Swarm.
   */
  it('traffic and cones are never met together, and never in tunnels or swarms', () => {
    let traffics = 0, ludicrous = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const w = createWorld(seed);
      const rng = createRng(seed * 7);
      start(w);
      if (seed % 2) w.time = 60 + seed * 3; // some runs mid-speed or at the cap
      const movingAt: number[] = [], staticAt: number[] = [];
      let sloppy = 0;
      for (let t = 0; t < 150 && w.phase === 'running'; t += DT) {
        if (sloppy > 0) sloppy -= DT;
        else if (rng() < DT / 12) sloppy = 0.8; // now and then stop dodging for a moment
        else if (!w.tube) dodge(w);
        else w.power = 'autopilot', w.powerTime = Math.max(w.powerTime, 1); // let autopilot drive the tube
        if (w.power === 'ludicrous') ludicrous++;
        step(w, DT);
        for (const e of w.entities) {
          if (!e.alive || !isObstacle(e.kind) || e.bumped !== undefined) continue;
          if (Math.abs(e.s - w.distance) > hitDepth(e.kind)) continue;
          if (e.v) {
            traffics++;
            movingAt.push(w.distance);
            expect(w.tube).toBe(false);
            if (w.swarmAt >= 0) expect(w.distance < w.swarmAt - SWARM_PAD || w.distance > w.swarmEnd + SWARM_PAD).toBe(true);
          } else staticAt.push(w.distance);
        }
      }
      // Smallest distance between a "level with traffic" spot and a "level with a cone" spot.
      staticAt.sort((a, b) => a - b);
      let min = Infinity, j = 0;
      for (const d of movingAt.sort((a, b) => a - b)) {
        while (j + 1 < staticAt.length && staticAt[j + 1] <= d) j++;
        if (staticAt.length) min = Math.min(min, Math.abs(staticAt[j] - d), j + 1 < staticAt.length ? staticAt[j + 1] - d : Infinity);
      }
      expect(min, `seed ${seed}`).toBeGreaterThanOrEqual(2 * EDGE_GAP - 2 * HIT_DEPTH - SPEED_MAX * DT * 2);
    }
    expect(traffics).toBeGreaterThan(1000); // traffic really is common
    expect(ludicrous).toBeGreaterThan(0); // and some runs had Ludicrous in them
  });
});
