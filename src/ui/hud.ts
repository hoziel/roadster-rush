import type { Phase } from '../sim/world';

/** DOM overlay: score, coins, best, start and finish cards, mute toggle. */
export class Hud {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private card: HTMLElement;
  private muteBtn: HTMLButtonElement;
  private debugEl: HTMLElement;

  constructor(onMute: () => void) {
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = `
      <div class="top">
        <div class="pill" id="score">0</div>
        <div class="pill coins" id="coins">● 0</div>
        <button class="pill mute" id="mute" aria-label="Mute"></button>
      </div>
      <div class="card" id="card"></div>
      <div class="debug" id="debug"></div>`;
    this.scoreEl = this.root.querySelector('#score')!;
    this.coinsEl = this.root.querySelector('#coins')!;
    this.card = this.root.querySelector('#card')!;
    this.muteBtn = this.root.querySelector('#mute')!;
    this.debugEl = this.root.querySelector('#debug')!;
    // Stop the mute tap from also starting a run.
    this.muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.muteBtn.addEventListener('pointerup', (e) => e.stopPropagation());
    this.muteBtn.addEventListener('click', onMute);
  }

  setMuted(muted: boolean): void { this.muteBtn.textContent = muted ? '🔇' : '🔊'; }

  update(score: number, coins: number): void {
    this.scoreEl.textContent = String(score);
    this.coinsEl.textContent = `● ${coins}`;
  }

  showPhase(phase: Phase, score: number, best: number, newBest: boolean): void {
    if (phase === 'running') { this.card.className = 'card'; return; }
    this.card.className = 'card show';
    this.card.innerHTML = phase === 'ready'
      ? `<h1>Roadster Rush</h1><p>Swipe ← → to steer, ↑ to jump</p><p class="go">Tap to drive</p>${best ? `<p class="best">Best ${best}</p>` : ''}`
      : `<h1>Great drive!</h1><p class="big">${score}</p>${newBest ? '<p class="best">New best! ★</p>' : `<p class="best">Best ${best}</p>`}<p class="go">Tap to drive again</p>`;
  }

  debug(text: string): void { this.debugEl.textContent = text; }
}
