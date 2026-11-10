import { HORN_NAMES } from '../audio/horns';
import {
  HAT_ID, HORN_IDS, PAINT_IDS, buy, canBuy, equip, isOwned, priceOf, removeHat, setDriver,
  type HornId, type ItemId, type PaintId, type ShopState,
} from '../sim/shop';
import { DRIVERS, avatarHtml, driverById, type Driver } from './drivers';
import './garage.css';
import { PAINTS, swatchCss, type PaintLook } from './paints';

type Tab = 'driver' | 'paint' | 'horn' | 'hat';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'driver', icon: '👤', label: 'Driver' },
  { id: 'paint', icon: '🎨', label: 'Paint' },
  { id: 'horn', icon: '📯', label: 'Horn' },
  { id: 'hat', icon: '🤠', label: 'Hat' },
];

export interface GarageLook { paint: PaintLook; driver: Driver; hat: boolean }

export interface GarageDeps {
  getShop(): ShopState;
  saveShop(s: ShopState): void;
  /** Dress the 3D car (called with previews too). */
  showLook(look: GarageLook): void;
  playHorn(id: HornId): void;
  /** Garage opened/closed: turntable camera on/off. */
  setOpen(open: boolean): void;
}

/** The current saved look, for dressing the car outside the garage. */
export function lookOf(s: ShopState, preview: ItemId | null = null): GarageLook {
  let paint = s.paint, hat = s.hat;
  if (preview?.startsWith('paint:')) paint = preview.slice(6) as PaintId;
  if (preview === HAT_ID) hat = true;
  return { paint: PAINTS[paint], driver: driverById(s.driver), hat };
}

const coin = (n: number) => `<span class="g-coin">●</span> ${n}`;
// Keep garage taps away from the game canvas (a tap there starts a run).
const swallow = (el: HTMLElement) => {
  for (const t of ['pointerdown', 'pointerup', 'touchstart'] as const) el.addEventListener(t, (e) => e.stopPropagation());
};

/** Garage screen: drivers, paint shop, horns, cowboy hat. Lives over a turntable view of the car. */
export class Garage {
  isOpen = false;
  private el: HTMLElement;
  private tab: Tab = 'driver';
  private preview: ItemId | null = null;

  constructor(private root: HTMLElement, private deps: GarageDeps) {
    this.el = document.createElement('div');
    this.el.className = 'garage';
    root.appendChild(this.el);
    swallow(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
    // Open buttons live on the start/finish cards (see cardHtml), so delegate from the UI root.
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-garage-open]');
      if (btn) this.open((btn.dataset.garageOpen || undefined) as Tab | undefined);
    });
    root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('[data-garage-open]')) e.stopPropagation();
    });
  }

  /** Wallet + big Garage button for the start and finish cards. */
  cardHtml(): string {
    return `<div class="g-cardrow">
      <span class="g-wallet" data-wallet>${coin(this.deps.getShop().wallet)}</span>
      <button class="g-open" data-garage-open>🚗 Garage</button>
    </div>
    <div class="g-cardrow">
      <button class="g-quick" data-garage-open="driver">👤 Driver</button>
      <button class="g-quick" data-sound-open>🔊 Sound</button>
    </div>`;
  }

  /** The chosen driver for the "Great drive!" card. */
  driverHtml(): string {
    const d = driverById(this.deps.getShop().driver);
    return `<div class="g-driver">${avatarHtml(d, 56)}<span>${d.name}</span></div>`;
  }

  /** Open on a given tab (the start card's Driver button opens straight to drivers). */
  open(tab?: Tab): void {
    if (tab) this.tab = tab;
    this.isOpen = true;
    this.preview = null;
    this.root.classList.add('garage-open');
    this.el.classList.add('show');
    this.deps.setOpen(true);
    this.render();
  }

  close(): void {
    this.isOpen = false;
    this.preview = null;
    this.root.classList.remove('garage-open');
    this.el.classList.remove('show');
    this.deps.showLook(lookOf(this.deps.getShop()));
    this.deps.setOpen(false);
    for (const w of this.root.querySelectorAll<HTMLElement>('[data-wallet]')) w.innerHTML = coin(this.deps.getShop().wallet);
  }

  private save(s: ShopState): void {
    this.deps.saveShop(s);
  }

  private onClick(e: MouseEvent): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const s = this.deps.getShop();
    const act = t.dataset.act!, id = t.dataset.id ?? '';
    if (act === 'close') { this.close(); return; }
    if (act === 'tab') { this.tab = id as Tab; this.preview = null; }
    else if (act === 'driver') {
      // Each driver has their own car colour; picking them paints the car.
      const paint = driverById(id).paint;
      this.save(paint ? equip(setDriver(s, id), `paint:${paint}`) : setDriver(s, id));
    }
    else if (act === 'nohat') { this.save(removeHat(s)); this.preview = null; }
    else if (act === 'item') {
      const item = id as ItemId;
      if (item.startsWith('horn:')) this.deps.playHorn(item.slice(5) as HornId);
      if (isOwned(s, item)) { this.save(equip(s, item)); this.preview = null; }
      else this.preview = item;
    } else if (act === 'buy' && this.preview) {
      const after = buy(s, this.preview);
      if (after === s) { this.nudge(t); return; }
      this.save(after);
      this.preview = null;
    }
    this.render();
  }

  private nudge(el: HTMLElement): void {
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
  }

  private render(): void {
    const s = this.deps.getShop();
    this.deps.showLook(lookOf(s, this.preview));
    const scroll = this.el.querySelector('.g-grid')?.scrollTop ?? 0;
    const tabs = TABS.map((t) => `<button class="g-tab ${t.id === this.tab ? 'on' : ''}" data-act="tab" data-id="${t.id}">
      <span class="g-icon">${t.icon}</span>${t.label}</button>`).join('');
    this.el.innerHTML = `
      <div class="g-top">
        <span class="g-wallet">${coin(s.wallet)}</span>
        <button class="g-done" data-act="close">✓ Done</button>
      </div>
      <div class="g-panel">
        <div class="g-tabs">${tabs}</div>
        <div class="g-grid">${this.tiles(s)}</div>
        ${this.buyBar(s)}
      </div>`;
    this.el.querySelector('.g-grid')!.scrollTop = scroll;
  }

  private tiles(s: ShopState): string {
    if (this.tab === 'driver') {
      return DRIVERS.map((d) => tile('driver', d.id, avatarHtml(d, 52), d.name, d.id === driverById(s.driver).id, '')).join('');
    }
    if (this.tab === 'paint') {
      return PAINT_IDS.map((p) => {
        const id: ItemId = `paint:${p}`;
        const look = PAINTS[p];
        const sw = `<span class="g-swatch ${look.finish}" style="background:${swatchCss(look)};--glow:${look.color}"></span>`;
        return tile('item', id, sw, look.name, s.paint === p, this.badge(s, id), this.preview === id);
      }).join('');
    }
    if (this.tab === 'horn') {
      return HORN_IDS.map((h) => {
        const id: ItemId = `horn:${h}`;
        return tile('item', id, '<span class="g-big">📣</span>', HORN_NAMES[h], s.horn === h, this.badge(s, id), this.preview === id);
      }).join('');
    }
    return tile('nohat', '', '<span class="g-big g-nohat">🚫</span>', 'No hat', !s.hat, '')
      + tile('item', HAT_ID, '<span class="g-big">🤠</span>', 'Cowboy', s.hat, this.badge(s, HAT_ID), this.preview === HAT_ID);
  }

  private badge(s: ShopState, id: ItemId): string {
    return isOwned(s, id) ? '' : `<span class="g-price">${coin(priceOf(id))}</span>`;
  }

  private buyBar(s: ShopState): string {
    if (!this.preview) return '<div class="g-buybar"></div>';
    const poor = canBuy(s, this.preview) === 'poor';
    return `<div class="g-buybar"><button class="g-buy ${poor ? 'poor' : ''}" data-act="buy">
      ${poor ? '🔒' : 'Buy'} ${coin(priceOf(this.preview))}</button></div>`;
  }
}

function tile(act: string, id: string, art: string, label: string, equipped: boolean, badge: string, previewing = false): string {
  return `<button class="g-tile ${equipped ? 'on' : ''} ${previewing ? 'peek' : ''}" data-act="${act}" data-id="${id}">
    ${art}<span class="g-label">${label}</span>${badge}${equipped ? '<span class="g-check">✓</span>' : ''}</button>`;
}
