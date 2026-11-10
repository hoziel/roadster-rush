import { describe, expect, it } from 'vitest';
import {
  HAT_ID, HAT_PRICE, PAINT_PRICES, addCoins, buy, canBuy, defaultShop, equip, isOwned, normalizeShop, removeHat,
} from '../src/sim/shop';

describe('shop', () => {
  it('starts with an empty wallet and the free items equipped', () => {
    const s = defaultShop();
    expect(s.wallet).toBe(0);
    expect(isOwned(s, 'paint:cherry')).toBe(true);
    expect(isOwned(s, 'horn:classic')).toBe(true);
    expect(isOwned(s, 'paint:gold')).toBe(false);
    expect(s.hat).toBe(false);
  });

  it('adds run coins to the wallet', () => {
    expect(addCoins(addCoins(defaultShop(), 12), 5).wallet).toBe(17);
    expect(addCoins(defaultShop(), -4).wallet).toBe(0);
  });

  it('refuses a buy you cannot afford', () => {
    const s = addCoins(defaultShop(), PAINT_PRICES.gold - 1);
    expect(canBuy(s, 'paint:gold')).toBe('poor');
    expect(buy(s, 'paint:gold')).toBe(s);
  });

  it('buys, pays and equips', () => {
    const s = buy(addCoins(defaultShop(), 100), 'paint:gold');
    expect(s.wallet).toBe(100 - PAINT_PRICES.gold);
    expect(s.paint).toBe('gold');
    expect(isOwned(s, 'paint:gold')).toBe(true);
    expect(canBuy(s, 'paint:gold')).toBe('owned');
  });

  it('never charges twice for something owned', () => {
    const a = buy(addCoins(defaultShop(), 100), 'horn:bell');
    const b = buy(equip(a, 'horn:classic'), 'horn:bell');
    expect(b.wallet).toBe(a.wallet);
    expect(b.horn).toBe('bell');
  });

  it('only equips owned items', () => {
    const s = defaultShop();
    expect(equip(s, 'paint:neonPink')).toBe(s);
    expect(equip(s, HAT_ID)).toBe(s);
  });

  it('hat goes on when bought and can come off', () => {
    const s = buy(addCoins(defaultShop(), HAT_PRICE), HAT_ID);
    expect(s.hat).toBe(true);
    expect(s.wallet).toBe(0);
    expect(removeHat(s).hat).toBe(false);
    expect(equip(removeHat(s), HAT_ID).hat).toBe(true);
  });

  it('cleans up bad saves', () => {
    expect(normalizeShop(null)).toEqual(defaultShop());
    const s = normalizeShop({ wallet: -5, owned: ['paint:gold', 'bogus', 'paint:gold'], paint: 'silver', horn: 'nope', hat: true });
    expect(s.wallet).toBe(0);
    expect(s.owned).toEqual(['paint:gold']);
    expect(s.paint).toBe('white'); // silver isn't owned
    expect(s.horn).toBe('classic');
    expect(s.hat).toBe(false); // hat isn't owned
    const ok = normalizeShop({ wallet: 42.7, owned: ['paint:gold', HAT_ID], paint: 'gold', hat: true, driver: 'b' });
    expect(ok).toMatchObject({ wallet: 42, paint: 'gold', hat: true, driver: 'b' });
  });
});
