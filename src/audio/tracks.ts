// Sampled audio files and their loop points. No Web Audio here so it stays unit-testable.
// The files are made by scripts/convert-audio.sh; keep the loop points in sync with its trims.

export type MusicId = 'menu' | 'run' | 'climax';
export type SampleId =
  | 'bike-horn' | 'bonk' | 'crash' | 'smash' | 'power' | 'battery' | 'hover' | 'ui'
  | 'ev-accel' | 'jingle-finish' | 'jingle-best';

export interface TrackDef {
  file: string;
  /** Loop region in seconds from the music's first sample (bar lines, so the seam is clean). */
  loopStart: number;
  loopEnd: number;
}

const bars = (n: number, bpm: number) => (n * 240) / bpm;
const MENU_BAR = 62259 / 44100; // ~170 bpm, measured in samples

export const MUSIC: Record<MusicId, TrackDef> = {
  run: { file: 'music-run.m4a', loopStart: 584530 / 44100, loopEnd: 6423991 / 44100 }, // Hillbilly Swing: seam baked by scripts/bake-loop.mjs
  climax: { file: 'music-climax.m4a', loopStart: bars(1, 175), loopEnd: bars(25, 175) },
  menu: { file: 'music-menu.m4a', loopStart: MENU_BAR, loopEnd: 7 * MENU_BAR },
};

/** Sample SFX (CC0; sources listed in scripts/convert-audio.sh). Each has a synth fallback in audio.ts. */
export const SAMPLES: Record<SampleId, string> = {
  'bike-horn': 'horn-bike.m4a',
  bonk: 'sfx-bonk.m4a',
  crash: 'sfx-crash.m4a',
  smash: 'sfx-smash.m4a',
  power: 'sfx-power.m4a',
  battery: 'sfx-battery.m4a',
  hover: 'sfx-hover.m4a',
  ui: 'sfx-ui.m4a',
  'ev-accel': 'ev-accel.m4a',
  'jingle-finish': 'jingle-finish.m4a',
  'jingle-best': 'jingle-best.m4a',
};

/** Samples needed first (menu taps, run start) load right after the menu music; the rest follow. */
export const SAMPLE_ORDER: SampleId[] = [
  'ui', 'ev-accel', 'bonk', 'crash', 'smash', 'power', 'battery', 'hover', 'jingle-finish', 'jingle-best', 'bike-horn',
];

/** Horn sounds the shop can offer. 'classic' is synthesized, the others are samples. */
export const HORN_KINDS = ['classic', 'bike'] as const;
export type HornKind = (typeof HORN_KINDS)[number];

export const audioUrl = (file: string) => `${import.meta.env.BASE_URL}themes/austin/audio/${file}`;

/**
 * Index of the first audible sample. AAC decoders may or may not strip the encoder's priming
 * silence (~2112 samples); measuring it keeps loop points on the beat either way.
 */
export function findOnset(data: Float32Array, threshold = 0.003): number {
  const limit = Math.min(data.length, 8192); // priming is ~2112 samples; never search far
  for (let i = 0; i < limit; i++) if (Math.abs(data[i]) > threshold) return i;
  return 0;
}

/** Loop points in buffer time, or null when the buffer is too short (then loop the whole buffer). */
export function loopPoints(def: TrackDef, onsetSec: number, duration: number): { start: number; end: number } | null {
  const start = onsetSec + def.loopStart;
  const end = onsetSec + def.loopEnd;
  return end <= duration && start < end ? { start, end } : null;
}
