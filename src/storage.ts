// localStorage can throw (private mode, blocked storage): never let that break the game.
const KEY = 'roadster-rush:v1';

interface Saved { best: number; muted: boolean }

function load(): Saved {
  try {
    return { best: 0, muted: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { best: 0, muted: false };
  }
}

const state = load();

export const storage = {
  get best(): number { return state.best; },
  get muted(): boolean { return state.muted; },
  set(patch: Partial<Saved>): void {
    Object.assign(state, patch);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
};
