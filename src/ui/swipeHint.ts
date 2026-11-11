// Swipe hint: see-through arrows that glide left and right (and up) over the lower screen, showing a young
// driver which way to swipe. Shown for the first seconds of a run, and again after a while without a swipe;
// any swipe hides them. A DOM layer over the game, under the HUD; nothing to click.

const FIRST_FOR = 4; // s shown at the start of each run
const IDLE_AFTER = 9; // s without a swipe before it comes back

export class SwipeHint {
  private el: HTMLElement;
  private runTime = 0;
  private lastSwipe = 0;
  private shown = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'swipe-hint';
    this.el.innerHTML = '<span class="sh-l">‹‹</span><span class="sh-u">︿</span><span class="sh-r">››</span>';
    const style = document.createElement('style');
    style.textContent = `
      .swipe-hint{position:absolute;left:0;right:0;bottom:24%;display:flex;justify-content:space-between;align-items:center;
        padding:0 9%;pointer-events:none;z-index:1;opacity:0;transition:opacity .4s;font:700 64px/1 Fredoka,ui-rounded,system-ui,sans-serif;
        color:rgba(255,255,255,.55);text-shadow:0 2px 10px rgba(40,10,60,.45)}
      .swipe-hint.show{opacity:1}
      .swipe-hint span{display:block}
      .swipe-hint .sh-l{animation:sh-l 1.1s ease-in-out infinite}
      .swipe-hint .sh-r{animation:sh-r 1.1s ease-in-out infinite}
      .swipe-hint .sh-u{font-size:44px;animation:sh-u 1.1s ease-in-out infinite .55s}
      @keyframes sh-l{0%,100%{transform:translateX(0);opacity:.35}50%{transform:translateX(-26px);opacity:1}}
      @keyframes sh-r{0%,100%{transform:translateX(0);opacity:.35}50%{transform:translateX(26px);opacity:1}}
      @keyframes sh-u{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-20px);opacity:.9}}
      @media (prefers-reduced-motion: reduce){.swipe-hint span{animation:none}}`;
    document.head.append(style);
    parent.append(this.el);
  }

  /** A swipe happened: hide the hint until the next idle spell. */
  swiped(): void { this.lastSwipe = this.runTime; }

  /** Every frame. running: a run is on (not paused); time: the run's clock in s. */
  update(running: boolean, time: number): void {
    if (time < this.runTime) this.lastSwipe = 0; // a new run
    this.runTime = time;
    const want = running && (time < FIRST_FOR && this.lastSwipe === 0 || time - this.lastSwipe > IDLE_AFTER);
    if (want !== this.shown) { this.shown = want; this.el.classList.toggle('show', want); }
  }
}
