import { HORN_IDS, type HornId } from '../sim/shop';
import { playHorn } from './horns';
import { MUSIC, SAMPLES, audioUrl, findOnset, loopPoints, type MusicId, type SampleId } from './tracks';

export { HORN_KINDS, type HornKind, type MusicId } from './tracks';

const MASTER_VOL = 0.8;
const MUSIC_VOL = 0.35; // music sits under the SFX
const DUCK = 0.55; // music level while an SFX plays (fraction of MUSIC_VOL)
const FADE = 0.8; // s, crossfade between tracks

interface Decoded { buffer: AudioBuffer; onset: number } // onset in seconds
interface Playing { id: MusicId; src: AudioBufferSourceNode; gain: GainNode }

// SFX are synthesized with Web Audio. Music and sample SFX are small .m4a files, loaded after the
// first tap; if they fail to load the game just plays without them.
export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private motor?: { osc: OscillatorNode; sub: OscillatorNode; gain: GainNode; filter: BiquadFilterNode };
  private muted: boolean;
  private sirenOsc?: OscillatorNode;
  private sirenGain?: GainNode;
  private buffers = new Map<MusicId | SampleId, Decoded>();
  private wantMusic: MusicId | null = null;
  private playing: Playing[] = []; // newest last; others are fading out, or the run track parked under climax

  constructor(muted: boolean) { this.muted = muted; }

  /** Must be called from a user gesture (iOS unlock). Safe to call on every tap: it resumes the context. */
  unlock(): void {
    if (this.ctx) { this.resume(); return; }
    let ctx: AudioContext;
    try { ctx = new AudioContext(); } catch { return; } // no Web Audio: play silently
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = MUSIC_VOL;
    this.musicBus.connect(this.master);

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

    // iOS suspends or "interrupts" the context (calls, app switch, screen lock). Resume when the page
    // is back; if iOS refuses without a gesture, the next tap's unlock() resumes it.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.resume();
      else void ctx.suspend().catch(() => {});
    });
    window.addEventListener('pageshow', () => this.resume());
    this.resume();
    void this.loadAll();
  }

  private resume(): void {
    const ctx = this.ctx;
    if (!ctx || document.visibilityState === 'hidden') return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  }

  /** Fetch and decode every file, menu music first. A failure just leaves that sound out. */
  private async loadAll(): Promise<void> {
    const order: [MusicId | SampleId, string][] = [
      ['menu', MUSIC.menu.file], ['run', MUSIC.run.file], ['bike-horn', SAMPLES['bike-horn']], ['climax', MUSIC.climax.file],
    ];
    for (const [id, file] of order) {
      try {
        this.buffers.set(id, await this.load(file));
        if (id === this.wantMusic && this.current()?.id !== id) this.music(id, true);
      } catch (e) {
        console.warn(`audio: could not load ${file}`, e);
      }
    }
  }

  private async load(file: string): Promise<Decoded> {
    const res = await fetch(audioUrl(file));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.arrayBuffer();
    const ctx = this.ctx!;
    // Callback form too: older iOS Safari has no promise-returning decodeAudioData.
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
      if (p && typeof p.catch === 'function') p.catch(reject);
    });
    return { buffer, onset: findOnset(buffer.getChannelData(0)) / buffer.sampleRate };
  }

  private current(): Playing | undefined { return this.playing[this.playing.length - 1]; }

  /**
   * Which music should play: 'menu', 'run', 'climax' (Ludicrous) or null for silence.
   * Cheap to call every frame; it only acts when the choice changes. Climax parks the run track
   * silently, so the run music carries on where it was when Ludicrous ends.
   */
  music(id: MusicId | null, force = false): void {
    if (id === this.wantMusic && !force) return;
    this.wantMusic = id;
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return; // before the first tap: remembered, started once loaded
    if (id === 'climax' && !this.buffers.has('climax')) id = 'run'; // keep the run music until climax loads
    const t = ctx.currentTime;
    const park: MusicId | null = id === 'climax' ? 'run' : null;
    let next = id ? this.playing.find((p) => p.id === id) : undefined;
    for (const p of this.playing) {
      if (p === next) continue;
      this.ramp(p.gain, 0, t);
      if (p.id !== park) p.src.stop(t + FADE + 0.05);
    }
    this.playing = this.playing.filter((p) => p === next || p.id === park);
    if (id && !next) {
      const d = this.buffers.get(id);
      if (!d) return; // not loaded yet: loadAll() starts it when it arrives
      const src = ctx.createBufferSource();
      src.buffer = d.buffer;
      src.loop = true;
      const lp = loopPoints(MUSIC[id], d.onset, d.buffer.duration);
      if (lp) { src.loopStart = lp.start; src.loopEnd = lp.end; }
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.musicBus);
      src.start(t, d.onset);
      next = { id, src, gain };
    }
    if (next) {
      this.ramp(next.gain, 1, t);
      const n = next;
      this.playing = this.playing.filter((p) => p !== n).concat(n);
    }
  }

  private ramp(g: GainNode, to: number, t: number): void {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + FADE);
  }

  /** Dip the music briefly so an SFX reads clearly. */
  private duck(len: number): void {
    if (!this.ctx || !this.musicBus) return;
    const g = this.musicBus.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_VOL * DUCK, t, 0.03);
    g.setTargetAtTime(MUSIC_VOL, t + Math.max(len, 0.2), 0.25);
  }

  /** Play a loaded sample through the master gain. Returns false if it isn't loaded (yet). */
  playSample(id: SampleId, vol = 0.5): boolean {
    const d = this.buffers.get(id);
    if (!this.ctx || !this.master || !d) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = d.buffer;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start(this.ctx.currentTime, d.onset);
    this.duck(d.buffer.duration - d.onset);
    return true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, this.ctx.currentTime, 0.05);
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

  /** 'bike' uses the CC0 bike-horn sample (synth fallback until it loads); the rest are synthesized. */
  honk(id: string = this.horn): void {
    const horn = (HORN_IDS as readonly string[]).includes(id) ? (id as HornId) : 'classic';
    if (horn === 'bike' && this.playSample('bike-horn', 0.6)) return;
    if (this.ctx && this.master) playHorn(horn, this.ctx, this.master);
  }

  coin(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.duck(0.15);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1046, t);
    o.frequency.setValueAtTime(1568, t + 0.06);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.2); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  crash(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.duck(0.5);
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
    src.onended = () => { src.disconnect(); g.disconnect(); };
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
    this.duck(0.3);
    [523, 659, 784, 1046].forEach((f, i) => this.tone([f], 'square', 0.09, 0.07, this.now() + i * 0.06));
  }

  /** Soft kid-friendly bonk when a crash costs a battery. */
  bonk(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.duck(0.3);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.32); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  smash(): void {
    this.tone([880, 1320], 'triangle', 0.08, 0.08);
  }

  fanfare(): void {
    this.duck(0.9);
    const n = this.now();
    [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36]].forEach(([f, d]) => this.tone([f, f * 1.5], 'square', d === 0.36 ? 0.5 : 0.11, 0.06, n + d));
  }

  private now(): number { return this.ctx ? this.ctx.currentTime : 0; }

  /** Synth notes; one starting now also ducks the music (scheduled ones are covered by their caller). */
  private tone(freqs: number[], type: OscillatorType, dur: number, vol: number, at?: number): void {
    if (!this.ctx || !this.master) return;
    const t = at ?? this.ctx.currentTime;
    if (at === undefined) this.duck(dur);
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
      o.start(t); o.stop(t + dur); o.onended = () => { o.disconnect(); g.disconnect(); };
    }
  }
}
