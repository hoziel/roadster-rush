import './install.css';

// "Save to Home Screen" nudge. The game works best installed (full screen, offline, its own icon), so menus
// show a small pill until it is. Detection is on the device only (no analytics, by design):
// - running from the home screen: display-mode standalone (iOS also sets navigator.standalone);
// - Android / desktop Chrome: the browser hands us an install prompt (beforeinstallprompt) we can trigger;
// - iOS Safari has no prompt, so the pill opens a short how-to (Share, then Add to Home Screen).
// Closing the pill hides it for a few days; installing hides it for good.

const SNOOZE_KEY = 'rr.install.snoozedUntil';
const SNOOZE_DAYS = 3;

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Is the game running as an installed home-screen app right now? */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function snoozed(): boolean {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now(); } catch { return false; }
}
function snooze(days: number): void {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86_400_000)); } catch { /* private mode */ }
}

export class InstallNudge {
  private pill: HTMLElement;
  private sheet: HTMLElement;
  private deferred: InstallPromptEvent | null = null;

  constructor(root: HTMLElement) {
    this.pill = document.createElement('div');
    this.pill.className = 'install-pill';
    this.pill.innerHTML = `<button class="ip-go" type="button">📲 Save to Home Screen</button><button class="ip-x" type="button" aria-label="Not now">✕</button>`;
    this.sheet = document.createElement('div');
    this.sheet.className = 'install-sheet';
    root.append(this.sheet);
    // The pill sits inside the start / finish card (above "Let's drive", or under the finish buttons);
    // the card's content is rebuilt each time it's shown, so follow it.
    const card = root.querySelector('#card');
    const place = () => {
      const slot = card?.querySelector('.m-bottom .m-drive') ?? null;
      if (slot) slot.before(this.pill);
      else card?.querySelector('.f-actions')?.append(this.pill);
    };
    if (card) new MutationObserver(place).observe(card, { childList: true });
    place();

    const stop = (e: Event) => e.stopPropagation(); // never let these taps start a run
    for (const el of [this.pill, this.sheet]) for (const t of ['pointerdown', 'pointerup', 'click', 'touchstart']) el.addEventListener(t, stop);
    this.pill.querySelector('.ip-go')!.addEventListener('click', () => void this.install());
    this.pill.querySelector('.ip-x')!.addEventListener('click', () => { snooze(SNOOZE_DAYS); this.refresh(); });
    this.sheet.addEventListener('click', () => this.sheet.classList.remove('show'));

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // keep the browser's own mini-bar away; our pill offers it at a calm moment
      this.deferred = e as InstallPromptEvent;
      this.refresh();
    });
    window.addEventListener('appinstalled', () => { this.deferred = null; snooze(3650); this.refresh(); });
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', () => this.refresh());
    this.refresh();
  }

  /** Show the pill on menus, unless installed, snoozed, or this browser can't install at all. */
  refresh(): void {
    const canOffer = !!this.deferred || isIOS();
    this.pill.classList.toggle('show', !isInstalled() && !snoozed() && canOffer);
  }

  private async install(): Promise<void> {
    if (this.deferred) {
      const ev = this.deferred;
      this.deferred = null;
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome !== 'accepted') snooze(SNOOZE_DAYS);
      this.refresh();
      return;
    }
    // iOS: show how.
    this.sheet.innerHTML = `
      <div class="is-card">
        <h2>Save Roadster Rush</h2>
        <ol>
          <li>Tap <b>Share</b> <span class="is-ico">⬆︎</span> at the bottom of Safari</li>
          <li>Scroll and tap <b>Add to Home Screen</b> <span class="is-ico">＋</span></li>
          <li>Tap <b>Add</b>, then open the game from its icon</li>
        </ol>
        <p>It plays full screen and works without internet.</p>
        <button type="button">Got it</button>
      </div>`;
    this.sheet.classList.add('show');
  }
}
