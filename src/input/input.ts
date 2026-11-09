export type Action = 'left' | 'right' | 'jump' | 'tap' | 'honk';

const SWIPE_PX = 28; // finger travel that counts as a swipe
const TAP_PX = 14; // a release within this distance is a tap, however long the press (kids press and hold)

/**
 * Swipe + tap on touch/mouse, arrows/WASD/space on keyboard.
 * Tracks one finger at a time so a resting thumb can't cause phantom swipes.
 * `onGesture` fires on raw pointerdown/pointerup/keydown: real user gestures for iOS audio unlock.
 */
export function bindInput(
  el: HTMLElement,
  onAction: (a: Action, x?: number, y?: number) => void,
  onGesture: () => void = () => {},
): void {
  let sx = 0, sy = 0, fired = false;
  let pointer: number | null = null;

  el.addEventListener('pointerdown', (e) => {
    onGesture();
    if (pointer !== null) return; // ignore extra fingers
    pointer = e.pointerId;
    fired = false;
    sx = e.clientX; sy = e.clientY;
  });

  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer || fired) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    fired = true; // one action per gesture, fired mid-swipe for responsiveness
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx < 0 ? 'left' : 'right');
    else if (dy < 0) onAction('jump');
  });

  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    onGesture();
    if (fired) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) < TAP_PX) onAction('tap', e.clientX, e.clientY);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === pointer) pointer = null; });

  window.addEventListener('keydown', (e) => {
    onGesture();
    if (e.repeat) return;
    const map: Record<string, Action> = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyH: 'honk', Enter: 'tap',
    };
    const a = map[e.code];
    if (a) { e.preventDefault(); onAction(a); }
  });
}
