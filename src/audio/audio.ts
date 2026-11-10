import { HORN_IDS, type HornId } from '../sim/shop';
import { playHorn } from './horns';
import { MUSIC, SAMPLES, SAMPLE_ORDER, audioUrl, findOnset, loopPoints, type MusicId, type SampleId } from './tracks';

export { HORN_KINDS, type HornKind, type MusicId } from './tracks';

const MASTER_VOL = 0.8;
const MUSIC_VOL = 0.22; // music sits well under the SFX (it's off by default)
const DUCK = 0.55; // music level while an SFX plays (fraction of MUSIC_VOL)
const FADE = 0.8; // s, crossfade between tracks

interface Decoded { buffer: AudioBuffer; onset: number } // onset in seconds
interface Playing { id: MusicId; src: AudioBufferSourceNode; gain: GainNode }

// Music and most SFX are small .m4a files, loaded after the first tap. Every sampled SFX has a
// synthesized fallback that plays until (or if never) its file loads. All SFX go through sfxBus, so
// the Sound panel's effects switch mutes them; the finish/new-best jingles count as effects too
// (they celebrate an event), so they sit on sfxBus, not musicBus.
export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode; // every sound that isn't looping music (motor, siren, horns, pickups, jingles)
  private musicOn = true;
  private sfxOn = true;
  private motor?: { osc: OscillatorNode; sub: OscillatorNode; gain: GainNode; filter: BiquadFilterNode };
  private muted: boolean;
  private sirenOsc?: OscillatorNode;
  private sirenGain?: GainNode;
  private buffers = new Map<MusicId | SampleId, Decoded>();
  private wantMusic: MusicId | null = null;
  private playing: Playing[] = []; // newest last; others are fading out, or the run track parked under climax
  private noise?: AudioBuffer; // 1 s of white noise for the synth whooshes
  private evSrc?: AudioBufferSourceNode; // the EV acceleration clip, so a new run restarts it

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
    this.musicBus.gain.value = this.musicOn ? MUSIC_VOL : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    this.sfxBus.connect(this.master);

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
    filter.connect(gain).connect(this.sfxBus!);
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
      ['menu', MUSIC.menu.file],
      ...SAMPLE_ORDER.map((id): [SampleId, string] => [id, SAMPLES[id]]), // ~100 KB in all
      ['run', MUSIC.run.file], ['climax', MUSIC.climax.file],
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
    if (!this.ctx || !this.musicBus || !this.musicOn || !this.sfxOn) return;
    const g = this.musicBus.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_VOL * DUCK, t, 0.03);
    g.setTargetAtTime(MUSIC_VOL, t + Math.max(len, 0.2), 0.25);
  }

  /**
   * Play a loaded sample through the SFX bus. Returns false if it isn't loaded (yet), so the caller
   * can fall back to a synth. `from`: seconds into the sound; `rate`: playback speed (also pitch).
   */
  playSample(id: SampleId, vol = 0.5, opts: { from?: number; rate?: number; duck?: boolean; at?: number } = {}): AudioBufferSourceNode | null {
    const d = this.buffers.get(id);
    if (!this.ctx || !this.master || !d) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = d.buffer;
    const rate = opts.rate ?? 1;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.sfxBus!);
    const from = d.onset + (opts.from ?? 0);
    src.start(opts.at ?? this.ctx.currentTime, from);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    if (opts.duck !== false) this.duck((d.buffer.duration - from) / rate);
    return src;
  }

  /** Music and sound effects can be switched off separately (Sound panel). */
  setMix(music: boolean, sfx: boolean): void {
    this.musicOn = music;
    this.sfxOn = sfx;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus?.gain.setTargetAtTime(sfx ? 1 : 0, t, 0.05);
    this.musicBus?.gain.setTargetAtTime(music ? MUSIC_VOL : 0, t, 0.05);
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
    if (this.ctx && this.master) playHorn(horn, this.ctx, this.sfxBus!);
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
    o.connect(g).connect(this.sfxBus!);
    o.start(t); o.stop(t + 0.2); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  /** Run-ending crash: a soft wooden thunk (synth noise burst until it loads) and a gentle "aww". */
  crash(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.duck(0.5);
    if (this.playSample('crash', 0.7)) { this.tone([330, 262], 'triangle', 0.4, 0.07, t + 0.12); return; }
    const len = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(g).connect(this.sfxBus!);
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
      o.connect(g).connect(this.sfxBus!);
      o.start();
      this.sirenOsc = o;
      this.sirenGain = g;
    }
    const t = this.ctx.currentTime;
    this.sirenOsc.frequency.setTargetAtTime(Math.floor(time * 2.5) % 2 ? 660 : 880, t, 0.02);
    this.sirenGain!.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.15);
  }

  /**
   * Distant police sirens in the background during a run: every 14-26 s a far-off wail (slow up/down sweep,
   * muffled, panned to one side) swells in and fades away. Separate from the close chase siren above.
   */
  ambientPolice(running: boolean): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (!running) { this.nextFarSiren = now + 6; return; }
    if (now < this.nextFarSiren) return;
    this.nextFarSiren = now + 14 + Math.random() * 12;
    const dur = 4.5 + Math.random() * 2;
    const o = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const pan = this.ctx.createStereoPanner();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    // US-style wail: slow sweeps between ~650 and ~1250 Hz.
    const sweep = 1.6;
    o.frequency.setValueAtTime(650, now);
    for (let k = 0; k * sweep < dur; k++) {
      o.frequency.linearRampToValueAtTime(1250, now + k * sweep + sweep * 0.55);
      o.frequency.linearRampToValueAtTime(650, now + (k + 1) * sweep);
    }
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5; // far away: muffled
    pan.pan.value = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.03, now + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(lp).connect(pan).connect(g).connect(this.sfxBus!);
    o.start(now); o.stop(now + dur + 0.05);
    o.onended = () => { o.disconnect(); lp.disconnect(); pan.disconnect(); g.disconnect(); };
  }
  private nextFarSiren = 0;

  powerUp(): void {
    if (this.playSample('power', 0.5)) return;
    this.duck(0.3);
    [523, 659, 784, 1046].forEach((f, i) => this.tone([f], 'square', 0.09, 0.07, this.now() + i * 0.06));
  }

  /** Soft kid-friendly bonk when a crash costs a battery. */
  bonk(): void {
    if (!this.ctx || !this.master) return;
    if (this.playSample('bonk', 0.75)) return;
    const t = this.ctx.currentTime;
    this.duck(0.3);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.sfxBus!);
    o.start(t); o.stop(t + 0.32); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  /** Cone knocked over: a light plastic tock plus a little sparkle. */
  smash(): void {
    this.playSample('smash', 0.45, { duck: false });
    this.tone([880, 1320], 'triangle', 0.08, 0.06);
  }

  /** Traffic knocked aside by a shield: a cartoon spring "boing" (pitch leaps up, then wobbles down). */
  boing(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const wob = this.ctx.createOscillator();
    const depth = this.ctx.createGain();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.4);
    wob.frequency.value = 16;
    depth.gain.setValueAtTime(70, t);
    depth.gain.exponentialRampToValueAtTime(5, t + 0.4);
    wob.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g).connect(this.sfxBus!);
    o.start(t); wob.start(t); o.stop(t + 0.45); wob.stop(t + 0.45);
    o.onended = () => { o.disconnect(); wob.disconnect(); depth.disconnect(); g.disconnect(); };
  }

  /** Spike strip: a sharp pop, then air hissing out of the tyre (high-passed noise fading over ~0.9 s). */
  puncture(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.duck(0.4);
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    const pop = Math.floor(ctx.sampleRate * 0.025);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (i < pop ? 1 : 0.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2500, t);
    hp.frequency.exponentialRampToValueAtTime(5500, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    g.gain.setValueAtTime(0.12, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    src.connect(hp).connect(g).connect(this.sfxBus!);
    src.start(t);
    src.onended = () => { src.disconnect(); hp.disconnect(); g.disconnect(); };
    this.tone([220, 147], 'triangle', 0.25, 0.08, t + 0.05); // a soft "uh-oh" under it
  }

  /** A longhorn hit or bumped: a short synthesized "moo" (a low sawtooth sliding up then down, through a vowel filter). */
  moo(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(105, t);
    o.frequency.linearRampToValueAtTime(135, t + 0.18);
    o.frequency.linearRampToValueAtTime(95, t + 0.75);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(350, t);
    lp.frequency.linearRampToValueAtTime(900, t + 0.25);
    lp.frequency.linearRampToValueAtTime(450, t + 0.75);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.08);
    g.gain.setValueAtTime(0.3, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(lp).connect(g).connect(this.sfxBus!);
    o.start(t); o.stop(t + 0.82);
    o.onended = () => { o.disconnect(); lp.disconnect(); g.disconnect(); };
  }

  /** Supercharger battery picked up. */
  battery(): void {
    if (!this.playSample('battery', 0.5)) this.powerUp();
  }

  /** Hover button pressed: a rising UFO phaser. */
  hover(): void {
    if (this.playSample('hover', 0.45)) return;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.sfxBus!);
    o.start(t); o.stop(t + 0.36); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  /** Kickflip: thruster ignition (low rumble + jet hiss), a rising zing, and a side-thruster puff as the roll starts. */
  kickflip(): void {
    this.whoosh(0.4, 110, 700, 0.55, 0, 0.8); // ignition rumble
    this.whoosh(0.55, 900, 4200, 0.3); // jet hiss
    this.whoosh(0.3, 1600, 3200, 0.24, 0.12); // side thrusters kick the roll
    this.sweep(260, 1500, 0.45, 0.11);
  }

  /** Touchdown after a kickflip: a soft thump and a puff of gas. */
  land(): void {
    this.sweep(130, 45, 0.18, 0.4, 'sine');
    this.whoosh(0.4, 700, 1800, 0.22);
  }

  private sweep(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'triangle'): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxBus!);
    o.start(t); o.stop(t + dur + 0.02); o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  /** Entering a tube tunnel: a longer, lower whoosh. */
  tunnel(): void {
    this.whoosh(0.9, 250, 1600, 0.2);
  }

  /** Taps on menu buttons (start card, garage, sound panel). */
  uiTap(): void {
    if (this.playSample('ui', 0.5, { duck: false })) return;
    this.tone([1320], 'sine', 0.05, 0.06);
  }

  /** Run start: the EV acceleration clip (justVova, CC0) over the synth motor whine. */
  runStart(): void {
    this.evSrc?.stop();
    this.evSrc = this.playSample('ev-accel', 0.55, { duck: false }) ?? undefined;
  }

  /** Speed-up step: a short surge from the middle of the acceleration clip. */
  faster(): void {
    this.evSrc?.stop();
    this.evSrc = this.playSample('ev-accel', 0.4, { from: 0.8, rate: 1.1, duck: false }) ?? undefined;
  }

  /** Ludicrous: the top of the acceleration clip, sped up, with the power-up chime. */
  ludicrous(): void {
    this.powerUp();
    this.evSrc?.stop();
    this.evSrc = this.playSample('ev-accel', 0.45, { from: 1.4, rate: 1.3, duck: false }) ?? undefined;
  }

  /** End-of-run jingle: a cheerful pizzicato, or the steel-drum one for a new best (synth fanfare fallback). */
  finishJingle(newBest: boolean): void {
    if (this.playSample(newBest ? 'jingle-best' : 'jingle-finish', 0.6)) return;
    if (newBest) this.fanfare();
  }

  private whoosh(dur: number, f0: number, f1: number, vol: number, delay = 0, q = 1.2): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfxBus!);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.02);
    src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
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
    g.connect(this.sfxBus!);
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      o.start(t); o.stop(t + dur); o.onended = () => { o.disconnect(); g.disconnect(); };
    }
  }
}
