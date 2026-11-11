// How each paint looks. Prices live in src/sim/shop.ts. Grey-box colors: retune with the art direction.
import type { PaintId } from '../sim/shop';

export type PaintFinish = 'solid' | 'metallic' | 'neon' | 'stripe' | 'twoTone' | 'blossom';

export interface PaintLook {
  name: string; // a word or two, shown on the tile
  finish: PaintFinish;
  color: string;
  accent?: string; // stripe or lower-half color
}

export const PAINTS: Record<PaintId, PaintLook> = {
  white: { name: 'White', finish: 'solid', color: '#f3f1ec' },
  pink: { name: 'Pink', finish: 'solid', color: '#ff69b4' },
  blossom: { name: 'Blossom', finish: 'blossom', color: '#ffffff' }, // Ori's: pearl white with cherry blossoms
  black: { name: 'Black', finish: 'metallic', color: '#26272e' },
  cherry: { name: 'Cherry', finish: 'solid', color: '#e8344e' },
  sky: { name: 'Sky', finish: 'solid', color: '#3f8cff' },
  sunny: { name: 'Sunny', finish: 'solid', color: '#ffc21f' },
  silver: { name: 'Silver', finish: 'metallic', color: '#c9d1e0' },
  gold: { name: 'Gold', finish: 'metallic', color: '#e0b030' },
  neonPink: { name: 'Neon', finish: 'neon', color: '#ff3fd0' },
  neonGreen: { name: 'Neon', finish: 'neon', color: '#3dff6a' },
  stripe: { name: 'Stripe', finish: 'stripe', color: '#ff7a1a', accent: '#ffffff' },
  twoTone: { name: 'Two-tone', finish: 'twoTone', color: '#36d6c3', accent: '#6b3fd6' },
  sunset: { name: 'Sunset', finish: 'twoTone', color: '#ff9a3c', accent: '#b0306a' },
};

/** CSS background for a garage tile swatch. */
export function swatchCss(p: PaintLook): string {
  switch (p.finish) {
    case 'metallic': return `linear-gradient(135deg, #fff 0%, ${p.color} 35%, ${p.color} 65%, #555 130%)`;
    case 'neon': return p.color;
    case 'blossom': return 'radial-gradient(circle at 38% 58%, #c2284a 0 7%, #ee7d97 8% 20%, transparent 21%), radial-gradient(circle at 70% 36%, #c2284a 0 5%, #ee7d97 6% 15%, transparent 16%), linear-gradient(90deg, #f4b3b8, #faf1ee 60%)';
    case 'stripe': return `linear-gradient(90deg, ${p.color} 38%, ${p.accent} 38% 62%, ${p.color} 62%)`;
    case 'twoTone': return `linear-gradient(180deg, ${p.color} 50%, ${p.accent} 50%)`;
    default: return p.color;
  }
}
