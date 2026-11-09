export type Action = 'left' | 'right' | 'jump' | 'tap' | 'honk';

const SWIPE_PX = 28; // finger travel that counts as a swipe
const TAP_PX = 12;
const TAP_MS = 300;

/** Swipe + tap on touch/mouse, arrows/WASD/space on keyboard. */
export function bindInput(el: HTMLElement, onAction: (a: Action, x?: number, y?: number) => void): void {
  let sx = 0, sy = 0, st = 0, fired = false, active = false;

  el.addEventListener('pointerdown', (e) => {
    active = true; fired = false;
    sx = e.clientX; sy = e.clientY; st = performance.now();
  });

  el.addEventListener('pointermove', (e) => {
    if (!active || fired) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    fired = true; // one action per gesture, fired mid-swipe for responsiveness
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx < 0 ? 'left' : 'right');
    else if (dy < 0) onAction('jump');
  });

  const end = (e: PointerEvent) => {
    if (!active) return;
    active = false;
    if (fired) return;
    const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
    if (moved < TAP_PX && performance.now() - st < TAP_MS) onAction('tap', e.clientX, e.clientY);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { active = false; });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const map: Record<string, Action> = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyH: 'honk', Enter: 'tap',
    };
    const a = map[e.code];
    if (a) { e.preventDefault(); onAction(a); }
  });
}
