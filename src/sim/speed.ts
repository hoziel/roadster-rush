import { SPEED_MAX, SPEED_START, SPEED_STEPS, SPEED_STEP_TIME, SPEED_SURGE } from './config';

/** Which speed-up step a run is on after `t` seconds (0 at the start, SPEED_STEPS at the cap). */
export function speedLevel(t: number): number {
  return Math.min(SPEED_STEPS, Math.floor(Math.max(0, t) / SPEED_STEP_TIME));
}

/** Speed after `t` seconds of driving: steps up every SPEED_STEP_TIME s, easing in, never above SPEED_MAX. */
export function speedAt(t: number): number {
  const level = speedLevel(t);
  const inc = (SPEED_MAX - SPEED_START) / SPEED_STEPS;
  if (level === 0) return SPEED_START;
  const k = Math.min(1, (t - level * SPEED_STEP_TIME) / SPEED_SURGE);
  return SPEED_START + inc * (level - 1 + k * k * (3 - 2 * k));
}
