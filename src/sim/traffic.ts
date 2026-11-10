// Traffic: cars (low, jump onto/over them) and trucks (tall, change lanes) driving the same way as us at
// TRAFFIC_SPEED. This file holds their sizes and the timing maths that keeps moving traffic fair next to
// static cones; world.ts lays it (layTraffic) and runs the collisions.
import {
  CAR_CLEAR, CAR_LENGTH, CONE_HEIGHT, HIT_DEPTH, PLAYER_HALF_LENGTH, TRUCK_HEIGHT, TRUCK_LENGTH,
} from './config';
import type { ObstacleKind } from './spawner';
import { speedAt } from './speed';

/** Half the collision depth along the road between the player and an obstacle (centre to centre). */
export function hitDepth(kind: ObstacleKind): number {
  if (kind === 'car') return CAR_LENGTH / 2 + PLAYER_HALF_LENGTH;
  if (kind === 'truck') return TRUCK_LENGTH / 2 + PLAYER_HALF_LENGTH;
  return HIT_DEPTH;
}

/** Height the car must be at to pass over an obstacle (Infinity: can't be jumped). */
export function clearHeight(kind: ObstacleKind): number {
  if (kind === 'car') return CAR_CLEAR;
  if (kind === 'truck') return TRUCK_HEIGHT;
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
