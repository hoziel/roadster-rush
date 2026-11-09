// The driver characters. PLACEHOLDERS: Ofir will supply the real ones.
// To swap them in, edit only this list. Everything else (garage tiles, 3D head in the car,
// license plate, "Great drive!" avatar) reads from here.
// Keep names short (they go on the license plate, ~8 letters max).
// If a real driver is based on a photo of a kid, keep the photo out of the repo (SCOPE.md -> Open questions).

export interface Driver {
  id: string; // stable: it's what the save file remembers
  name: string;
  color: string; // avatar circle and card accent
  skin: string; // 3D head
  hair: string; // 3D hair/cap blob
}

export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'Zoom', color: '#ff4fd8', skin: '#f2c7a5', hair: '#5a3a22' },
  { id: 'd2', name: 'Bolt', color: '#35e0ff', skin: '#c68a5e', hair: '#1d1d26' },
  { id: 'd3', name: 'Sunny', color: '#ffd23f', skin: '#8d5a3b', hair: '#e04a2a' },
  { id: 'd4', name: 'Pip', color: '#4cff6a', skin: '#f6d9c2', hair: '#e8c060' },
];

/** The saved driver, or the first one if the save is missing/unknown. */
export function driverById(id: string): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
}

/** Simple DOM avatar: a colored circle with the initial. `size` in px. */
export function avatarHtml(d: Driver, size = 64): string {
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px;background:${d.color}">${d.name[0]}</span>`;
}
