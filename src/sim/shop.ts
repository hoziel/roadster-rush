// Garage store rules: wallet, owned items, what's equipped, buy rules.
// Pure data + functions (no three.js, no DOM) so it stays unit-testable.
// All prices live here. Looks (colors, sounds) live in src/ui/paints.ts and src/audio/horns.ts.

export const PAINT_IDS = [
  'white', 'cherry', 'pink', 'black', 'sky', 'sunny', 'silver', 'gold', 'neonPink', 'neonGreen', 'stripe', 'twoTone', 'sunset',
] as const;
export const HORN_IDS = ['classic', 'bell', 'tune', 'clown', 'bike'] as const;
export type PaintId = typeof PAINT_IDS[number];
export type HornId = typeof HORN_IDS[number];

/** Coins per item. 0 = free (always owned). Tune after playtest. */
export const PAINT_PRICES: Record<PaintId, number> = {
  white: 0, cherry: 0, pink: 0, black: 0, sky: 20, sunny: 20, silver: 40, gold: 60,
  neonPink: 80, neonGreen: 80, stripe: 100, twoTone: 100, sunset: 120,
};
export const HORN_PRICES: Record<HornId, number> = { classic: 0, bell: 30, tune: 50, clown: 50, bike: 40 };
export const HAT_PRICE = 100;

/** Item ids in the owned list: "paint:gold", "horn:bell", "hat:cowboy". */
export type ItemId = `paint:${PaintId}` | `horn:${HornId}` | 'hat:cowboy';
export const HAT_ID: ItemId = 'hat:cowboy';

export interface ShopState {
  wallet: number;
  owned: ItemId[];
  paint: PaintId;
  horn: HornId;
  hat: boolean;
  /** Driver id from src/ui/drivers.ts (drivers are free; validated by the UI). */
  driver: string;
}

export function defaultShop(): ShopState {
  return { wallet: 0, owned: [], paint: PAINT_IDS[0], horn: HORN_IDS[0], hat: false, driver: '' };
}

const ALL_ITEMS: ItemId[] = [
  ...PAINT_IDS.map((p) => `paint:${p}` as const),
  ...HORN_IDS.map((h) => `horn:${h}` as const),
  HAT_ID,
];

export function priceOf(id: ItemId): number {
  const [kind, key] = id.split(':') as [string, string];
  if (kind === 'paint') return PAINT_PRICES[key as PaintId];
  if (kind === 'horn') return HORN_PRICES[key as HornId];
  return HAT_PRICE;
}

export function isOwned(s: ShopState, id: ItemId): boolean {
  return priceOf(id) === 0 || s.owned.includes(id);
}

export type BuyCheck = 'owned' | 'ok' | 'poor';
export function canBuy(s: ShopState, id: ItemId): BuyCheck {
  if (isOwned(s, id)) return 'owned';
  return s.wallet >= priceOf(id) ? 'ok' : 'poor';
}

/** Coins from a run go into the wallet. */
export function addCoins(s: ShopState, n: number): ShopState {
  return { ...s, wallet: s.wallet + Math.max(0, Math.floor(n)) };
}

/** Buy and equip. Returns the same state object if the buy isn't allowed. */
export function buy(s: ShopState, id: ItemId): ShopState {
  const check = canBuy(s, id);
  if (check === 'poor') return s;
  if (check === 'owned') return equip(s, id);
  return equip({ ...s, wallet: s.wallet - priceOf(id), owned: [...s.owned, id] }, id);
}

/** Equip an owned item (the hat goes on). Returns the same state if not owned. */
export function equip(s: ShopState, id: ItemId): ShopState {
  if (!isOwned(s, id)) return s;
  const [kind, key] = id.split(':');
  if (kind === 'paint') return { ...s, paint: key as PaintId };
  if (kind === 'horn') return { ...s, horn: key as HornId };
  return { ...s, hat: true };
}

export function removeHat(s: ShopState): ShopState { return { ...s, hat: false }; }

export function setDriver(s: ShopState, driver: string): ShopState { return { ...s, driver }; }

/** Clean up whatever came out of storage (old saves, hand edits, garbage). */
export function normalizeShop(raw: unknown): ShopState {
  const d = defaultShop();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const owned = Array.isArray(r.owned)
    ? [...new Set(r.owned.filter((x): x is ItemId => ALL_ITEMS.includes(x as ItemId)))]
    : [];
  const wallet = typeof r.wallet === 'number' && Number.isFinite(r.wallet) ? Math.max(0, Math.floor(r.wallet)) : 0;
  const s: ShopState = {
    wallet,
    owned,
    paint: PAINT_IDS.includes(r.paint as PaintId) ? r.paint as PaintId : d.paint,
    horn: HORN_IDS.includes(r.horn as HornId) ? r.horn as HornId : d.horn,
    hat: r.hat === true,
    driver: typeof r.driver === 'string' ? r.driver : d.driver,
  };
  // Never leave something equipped that isn't owned.
  if (!isOwned(s, `paint:${s.paint}`)) s.paint = d.paint;
  if (!isOwned(s, `horn:${s.horn}`)) s.horn = d.horn;
  if (!isOwned(s, HAT_ID)) s.hat = false;
  return s;
}
