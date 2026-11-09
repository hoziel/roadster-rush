// All sound is generated with Web Audio: nothing to download yet.
import type { HornId } from '../sim/shop';
import { playHorn } from './horns';

export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private motor?: { osc: OscillatorNode; sub: OscillatorNode; gain: GainNode; filter: BiquadFilterNode };
  private muted: boolean;
  private sirenOsc?: OscillatorNode;
  private sirenGain?: GainNode;

  constructor(muted: boolean) { this.muted = muted; }

  /** Must be called from a user gesture (iOS unlock). */
  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    osc.connect(filter); sub.connect(filter);
    filter.connect(gain).connect(this.master);
    osc.start(); sub.start();
    this.motor = { osc, sub, gain, filter };
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  /** Electric whine that rises with speed; `on` false fades it out. */
  motorUpdate(speed: number, on: boolean): void {
    if (!this.ctx || !this.motor) return;
    const t = this.ctx.currentTime;
    const f = 140 + speed * 18;
    this.motor.osc.frequency.setTargetAtTime(f, t, 0.1);
    this.motor.sub.frequency.setTargetAtTime(f / 2, t, 0.1);
    this.motor.filter.frequency.setTargetAtTime(600 + speed * 40, t, 0.1);
    this.motor.gain.gain.setTargetAtTime(on ? 0.05 : 0, t, on ? 0.2 : 0.08);
  }

  /** The equipped horn (set from the garage). */
  horn: HornId = 'classic';

  honk(id: HornId = this.horn): void {
    if (this.ctx && this.master) playHorn(id, this.ctx, this.master);
  }

  coin(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1046, t);
    o.frequency.setValueAtTime(1568, t + 0.06);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.2);
  }

  crash(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(g).connect(this.master);
    src.start(t);
    this.tone([330, 262], 'triangle', 0.4, 0.1, t + 0.1);
  }

  /** Two-tone siren while the police is close. */
  siren(on: boolean, time: number): void {
    if (!this.ctx || !this.master) return;
    if (!this.sirenOsc) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      const g = this.ctx.createGain();
      g.gain.value = 0;
      o.connect(g).connect(this.master);
      o.start();
      this.sirenOsc = o;
      this.sirenGain = g;
    }
    const t = this.ctx.currentTime;
    this.sirenOsc.frequency.setTargetAtTime(Math.floor(time * 2.5) % 2 ? 660 : 880, t, 0.02);
    this.sirenGain!.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.15);
  }

  powerUp(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone([f], 'square', 0.09, 0.07, this.now() + i * 0.06));
  }

  /** Soft kid-friendly bonk when a crash costs a battery. */
  bonk(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.32);
  }

  smash(): void {
    this.tone([880, 1320], 'triangle', 0.08, 0.08);
  }

  fanfare(): void {
    const n = this.now();
    [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36]].forEach(([f, d]) => this.tone([f, f * 1.5], 'square', d === 0.36 ? 0.5 : 0.11, 0.06, n + d));
  }

  private now(): number { return this.ctx ? this.ctx.currentTime : 0; }

  private tone(freqs: number[], type: OscillatorType, dur: number, vol: number, at?: number): void {
    if (!this.ctx || !this.master) return;
    const t = at ?? this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(this.master);
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      o.start(t); o.stop(t + dur);
    }
  }
}
