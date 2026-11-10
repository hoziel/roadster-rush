import { defaultShop, normalizeShop, type ShopState } from './sim/shop';

// localStorage can throw (private mode, blocked storage): never let that break the game.
const KEY = 'roadster-rush:v1';

interface Saved { best: number; muted: boolean; music: boolean; sfx: boolean; shop: ShopState; musicReset?: boolean }

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const s: Saved = { best: 0, muted: false, music: false, sfx: true, ...raw, shop: normalizeShop(raw.shop) };
    // Nov 10: music is off by default (Ofir found it annoying); turn it off once on existing saves too.
    if (!s.musicReset) { s.music = false; s.musicReset = true; }
    return s;
  } catch {
    return { best: 0, muted: false, music: false, sfx: true, shop: defaultShop() };
  }
}

const state = load();

export const storage = {
  get best(): number { return state.best; },
  get muted(): boolean { return state.muted; },
  get music(): boolean { return state.music; },
  get sfx(): boolean { return state.sfx; },
  /** Wallet, owned and equipped garage items, chosen driver (rules in src/sim/shop.ts). */
  get shop(): ShopState { return state.shop; },
  set(patch: Partial<Saved>): void {
    Object.assign(state, patch);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
};
