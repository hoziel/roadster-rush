// The driver characters. Nevo is real (Ofir's art); Zoom, Bolt, Sunny and Pip are placeholders.
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
}

export const DRIVERS: Driver[] = [
  { id: 'nevo', name: 'Nevo', color: '#2f7de1', skin: '#f2c7a5', hair: '#4a2e1c', paint: 'white', photo: 'drivers/nevo.jpg' },
  { id: 'd1', name: 'Zoom', color: '#ff4fd8', skin: '#f2c7a5', hair: '#5a3a22' },
  { id: 'd2', name: 'Bolt', color: '#35e0ff', skin: '#c68a5e', hair: '#1d1d26' },
  { id: 'd3', name: 'Sunny', color: '#ffd23f', skin: '#8d5a3b', hair: '#e04a2a' },
  { id: 'd4', name: 'Pip', color: '#4cff6a', skin: '#f6d9c2', hair: '#e8c060' },
];

/** The saved driver, or the first one if the save is missing/unknown. */
export function driverById(id: string): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
}

/** DOM avatar: the driver's picture, or a colored circle with the initial when there's none. `size` in px. */
export function avatarHtml(d: Driver, size = 64): string {
  const img = d.photo ? `<img src="${import.meta.env.BASE_URL}${d.photo}" alt="" onerror="this.remove()">` : '';
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px;background:${d.color}">${d.name[0]}${img}</span>`;
}
