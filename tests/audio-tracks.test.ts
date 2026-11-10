import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HORN_KINDS, MUSIC, SAMPLES, SAMPLE_ORDER, findOnset, loopPoints } from '../src/audio/tracks';

const AUDIO_DIR = new URL('../public/themes/austin/audio/', import.meta.url);

describe('audio tracks', () => {
  it('loops are whole bars inside the shipped files', () => {
    expect(MUSIC.run.loopEnd - MUSIC.run.loopStart).toBeCloseTo(72, 5); // 48 bars at 160 bpm
    expect(MUSIC.climax.loopStart).toBeCloseTo(60480 / 44100, 6);
    for (const def of Object.values(MUSIC)) expect(def.loopEnd).toBeGreaterThan(def.loopStart);
  });

  it('finds the first audible sample after decoder priming', () => {
    const data = new Float32Array(5000);
    data[2112] = 0.4;
    expect(findOnset(data)).toBe(2112);
    expect(findOnset(new Float32Array(100))).toBe(0);
  });

  it('falls back to the whole buffer when loop points do not fit', () => {
    const lp = loopPoints(MUSIC.run, 0.02, 73.55)!;
    expect(lp.start).toBeCloseTo(1.52, 6);
    expect(lp.end).toBeCloseTo(73.52, 6);
    expect(loopPoints(MUSIC.run, 0, 30)).toBeNull();
  });

  it('offers the classic and bike horns', () => {
    expect(HORN_KINDS).toEqual(['classic', 'bike']);
  });

  it('loads every sample exactly once, and every file is shipped and small', () => {
    expect([...SAMPLE_ORDER].sort()).toEqual(Object.keys(SAMPLES).sort());
    expect(new Set(SAMPLE_ORDER).size).toBe(SAMPLE_ORDER.length);
    let total = 0;
    for (const file of Object.values(SAMPLES)) {
      const url = new URL(file, AUDIO_DIR);
      expect(existsSync(url), file).toBe(true);
      total += statSync(url).size;
    }
    expect(total).toBeLessThan(400 * 1024);
  });
});
