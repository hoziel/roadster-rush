import { GameAudio } from './audio/audio';
import { bindInput } from './input/input';
import { storage } from './storage';
import { Hud } from './ui/hud';
import './ui/hud.css';
import { GameView } from './view/scene';
import { POWER_TIME, createWorld, jump, score, start, steer, step } from './sim/world';

const SIM_DT = 1 / 120; // fixed sim step; render runs at display rate
const FINISH_LOCK_MS = 900; // ignore taps right after a finish so a swipe doesn't restart instantly

const world = createWorld();
const view = new GameView(document.getElementById('game')!);
const audio = new GameAudio(storage.muted);
const hud = new Hud(() => {
  storage.set({ muted: !storage.muted });
  audio.unlock();
  audio.setMuted(storage.muted);
  hud.setMuted(storage.muted);
});
hud.setMuted(storage.muted);
hud.showReady(storage.best);

const debug = new URLSearchParams(location.search).has('debug');
let finishedAt = 0;

function honk(): void {
  audio.honk();
  view.honk();
}

function finish(): void {
  const s = score(world);
  const newBest = s > storage.best;
  if (newBest) storage.set({ best: s });
  finishedAt = performance.now();
  hud.showFinish(s, world.coins, storage.best, newBest, world.caught);
  if (newBest) setTimeout(() => audio.fanfare(), 500);
}

bindInput(view.renderer.domElement, (action, x, y) => {
  audio.unlock();
  if (world.phase !== 'running') {
    if ((action === 'tap' || action === 'jump') && performance.now() - finishedAt > FINISH_LOCK_MS) {
      start(world);
      hud.hideCard();
    }
    return;
  }
  if (action === 'left') steer(world, -1);
  else if (action === 'right') steer(world, 1);
  else if (action === 'jump') jump(world);
  else if (action === 'honk') honk();
  else if (action === 'tap' && x !== undefined && y !== undefined && view.hitsCar(x, y)) honk();
}, () => audio.unlock()); // raw pointerdown/up/keydown: real gestures, so iOS lets audio start

let last = performance.now();
let acc = 0;
let frames = 0, fpsTime = 0;

view.renderer.setAnimationLoop((now: number) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  acc += dt;
  while (acc >= SIM_DT) {
    for (const ev of step(world, SIM_DT)) {
      switch (ev) {
        case 'coin': audio.coin(); break;
        case 'smash': audio.smash(); break;
        case 'hit': audio.bonk(); view.bump(); hud.toast('Oops!', '#ffb8d0'); break;
        case 'power': audio.powerUp(); if (world.lastPower) hud.powerToast(world.lastPower); break;
        case 'battery': audio.powerUp(); hud.powerToast('supercharger'); break;
        case 'crash': case 'caught': audio.crash(); view.bump(); finish(); break;
      }
    }
    acc -= SIM_DT;
  }

  const running = world.phase === 'running';
  audio.motorUpdate(world.speed, running);
  audio.siren(running && world.chase > 0, now / 1000);
  hud.update(world, score(world), world.power ? POWER_TIME[world.power] : 1);
  view.render(world, dt, now / 1000);

  if (debug) {
    frames++; fpsTime += dt;
    if (fpsTime >= 0.5) {
      const info = view.renderer.info.render;
      hud.debug(`${Math.round(frames / fpsTime)} fps · ${info.calls} draws · ${info.triangles} tris · ${world.speed.toFixed(1)} m/s`);
      frames = 0; fpsTime = 0;
    }
  }
});

// Debug helpers for playtesting: ?debug then window.rr.give('hover') etc.
if (debug) {
  (window as unknown as { rr: unknown }).rr = {
    world,
    give: (k: 'ludicrous' | 'autopilot' | 'hover') => { world.power = k; world.powerTime = POWER_TIME[k]; world.lastPower = k; hud.powerToast(k); },
  };
}
