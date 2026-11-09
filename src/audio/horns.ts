// Unlockable horns, all generated with Web Audio (nothing to download).
// The "tune" is an original five-note phrase written for this game.
import type { HornId } from '../sim/shop';

export const HORN_NAMES: Record<HornId, string> = {
  classic: 'Beep', bell: 'Ding', tune: 'Tune', clown: 'Honk', bike: 'Squeak',
};

type Play = (ctx: AudioContext, out: AudioNode, t: number) => void;

function note(ctx: AudioContext, out: AudioNode, freqs: number[], type: OscillatorType, t: number, dur: number, vol: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04));
  g.gain.linearRampToValueAtTime(0, t + dur);
  g.connect(out);
  for (const f of freqs) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(g);
    o.start(t); o.stop(t + dur); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
}

const HORNS: Record<HornId, Play> = {
  // The original two-tone beep.
  classic: (ctx, out, t) => note(ctx, out, [392, 494], 'square', t, 0.28, 0.12),

  // Bike horn: the real CC0 sample plays via GameAudio.honk; this short squeak is only the fallback.
  bike: (ctx, out, t) => note(ctx, out, [620, 700], 'square', t, 0.18, 0.1),

  // Bike-bell-ish: bright inharmonic partials with a ringing decay, two dings.
  bell: (ctx, out, t) => {
    for (const at of [0, 0.16]) {
      for (const [f, v] of [[2100, 0.12], [2100 * 2.76, 0.04], [2100 * 1.5, 0.03]] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(v, t + at);
        g.gain.exponentialRampToValueAtTime(0.0008, t + at + 0.5);
        o.connect(g).connect(out);
        o.start(t + at); o.stop(t + at + 0.52); o.onended = () => { o.disconnect(); g.disconnect(); };
      }
    }
  },

  // Original short phrase: G5 E5 G5 C6 (hold).
  tune: (ctx, out, t) => {
    const seq: [number, number][] = [[784, 0.1], [659, 0.1], [784, 0.1], [1047, 0.26]];
    let at = t;
    for (const [f, d] of seq) { note(ctx, out, [f, f / 2], 'square', at, d, 0.08); at += d + 0.02; }
  },

  // Bulb clown honk: buzzy low tone that wobbles and sags in pitch, twice.
  clown: (ctx, out, t) => {
    for (const at of [0, 0.24]) {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(330, t + at);
      o.frequency.exponentialRampToValueAtTime(220, t + at + 0.18);
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t + at);
      g.gain.linearRampToValueAtTime(0.35, t + at + 0.02);
      g.gain.linearRampToValueAtTime(0, t + at + 0.2);
      o.connect(f).connect(g).connect(out);
      o.start(t + at); o.stop(t + at + 0.21); o.onended = () => { o.disconnect(); f.disconnect(); g.disconnect(); };
    }
  },
};

export function playHorn(id: HornId, ctx: AudioContext, out: AudioNode): void {
  HORNS[id](ctx, out, ctx.currentTime);
}
