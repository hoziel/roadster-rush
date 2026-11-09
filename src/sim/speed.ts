import { SPEED_MAX, SPEED_START, SPEED_TAU } from './config';

/** Speed after `t` seconds of driving: climbs smoothly, never exceeds SPEED_MAX. */
export function speedAt(t: number): number {
  return SPEED_START + (SPEED_MAX - SPEED_START) * (1 - Math.exp(-Math.max(0, t) / SPEED_TAU));
}
