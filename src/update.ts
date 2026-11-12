import { registerSW } from 'virtual:pwa-register';

// New versions: the game works offline from a cached copy, so a new deploy first downloads in the background.
// Without this, the game kept running the old copy until it was closed and opened again (a fix "not live").
// When a new version is ready, switch to it straight away on the start screen, or at the next "drive again"
// if a run is on (never mid-run). A home-screen app can stay open for days, so look for updates every 15 min.

let ready: ((reload?: boolean) => Promise<void>) | null = null;
let pending = false;

/** Start watching for updates. `canReloadNow`: true when nothing would be lost (start screen, no run on). */
export function watchUpdates(canReloadNow: () => boolean): void {
  if (!('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      pending = true;
      ready = update;
      if (canReloadNow()) void update(true);
    },
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => { void reg.update(); }, 15 * 60 * 1000);
    },
  });
}

/** A new version is waiting: switch to it now (reloads the page). Returns false if there's none. */
export function applyUpdate(): boolean {
  if (!pending || !ready) return false;
  void ready(true);
  return true;
}
