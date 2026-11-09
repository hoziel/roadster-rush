import { BATTERIES } from '../sim/config';
import type { PowerKind } from '../sim/spawner';
import type { World } from '../sim/world';
import { CREDITS } from './credits';

const POWER_LABEL: Record<PowerKind, string> = {
  ludicrous: 'LUDICROUS!', autopilot: 'AUTOPILOT', hover: 'HOVER', supercharger: 'CHARGED!',
};
const POWER_COLOR: Record<PowerKind, string> = {
  ludicrous: '#ff4fd8', autopilot: '#35e0ff', supercharger: '#4cff6a', hover: '#b18cff',
};

/** DOM overlay: score, coins, batteries, power timer, start and finish cards, mute toggle. */
export class Hud {
  private root: HTMLElement;
  private el: Record<'score' | 'coins' | 'batteries' | 'power' | 'powerLabel' | 'powerBar' | 'card' | 'debug' | 'toast' | 'confetti', HTMLElement>;
  private muteBtn: HTMLButtonElement;
  private lastBatteries = -1;
  private countUp = 0;

  constructor(onMute: () => void) {
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = `
      <div class="top">
        <div class="pill" id="score">0</div>
        <div class="pill coins" id="coins">● 0</div>
        <div class="pill batteries" id="batteries"></div>
        <button class="pill mute" id="mute" aria-label="Mute"></button>
      </div>
      <div class="power" id="power"><span id="powerLabel"></span><div class="bar"><div id="powerBar"></div></div></div>
      <div class="toast" id="toast"></div>
      <div class="card" id="card"></div>
      <div class="confetti" id="confetti"></div>
      <button class="pill credits-btn" id="creditsBtn">Credits</button>
      <div class="credits" id="credits"></div>
      <div class="debug" id="debug"></div>`;
    const q = (id: string) => this.root.querySelector<HTMLElement>('#' + id)!;
    this.el = {
      score: q('score'), coins: q('coins'), batteries: q('batteries'), power: q('power'),
      powerLabel: q('powerLabel'), powerBar: q('powerBar'), card: q('card'), debug: q('debug'),
      toast: q('toast'), confetti: q('confetti'),
    };
    this.muteBtn = q('mute') as HTMLButtonElement;
    // Stop the mute tap from also starting a run.
    this.muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.muteBtn.addEventListener('pointerup', (e) => e.stopPropagation());
    this.muteBtn.addEventListener('click', onMute);

    const creditsBtn = q('creditsBtn');
    const credits = q('credits');
    credits.innerHTML = `<h2>Credits</h2>
      <p>Made by Ofir with Claude and Codex.</p>
      <ul>${CREDITS.map((c) => `<li><b>${c.what}</b><br>${c.who} · ${c.license}</li>`).join('')}</ul>
      <p class="go">Tap to close</p>`;
    for (const el of [creditsBtn, credits]) {
      // Keep these taps from reaching the game (which would start a run).
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('pointerup', (e) => e.stopPropagation());
    }
    creditsBtn.addEventListener('click', () => credits.classList.add('show'));
    credits.addEventListener('click', () => credits.classList.remove('show'));
    this.creditsBtn = creditsBtn;
  }

  private creditsBtn!: HTMLElement;

  setMuted(muted: boolean): void { this.muteBtn.textContent = muted ? '🔇' : '🔊'; }

  update(w: World, score: number, powerTotal: number): void {
    this.el.score.textContent = String(score);
    this.el.coins.textContent = `● ${w.coins}`;
    if (w.batteries !== this.lastBatteries) {
      const lost = w.batteries < this.lastBatteries;
      this.lastBatteries = w.batteries;
      this.el.batteries.innerHTML = Array.from({ length: BATTERIES }, (_, i) =>
        `<span class="cell ${i < w.batteries ? 'full' : 'empty'}"></span>`).join('');
      if (lost) this.flash(this.el.batteries);
    }
    const p = w.power;
    this.el.power.classList.toggle('show', !!p);
    if (p) {
      this.el.powerLabel.textContent = POWER_LABEL[p];
      this.el.powerBar.style.width = `${(w.powerTime / powerTotal) * 100}%`;
      this.el.powerBar.style.background = POWER_COLOR[p];
      this.el.power.style.color = POWER_COLOR[p];
    }
  }

  toast(text: string, color = '#fff'): void {
    const t = this.el.toast;
    t.textContent = text;
    t.style.color = color;
    t.classList.remove('show');
    void t.offsetWidth; // restart the animation
    t.classList.add('show');
  }

  powerToast(kind: PowerKind): void { this.toast(POWER_LABEL[kind], POWER_COLOR[kind]); }

  /** `extra`: wallet + Garage button from the garage module. */
  showReady(best: number, extra = ''): void {
    this.creditsBtn.classList.add('show');
    this.el.card.className = 'card show';
    this.el.card.innerHTML = `<h1>Roadster Rush</h1><p>Swipe ← → to steer, ↑ to jump</p><p class="go">Tap to drive</p>${best ? `<p class="best">Best ${best}</p>` : ''}${extra}`;
  }

  hideCard(): void {
    this.creditsBtn.classList.remove('show');
    this.el.card.className = 'card';
    this.el.confetti.innerHTML = '';
    cancelAnimationFrame(this.countUp);
  }

  /** "Great drive!" with a coin count-up, and confetti on a new best. */
  showFinish(score: number, coins: number, best: number, newBest: boolean, caught: boolean, driver = '', extra = ''): void {
    this.creditsBtn.classList.add('show');
    this.el.card.className = 'card show finish';
    this.el.card.innerHTML = `
      <h1>Great drive!</h1>
      ${driver}
      ${caught ? '<p class="sub">The police caught up. Nice chase!</p>' : ''}
      <p class="big" id="final">0</p>
      <p class="coinline">● <span id="finalCoins">0</span> coins</p>
      ${newBest ? '<p class="best newbest">New best! ★</p>' : `<p class="best">Best ${best}</p>`}
      <p class="go">Tap to drive again</p>${extra}`;
    const finalEl = this.el.card.querySelector<HTMLElement>('#final')!;
    const coinsEl = this.el.card.querySelector<HTMLElement>('#finalCoins')!;
    const t0 = performance.now();
    const dur = 1200;
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      finalEl.textContent = String(Math.round(score * e));
      coinsEl.textContent = String(Math.round(coins * e));
      if (k < 1) this.countUp = requestAnimationFrame(tick);
    };
    this.countUp = requestAnimationFrame(tick);
    if (newBest) this.confetti();
  }

  private confetti(): void {
    const colors = ['#ffd23f', '#ff4fd8', '#35e0ff', '#4cff6a', '#ff6a1a', '#ffffff'];
    this.el.confetti.innerHTML = Array.from({ length: 70 }, () => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.6;
      const dur = 1.8 + Math.random() * 1.4;
      const c = colors[Math.floor(Math.random() * colors.length)];
      const rot = Math.floor(Math.random() * 360);
      return `<i style="left:${left}%;background:${c};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></i>`;
    }).join('');
  }

  private flash(el: HTMLElement): void {
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  debug(text: string): void { this.el.debug.textContent = text; }
}
