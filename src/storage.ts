import { defaultShop, normalizeShop, type ShopState } from './sim/shop';

// localStorage can throw (private mode, blocked storage): never let that break the game.
const KEY = 'roadster-rush:v1';

interface Saved { best: number; muted: boolean; shop: ShopState }

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { best: 0, muted: false, ...raw, shop: normalizeShop(raw.shop) };
  } catch {
    return { best: 0, muted: false, shop: defaultShop() };
  }
}

const state = load();

export const storage = {
  get best(): number { return state.best; },
  get muted(): boolean { return state.muted; },
  /** Wallet, owned and equipped garage items, chosen driver (rules in src/sim/shop.ts). */
  get shop(): ShopState { return state.shop; },
  set(patch: Partial<Saved>): void {
    Object.assign(state, patch);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  },
};
