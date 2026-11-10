// Splashes on the screen: drive through a puddle and drops of water (or blobs of mud) hit the glass, then
// drip down and fade. A DOM layer over the game canvas, under the HUD; nothing to click.

export type SplashKind = 'water' | 'mud';

const DROPS = 12;
const LOOK: Record<SplashKind, { fill: string; edge: string; shine: string; life: number }> = {
  water: { fill: 'rgba(205, 232, 255, 0.42)', edge: 'rgba(255, 255, 255, 0.75)', shine: 'rgba(255, 255, 255, 0.9)', life: 1700 },
  mud: { fill: 'rgba(104, 66, 32, 0.93)', edge: 'rgba(60, 36, 16, 0.95)', shine: 'rgba(190, 140, 90, 0.7)', life: 2600 },
};

export class Splash {
  private layer: HTMLElement;

  constructor(parent: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1';
    parent.append(this.layer);
  }

  hit(kind: SplashKind): void {
    const look = LOOK[kind];
    const w = this.layer.clientWidth, h = this.layer.clientHeight;
    for (let i = 0; i < DROPS; i++) {
      // Mostly across the lower two thirds, a few big ones, many small.
      const size = (i < 3 ? 0.22 : 0.07 + Math.random() * 0.1) * Math.min(w, h);
      const x = Math.random() * w - size / 2, y = h * (0.25 + Math.random() * 0.65) - size / 2;
      const drop = document.createElement('div');
      drop.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size * (0.8 + Math.random() * 0.4)}px;
        border-radius:${45 + Math.random() * 10}% ${55 - Math.random() * 10}% ${50 + Math.random() * 10}% ${48 + Math.random() * 8}%;
        background:radial-gradient(circle at 32% 30%, ${look.shine} 0 12%, transparent 22%), ${look.fill};
        box-shadow:inset 0 0 0 ${Math.max(1.5, size * 0.04)}px ${look.edge};`;
      // A drip running down from the drop.
      const drip = document.createElement('div');
      const dw = size * 0.22;
      drip.style.cssText = `position:absolute;left:${size * (0.3 + Math.random() * 0.4) - dw / 2}px;top:${size * 0.7}px;width:${dw}px;height:${size * 0.8}px;
        border-radius:${dw}px;background:${look.fill};transform-origin:top;transform:scaleY(0)`;
      drop.append(drip);
      this.layer.append(drop);
      const delay = Math.random() * 120;
      drop.animate([{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.08 }, { transform: 'scale(1)', opacity: 1, offset: 0.15 },
        { transform: `translateY(${size * 0.6}px)`, opacity: 1, offset: 0.7 }, { transform: `translateY(${size * 1.2}px)`, opacity: 0 }],
        { duration: look.life, delay, easing: 'ease-in', fill: 'both' });
      drip.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.6 }, { transform: 'scaleY(1.4)' }],
        { duration: look.life, delay: delay + 200, easing: 'ease-in', fill: 'both' });
      setTimeout(() => drop.remove(), look.life + delay + 300);
    }
  }
}
