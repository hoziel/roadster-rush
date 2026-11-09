import { DAY_CYCLE, DUSK_END, DUSK_START } from './config';

export type DayLabel = 'sunset' | 'dusk' | 'night' | 'dawn';

const frac = (v: number): number => v - Math.floor(v);

/** Where we are in the sunset-to-night loop, 0..1 (0 = sunset). Driven by run time. */
export function dayPhase(w: { time: number; dayOffset: number }): number {
  return frac(w.time / DAY_CYCLE + w.dayOffset);
}

export const isDusk = (phase: number): boolean => phase >= DUSK_START && phase < DUSK_END;

export function dayLabel(phase: number): DayLabel {
  if (phase < DUSK_START) return 'sunset';
  if (phase < DUSK_END) return 'dusk';
  if (phase < 0.85) return 'night';
  return 'dawn';
}

/** Offset that puts the cycle at `phase` right now (debug jumps). */
export function offsetFor(w: { time: number }, phase: number): number {
  return frac(phase - w.time / DAY_CYCLE);
}
