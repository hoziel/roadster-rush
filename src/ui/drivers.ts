// The driver characters: only the characters Ofir supplied (Nevo, Ori, Shiri, Ofir). Add more here.
// To swap them in, edit only this list. Everything else (garage tiles, 3D head in the car,
// license plate, "Great drive!" avatar) reads from here.
// Keep names short (they go on the license plate, ~8 letters max).
// Driver pictures live in public/drivers/ and are committed: Ofir decided (Nov 10) they go public with the repo.
// Without a picture the avatar falls back to the coloured initial.
import type { PaintId } from '../sim/shop';

export interface Driver {
  id: string; // stable: it's what the save file remembers
  name: string;
  color: string; // avatar circle and card accent
  skin: string; // 3D head
  hair: string; // 3D hair/cap blob
  paint?: PaintId; // their car colour: picking the driver paints the car (free)
  photo?: string; // avatar picture, relative to the site root
  full?: string; // full-body picture (driver select hero, run intro), relative to the site root
}

/** URL for a driver's full-body picture, or '' when there is none. */
export function fullUrl(d: Driver): string { return d.full ? `${import.meta.env.BASE_URL}${d.full}` : ''; }

export const DRIVERS: Driver[] = [
  { id: 'nevo', name: 'Nevo', color: '#2f7de1', skin: '#f2c7a5', hair: '#4a2e1c', paint: 'white', photo: 'drivers/nevo.jpg', full: 'drivers/nevo-full.jpg' },
  { id: 'ori', name: 'Ori', color: '#e8452c', skin: '#f2c7a5', hair: '#6b4226', paint: 'cherry', photo: 'drivers/ori.jpg', full: 'drivers/ori-full.jpg' },
  { id: 'shiri', name: 'Shiri', color: '#c99a3b', skin: '#f2c7a5', hair: '#c9a063', paint: 'pink', photo: 'drivers/shiri.jpg', full: 'drivers/shiri-full.jpg' },
  { id: 'ofir', name: 'Ofir', color: '#8a96a8', skin: '#f2c7a5', hair: '#6b4226', paint: 'black', photo: 'drivers/ofir.jpg', full: 'drivers/ofir-full.jpg' },
];

/** The saved driver, or the first one if the save is missing/unknown. */
export function driverById(id: string): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
}

/** DOM avatar: the driver's picture, or a colored circle with the initial when there's none. `size` in px. */
export function avatarHtml(d: Driver, size = 64): string {
  // With a picture, no initial underneath: it would flash while the picture decodes. A broken picture brings it back.
  const img = d.photo ? `<img src="${import.meta.env.BASE_URL}${d.photo}" alt="" onerror="this.parentNode.textContent='${d.name[0]}'">` : '';
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px;background:${d.color}">${img || d.name[0]}</span>`;
}
