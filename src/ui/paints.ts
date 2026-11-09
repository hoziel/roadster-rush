// How each paint looks. Prices live in src/sim/shop.ts. Grey-box colors: retune with the art direction.
import type { PaintId } from '../sim/shop';

export type PaintFinish = 'solid' | 'metallic' | 'neon' | 'stripe' | 'twoTone';

export interface PaintLook {
  name: string; // a word or two, shown on the tile
  finish: PaintFinish;
  color: string;
  accent?: string; // stripe or lower-half color
}

export const PAINTS: Record<PaintId, PaintLook> = {
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
    case 'stripe': return `linear-gradient(90deg, ${p.color} 38%, ${p.accent} 38% 62%, ${p.color} 62%)`;
    case 'twoTone': return `linear-gradient(180deg, ${p.color} 50%, ${p.accent} 50%)`;
    default: return p.color;
  }
}
