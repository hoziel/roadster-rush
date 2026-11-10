import './install.css';

// "Save to Home Screen". The game works best installed (full screen, offline, its own icon), so:
// - a big popup asks once per visit, shortly after the start screen appears, with a Skip button;
// - a small pill stays on the start / finish cards as a reminder.
// Skip (or the pill's ✕) hides both for a few days; installing hides them for good.
// Detection is on the device only (no analytics, by design):
// - running from the home screen: display-mode standalone (iOS also sets navigator.standalone);
// - Android / desktop Chrome: the browser hands us an install prompt (beforeinstallprompt) we can trigger;
// - iOS (and browsers without a prompt) get short how-to steps instead.

const SNOOZE_KEY = 'rr.install.snoozedUntil';
const SNOOZE_DAYS = 3;
const POPUP_DELAY_MS = 1400; // let the start screen settle first

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Is the game running as an installed home-screen app right now? */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = (): boolean => isIOS() || /Android|Mobi/i.test(navigator.userAgent);

function snoozed(): boolean {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now(); } catch { return false; }
}
function snooze(days: number): void {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86_400_000)); } catch { /* private mode */ }
}

export class InstallNudge {
  private pill: HTMLElement;
  private popup: HTMLElement;
  private deferred: InstallPromptEvent | null = null;
  private shownThisVisit = false;

  constructor(root: HTMLElement) {
    this.pill = document.createElement('div');
    this.pill.className = 'install-pill';
    this.pill.innerHTML = `<button class="ip-go" type="button">📲 Save to Home Screen</button><button class="ip-x" type="button" aria-label="Not now">✕</button>`;
    this.popup = document.createElement('div');
    this.popup.className = 'install-popup';
    this.popup.setAttribute('role', 'dialog');
    this.popup.setAttribute('aria-modal', 'true');
    root.append(this.popup);
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
    for (const el of [this.pill, this.popup]) for (const t of ['pointerdown', 'pointerup', 'click', 'touchstart']) el.addEventListener(t, stop);
    this.pill.querySelector('.ip-go')!.addEventListener('click', () => this.open(true));
    this.pill.querySelector('.ip-x')!.addEventListener('click', () => { snooze(SNOOZE_DAYS); this.refresh(); });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // keep the browser's own mini-bar away; our popup offers it instead
      this.deferred = e as InstallPromptEvent;
      this.refresh();
      if (this.popup.classList.contains('show')) this.render(); // upgrade the steps to a one-tap button
    });
    window.addEventListener('appinstalled', () => { this.deferred = null; snooze(3650); this.close(); this.refresh(); });
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', () => this.refresh());
    this.refresh();
    setTimeout(() => { if (this.canOffer() && !snoozed() && !document.querySelector('.garage.open')) this.open(false); }, POPUP_DELAY_MS);
  }

  /** Can this device save the game at all (and isn't it saved already)? */
  private canOffer(): boolean {
    return !isInstalled() && (!!this.deferred || isMobile());
  }

  /** Small pill on the menus, unless installed, snoozed or impossible. */
  refresh(): void {
    this.pill.classList.toggle('show', this.canOffer() && !snoozed());
  }

  /** The big popup. fromPill: the player asked for it (shown even if already seen this visit). */
  private open(fromPill: boolean): void {
    if (!fromPill && this.shownThisVisit) return;
    this.shownThisVisit = true;
    this.render();
    this.popup.classList.add('show');
  }

  private close(): void { this.popup.classList.remove('show'); }

  private render(): void {
    const icon = `${import.meta.env.BASE_URL}icons/app-icon-192.png`;
    let body: string;
    if (this.deferred) {
      body = `<button class="ipop-go" type="button">📲 Save to Home Screen</button>`;
    } else if (isIOS()) {
      body = `
        <ol class="ipop-steps">
          <li><span class="ipop-n">1</span>Tap <b>Share</b> <span class="ipop-ico">⬆︎</span> at the bottom of the screen</li>
          <li><span class="ipop-n">2</span>Tap <b>Add to Home Screen</b> <span class="ipop-ico">＋</span></li>
          <li><span class="ipop-n">3</span>Tap <b>Add</b>, then play from the new icon</li>
        </ol>`;
    } else {
      body = `
        <ol class="ipop-steps">
          <li><span class="ipop-n">1</span>Tap the browser menu <span class="ipop-ico">⋮</span></li>
          <li><span class="ipop-n">2</span>Tap <b>Add to Home screen</b> or <b>Install app</b></li>
          <li><span class="ipop-n">3</span>Play from the new icon</li>
        </ol>`;
    }
    this.popup.innerHTML = `
      <div class="ipop-card">
        <img class="ipop-icon" src="${icon}" alt="" width="96" height="96">
        <h2>Keep Roadster Rush on your Home Screen!</h2>
        <p class="ipop-sub">Play full screen, any time, even without internet.</p>
        ${body}
        <button class="ipop-skip" type="button">Skip</button>
      </div>
      ${isIOS() && !this.deferred ? '<div class="ipop-arrow" aria-hidden="true">⬇︎</div>' : ''}`;
    this.popup.querySelector('.ipop-go')?.addEventListener('click', () => void this.prompt());
    this.popup.querySelector('.ipop-skip')!.addEventListener('click', () => { snooze(SNOOZE_DAYS); this.close(); this.refresh(); });
  }

  private async prompt(): Promise<void> {
    const ev = this.deferred;
    if (!ev) return;
    this.deferred = null;
    this.close();
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    snooze(outcome === 'accepted' ? 3650 : SNOOZE_DAYS); // installed: never ask again
    this.refresh();
  }
}
