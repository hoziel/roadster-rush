// Sound panel, opened from the start/finish card: big kid-sized switches for music and effects,
// plus a shortcut to the Garage's horn tab.

export interface SoundDeps {
  get(): { music: boolean; sfx: boolean };
  set(music: boolean, sfx: boolean): void;
  openHorns(): void;
  /** Play a short sample so the effects switch is audible right away. */
  preview(): void;
}

export class SoundPanel {
  isOpen = false;
  private el: HTMLElement;

  constructor(root: HTMLElement, private deps: SoundDeps) {
    this.el = document.createElement('div');
    this.el.className = 'sound-panel';
    root.appendChild(this.el);
    // Keep these taps away from the game (a tap would start a run).
    for (const t of ['pointerdown', 'pointerup'] as const) this.el.addEventListener(t, (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-sound-open]')) this.open(); });
    root.addEventListener('pointerdown', (e) => { if ((e.target as HTMLElement).closest('[data-sound-open]')) e.stopPropagation(); });
  }

  open(): void { this.isOpen = true; this.render(); this.el.classList.add('show'); }
  close(): void { this.isOpen = false; this.el.classList.remove('show'); }

  private render(): void {
    const { music, sfx } = this.deps.get();
    const sw = (id: string, icon: string, label: string, on: boolean) =>
      `<button class="s-switch ${on ? 'on' : ''}" data-s="${id}"><span class="s-icon">${icon}</span><span>${label}</span><b>${on ? 'ON' : 'OFF'}</b></button>`;
    this.el.innerHTML = `<h2>Sound</h2>
      ${sw('music', '🎵', 'Music', music)}
      ${sw('sfx', '💥', 'Sounds', sfx)}
      <button class="s-switch s-horn" data-s="horn"><span class="s-icon">📯</span><span>Horn</span><b>›</b></button>
      <button class="g-open s-done" data-s="done">Done</button>`;
  }

  private onClick(e: MouseEvent): void {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-s]')?.dataset.s;
    if (!id) return;
    const { music, sfx } = this.deps.get();
    if (id === 'music') this.deps.set(!music, sfx);
    else if (id === 'sfx') { this.deps.set(music, !sfx); if (!sfx) this.deps.preview(); }
    else if (id === 'horn') { this.close(); this.deps.openHorns(); return; }
    else if (id === 'done') { this.close(); return; }
    this.render();
  }
}
