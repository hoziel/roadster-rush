import { describe, expect, it } from 'vitest';
import {
  HAT_ID, HAT_PRICE, PAINT_PRICES, addCoins, buy, canBuy, defaultShop, equip, isOwned, normalizeShop, removeHat, setDriver, setModel,
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

describe('each driver keeps their own look', () => {
  it('switching drivers saves one look and brings back the other', () => {
    let s = { ...defaultShop(), wallet: 1000 };
    s = setDriver(s, 'nevo', 'white');
    s = buy(s, 'paint:gold'); s = buy(s, 'horn:bell'); s = buy(s, HAT_ID);
    s = setDriver(s, 'ori', 'blossom');
    expect([s.paint, s.horn, s.hat]).toEqual(['blossom', 'classic', false]); // first time: her own paint
    s = equip(s, 'horn:bell');
    s = setDriver(s, 'nevo', 'white');
    expect([s.paint, s.horn, s.hat]).toEqual(['gold', 'bell', true]);
    s = setDriver(s, 'ori', 'blossom');
    expect([s.paint, s.horn, s.hat]).toEqual(['blossom', 'bell', false]);
  });

  it('looks survive a save and load', () => {
    let s = { ...defaultShop(), wallet: 1000 };
    s = setDriver(s, 'nevo', 'white');
    s = buy(s, 'paint:sky');
    s = setDriver(s, 'shiri', 'pink');
    const back = normalizeShop(JSON.parse(JSON.stringify(s)));
    expect(setDriver(back, 'nevo').paint).toBe('sky');
  });

  it('keeps each driver\'s car model', () => {
    let s = setDriver(defaultShop(), 'nevo', 'black');
    expect(s.model).toBe('roadster');
    s = setModel(s, 'cybertruck');
    s = setDriver(s, 'ori', 'blossom');
    expect(s.model).toBe('roadster');
    s = setModel(s, 'cybercab');
    s = setDriver(s, 'nevo');
    expect(s.model).toBe('cybertruck');
    const back = normalizeShop(JSON.parse(JSON.stringify(s)));
    expect(back.model).toBe('cybertruck');
    expect(back.looks.ori.model).toBe('cybercab');
    expect(normalizeShop({ model: 'tank' }).model).toBe('roadster');
  });
});
