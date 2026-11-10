import { describe, expect, it } from 'vitest';
import { CHUNKS, CHUNK_LENGTH, placeChunk, poolOf, validateChunk } from '../src/sim/chunks';
import {
  BARRIER_HEIGHT, BATTERIES, DIGGER_HEIGHT, FENCE_HEIGHT, GRAVITY, JUMP_VELOCITY, LANE_WIDTH, LONGHORN_HEIGHT,
  LONGHORN_WALK, PARKED_POLICE_ROOF, POLICE_GAP, SPIKES_HEIGHT, SWARM_PAD, WORK_GAP,
} from '../src/sim/config';
import { herdLane, lanesBlocked } from '../src/sim/longhorns';
import { createRng } from '../src/sim/rng';
import { isObstacle, type EntityKind, type ObstacleKind } from '../src/sim/spawner';
import { clearHeight, hitDepth } from '../src/sim/traffic';
import {
  POWER_TIME, createWorld, entityLane, jump, laneX, queueConstruction, queueLonghorns, queuePoliceStop, start, step,
  type Entity, type World,
} from '../src/sim/world';
import { dodge } from './bot';

const DT = 1 / 120;
const PEAK = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
const run = (w: World, seconds: number) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...step(w, DT));
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
const put = (w: World, kind: EntityKind, ahead: number, lane = 1, from?: number) => {
  const e: Entity = { kind, lane, s: w.distance + ahead, alive: true, from };
  w.entities.push(e);
  return e;
};
/** Drive until the car is `lead` seconds from the obstacle's hit zone, then jump; return the events after. */
const jumpOver = (w: World, e: Entity, lead: number) => {
  for (let i = 0; i < 100000 && e.s - hitDepth(e.kind as ObstacleKind) - w.distance > w.speed * lead; i++) step(w, DT);
  expect(jump(w)).toBe(true);
  return run(w, 1.5);
};

describe('police stop and construction chunks', () => {
  const police = CHUNKS.filter((c) => poolOf(c) === 'police');
  const work = CHUNKS.filter((c) => poolOf(c) === 'construction');
  const herds = CHUNKS.filter((c) => poolOf(c) === 'longhorns');

  it('exist, and every one passes the fairness validator', () => {
    expect(police.length).toBeGreaterThanOrEqual(3);
    expect(work.length).toBeGreaterThanOrEqual(4);
    expect(herds.length).toBeGreaterThanOrEqual(3);
    expect([...police, ...work, ...herds].flatMap(validateChunk)).toEqual([]);
  });

  it('a police stop has one parked car and a spike strip; a herd is 1-3 longhorns', () => {
    for (const c of police) {
      expect(c.rows.reduce((n, r) => n + (r.police?.length ?? 0), 0)).toBe(1);
      expect(c.rows.some((r) => r.spikes?.length)).toBe(true);
    }
    for (const c of herds) {
      const n = c.rows.reduce((k, r) => k + (r.longhorns?.length ?? 0), 0);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('are never drawn as ordinary cone chunks', () => {
    const rng = createRng(4);
    for (let i = 0; i < 400; i++) {
      const { id } = placeChunk(rng, rng(), 0);
      expect(poolOf(CHUNKS.find((c) => c.id === id)!)).toBe('cones');
    }
  });

  it('the validator rejects unfair or misplaced pieces', () => {
    // Spikes in two lanes beside the police car: every lane blocked (spikes are only passable by jumping).
    expect(validateChunk({ id: 'wall', difficulty: 0, kind: 'police', rows: [{ at: 15, police: [0], spikes: [1, 2] }] }).length).toBeGreaterThan(0);
    // Two police cars, or none.
    expect(validateChunk({ id: 'two', difficulty: 0, kind: 'police', rows: [{ at: 12, police: [0], spikes: [1] }, { at: 28, police: [2] }] }).length).toBeGreaterThan(0);
    expect(validateChunk({ id: 'none', difficulty: 0, kind: 'police', rows: [{ at: 12, spikes: [1] }] }).length).toBeGreaterThan(0);
    // Road work in a cone chunk, spikes in a construction chunk.
    expect(validateChunk({ id: 'mix', difficulty: 0, rows: [{ at: 12, barriers: [1] }] }).length).toBeGreaterThan(0);
    expect(validateChunk({ id: 'mix2', difficulty: 0, kind: 'construction', rows: [{ at: 12, barriers: [1], spikes: [0] }] }).length).toBeGreaterThan(0);
    // A digger's length counts: digger in lane 0, then a fence in 1+2 too soon after to cross two lanes.
    expect(validateChunk({ id: 'dig', difficulty: 0, kind: 'construction', rows: [{ at: 10, diggers: [0], barriers: [1] }, { at: 19, fences: [1, 2] }] }).length).toBeGreaterThan(0);
    // A longhorn walking more than one lane, or a herd blocking every lane.
    expect(validateChunk({ id: 'run', difficulty: 0, kind: 'longhorns', rows: [{ at: 15, longhorns: [{ from: -1, to: 1 }] }] }).length).toBeGreaterThan(0);
    expect(validateChunk({ id: 'herdwall', difficulty: 0, kind: 'longhorns', rows: [{ at: 15, longhorns: [{ from: -1, to: 0 }, { from: 0, to: 1 }, { from: 3, to: 2 }] }] }).length).toBeGreaterThan(0);
  });
});

describe('spike strips (police stop)', () => {
  it('driving over spikes is a puncture: it costs a battery and counts as a crash', () => {
    const w = empty();
    put(w, 'spikes', 6);
    const events = run(w, 1);
    expect(events).toContain('puncture');
    expect(w.batteries).toBe(BATTERIES - 1);
    expect(w.phase).toBe('running'); // kid mode: like a cone hit
    expect(w.chase).toBeGreaterThan(0); // the police closes in, as after any crash
    expect(w.invuln).toBeGreaterThan(0); // and the usual blinking grace
  });

  it('kid mode stays forgiving: one strip costs one battery, and the last battery ends the run like a cone', () => {
    const w = empty();
    put(w, 'spikes', 6, 1);
    put(w, 'spikes', 6.5, 1); // a second strip right behind: covered by the grace time
    run(w, 1);
    expect(w.batteries).toBe(BATTERIES - 1);
    const last = empty();
    last.batteries = 1;
    put(last, 'spikes', 6);
    expect(run(last, 1)).toContain('crash');
    expect(last.phase).toBe('over');
    expect(last.caught).toBe(false);
  });

  it('kid mode off: a puncture ends the run', () => {
    const w = empty();
    w.kidMode = false;
    put(w, 'spikes', 6);
    expect(run(w, 1)).toContain('crash');
    expect(w.phase).toBe('over');
  });

  for (const top of [false, true]) {
    it(`a jump clears the spikes and the low barrier at ${top ? 'top' : 'start'} speed`, () => {
      for (const kind of ['spikes', 'barrier'] as const) {
        for (const lead of [0.1, 0.25, 0.4]) {
          const w = empty(top);
          const e = put(w, kind, 40);
          const events = jumpOver(w, e, lead);
          expect(events, `${kind} lead ${lead}`).not.toContain('puncture');
          expect(events, `${kind} lead ${lead}`).not.toContain('hit');
          expect(events).not.toContain('smash');
          expect(w.batteries).toBe(BATTERIES);
        }
      }
    });
  }

  it('shields and grace time roll over the spikes harmlessly (the strip stays)', () => {
    for (const power of ['ludicrous', 'autopilot', 'hover', null] as const) {
      const w = empty();
      if (power) { w.power = power; w.powerTime = POWER_TIME[power]; } else w.invuln = 10;
      if (power === 'autopilot') { put(w, 'spikes', 12, 0); put(w, 'spikes', 12, 2); } // nowhere to steer
      const strip = put(w, 'spikes', 12, 1);
      const events = run(w, 1.5);
      expect(events, String(power)).not.toContain('puncture');
      expect(events).not.toContain('hit');
      expect(events).not.toContain('smash');
      expect(strip.bumped).toBeUndefined();
      expect(w.batteries).toBe(BATTERIES);
    }
  });
});

describe('construction and the parked police car', () => {
  it('heights match: low pieces under a normal jump, tall ones above it', () => {
    expect(clearHeight('spikes')).toBe(SPIKES_HEIGHT);
    expect(clearHeight('barrier')).toBe(BARRIER_HEIGHT);
    for (const k of ['spikes', 'barrier', 'police'] as const) expect(clearHeight(k)).toBeLessThan(PEAK - 0.3);
    for (const k of ['fence', 'digger', 'longhorn'] as const) expect(clearHeight(k)).toBeGreaterThan(PEAK);
    expect(FENCE_HEIGHT).toBeGreaterThan(PEAK);
    expect(DIGGER_HEIGHT).toBeGreaterThan(PEAK);
    expect(LONGHORN_HEIGHT).toBeGreaterThan(PEAK);
  });

  it('tall pieces (fence, digger, longhorn) can\'t be jumped', () => {
    for (const kind of ['fence', 'digger', 'longhorn'] as const) {
      for (const lead of [0.15, 0.3]) {
        const w = empty();
        const e = put(w, kind, 40, 1, kind === 'longhorn' ? 1 : undefined);
        expect(jumpOver(w, e, lead), `${kind} lead ${lead}`).toContain('hit');
        expect(w.batteries).toBe(BATTERIES - 1);
      }
    }
  });

  it('hitting a barrier, fence, digger or the parked police car costs a battery; the prop pops aside', () => {
    for (const kind of ['barrier', 'fence', 'digger', 'police'] as const) {
      const w = empty();
      const e = put(w, kind, 10);
      expect(run(w, 1.5), kind).toContain('hit');
      expect(w.batteries).toBe(BATTERIES - 1);
      expect(e.bumped).toBeDefined();
    }
  });

  it('the parked police car can be jumped like a car, landing on its roof', () => {
    const w = empty();
    const e = put(w, 'police', 40);
    let rode = false;
    for (let i = 0; i < 100000 && e.s - hitDepth('police') - w.distance > w.speed * 0.25; i++) step(w, DT);
    jump(w);
    const events: string[] = [];
    for (let t = 0; t < 1.5; t += DT) { events.push(...step(w, DT)); if (w.floor === PARKED_POLICE_ROOF) rode = true; }
    expect(events).not.toContain('hit');
    expect(rode).toBe(true);
    expect(w.y).toBe(0);
  });

  it('shields knock the props aside with a boing, no battery lost', () => {
    for (const kind of ['barrier', 'fence', 'digger', 'police'] as const) {
      const w = empty();
      w.invuln = 10;
      const e = put(w, kind, 10);
      const events = run(w, 1.5);
      expect(events).toContain('boing');
      expect(events).not.toContain('hit');
      expect(e.bumped).toBeDefined();
      expect(w.batteries).toBe(BATTERIES);
    }
  });
});

describe('longhorns crossing', () => {
  it('each animal walks one lane while the car closes the last LONGHORN_WALK metres, then stands in its lane', () => {
    expect(herdLane(0, 1, LONGHORN_WALK + 50)).toBe(0);
    expect(herdLane(0, 1, LONGHORN_WALK / 2)).toBeCloseTo(0.5);
    expect(herdLane(0, 1, 0)).toBe(1);
    // In its hit zone it has (almost) arrived: it blocks just its lane.
    expect(lanesBlocked(0, 1, hitDepth('longhorn'))).toEqual([1]);
    expect(lanesBlocked(-1, 0, hitDepth('longhorn'))).toEqual([0]);
  });

  it('the walk is slow: under 2 m/s sideways even at top speed', () => {
    expect((LANE_WIDTH / LONGHORN_WALK) * 40).toBeLessThan(2);
  });

  it('blocks whichever lane it is in: walking into our lane is a hit, walking out of it is not', () => {
    const into = empty();
    put(into, 'longhorn', 50, 1, 0); // from the left lane into ours
    const ev = run(into, 3);
    expect(ev).toContain('hit');
    expect(ev).toContain('moo');
    const out = empty();
    const e = put(out, 'longhorn', LONGHORN_WALK + 10, 2, 1); // standing in our lane now, but walking out of it
    expect(laneX(entityLane(out, e))).toBe(laneX(1));
    expect(run(out, 3)).not.toContain('hit');
  });

  it('a shield or grace makes it boing aside with a moo', () => {
    const w = empty();
    w.invuln = 10;
    const e = put(w, 'longhorn', 10, 1, 1);
    const events = run(w, 1.5);
    expect(events).toContain('boing');
    expect(events).toContain('moo');
    expect(e.bumped).toBeDefined();
    expect(w.batteries).toBe(BATTERIES);
  });

  it('autopilot steers round every herd (proof a free lane is always reachable in time)', () => {
    for (const c of CHUNKS.filter((k) => poolOf(k) === 'longhorns')) {
      for (const top of [false, true]) {
        for (let seed = 1; seed <= 4; seed++) {
          const w = empty(top);
          w.power = 'autopilot'; w.powerTime = 1000;
          w.lane = seed % 3; w.x = laneX(w.lane);
          const mirror = seed % 2 === 0;
          for (const r of c.rows) for (const a of r.longhorns ?? []) {
            const m = (l: number) => (mirror ? 2 - l : l);
            put(w, 'longhorn', 120 + r.at, m(a.to), m(a.from));
          }
          const events = run(w, 10);
          expect(events, `${c.id} top=${top} seed=${seed}`).not.toContain('boing');
        }
      }
    }
  });
});

describe('in real runs', () => {
  it('police stops, construction and herds show up at the configured spacing, never in tunnels, swarms or traffic', () => {
    let stops = 0, zones = 0, herds = 0;
    const dt = 1 / 60;
    for (let seed = 1; seed <= 10; seed++) {
      const w = createWorld(seed);
      start(w);
      if (seed % 2) w.time = 100;
      const policeAt: number[] = [], workAt: number[] = [];
      const movingAt: number[] = [], zoneAt: number[] = [];
      for (let t = 0; t < 120 && w.phase === 'running'; t += dt) {
        if (!w.tube) dodge(w); else { w.power = 'autopilot'; w.powerTime = Math.max(w.powerTime, 1); }
        w.batteries = BATTERIES; // keep going: we're checking the layout, not the driving
        for (const ev of step(w, dt)) {
          if (ev === 'police-stop') { stops++; policeAt.push(w.policeAt); }
          if (ev === 'roadwork') { zones++; workAt.push(w.workAt); }
          if (ev === 'longhorns') herds++;
        }
        for (const e of w.entities) {
          if (!e.alive || !isObstacle(e.kind) || e.bumped !== undefined) continue;
          if (Math.abs(e.s - w.distance) > hitDepth(e.kind)) continue;
          if (e.v) movingAt.push(w.distance);
          else if (e.kind !== 'cone') {
            zoneAt.push(w.distance);
            expect(w.tube).toBe(false);
            if (w.swarmAt >= 0) expect(w.distance < w.swarmAt - SWARM_PAD || w.distance > w.swarmEnd + SWARM_PAD).toBe(true);
          }
        }
      }
      for (let i = 1; i < policeAt.length; i++) expect(policeAt[i] - policeAt[i - 1]).toBeGreaterThanOrEqual(POLICE_GAP[0] - CHUNK_LENGTH);
      for (let i = 1; i < workAt.length; i++) expect(workAt[i] - workAt[i - 1]).toBeGreaterThanOrEqual(WORK_GAP[0]);
      // Moving traffic is never level with the car at the same time as a stop, a zone or a herd.
      const zoneSpots = [...new Set(zoneAt)];
      let min = Infinity;
      for (const d of new Set(movingAt)) for (const z of zoneSpots) min = Math.min(min, Math.abs(d - z));
      expect(min, `seed ${seed}`).toBeGreaterThan(3);
    }
    expect(stops).toBeGreaterThan(5);
    expect(zones).toBeGreaterThan(stops);
    expect(herds).toBeGreaterThan(3);
  });

  it('debug queues lay one at the next free slot, with its warning event', () => {
    for (const [queue, ev] of [[queuePoliceStop, 'police-stop'], [queueConstruction, 'roadwork'], [queueLonghorns, 'longhorns']] as const) {
      const w = createWorld(3);
      start(w);
      queue(w);
      let events: string[] = [];
      for (let t = 0; t < 15 && !events.includes(ev); t += DT) events = events.concat(step(w, DT));
      expect(events, ev).toContain(ev);
    }
  });
});
