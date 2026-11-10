import './cheer.css';
import type { World } from '../sim/world';

// Uplifting messages for the driver ("Go Ori!", "So proud of you, Nevo!"), every so often during a run and at
// each kilometre: a soft, elegant line near the top that glides in, holds, and fades. Never on top of a toast.

const FIRST_AT = 7; // s into a run
const EVERY: [number, number] = [16, 28]; // s between cheers
const KM = 1000; // m: a milestone cheer every kilometre
const SHOW_MS = 2600;

const GENERIC = (n: string): string[] => [
  `Go ${n}!`, `You're amazing, ${n}!`, `${n}, you're a star!`, `Keep going, ${n}!`, `Wow, ${n}!`,
  `So proud of you, ${n}!`, `Best driver in Austin!`, `${n} rocks!`, `You've got this, ${n}!`, `Nice driving, ${n}!`,
];
const EXTRA: Record<string, (n: string) => string[]> = {
  nevo: (n) => ['HI-YA! Black belt driving!', `Dunk it, ${n}!`, 'Go Spurs Go!', `${n} the champ!`],
  ori: (n) => [`Spike it, ${n}!`, 'Perfect 10!', 'Go Team Blue!', `Flip, ${n}, flip!`],
};

export class Cheer {
  private el: HTMLElement;
  private nextAt = FIRST_AT;
  private nextKm = KM;
  private lastTime = 0;
  private last = '';
  private hideTimer = 0;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'cheer';
    root.append(this.el);
  }

  /** Every frame. name / driverId: the chosen driver. */
  update(w: World, name: string, driverId: string): void {
    if (w.time < this.lastTime) { this.nextAt = FIRST_AT; this.nextKm = KM; } // a new run
    this.lastTime = w.time;
    if (w.phase !== 'running') { this.el.classList.remove('show'); return; }
    if (w.distance >= this.nextKm) {
      const km = Math.round(this.nextKm / KM);
      this.nextKm += KM;
      this.show(`${km} km! Amazing, ${name}!`);
      this.nextAt = Math.max(this.nextAt, w.time + 8);
    } else if (w.time >= this.nextAt) {
      this.nextAt = w.time + EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]);
      const pool = [...GENERIC(name), ...(EXTRA[driverId]?.(name) ?? [])].filter((m) => m !== this.last);
      this.show(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  private show(text: string): void {
    if (document.querySelector('.toast')?.getAnimations().length) { this.nextAt = this.lastTime + 3; return; } // wait for the toast to clear
    this.last = text;
    this.el.textContent = text;
    this.el.classList.remove('show');
    void this.el.offsetWidth; // restart the animation
    this.el.classList.add('show');
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.el.classList.remove('show'), SHOW_MS);
  }
}
