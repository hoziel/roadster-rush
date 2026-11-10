// Traffic: cars (low, jump onto/over them) and trucks (tall, change lanes) driving the same way as us at
// TRAFFIC_SPEED. This file holds their sizes and the timing maths that keeps moving traffic fair next to
// static cones; world.ts lays it (layTraffic) and runs the collisions.
import {
  BARRIER_HEIGHT, CAR_CLEAR, LONGHORN_DEPTH, LONGHORN_HEIGHT, CAR_LENGTH, CAR_ROOF, CONE_HEIGHT, DIGGER_HEIGHT, DIGGER_LENGTH, FENCE_HEIGHT, HIT_DEPTH,
  PARKED_POLICE_CLEAR, PARKED_POLICE_LENGTH, PARKED_POLICE_ROOF, PLAYER_HALF_LENGTH, SPIKES_HEIGHT, TRUCK_HEIGHT,
  TRUCK_LENGTH,
} from './config';
import type { ObstacleKind } from './spawner';
import { speedAt } from './speed';

/** Half the collision depth along the road between the player and an obstacle (centre to centre). */
export function hitDepth(kind: ObstacleKind): number {
  if (kind === 'car') return CAR_LENGTH / 2 + PLAYER_HALF_LENGTH;
  if (kind === 'truck') return TRUCK_LENGTH / 2 + PLAYER_HALF_LENGTH;
  if (kind === 'police') return PARKED_POLICE_LENGTH / 2 + PLAYER_HALF_LENGTH;
  if (kind === 'digger') return DIGGER_LENGTH / 2 + PLAYER_HALF_LENGTH;
  if (kind === 'longhorn') return LONGHORN_DEPTH / 2 + PLAYER_HALF_LENGTH;
  return HIT_DEPTH; // cones and the thin ones: spike strip, barrier, fence
}

/** Height of a roof the car can land on and ride (0: none). */
export function roofHeight(kind: ObstacleKind): number {
  if (kind === 'car') return CAR_ROOF;
  if (kind === 'police') return PARKED_POLICE_ROOF;
  return 0;
}

/** Height the car must be at to pass over an obstacle (Infinity: can't be jumped). */
export function clearHeight(kind: ObstacleKind): number {
  if (kind === 'car') return CAR_CLEAR;
  if (kind === 'truck') return TRUCK_HEIGHT;
  if (kind === 'spikes') return SPIKES_HEIGHT;
  if (kind === 'police') return PARKED_POLICE_CLEAR;
  if (kind === 'barrier') return BARRIER_HEIGHT;
  if (kind === 'fence') return FENCE_HEIGHT;
  if (kind === 'digger') return DIGGER_HEIGHT;
  if (kind === 'longhorn') return LONGHORN_HEIGHT;
  return CONE_HEIGHT;
}

const STEP = 1 / 60;

/**
 * Seconds for the player, `t0` seconds into a run and driving at `factor(τ) * speedAt(t0 + τ)`, to close a
 * gap of `gap` metres on something moving the same way at `v` m/s. Integrated in small steps; the result
 * is at most one step too long.
 */
export function catchTime(t0: number, gap: number, v: number, factor: (tau: number) => number): number {
  let tau = 0, closed = 0;
  while (closed < gap && tau < 600) {
    closed += Math.max(0.1, speedAt(t0 + tau) * factor(tau) - v) * STEP;
    tau += STEP;
  }
  return tau;
}

/** Same, but never longer than the true time (for lower bounds). */
export const catchTimeAtLeast = (t0: number, gap: number, v: number, factor: (tau: number) => number): number =>
  Math.max(0, catchTime(t0, gap, v, factor) - STEP);
