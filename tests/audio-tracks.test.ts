import { describe, expect, it } from 'vitest';
import { HORN_KINDS, MUSIC, findOnset, loopPoints } from '../src/audio/tracks';

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
});
