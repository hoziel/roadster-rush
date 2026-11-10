import {
  AUTOPILOT_LOOKAHEAD, AUTOPILOT_TIME, BATTERIES, CAR_CLEAR, CHASE_TIME, COIN_VALUE,
  DESPAWN_BEHIND, GRAVITY, JUMP_BUFFER, SLAM_VELOCITY, HIT_DEPTH, HIT_HALF_WIDTH, HOVER_CHARGES_MAX, HOVER_CHARGES_START, HOVER_TIME,
  INTRO_CHASE_TIME,
  INVULN_TIME, JUMP_VELOCITY, LANE_CHANGE_SPEED, LANE_COUNT, LANE_WIDTH, LUDICROUS_BOOST,
  LUDICROUS_TIME, POWER_CHANCE, POWER_START_AFTER, SPAWN_AHEAD, SPEED_MAX, SPEED_START, STUMBLE_SLOWDOWN, STUMBLE_TIME,
  SWARM_CHANCE, SWARM_LENGTH, SWARM_MIN_GAP, SWARM_PAD,
  ROOF_COIN_REACH, TRAFFIC_CHANCE, TRAFFIC_FIRST_AT, TRAFFIC_GHOST_DIST, TRAFFIC_RUN, TRAFFIC_SLACK,
  TRAFFIC_SPEED,
  TUNNEL_CHANCE, TUNNEL_EXIT, TUNNEL_FIRST_AT, TUNNEL_LENGTH, TUNNEL_MIN_GAP, TUNNEL_RADIUS, TUNNEL_SLOTS,
  PLAYER_HALF_LENGTH, POLICE_FIRST_AT, POLICE_GAP, WORK_FIRST_AT, WORK_GAP, WORK_RUN, ZONE_AFTER_BLOCK, ZONE_SPACING,
  ZONE_WARN, LONGHORN_FIRST_AT, LONGHORN_GAP, LONGHORN_HIT_X,
  DECK_CLIMB, DECK_STEP, DECK_HEIGHT, DUCK_TIME, HIGHROAD_FIRST_AT, HIGHROAD_GAP, OVERHEAD_TOP, RAMP_LENGTH,
  HOVER_BOOST, SKY_COIN_Y, SKY_DESCEND, SKY_GLIDE_FROM, SKY_END_TIME, SKY_HEIGHT, SKY_LAND_GRACE, SKY_NEAR, SKY_RISE, SKY_ROW_TIME, SKY_START_TIME,
} from './config';
import { SKY_DEPTH, isSky, skyRow } from './sky';
import { deckLength, deckOffset, deckSurface, isDeck, underOverhead, type DeckKind } from './highroad';
import { herdLane } from './longhorns';
import {
  SLOT_ANGLE, TUBE_TURN_SPEED, angleGap, exitSlot, laneToSlot, slotToLane, tunnelItems, wrapSlot,
} from './tunnel';
import { SWARM_SPAN, conesIn, swarmCoins } from './batswarm';
import { dayPhase, isDusk } from './daycycle';
import { createRng, type Rng } from './rng';
import { CHUNK_LENGTH, placeChunk, type Chunk, type PlacedItem } from './chunks';
import { isObstacle, isPower, isProp, isStatic, isTraffic, type EntityKind, type ObstacleKind, type PowerKind } from './spawner';
import { catchTime, catchTimeAtLeast, clearHeight, hitDepth, roofHeight } from './traffic';
import { speedAt, speedLevel } from './speed';

export type { PowerKind } from './spawner';

export interface Entity {
  kind: EntityKind;
  lane: number;
  s: number; // absolute distance along the road
  alive: boolean;
  slot?: number; // set for tunnel contents: slot around the tube's ring (-3..4, 0 = bottom); lane is unused
  v?: number; // m/s along the road: traffic (and the coins of a traffic chunk) drive at TRAFFIC_SPEED
  y?: number; // coins floating over a car roof: height (m); collected only when the car is up there too
  variant?: number; // traffic: which model the view draws; parked police car: which way it's angled (any non-negative integer)
  from?: number; // longhorns: the lane it walks from while the car closes in (lane: where it ends up); see longhorns.ts
  bumped?: number; // traffic or a big prop knocked aside by a crash or a shield: run time it happened (no more collisions)
}

export type SimEvent =
  | 'coin' | 'hit' | 'smash' | 'boing' | 'crash' | 'caught' | 'battery'
  | 'power' | 'power-end' | 'swarm' | 'charge' | 'faster' | 'tunnel' | 'jump'
  | 'puncture' // drove over a spike strip: a flat tyre (costs a battery like a hit; 'crash'/'caught' follow if it ends the run)
  | 'police-stop' | 'roadwork' | 'longhorns' | 'highroad' // one coming up, ZONE_WARN ahead
  | 'moo' // a longhorn was hit or knocked aside (comes with 'hit'/'boing')
  | 'sky' // reached the sky lanes
  | 'sky-hit' // flew into a sky obstacle: the hover ends and the car drops back (no battery lost)
  | 'bird-near' | 'drone-near' | 'heli-near'; // a sky obstacle SKY_NEAR ahead (for its sound)
export type Phase = 'ready' | 'running' | 'over';

export const POWER_TIME: Record<PowerKind, number> = {
  ludicrous: LUDICROUS_TIME, autopilot: AUTOPILOT_TIME, hover: HOVER_TIME, supercharger: 0,
};

export interface World {
  phase: Phase;
  kidMode: boolean;
  time: number; // s driven this run
  distance: number; // m driven this run
  speed: number;
  lane: number; // target lane 0..LANE_COUNT-1
  x: number; // current sideways position (m), 0 = centre lane
  y: number; // height above road (m)
  vy: number;
  floor: number; // what the car stands on: 0 = road, CAR_ROOF = riding a car's roof, up to DECK_HEIGHT on a trailer
  duck: number; // s of ducking left (swipe down): squashed low, fits under an overhead beam
  coins: number;
  batteries: number;
  invuln: number; // s of post-crash grace left
  stumble: number; // s of post-crash slowdown left
  jumpBuffer: number; // s left on a jump swiped while still in the air
  chase: number; // s the police stays close (a crash now ends the run)
  intro: number; // s of the harmless opening chase left (police shown close, crashes don't end the run)
  hoverCharges: number; // banked hover-button presses
  speedLevel: number; // speed-up steps reached this run ('faster' fires on each)
  power: PowerKind | null; // timed power-up in effect
  powerTime: number; // s left on it
  lastPower: PowerKind | null; // last picked up (for UI events)
  caught: boolean; // run ended by the police
  entities: Entity[]; // pooled: dead entries are reused
  nextRowAt: number;
  dayOffset: number; // shifts the sunset-to-night cycle (debug jumps); kept across runs
  trafficRun: number; // traffic chunks still to lay in the current run of traffic
  swarmAt: number; // s where the current/last Bat Swarm coin rain starts, -1 if none
  swarmEnd: number; // s where it ends
  swarmSeen: boolean; // 'swarm' event already sent for it
  nextSwarmAt: number; // no new swarm laid before this s
  swarmQueued: boolean; // lay one at the next chunk slot whatever the time of day
  tunnelAt: number; // s where the current/last tube tunnel starts, -1 if none
  tunnelEnd: number; // s where it ends
  nextTunnelAt: number; // no new tunnel laid before this s
  tunnelQueued: boolean; // lay one at the next chunk slot (debug)
  policeAt: number; // s of the latest police stop's chunk, -1 if none
  policeWarned: boolean; // 'police-stop' event already sent for it
  nextPoliceAt: number; // no new police stop laid before this s
  policeQueued: boolean; // lay one at the next free chunk slot (debug)
  workAt: number; // s where the latest construction zone starts, -1 if none
  workEnd: number; // s where it ends
  workWarned: boolean; // 'roadwork' event already sent for it
  nextWorkAt: number; // no new construction zone laid before this s
  workRun: number; // construction chunks still to lay in the current zone
  workQueued: boolean; // lay one at the next free chunk slot (debug)
  herdAt: number; // s of the latest longhorns crossing's chunk, -1 if none
  herdWarned: boolean; // 'longhorns' event already sent for it
  nextHerdAt: number; // no new crossing laid before this s
  herdQueued: boolean; // lay one at the next free chunk slot (debug)
  highAt: number; // s of the latest high road (trailers) chunk, -1 if none
  highWarned: boolean; // 'highroad' event already sent for it
  nextHighAt: number; // no new high road laid before this s
  highQueued: boolean; // lay one at the next free chunk slot (debug)
  overheadQueued: boolean; // make the next cone chunk one with an overhead beam (debug)
  skyEnd: number; // s where the current/last sky course ends (-Infinity: none yet)
  skyReached: boolean; // 'sky' event already sent for this hover
  zoneEnd: number; // s where the latest police stop, construction zone, crossing or high road ends (-Infinity: none yet)
  tube: boolean; // driving inside a tunnel: steering moves around the ring
  slot: number; // target slot around the ring while in the tube (-3..4, 0 = bottom)
  angle: number; // current angle around the ring (rad, 0 = bottom, + = right); eases toward the slot
  rng: Rng;
}

export const laneX = (lane: number): number => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

const runState = () => ({
  time: 0, distance: 0, speed: SPEED_START, lane: 1, x: 0, y: 0, vy: 0, floor: 0, duck: 0, coins: 0, trafficRun: 0,
  batteries: BATTERIES, invuln: 0, stumble: 0, jumpBuffer: 0, chase: 0, intro: INTRO_CHASE_TIME,
  hoverCharges: HOVER_CHARGES_START, speedLevel: 0,
  power: null, powerTime: 0, lastPower: null, caught: false, nextRowAt: 40,
  swarmAt: -1, swarmEnd: -1, swarmSeen: true, nextSwarmAt: 0, swarmQueued: false,
  tunnelAt: -1, tunnelEnd: -1, nextTunnelAt: TUNNEL_FIRST_AT, tunnelQueued: false, tube: false, slot: 0, angle: 0,
  policeAt: -1, policeWarned: true, nextPoliceAt: POLICE_FIRST_AT, policeQueued: false,
  workAt: -1, workEnd: -1, workWarned: true, nextWorkAt: WORK_FIRST_AT, workRun: 0, workQueued: false,
  herdAt: -1, herdWarned: true, nextHerdAt: LONGHORN_FIRST_AT, herdQueued: false,
  highAt: -1, highWarned: true, nextHighAt: HIGHROAD_FIRST_AT, highQueued: false, overheadQueued: false, zoneEnd: -Infinity, skyEnd: -Infinity, skyReached: false,
});

export function createWorld(seed = Date.now()): World {
  return { phase: 'ready', kidMode: true, ...runState(), dayOffset: 0, entities: [], rng: createRng(seed) };
}

export function score(w: World): number {
  return Math.floor(w.distance) + w.coins * COIN_VALUE;
}

/** Start a fresh run, keeping the entity pool and settings. */
export function start(w: World): void {
  for (const e of w.entities) e.alive = false;
  Object.assign(w, runState(), { phase: 'running' });
}

/** Game over: clear everything within `radius` m of the car, so the police cars closing in have the road to themselves. */
export function clearAround(w: World, radius: number): void {
  for (const e of w.entities) if (e.alive && Math.abs(e.s - w.distance) < radius) e.alive = false;
}

/** Can't be hurt right now (grace period or a protective power-up). */
export const isShielded = (w: World): boolean =>
  w.invuln > 0 || w.power === 'ludicrous' || w.power === 'autopilot' || w.power === 'hover';

export function steer(w: World, dir: -1 | 1): boolean {
  if (w.phase !== 'running' || w.power === 'autopilot') return false;
  if (w.tube) return turnSlot(w, dir);
  const next = Math.max(0, Math.min(LANE_COUNT - 1, w.lane + dir));
  if (next === w.lane) return false;
  w.lane = next;
  return true;
}

/**
 * Swipe down: duck low for DUCK_TIME (under an overhead beam). In the air, first slam straight back down
 * (Subway Surfers' quick drop) and land ducked.
 */
export function slam(w: World): boolean {
  if (w.phase !== 'running' || w.power === 'hover') return false;
  if (w.y > w.floor + 0.05) w.vy = Math.min(w.vy, -SLAM_VELOCITY);
  w.duck = DUCK_TIME;
  return true;
}

/** Is the car ducking right now? */
export const isDucking = (w: World): boolean => w.duck > 0;

/** Hover button: spend a banked charge to hover for HOVER_TIME. */
export function hover(w: World): boolean {
  if (w.phase !== 'running' || w.hoverCharges <= 0 || w.power === 'hover' || !skyClear(w)) return false;
  w.hoverCharges--;
  activate(w, 'hover');
  laySky(w);
  return true;
}

/** m of road one hover covers at most (at top speed). */
const SKY_REACH = SPEED_MAX * LUDICROUS_BOOST * HOVER_TIME + 60;

/** No tube tunnel in or coming up within a hover's reach (the sky lanes can't pass through one). */
const skyClear = (w: World): boolean =>
  !w.tube && !(w.tunnelAt >= 0 && w.tunnelEnd > w.distance && w.tunnelAt < w.distance + SKY_REACH);

/** Lay the sky course for a hover starting now: rows of sky obstacles with coins, above the road. */
function laySky(w: World): void {
  const v = w.speed * HOVER_BOOST; // the speed the sky lanes are flown at
  const gap = Math.max(16, v * SKY_ROW_TIME);
  const end = w.distance + v * (HOVER_TIME - SKY_END_TIME);
  for (let s = w.distance + v * SKY_START_TIME; s < end; s += gap) {
    for (const it of skyRow(w.rng, s, gap)) {
      if (it.kind === 'coin') add(w, 'coin', it.lane, it.s, undefined, undefined, SKY_HEIGHT + SKY_COIN_Y);
      else add(w, it.kind, it.lane, it.s, undefined, undefined, SKY_HEIGHT, Math.floor(w.rng() * 1000));
    }
  }
  w.skyEnd = end + 40;
  w.skyReached = false;
}

/** The hover is over: clear what's left up in the sky and give a grace period for the landing. */
function leaveSky(w: World): void {
  for (const e of w.entities) if (e.alive && e.y !== undefined && e.y >= SKY_HEIGHT - 1) e.alive = false;
  w.invuln = Math.max(w.invuln, SKY_LAND_GRACE);
}

/** Up on the sky lanes (high enough to meet what flies there). */
export const inSky = (w: World): boolean => w.y >= SKY_HEIGHT - 2;

/** Police is shown right behind the car (after a crash, or the opening chase). */
export const policeClose = (w: World): boolean => w.chase > 0 || w.intro > 0;

export function jump(w: World): boolean {
  if (w.phase !== 'running' || w.power === 'hover') return false;
  if (w.y > w.floor + 1e-6) { w.jumpBuffer = JUMP_BUFFER; return false; } // fires on touchdown
  w.duck = 0; // a jump pops the car back up out of a duck
  w.vy = JUMP_VELOCITY;
  w.y = w.floor + 0.0001;
  return true;
}

const EVENTS: SimEvent[] = [];
const SCORES: number[] = new Array(LANE_COUNT).fill(0);

export function step(w: World, dt: number): SimEvent[] {
  const events = EVENTS;
  events.length = 0; // reused every step (120 Hz): callers must consume before the next step
  if (w.phase !== 'running') return events;

  w.time += dt;
  w.invuln = Math.max(0, w.invuln - dt);
  w.stumble = Math.max(0, w.stumble - dt);
  w.jumpBuffer = Math.max(0, w.jumpBuffer - dt);
  w.duck = Math.max(0, w.duck - dt);
  w.chase = Math.max(0, w.chase - dt);
  w.intro = Math.max(0, w.intro - dt);
  if (w.power) {
    w.powerTime -= dt;
    if (w.powerTime <= 0) {
      if (w.power === 'hover') leaveSky(w);
      w.power = null; w.powerTime = 0; events.push('power-end');
    }
  }

  const level = speedLevel(w.time);
  if (level > w.speedLevel) { w.speedLevel = level; events.push('faster'); }
  let speed = speedAt(w.time);
  if (w.stumble > 0) speed *= 1 - STUMBLE_SLOWDOWN * (w.stumble / STUMBLE_TIME);
  if (w.power === 'ludicrous') speed *= LUDICROUS_BOOST;
  if (w.power === 'hover') speed *= HOVER_BOOST;
  w.speed = speed;
  w.distance += speed * dt;
  if (!w.swarmSeen && w.swarmAt >= 0 && w.distance >= w.swarmAt) { w.swarmSeen = true; events.push('swarm'); }
  if (!w.policeWarned && w.distance >= w.policeAt - ZONE_WARN) { w.policeWarned = true; events.push('police-stop'); }
  if (!w.workWarned && w.distance >= w.workAt - ZONE_WARN) { w.workWarned = true; events.push('roadwork'); }
  if (!w.herdWarned && w.distance >= w.herdAt - ZONE_WARN) { w.herdWarned = true; events.push('longhorns'); }
  if (!w.highWarned && w.distance >= w.highAt - ZONE_WARN) { w.highWarned = true; events.push('highroad'); }

  if (!w.tube && w.tunnelAt >= 0 && w.distance >= w.tunnelAt && w.distance < w.tunnelEnd) {
    enterTube(w);
    events.push('tunnel');
  }
  if (w.tube) driveTube(w, dt);
  else {
    if (w.power === 'autopilot') autopilot(w);
    const dx = laneX(w.lane) - w.x;
    w.x += Math.sign(dx) * Math.min(Math.abs(dx), LANE_CHANGE_SPEED * dt);
  }

  // Traffic drives on; a car under us (once we're up at its roof) or a ramp or deck is the floor we ride on.
  for (const e of w.entities) if (e.alive && e.v) e.s += e.v * dt;
  w.floor = roofUnder(w);
  if (w.power === 'hover') {
    // Rise to hover height (or stay level with a deck you were riding), never down through it.
    w.vy = 0;
    const to = Math.max(SKY_HEIGHT, w.floor) - w.y;
    w.y += Math.sign(to) * Math.min(Math.abs(to), SKY_RISE * dt);
    if (!w.skyReached && w.y >= SKY_HEIGHT - 0.5) { w.skyReached = true; events.push('sky'); }
  } else if (w.y > SKY_GLIDE_FROM && w.vy <= 0) {
    // Dropping back from the sky lanes: a steady glide down, then a normal fall for the last bit.
    w.vy = -SKY_DESCEND;
    w.y = Math.max(w.floor, w.y - SKY_DESCEND * dt);
  } else if (w.y > w.floor || w.vy > 0) {
    // Falls back down after a hover ends or off the front of a car; otherwise a normal jump arc.
    w.vy -= GRAVITY * dt;
    w.y += w.vy * dt;
    if (w.y <= w.floor) {
      w.y = w.floor; w.vy = 0;
      if (w.jumpBuffer > 0 && jump(w)) { w.jumpBuffer = 0; events.push('jump'); }
    }
  } else {
    w.y = w.floor; // landed on (or stepped up onto) a roof
    w.vy = 0;
  }

  spawn(w);

  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (rel < -DESPAWN_BEHIND) { e.alive = false; continue; }
    if (e.bumped !== undefined) continue;
    if (isSky(e.kind)) {
      if (e.variant !== undefined && e.variant < 1000 && rel < SKY_NEAR && inSky(w)) {
        e.variant += 1000; // announced (the view takes variant % 1000)
        events.push(`${e.kind}-near` as SimEvent);
      }
      if (!inSky(w) || Math.abs(rel) > SKY_DEPTH[e.kind] || !sideOverlap(w, e)) continue;
      e.alive = false;
      events.push('sky-hit');
      leaveSky(w);
      w.power = null; w.powerTime = 0;
      events.push('power-end');
      continue;
    }
    if (Math.abs(rel) > (isObstacle(e.kind) ? hitDepth(e.kind) : HIT_DEPTH) || !sideOverlap(w, e)) continue;

    if (e.kind === 'coin') {
      if (e.y !== undefined && w.y < e.y - ROOF_COIN_REACH) continue; // floating over a roof: jump for it
      if (e.y === undefined && w.y > SKY_GLIDE_FROM) continue; // road coins stay on the road below the sky lanes
      e.alive = false;
      w.coins++;
      events.push('coin');
    } else if (isPower(e.kind)) {
      e.alive = false;
      if (e.kind === 'hover') {
        // Hover pickups charge the hover button instead of firing right away.
        w.hoverCharges = Math.min(HOVER_CHARGES_MAX, w.hoverCharges + 1);
        events.push('charge');
        continue;
      }
      activate(w, e.kind);
      events.push(e.kind === 'supercharger' ? 'battery' : 'power');
    } else if (clears(w, e)) {
      continue; // jumped or hovering over it, riding a car's roof or a deck, or ducked under a beam
    } else if (e.kind === 'spikes') {
      // A spike strip stays put. Shielded (grace or a power-up), the car rolls over it unharmed.
      if (isShielded(w)) continue;
      events.push('puncture');
      if (crash(w)) { events.push(w.caught ? 'caught' : 'crash'); break; }
    } else if (isShielded(w)) {
      knockAside(w, e);
      events.push(isTraffic(e.kind) || isProp(e.kind) ? 'boing' : 'smash');
      if (e.kind === 'longhorn') events.push('moo');
    } else {
      knockAside(w, e);
      if (e.kind === 'longhorn') events.push('moo');
      if (crash(w)) { events.push(w.caught ? 'caught' : 'crash'); break; }
      events.push('hit');
    }
  }
  return events;
}

/** Cones are flattened; traffic and big props get a "boing" and pop aside (the view animates it), harmless from then on. */
function knockAside(w: World, e: Entity): void {
  if (isTraffic(e.kind) || isProp(e.kind)) e.bumped = w.time;
  else e.alive = false;
}

/**
 * What the car stands on: a roof (CAR_ROOF, or a parked police car's) if it's up level with one under it, the
 * surface of a ramp or deck it's level with, else 0 (the road). Driving, it rolls up a ramp (each step rises
 * at most DECK_CLIMB); from the air it settles onto a deck only from above (within DECK_STEP), so a jump from
 * the road never reaches a deck.
 */
function roofUnder(w: World): number {
  if (w.tube) return 0;
  const driving = w.y <= w.floor + 1e-6 && w.vy <= 0;
  let roof = 0;
  for (const e of w.entities) {
    if (!e.alive || e.bumped !== undefined) continue;
    if (isDeck(e.kind)) {
      const r = deckOffset(e.kind, e.s, w.distance);
      if (r < 0 || r > deckLength(e.kind) || !sideOverlap(w, e)) continue;
      const surface = deckSurface(e.kind, r);
      if (w.y >= surface - (driving ? DECK_CLIMB : DECK_STEP)) roof = Math.max(roof, surface);
      continue;
    }
    if (w.y < CAR_CLEAR || (e.kind !== 'car' && e.kind !== 'police')) continue;
    if (Math.abs(e.s - w.distance) <= hitDepth(e.kind) && sideOverlap(w, e)) roof = Math.max(roof, roofHeight(e.kind));
  }
  return roof;
}

/**
 * Does the car get past an obstacle it's level with? Over it (a jump, a hover, a car roof); for a deck piece,
 * up level with its surface (on the ramp or deck, or past its front); for an overhead beam, ducked under it.
 */
function clears(w: World, e: Entity): boolean {
  if (isDeck(e.kind)) {
    const r = deckOffset(e.kind, e.s, w.distance);
    if (r > deckLength(e.kind)) return true; // driven off the front
    return w.y >= wallHeight(e.kind, r) - DECK_STEP;
  }
  if (e.kind === 'overhead') return underOverhead(w.y, isDucking(w)) || w.y >= OVERHEAD_TOP;
  return w.y >= clearHeight(e.kind as ObstacleKind);
}

/** How high a deck piece stands `r` m in front of its back end (the car's front reaches it from r = -1): the ramp, else the deck. */
const wallHeight = (k: DeckKind, r: number): number => (k === 'flatbed' ? DECK_HEIGHT : deckSurface(k, Math.max(0, r)));

/** Slope (rise per metre) of the ramp the car is driving up, 0 if it isn't on one (for the view's nose-up tilt). */
export function rampSlope(w: World): number {
  if (w.tube || w.y > w.floor + 1e-6 || w.floor <= 0 || w.floor >= DECK_HEIGHT) return 0;
  for (const e of w.entities) {
    if (!e.alive || e.kind !== 'trailer' || e.bumped !== undefined || !sideOverlap(w, e)) continue;
    const r = deckOffset(e.kind, e.s, w.distance);
    if (r > 0 && r < RAMP_LENGTH && Math.abs(deckSurface(e.kind, r) - w.y) < 0.05) return DECK_HEIGHT / RAMP_LENGTH;
  }
  return 0;
}

/** Is the car level with `e` across the road (or around the tube's ring)? */
function sideOverlap(w: World, e: Entity): boolean {
  if (w.tube) {
    // Inside the tube, compare angles; road items count as the bottom slot of their lane.
    const slot = e.slot ?? laneToSlot(e.lane);
    return angleGap(w.angle, slot * SLOT_ANGLE) * TUNNEL_RADIUS <= HIT_HALF_WIDTH;
  }
  if (e.slot !== undefined) {
    // Tube item met on the road (only at the very mouth): bottom slots only.
    if (Math.abs(e.slot) > 1) return false;
    return Math.abs(laneX(slotToLane(e.slot)) - w.x) <= HIT_HALF_WIDTH;
  }
  if (e.from !== undefined) return Math.abs(laneX(entityLane(w, e)) - w.x) < LONGHORN_HIT_X;
  return Math.abs(laneX(e.lane) - w.x) <= HIT_HALF_WIDTH;
}

/** The (fractional) lane an entity is in right now: its lane, or for a walking longhorn, where its walk has got to. */
export const entityLane = (w: World, e: Entity): number =>
  e.from === undefined ? e.lane : herdLane(e.from, e.lane, e.s - w.distance);

/** In the exit stretch, only the bottom slots are allowed: the car slides back down to leave in a lane. */
const inTubeExit = (w: World): boolean => w.distance >= w.tunnelEnd - TUNNEL_EXIT;

/** Move one slot around the ring; it wraps, so a kid can keep going all the way round. */
function turnSlot(w: World, dir: number): boolean {
  let next = w.slot + dir;
  if (inTubeExit(w)) next = Math.max(-1, Math.min(1, next));
  if (next === w.slot) return false;
  w.slot = next;
  // Keep slot in -3..4; shift the angle by a full turn with it so nothing visibly jumps.
  if (w.slot > TUNNEL_SLOTS / 2) { w.slot -= TUNNEL_SLOTS; w.angle -= Math.PI * 2; }
  if (w.slot < 1 - TUNNEL_SLOTS / 2) { w.slot += TUNNEL_SLOTS; w.angle += Math.PI * 2; }
  return true;
}

function enterTube(w: World): void {
  w.tube = true;
  w.angle = (w.x / LANE_WIDTH) * SLOT_ANGLE; // lane positions map straight onto the bottom slots
  w.slot = laneToSlot(w.lane);
}

function driveTube(w: World, dt: number): void {
  if (inTubeExit(w)) w.slot = exitSlot(w.slot);
  if (w.power === 'autopilot') tubeAutopilot(w);
  const da = w.slot * SLOT_ANGLE - w.angle;
  w.angle += Math.sign(da) * Math.min(Math.abs(da), TUBE_TURN_SPEED * dt);
  // x follows the angle near the bottom (police, entry/exit blend), clamped to the road.
  w.x = Math.max(laneX(0), Math.min(laneX(LANE_COUNT - 1), (w.angle / SLOT_ANGLE) * LANE_WIDTH));
  if (w.distance >= w.tunnelEnd) {
    w.tube = false;
    w.lane = slotToLane(w.slot);
    w.angle = 0;
    w.slot = 0;
  }
}

const SLOT_SCORES: number[] = new Array(TUNNEL_SLOTS).fill(0);
const SLOT_CONE: number[] = new Array(TUNNEL_SLOTS).fill(0);

/**
 * Tube autopilot: head for the slot with the most coins and no cones ahead, by a way round that
 * doesn't cross a slot with a cone coming up before the car is past it.
 */
function tubeAutopilot(w: World): void {
  if (angleGap(w.angle, w.slot * SLOT_ANGLE) > 0.1) return; // finish the current move first
  const exit = inTubeExit(w);
  const scores = SLOT_SCORES, cone = SLOT_CONE;
  const idx = (slot: number) => wrapSlot(slot) + TUNNEL_SLOTS / 2 - 1; // -3..4 -> 0..7
  for (let i = 0; i < TUNNEL_SLOTS; i++) { scores[i] = 0; cone[i] = Infinity; }
  scores[idx(w.slot)] = 0.5;
  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (rel < -HIT_DEPTH || rel > AUTOPILOT_LOOKAHEAD) continue;
    const i = idx(e.slot ?? laneToSlot(e.lane));
    if (e.kind === 'cone') { cone[i] = Math.min(cone[i], rel); if (rel >= 0) scores[i] -= 100 / (1 + rel * 0.1); }
    else if (rel >= 0) scores[i] += e.kind === 'coin' ? 1 : 3;
  }
  const stepDist = (w.speed * SLOT_ANGLE) / TUBE_TURN_SPEED; // m driven while moving one slot
  let bestDir = 0, bestScore = scores[idx(w.slot)];
  for (const dir of [-1, 1]) {
    for (let n = 1; n <= TUNNEL_SLOTS / 2; n++) {
      const slot = w.slot + dir * n;
      // Passing through (or stopping on) a slot whose cone arrives before we're clear of it: path blocked.
      if (cone[idx(slot)] < (n + 1) * stepDist + HIT_DEPTH * 2) break;
      if (exit && Math.abs(slot) > 1) break;
      const score = scores[idx(slot)] - 0.2 * n;
      if (score > bestScore) { bestScore = score; bestDir = dir; }
    }
  }
  if (bestDir) turnSlot(w, bestDir);
}

/** Returns true if this crash ends the run. */
function crash(w: World): boolean {
  const close = w.chase > 0; // the harmless opening chase doesn't count
  w.batteries--;
  if (!w.kidMode || close || w.batteries <= 0) {
    w.caught = close;
    w.phase = 'over';
    return true;
  }
  w.invuln = INVULN_TIME;
  w.stumble = STUMBLE_TIME;
  w.chase = CHASE_TIME;
  w.intro = 0;
  return false;
}

function activate(w: World, kind: PowerKind): void {
  w.lastPower = kind;
  if (kind === 'supercharger') {
    w.batteries = Math.min(BATTERIES, w.batteries + 1);
    w.chase = 0; // a fresh battery also shakes off the police
    w.intro = 0;
    return;
  }
  w.power = kind;
  w.powerTime = POWER_TIME[kind];
}

/** Steer toward the lane with the most coins and no cones ahead. */
function autopilot(w: World): void {
  if (Math.abs(w.x - laneX(w.lane)) > 0.15) return; // finish the current lane change first
  const scores = SCORES;
  for (let l = 0; l < LANE_COUNT; l++) scores[l] = l === w.lane ? 0.5 : 0;
  for (const e of w.entities) {
    if (!e.alive) continue;
    const rel = e.s - w.distance;
    if (isObstacle(e.kind)) {
      // Cones, cars and trucks: anything ahead, or still level with us (no swerving into a car's side).
      if (e.bumped !== undefined) continue;
      const h = hitDepth(e.kind);
      if (rel + h < 0 || rel - h > AUTOPILOT_LOOKAHEAD) continue;
      scores[e.lane] -= 100 / (1 + Math.max(0, rel - h) * 0.1);
      continue;
    }
    if (rel < 0 || rel > AUTOPILOT_LOOKAHEAD) continue;
    scores[e.lane] += e.kind === 'coin' ? 1 : 3;
  }
  let best = w.lane;
  for (let l = 0; l < LANE_COUNT; l++) if (scores[l] > scores[best]) best = l;
  if (best !== w.lane) w.lane += Math.sign(best - w.lane);
}

function pickPower(w: World): PowerKind {
  const options: PowerKind[] = ['ludicrous', 'autopilot', 'hover'];
  if (w.batteries < BATTERIES) options.push('supercharger', 'supercharger');
  return options[Math.floor(w.rng() * options.length)];
}

function spawn(w: World): void {
  while (w.nextRowAt < w.distance + SPAWN_AHEAD) {
    const difficulty = (speedAt(w.time) - SPEED_START) / (SPEED_MAX - SPEED_START);
    if (layBatSwarm(w) || layTunnel(w) || layZone(w, difficulty)) continue;
    if (wantTraffic(w)) { layTraffic(w, placeChunk(w.rng, difficulty, w.nextRowAt, true).items); continue; }
    const powersOk = w.time > POWER_START_AFTER && !w.power;
    const only = w.overheadQueued ? hasOverhead : undefined;
    w.overheadQueued = false;
    for (const item of placeChunk(w.rng, difficulty, w.nextRowAt, 'cones', only).items) {
      let kind: EntityKind;
      if (item.kind === 'power') {
        // Power slots only sometimes hold a power-up; otherwise a short coin line.
        if (powersOk && w.rng() < POWER_CHANCE * 4) kind = pickPower(w);
        else { for (let i = 0; i < 3; i++) add(w, 'coin', item.lane, item.s + i * 2.2); continue; }
      } else kind = item.kind;
      add(w, kind, item.lane, item.s, undefined, undefined, item.y);
    }
    w.nextRowAt += CHUNK_LENGTH;
  }
}

/** Is the next chunk slot a traffic chunk? Traffic comes in runs of a few chunks, between cone chunks. */
function wantTraffic(w: World): boolean {
  // Not straight after a tunnel or Bat Swarm: traffic can't be pulled back into them, so it would be met late.
  if (w.nextRowAt < TRAFFIC_FIRST_AT || w.nextRowAt < Math.max(w.tunnelEnd, w.swarmEnd + SWARM_PAD) + 60) return false;
  if (w.trafficRun > 0) { w.trafficRun--; return true; }
  const first = w.nextRowAt < TRAFFIC_FIRST_AT + CHUNK_LENGTH; // the first slot that may have traffic always does
  if (!first && w.rng() >= TRAFFIC_CHANCE) return false;
  const [lo, hi] = TRAFFIC_RUN;
  w.trafficRun = lo + Math.floor(w.rng() * (hi - lo + 1));
  return true;
}

/**
 * Lay a traffic chunk (cars, trucks and their coins, all driving at TRAFFIC_SPEED) in the slot at nextRowAt.
 *
 * Fairness: the chunk moves as one rigid piece, so its own layout never changes (the chunk validator checks
 * it at top speed, which is stricter than closing on traffic). What must not happen is traffic meeting the
 * car at the same time as static cones. So:
 * - Behind it: the chunk is pulled back by `shift`, at most what the traffic drives before even the fastest
 *   possible car (speed steps, plus any Ludicrous that could be picked up) reaches it. So every vehicle is
 *   met at or beyond its spot in the slot, never back among the cones before the slot.
 * - Ahead of it: the next slot starts only past where the last vehicle can be when the slowest car
 *   (stumbling after crashes, allowed for by TRAFFIC_SLACK) gets past it.
 * Without the pull-back, the car would need ages to catch traffic laid SPAWN_AHEAD away; with it, the
 * traffic is met roughly where the chunk was designed to be, like a cone chunk.
 */
function layTraffic(w: World, items: PlacedItem[]): void {
  const s0 = w.nextRowAt, v = TRAFFIC_SPEED;
  const depth = (it: PlacedItem) => (isObstacle(it.kind) ? hitDepth(it.kind) : 0);
  const movers = items.filter((it) => isObstacle(it.kind));
  const firstZone = Math.min(...movers.map((it) => it.s - depth(it)));
  let boost = w.power === 'ludicrous' ? w.powerTime : 0;
  for (const e of w.entities) if (e.alive && e.kind === 'ludicrous' && e.s > w.distance) boost += LUDICROUS_TIME;
  const fastest = (tau: number) => (tau < boost ? LUDICROUS_BOOST : 1);
  let shift = v * catchTimeAtLeast(w.time, firstZone - w.distance, 0, fastest);
  // Never pulled back into a tunnel or Bat Swarm, or over older static obstacles (cones, police stops, road work)
  // close enough to see it drive through them.
  const clear = hitDepth('truck');
  const blockEnd = Math.max(w.tunnelEnd, w.swarmEnd + SWARM_PAD);
  for (const it of items) shift = Math.min(shift, it.s - blockEnd - clear);
  const p = speedAt(w.time);
  for (const it of movers) {
    for (const e of w.entities) {
      if (!e.alive || !isStatic(e.kind) || e.slot !== undefined || e.s >= it.s) continue;
      // Same lane (a longhorn: any lane on its walk).
      if (e.from === undefined ? e.lane !== it.lane : it.lane < Math.min(e.from, e.lane) - 0.5 || it.lane > Math.max(e.from, e.lane) + 0.5) continue;
      // Bodies must not overlap: a truck's half length plus the obstacle's (a cone's fits inside `clear`).
      const gap = Math.max(clear, hitDepth('truck') + hitDepth(e.kind as 'cone') - 2 * PLAYER_HALF_LENGTH + 0.5);
      const seen = e.s - w.distance - TRAFFIC_GHOST_DIST; // > 0: still deep in the fog when traffic reaches it
      const minStart = seen > 0 ? e.s - gap - (v * seen) / p : e.s + gap;
      shift = Math.min(shift, it.s - minStart);
    }
  }
  shift = Math.max(0, shift);
  for (const it of items) {
    if (it.kind === 'power') continue; // traffic chunks have none; the validator enforces it
    add(w, it.kind, it.lane, it.s - shift, undefined, v, it.y, isTraffic(it.kind) ? Math.floor(w.rng() * 1000) : undefined);
  }
  // Keep the road after the chunk clear of whatever the slowest car could still meet there.
  const lastZone = Math.max(...movers.map((it) => it.s + depth(it))) - shift;
  const stumble = w.stumble;
  const slowest = (tau: number) => 1 - (STUMBLE_SLOWDOWN * Math.max(0, stumble - tau)) / STUMBLE_TIME;
  const drift = v * (catchTime(w.time, lastZone - w.distance, v, slowest) + TRAFFIC_SLACK) - shift;
  w.nextRowAt = s0 + CHUNK_LENGTH + Math.max(0, drift);
}

const between = (w: World, [lo, hi]: number[]): number => lo + w.rng() * (hi - lo);

/** Ask for a police stop at the next free chunk slot (debug). */
export function queuePoliceStop(w: World): void { w.policeQueued = true; }
/** Ask for a longhorns crossing at the next free chunk slot (debug). */
export function queueLonghorns(w: World): void { w.herdQueued = true; }
/** Ask for a construction zone at the next free chunk slot (debug). */
export function queueConstruction(w: World): void { w.workQueued = true; }
/** Ask for a high road (trailers with ramps) at the next free chunk slot (debug). */
export function queueHighroad(w: World): void { w.highQueued = true; }
/** Make the next cone chunk one with an overhead beam to duck under (debug). */
export function queueOverhead(w: World): void { w.overheadQueued = true; }

const hasOverhead = (c: Chunk): boolean => c.rows.some((r) => r.overheads?.length);

/**
 * Now and then lay a police stop or a construction zone (one or more chunks) in place of a cone chunk. They're
 * static like cones, so the same fairness holds (chunk validator, edge gaps, traffic pulled back only so far). Never
 * inside or straight after a tube tunnel or Bat Swarm (both are laid at nextRowAt, so never on top of one), and never
 * in the middle of a run of traffic chunks.
 */
function layZone(w: World, difficulty: number): boolean {
  const s0 = w.nextRowAt;
  const blockEnd = Math.max(w.tunnelAt >= 0 ? w.tunnelEnd : -Infinity, w.swarmAt >= 0 ? w.swarmEnd + SWARM_PAD : -Infinity);
  if (s0 < blockEnd + ZONE_AFTER_BLOCK) return false;
  let pool: 'police' | 'construction' | 'longhorns' | 'highroad';
  if (w.workRun > 0 && s0 !== w.workEnd) w.workRun = 0; // a tunnel or swarm came in between: that zone is over
  if (w.workRun > 0) { pool = 'construction'; w.workRun--; }
  else if (w.trafficRun > 0 || s0 < w.zoneEnd + ZONE_SPACING) return false;
  else {
    // Whichever is most overdue (debug queues first); each keeps its own spacing.
    const due = (queued: boolean, at: number) => (queued ? -Infinity : at <= s0 ? at : Infinity);
    const police = due(w.policeQueued, w.nextPoliceAt), work = due(w.workQueued, w.nextWorkAt), herd = due(w.herdQueued, w.nextHerdAt);
    const high = due(w.highQueued, w.nextHighAt);
    const first = Math.min(police, work, herd, high);
    if (first === Infinity) return false;
    if (first === high) {
      pool = 'highroad';
      w.highQueued = false;
      w.highWarned = false;
      w.highAt = s0;
      w.nextHighAt = s0 + between(w, HIGHROAD_GAP);
    } else if (first === police) {
      pool = 'police';
      w.policeQueued = false;
      w.policeWarned = false;
      w.nextPoliceAt = s0 + between(w, POLICE_GAP);
    } else if (first === herd) {
      pool = 'longhorns';
      w.herdQueued = false;
      w.herdWarned = false;
      w.herdAt = s0;
      w.nextHerdAt = s0 + between(w, LONGHORN_GAP);
    } else {
      pool = 'construction';
      w.workQueued = false;
      w.workWarned = false;
      const [lo, hi] = WORK_RUN;
      w.workRun = lo + Math.floor(w.rng() * (hi - lo + 1)) - 1;
      w.workAt = s0;
      w.nextWorkAt = s0 + between(w, WORK_GAP);
    }
  }
  const { items, length } = placeChunk(w.rng, difficulty, s0, pool);
  for (const it of items) {
    if (it.kind === 'power') { for (let i = 0; i < 3; i++) add(w, 'coin', it.lane, it.s + i * 2.2); continue; }
    if (it.kind === 'police') w.policeAt = it.s;
    const variant = it.kind === 'police' || it.kind === 'longhorn' || isDeck(it.kind) ? Math.floor(w.rng() * 1000) : undefined;
    add(w, it.kind, it.lane, it.s, undefined, undefined, it.y, variant, it.from);
  }
  w.nextRowAt += length;
  if (pool === 'construction') w.workEnd = w.nextRowAt;
  w.zoneEnd = w.nextRowAt;
  return true;
}

/** Ask for a Bat Swarm at the next chunk slot, whatever the time of day (debug). */
export function queueSwarm(w: World): void { w.swarmQueued = true; }

/** At dusk, sometimes lay a Bat Swarm in place of the next chunk. Only on cone-free road. */
function layBatSwarm(w: World): boolean {
  const s0 = w.nextRowAt;
  if (!w.swarmQueued) {
    if (!isDusk(dayPhase(w)) || s0 < w.nextSwarmAt || w.rng() >= SWARM_CHANCE) return false;
  }
  if (conesIn(w.entities, s0, s0 + SWARM_SPAN)) return false;
  for (const c of swarmCoins(s0)) add(w, 'coin', c.lane, c.s);
  w.swarmAt = s0 + SWARM_PAD;
  w.swarmEnd = w.swarmAt + SWARM_LENGTH;
  w.swarmSeen = false;
  w.swarmQueued = false;
  w.nextRowAt += SWARM_SPAN;
  w.nextSwarmAt = w.nextRowAt + SWARM_MIN_GAP;
  return true;
}

/** Ask for a tube tunnel at the next chunk slot (debug). */
export function queueTunnel(w: World): void { w.tunnelQueued = true; }

/** Every so often, lay a tube tunnel in place of the next chunks. Only on cone-free road. */
function layTunnel(w: World): boolean {
  const s0 = w.nextRowAt;
  if (w.tunnelAt >= 0 && w.distance < w.tunnelEnd) return false; // one tunnel at a time
  if (s0 < w.swarmEnd + SWARM_PAD) return false; // never over a Bat Swarm
  if (w.power === 'hover' || s0 < w.skyEnd + 60) return false; // never under the sky lanes
  if (!w.tunnelQueued && (s0 < w.nextTunnelAt || w.rng() >= TUNNEL_CHANCE)) return false;
  if (conesIn(w.entities, s0, s0 + TUNNEL_LENGTH)) return false;
  for (const it of tunnelItems(w.rng, s0)) add(w, it.kind, 1, it.s, it.slot);
  w.tunnelAt = s0;
  w.tunnelEnd = s0 + TUNNEL_LENGTH;
  w.tunnelQueued = false;
  w.nextRowAt += TUNNEL_LENGTH;
  w.nextTunnelAt = w.nextRowAt + TUNNEL_MIN_GAP;
  return true;
}

function add(
  w: World, kind: EntityKind, lane: number, s: number, slot?: number, v?: number, y?: number, variant?: number, from?: number,
): void {
  const e: Entity = { kind, lane, s, alive: true, slot, v, y, variant, from, bumped: undefined };
  const free = w.entities.find((x) => !x.alive);
  if (free) Object.assign(free, e);
  else w.entities.push(e);
}
