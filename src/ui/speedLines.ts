// Speed lines: white streaks rushing out from the middle of the view toward the screen edges, for Ludicrous
// (strong, with a burst as it kicks in) and, faintly, at top speed. A low-resolution 2D canvas over the game,
// under the HUD; the middle stays clear so the road ahead is never covered.

const STREAKS = 72;
const SCALE = 0.5; // canvas pixels per CSS pixel: soft streaks are fine, and it keeps the fill cost low on phones

interface Streak { a: number; r: number; v: number; len: number; w: number }

export class SpeedLines {
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private streaks: Streak[] = [];
  private level = 0; // eased 0..1.6

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
    parent.append(this.canvas);
    this.g = this.canvas.getContext('2d')!;
    for (let i = 0; i < STREAKS; i++) this.streaks.push(this.spawn(Math.random()));
  }

  /** Every frame. target: 0 none, 1 Ludicrous; above 1 for a burst (it eases toward the target). */
  update(dt: number, target: number): void {
    this.level += (target - this.level) * Math.min(1, dt * (target > this.level ? 10 : 3));
    const c = this.canvas, g = this.g;
    if (this.level < 0.02) {
      if (c.width) { c.width = 0; c.height = 0; } // frees the layer while idle
      return;
    }
    const w = Math.round(c.clientWidth * SCALE), h = Math.round(c.clientHeight * SCALE);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.42, RX = w * 0.75, RY = h * 0.75; // an oval that fits any screen shape
    g.lineCap = 'round';
    for (const s of this.streaks) {
      s.r += s.v * dt * (0.6 + this.level);
      if (s.r > 1.15) Object.assign(s, this.spawn(0));
      const r0 = s.r, r1 = s.r + s.len;
      const alpha = Math.min(1, (s.r - 0.36) * 4) * Math.min(1, this.level) * 0.85;
      if (alpha <= 0) continue;
      g.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      g.lineWidth = s.w * (0.6 + 0.4 * Math.min(this.level, 1.6));
      g.beginPath();
      g.moveTo(cx + Math.cos(s.a) * r0 * RX, cy + Math.sin(s.a) * r0 * RY);
      g.lineTo(cx + Math.cos(s.a) * r1 * RX, cy + Math.sin(s.a) * r1 * RY);
      g.stroke();
    }
  }

  private spawn(t: number): Streak {
    return { a: Math.random() * Math.PI * 2, r: 0.36 + t * 0.7, v: 0.9 + Math.random() * 1.1, len: 0.12 + Math.random() * 0.22, w: 1.6 + Math.random() * 3 };
  }
}
