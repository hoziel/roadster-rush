import { describe, expect, it } from 'vitest';
import { CHUNKS, CHUNK_LENGTH, chunkLength, placeChunk, poolOf, validateChunk } from '../src/sim/chunks';
import {
  BATTERIES, CAR_HEIGHT, DECK_HEIGHT, DUCK_HEIGHT, DUCK_TIME, FLATBED_LENGTH, GRAVITY, HIGHROAD_GAP, JUMP_VELOCITY,
  OVERHEAD_BOTTOM, OVERHEAD_TOP, RAMP_LENGTH, SWARM_PAD, TRAILER_LENGTH, DECK_STEP,
} from '../src/sim/config';
import { deckSurface } from '../src/sim/highroad';
import { createRng } from '../src/sim/rng';
import { type EntityKind } from '../src/sim/spawner';
import {
  POWER_TIME, createWorld, isDucking, jump, laneX, queueHighroad, queueOverhead, slam, start, steer, step,
  type Entity, type World,
} from '../src/sim/world';
import { dodge } from './bot';

const DT = 1 / 120;
const PEAK = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds && w.phase === 'running'; t += DT) events.push(...step(w, DT));
  return events;
};
/** A running world with no random spawns, past the opening chase, at the start speed or (top) at the cap. */
const empty = (top = false) => {
  const w = createWorld(1);
  start(w);
  w.nextRowAt = Infinity;
  w.intro = 0;
  if (top) w.time = 1000;
  return w;
};
const put = (w: World, kind: EntityKind, ahead: number, lane = 1, y?: number) => {
  const e: Entity = { kind, lane, s: w.distance + ahead, alive: true, y };
  w.entities.push(e);
  return e;
};
/** Put a trailer whose ramp foot is `ahead` m in front of the car. */
const trailer = (w: World, ahead: number, lane = 1) => put(w, 'trailer', ahead + TRAILER_LENGTH / 2, lane);
const driveTo = (w: World, s: number) => { for (let i = 0; i < 100000 && w.distance < s && w.phase === 'running'; i++) step(w, DT); };

describe('the high road: ramps onto trailers', () => {
  it('the deck is out of reach of a jump from the road, and the ramp climbs to it', () => {
    expect(DECK_HEIGHT - DECK_STEP).toBeGreaterThan(PEAK);
    expect(deckSurface('trailer', 0)).toBe(0);
    expect(deckSurface('trailer', RAMP_LENGTH / 2)).toBeCloseTo(DECK_HEIGHT / 2);
    expect(deckSurface('trailer', RAMP_LENGTH)).toBe(DECK_HEIGHT);
    expect(deckSurface('trailer', TRAILER_LENGTH)).toBe(DECK_HEIGHT);
    expect(deckSurface('trailer', TRAILER_LENGTH + 0.1)).toBe(0);
  });

  for (const speed of ['start', 'top', 'ludicrous'] as const) {
    it(`driving up the ramp reaches the deck, rides it and drops off the front (${speed} speed)`, () => {
      const w = empty(speed !== 'start');
      if (speed === 'ludicrous') { w.power = 'ludicrous'; w.powerTime = 1000; w.invuln = 0; }
      const e = trailer(w, 20);
      const back = e.s - TRAILER_LENGTH / 2, front = e.s + TRAILER_LENGTH / 2;
      const events: string[] = [];
      let onDeck = 0, rampOk = true;
      for (let i = 0; i < 100000 && w.distance < front + 30; i++) {
        events.push(...step(w, DT));
        const r = w.distance - back;
        if (r > 0.5 && r < RAMP_LENGTH - 0.5 && Math.abs(w.y - deckSurface('trailer', r)) > 0.01) rampOk = false; // follows the slope
        if (r > RAMP_LENGTH && r < TRAILER_LENGTH) { expect(w.y).toBe(DECK_HEIGHT); onDeck++; }
      }
      expect(rampOk).toBe(true);
      expect(onDeck).toBeGreaterThan(5);
      expect(events).not.toContain('hit');
      expect(events).not.toContain('boing');
      expect(w.batteries).toBe(BATTERIES);
      expect(w.y).toBe(0); // back down on the road
      expect(w.floor).toBe(0);
    });
  }

  it('coins along the deck are collected riding it, and out of reach from the road beside it', () => {
    const items = placeChunk(createRng(1), 0, 0, 'highroad', (c) => c.id === 'hr-ramp-run').items;
    const deckCoins = items.filter((i) => i.kind === 'coin' && i.y !== undefined);
    const lane = items.find((i) => i.kind === 'trailer')!.lane;
    expect(deckCoins.length).toBeGreaterThanOrEqual(6);
    const ride = empty(), beside = empty();
    for (const w of [ride, beside]) for (const it of items) if (it.kind !== 'power') put(w, it.kind as EntityKind, it.s + 20 - w.distance, it.lane, it.y);
    beside.lane = lane === 1 ? 0 : 1; beside.x = laneX(beside.lane);
    ride.lane = lane; ride.x = laneX(lane);
    run(ride, 2.5);
    run(beside, 2.5);
    const ground = (l: number) => items.filter((i) => i.kind === 'coin' && i.y === undefined && i.lane === l).length;
    expect(ride.coins).toBe(ground(lane) + deckCoins.length); // every deck coin, up the ramp and along the deck
    expect(beside.coins).toBe(ground(beside.lane)); // none of them from the road
    expect(ride.batteries).toBe(BATTERIES);
  });

  it('nose to tail: the car rolls from the trailer straight onto the flatbed in front', () => {
    const w = empty(true);
    const t = trailer(w, 20);
    const f = put(w, 'flatbed', t.s + TRAILER_LENGTH / 2 + 1 + FLATBED_LENGTH / 2 - w.distance);
    let low = Infinity;
    const events: string[] = [];
    for (let i = 0; i < 100000 && w.distance < f.s + FLATBED_LENGTH / 2 - 0.5; i++) {
      events.push(...step(w, DT));
      if (w.distance > t.s) low = Math.min(low, w.y);
    }
    expect(low).toBeGreaterThan(DECK_HEIGHT - 0.05);
    expect(events).not.toContain('hit');
  });

  it('hops sideways from deck to deck at deck height, and off the side down to the road', () => {
    const w = empty();
    const t = trailer(w, 10, 1);
    put(w, 'flatbed', t.s + 4 - w.distance, 2); // alongside, to the right
    driveTo(w, t.s);
    expect(w.y).toBe(DECK_HEIGHT);
    steer(w, 1);
    const events = run(w, 0.3);
    expect(w.y).toBe(DECK_HEIGHT);
    steer(w, -1); steer(w, -1); // across the trailer and off its left side
    events.push(...run(w, 0.8));
    expect(events).not.toContain('hit');
    expect(w.lane).toBe(0);
    expect(w.y).toBe(0);
  });

  it('a side hit on a trailer is a crash like a truck, and a jump from the road beside it falls short', () => {
    // Steering into the deck section.
    const side = empty();
    side.lane = 0; side.x = laneX(0);
    const t = trailer(side, 5, 1);
    driveTo(side, t.s);
    steer(side, 1);
    expect(run(side, 0.5)).toContain('hit');
    expect(side.batteries).toBe(BATTERIES - 1);
    expect(t.bumped).toBeDefined();
    // Steering in halfway up the ramp.
    const ramp = empty();
    ramp.lane = 2; ramp.x = laneX(2);
    const t2 = trailer(ramp, 10, 1);
    driveTo(ramp, t2.s - TRAILER_LENGTH / 2 + RAMP_LENGTH / 2);
    steer(ramp, -1);
    expect(run(ramp, 0.5)).toContain('hit');
    // Jumping at the side at any moment: never high enough to land on the deck.
    for (const lead of [0, 0.1, 0.2, 0.3]) {
      const w = empty();
      w.lane = 0; w.x = laneX(0);
      const e = trailer(w, 5, 1);
      driveTo(w, e.s - 4);
      jump(w);
      for (let i = 0; i < lead / DT; i++) step(w, DT);
      steer(w, 1);
      const ev = run(w, 1);
      expect(ev, `lead ${lead}`).toContain('hit');
    }
  });

  it('a flatbed (no ramp) front-on is a wall; a shield boings it aside', () => {
    const w = empty();
    put(w, 'flatbed', 10 + FLATBED_LENGTH / 2);
    expect(run(w, 1)).toContain('hit');
    expect(w.batteries).toBe(BATTERIES - 1);
    const s = empty();
    s.invuln = 10;
    const f = put(s, 'flatbed', 10 + FLATBED_LENGTH / 2);
    const ev = run(s, 1);
    expect(ev).toContain('boing');
    expect(f.bumped).toBeDefined();
    expect(s.batteries).toBe(BATTERIES);
  });

  it('hovering on a deck stays level with it, and settles back down after', () => {
    const w = empty();
    const t = trailer(w, 10);
    driveTo(w, t.s);
    w.power = 'hover'; w.powerTime = POWER_TIME.hover;
    run(w, 0.3);
    expect(w.y).toBeGreaterThanOrEqual(DECK_HEIGHT - 1e-9);
    w.power = null; w.powerTime = 0;
    run(w, 1.5);
    expect(w.y).toBe(0);
  });
});

describe('ducking under overhead beams', () => {
  it('heights: ducked fits under the beam, upright does not, and a jump never clears it', () => {
    expect(DUCK_HEIGHT).toBeLessThan(OVERHEAD_BOTTOM);
    expect(CAR_HEIGHT).toBeGreaterThan(OVERHEAD_BOTTOM);
    expect(OVERHEAD_TOP).toBeGreaterThan(PEAK);
  });

  for (const top of [false, true]) {
    it(`swipe down ducks under it; upright or jumping is a crash (${top ? 'top' : 'start'} speed)`, () => {
      for (const lead of [0.05, 0.2, 0.4]) {
        const w = empty(top);
        const e = put(w, 'overhead', 40);
        driveTo(w, e.s - 0.9 - 1 - w.speed * lead);
        expect(slam(w)).toBe(true);
        expect(isDucking(w)).toBe(true);
        const ev = run(w, 1);
        expect(ev, `lead ${lead}`).not.toContain('hit');
        expect(w.batteries).toBe(BATTERIES);
      }
      const upright = empty(top);
      put(upright, 'overhead', 30);
      expect(run(upright, 1.5)).toContain('hit');
      for (const lead of [0.15, 0.3]) {
        const w = empty(top);
        const e = put(w, 'overhead', 40);
        driveTo(w, e.s - 1.9 - w.speed * lead);
        jump(w);
        expect(run(w, 1.2), `jump lead ${lead}`).toContain('hit');
      }
    });
  }

  it('a duck lasts DUCK_TIME; a jump pops back up; in the air, swipe down slams and lands ducked', () => {
    const w = empty();
    slam(w);
    run(w, DUCK_TIME - 0.05);
    expect(isDucking(w)).toBe(true);
    run(w, 0.1);
    expect(isDucking(w)).toBe(false);
    slam(w);
    jump(w);
    expect(isDucking(w)).toBe(false);
    // Jump, then slam over the beam's approach: down fast and under it.
    const air = empty(true);
    const e = put(air, 'overhead', 40);
    driveTo(air, e.s - 1.9 - air.speed * 0.45);
    jump(air);
    run(air, 0.15);
    expect(slam(air)).toBe(true);
    const ev = run(air, 1);
    expect(ev).not.toContain('hit');
  });

  it('kid mode stays forgiving: an upright hit costs one battery; kid mode off ends the run', () => {
    const w = empty();
    put(w, 'overhead', 20, 0); put(w, 'overhead', 20, 1); put(w, 'overhead', 20, 2);
    const ev = run(w, 1.5);
    expect(ev).toContain('hit');
    expect(w.batteries).toBe(BATTERIES - 1);
    expect(w.phase).toBe('running');
    const off = empty();
    off.kidMode = false;
    put(off, 'overhead', 20);
    expect(run(off, 1.5)).toContain('crash');
    expect(off.phase).toBe('over');
  });
});

describe('chunks: high road trains and beams', () => {
  const high = CHUNKS.filter((c) => poolOf(c) === 'highroad');
  const beams = CHUNKS.filter((c) => c.rows.some((r) => r.overheads?.length));

  it('exist, and every one passes the fairness validator', () => {
    expect(high.length).toBeGreaterThanOrEqual(4);
    expect(high.some((c) => chunkLength(c) > CHUNK_LENGTH)).toBe(true); // trains
    expect(high.some((c) => c.rows.some((r) => r.flatbeds?.length))).toBe(true);
    expect(beams.length).toBeGreaterThanOrEqual(4);
    expect(beams.some((c) => c.rows.some((r) => r.overheads?.length === 3))).toBe(true);
    expect([...high, ...beams].flatMap(validateChunk)).toEqual([]);
  });

  it('every deck has a coin line, and decks pay more than the road beside them', () => {
    for (const c of high) {
      for (const r of c.rows) for (const l of [...(r.trailers ?? []), ...(r.flatbeds ?? [])]) expect(r.deck, c.id).toContain(l);
      const items = placeChunk(createRng(2), 0, 0, 'highroad', (k) => k.id === c.id).items;
      const air = items.filter((i) => i.kind === 'coin' && i.y !== undefined).length;
      const ground = items.filter((i) => i.kind === 'coin' && i.y === undefined).length;
      expect(air, c.id).toBeGreaterThan(ground);
    }
  });

  it('the validator rejects unfair high roads and beams', () => {
    const v = (c: Parameters<typeof validateChunk>[0]) => validateChunk(c).length;
    // Trailers outside a high road chunk; a high road without a ramp; every lane a trailer.
    expect(v({ id: 'a', difficulty: 0, rows: [{ at: 20, trailers: [1] }] })).toBeGreaterThan(0);
    expect(v({ id: 'b', difficulty: 0, kind: 'highroad', rows: [{ at: 20, flatbeds: [1] }] })).toBeGreaterThan(0);
    expect(v({ id: 'c', difficulty: 0, kind: 'highroad', rows: [{ at: 20, trailers: [0, 1, 2] }] })).toBeGreaterThan(0);
    // A flatbed nobody can get onto.
    expect(v({ id: 'd', difficulty: 0, kind: 'highroad', length: 80, rows: [{ at: 16, trailers: [0] }, { at: 50, flatbeds: [2] }] })).toBeGreaterThan(0);
    // Off the front of the deck straight into a wall with no way round.
    expect(v({ id: 'e', difficulty: 0, kind: 'highroad', length: 80, rows: [{ at: 16, trailers: [0] }, { at: 28, flatbeds: [1] }, { at: 38, flatbeds: [0] }] })).toBeGreaterThan(0);
    // Deck coins with no deck; a three-lane beam is fine, and so is a beam beside walls (duck under it).
    expect(v({ id: 'f', difficulty: 0, kind: 'highroad', rows: [{ at: 20, trailers: [1], deck: [0] }] })).toBeGreaterThan(0);
    expect(v({ id: 'g', difficulty: 0, rows: [{ at: 20, overheads: [0, 1, 2] }] })).toBe(0);
    expect(v({ id: 'h', difficulty: 0, rows: [{ at: 20, overheads: [0], cones: [1, 2] }] })).toBe(0);
    expect(v({ id: 'i', difficulty: 0, kind: 'construction', rows: [{ at: 20, overheads: [0], fences: [1], barriers: [2] }] })).toBe(0);
    // But a beam is no way round a wall in its own lane right after it.
    expect(v({ id: 'k', difficulty: 0, rows: [{ at: 14, overheads: [0], cones: [1, 2] }, { at: 18, cones: [0, 1] }] })).toBeGreaterThan(0);
    // No beams in traffic, police or longhorn chunks.
    expect(v({ id: 'j', difficulty: 0, traffic: true, rows: [{ at: 20, overheads: [1] }] })).toBeGreaterThan(0);
  });

  it('the dodging bot gets past every train, from any lane, at start and top speed', () => {
    for (const c of high) {
      for (const top of [false, true]) {
        for (let seed = 1; seed <= 4; seed++) {
          const w = empty(top);
          w.lane = seed % 3; w.x = laneX(w.lane);
          for (const it of placeChunk(createRng(seed), 0, w.distance + 60, 'highroad', (k) => k.id === c.id).items) {
            if (it.kind !== 'power') put(w, it.kind as EntityKind, it.s - w.distance, it.lane, it.y);
          }
          const events: string[] = [];
          for (let t = 0; t < 6; t += DT) { dodge(w); events.push(...step(w, DT)); }
          expect(events, `${c.id} top=${top} seed=${seed}`).not.toContain('hit');
        }
      }
    }
  });
});

describe('in real runs', () => {
  it('high roads show up at their spacing, never in tunnels or swarms; the bot meets trailers and beams and survives', () => {
    let highs = 0, trailers = 0, beams = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const w = createWorld(seed);
      start(w);
      if (seed % 2) w.time = 100;
      const at: number[] = [];
      const seen = new Set<Entity>();
      for (let t = 0; t < 120 && w.phase === 'running'; t += DT) {
        if (!w.tube) dodge(w); else { w.power = 'autopilot'; w.powerTime = Math.max(w.powerTime, 1); }
        for (const ev of step(w, DT)) if (ev === 'highroad') { highs++; at.push(w.highAt); }
        for (const e of w.entities) {
          if (!e.alive || (e.kind !== 'trailer' && e.kind !== 'flatbed' && e.kind !== 'overhead')) continue;
          if (Math.abs(e.s - w.distance) > 2) continue;
          expect(w.tube).toBe(false);
          if (w.swarmAt >= 0) expect(w.distance < w.swarmAt - SWARM_PAD || w.distance > w.swarmEnd + SWARM_PAD).toBe(true);
          if (!seen.has(e)) { seen.add(e); if (e.kind === 'overhead') beams++; else trailers++; }
        }
      }
      for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(HIGHROAD_GAP[0]);
      expect(w.phase, `seed ${seed}`).toBe('running');
    }
    expect(highs).toBeGreaterThan(4);
    expect(trailers).toBeGreaterThan(highs);
    expect(beams).toBeGreaterThan(3);
  });

  it('debug queues lay a high road (with its warning) and a beam chunk at the next free slot', () => {
    const w = createWorld(3);
    start(w);
    queueHighroad(w);
    let events: string[] = [];
    for (let t = 0; t < 15 && !events.includes('highroad'); t += DT) events = events.concat(step(w, DT));
    expect(events).toContain('highroad');
    expect(w.entities.some((e) => e.alive && e.kind === 'trailer')).toBe(true);
    const b = createWorld(3);
    start(b);
    queueOverhead(b);
    step(b, DT);
    expect(b.entities.some((e) => e.alive && e.kind === 'overhead')).toBe(true);
  });
});
