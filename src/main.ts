import { GameAudio } from './audio/audio';
import { bindInput } from './input/input';
import { storage } from './storage';
import { addCoins } from './sim/shop';
import { Garage, lookOf } from './ui/garage';
import { Hud } from './ui/hud';
import { SoundPanel } from './ui/sound';
import './ui/hud.css';
import { GameView } from './view/scene';
import {
  POWER_TIME, createWorld, hover, jump, policeClose, queueConstruction, queueHighroad, queueLonghorns, queueOverhead, queuePoliceStop,
  queueSwarm, queueTunnel, score,
  slam, start, steer, step,
} from './sim/world';
import { dayLabel, offsetFor } from './sim/daycycle';
import { HOVER_CHARGES_MAX, LANE_WIDTH } from './sim/config';

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
}, () => { audio.unlock(); if (!paused && hover(world)) audio.hover(); },
() => { audio.unlock(); if (!paused && world.phase === 'running') honk(); });
hud.setMuted(storage.muted);

const garage = new Garage(document.getElementById('ui')!, {
  getShop: () => storage.shop,
  saveShop: (shop) => { storage.set({ shop }); audio.horn = shop.horn; },
  showLook: (look) => view.style.set(look),
  playHorn: (id) => { audio.unlock(); audio.honk(id); },
  setOpen: (open) => { view.showcase = open; },
});
const sound = new SoundPanel(document.getElementById('ui')!, {
  get: () => ({ music: storage.music, sfx: storage.sfx }),
  set: (music, sfx) => { storage.set({ music, sfx }); audio.unlock(); audio.setMix(music, sfx); },
  openHorns: () => garage.open('horn'),
  preview: () => audio.coin(),
});
audio.setMix(storage.music, storage.sfx);
view.style.set(lookOf(storage.shop));
audio.horn = storage.shop.horn;
void document.fonts?.ready.then(() => view.style.refreshPlate());
hud.showReady(storage.best, garage.walletHtml(), garage.buttonsHtml(), world.kidMode);
// A soft tap sound for every menu button (start card, garage, sound panel); the hover button has its own.
document.getElementById('ui')!.addEventListener('click', (e) => {
  const b = (e.target as Element).closest('button');
  if (b && b.id !== 'hoverBtn' && b.id !== 'hornBtn') audio.uiTap();
});

const debug = new URLSearchParams(location.search).has('debug');
let finishedAt = 0;
let paused = false;

// Pause when the app goes to the background, so a kid doesn't come back mid-crash.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && world.phase === 'running' && !paused) {
    paused = true;
    hud.showPaused();
  }
});

function honk(): void {
  audio.honk();
  view.honk();
}

function finish(): void {
  const s = score(world);
  const newBest = s > storage.best;
  if (newBest) storage.set({ best: s });
  storage.set({ shop: addCoins(storage.shop, world.coins) });
  finishedAt = performance.now();
  hud.showFinish(s, world.coins, storage.best, newBest, world.caught, garage.driverHtml(), garage.walletHtml(), garage.buttonsHtml());
  setTimeout(() => audio.finishJingle(newBest), 600);
}

bindInput(view.renderer.domElement, (action, x, y) => {
  audio.unlock();
  if (garage.isOpen || sound.isOpen) return; // keys and stray taps never start a run from these screens
  if (paused) {
    if (action === 'tap' || action === 'jump') { paused = false; hud.hideCard(); }
    return;
  }
  if (world.phase !== 'running') {
    if ((action === 'tap' || action === 'jump') && performance.now() - finishedAt > FINISH_LOCK_MS) {
      start(world);
      audio.runStart();
      hud.hideCard();
    }
    return;
  }
  if (action === 'left') steer(world, -1);
  else if (action === 'right') steer(world, 1);
  else if (action === 'jump') { if (jump(world)) audio.kickflip(); }
  else if (action === 'down') { if (slam(world)) audio.duckWhoosh(); }
  else if (action === 'hover') { if (hover(world)) audio.hover(); }
  else if (action === 'honk') honk();
  else if (action === 'tap' && x !== undefined && y !== undefined && view.hitsCar(x, y)) honk();
}, () => audio.unlock()); // raw pointerdown/up/keydown: real gestures, so iOS lets audio start

let last = performance.now();
let acc = 0;
let frames = 0, fpsTime = 0;
let stampDraws = false; // debug go mode (headless shots): show draw calls every frame
let airborne = false; // for the kickflip touchdown sound

view.renderer.setAnimationLoop((now: number) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  acc = paused ? 0 : acc + dt;
  while (acc >= SIM_DT) {
    for (const ev of step(world, SIM_DT)) {
      switch (ev) {
        case 'coin': audio.coin(); break;
        case 'smash': audio.smash(); break;
        case 'boing': audio.boing(); break;
        case 'hit': audio.bonk(); view.bump(); hud.toast('Oops!', '#ffb8d0'); break;
        case 'power': if (world.lastPower === 'ludicrous') audio.ludicrous(); else audio.powerUp(); if (world.lastPower) hud.powerToast(world.lastPower); break;
        case 'battery': audio.battery(); hud.powerToast('supercharger'); break;
        case 'faster': audio.faster(); hud.toast('Faster!', '#ffd23f'); break;
        case 'charge': audio.coin(); hud.toast(world.hoverCharges >= HOVER_CHARGES_MAX ? 'Hover full!' : 'Hover +1', '#b18cff'); break;
        case 'swarm': audio.powerUp(); hud.toast('Bat swarm!', '#ffd23f'); break;
        case 'jump': audio.kickflip(); break;
        case 'tunnel': audio.tunnel(); hud.toast('Tube tunnel!', '#ff4fd8'); break;
        case 'puncture': audio.puncture(); view.bump(); view.puncture(); hud.toast('Flat tyre!', '#ffb8d0'); break;
        case 'moo': audio.moo(); break;
        case 'police-stop': hud.toast('Police stop!', '#54bdeb'); break;
        case 'roadwork': hud.toast('Road work!', '#ff8a1a'); break;
        case 'longhorns': hud.toast('Longhorns crossing!', '#ffd23f'); break;
        case 'highroad': hud.toast('Ramp up!', '#4cff6a'); break;
        case 'crash': case 'caught': audio.crash(); view.bump(); finish(); break;
      }
    }
    acc -= SIM_DT;
  }

  const running = world.phase === 'running' && !paused;
  const inAir = running && world.y > world.floor + 0.05 && world.power !== 'hover';
  if (airborne && !inAir && running) audio.land();
  airborne = inAir;
  audio.motorUpdate(world.speed, running);
  audio.siren(running && policeClose(world), now / 1000);
  audio.music(running ? (world.power === 'ludicrous' ? 'climax' : 'run') : 'menu');
  hud.update(world, score(world), world.power ? POWER_TIME[world.power] : 1);
  view.render(world, dt, now / 1000);
  if (stampDraws) { const r = view.renderer.info.render; hud.debug(`${r.calls} draws · ${r.triangles} tris`); }

  if (debug) {
    frames++; fpsTime += dt;
    if (fpsTime >= 0.5) {
      const info = view.renderer.info.render;
      hud.debug(`${Math.round(frames / fpsTime)} fps · ${info.calls} draws · ${info.triangles} tris · ${world.speed.toFixed(1)} m/s · ${dayLabel(view.phase)} ${view.phase.toFixed(2)}`);
      frames = 0; fpsTime = 0;
    }
  }
});

// Debug helpers for playtesting: ?debug then window.rr.give('hover') etc.
if (debug) {
  (window as unknown as { rr: unknown }).rr = {
    world,
    honk: (kind?: string) => audio.honk(kind),
    /** Jump the sunset-to-night cycle: 0 sunset, 0.3 dusk, 0.6 night. */
    timeOfDay: (phase: number) => { world.dayOffset = offsetFor(world, phase); },
    /** Lay a Bat Swarm at the next chunk slot (~6 s ahead), any time of day. */
    swarm: () => { world.dayOffset = offsetFor(world, 0.3); queueSwarm(world); },
    /** Lay a tube tunnel at the next chunk slot (~6 s ahead). */
    tunnel: () => queueTunnel(world),
    /** Lay a police stop (parked police car + spike strip) at the next free chunk slot. */
    policeStop: () => queuePoliceStop(world),
    /** Lay a construction zone at the next free chunk slot. */
    construction: () => queueConstruction(world),
    /** Lay a longhorns crossing at the next free chunk slot. */
    longhorns: () => queueLonghorns(world),
    /** Lay a high road (trailers with ramps, sometimes a train) at the next free chunk slot. */
    highroad: () => queueHighroad(world),
    /** Make the next cone chunk one with an overhead beam to duck under. */
    overhead: () => queueOverhead(world),
    give: (k: 'ludicrous' | 'autopilot' | 'hover') => { world.power = k; world.powerTime = POWER_TIME[k]; world.lastPower = k; hud.powerToast(k); },
  };
  // Headless screenshots: ?debug&go=police|construction|longhorns|highroad|overhead[&wait=ms][&tod=0.6][&drive=m][&lane=0-2|&ride=trailer|overhead][&time=s][&duck]
  // starts a run after `wait`
  // with that piece laid in the first chunk slot (40 m ahead).
  const q = new URLSearchParams(location.search);
  const go = q.get('go');
  if (go) setTimeout(() => {
    start(world);
    hud.hideCard();
    document.getElementById('card')?.style.setProperty('transition', 'none');
    if (q.has('tod')) world.dayOffset = offsetFor(world, Number(q.get('tod')));
    if (q.has('time')) world.time = Number(q.get('time')); // &time=s: as far into a run (speed, harder chunks)
    if (go === 'police') queuePoliceStop(world);
    else if (go === 'construction') queueConstruction(world);
    else if (go === 'longhorns') queueLonghorns(world);
    else if (go === 'highroad') queueHighroad(world);
    else if (go === 'overhead') queueOverhead(world);
    // &lane=n: drive in that lane (the sim drives straight, so this picks which piece the car meets);
    // &ride=trailer|overhead: in the lane of the first one laid.
    const ride = q.get('ride');
    if (ride) {
      step(world, SIM_DT); // lays the first chunk
      const first = world.entities.filter((e) => e.alive && e.kind === ride).sort((a, b) => a.s - b.s)[0];
      if (first) q.set('lane', String(first.lane));
    }
    if (q.has('lane')) { world.lane = Number(q.get('lane')); world.x = (world.lane - 1) * LANE_WIDTH; }
    // &drive=m: drive that far straight away (sim only) and freeze there, for a still shot.
    const drive = Number(q.get('drive') ?? 0);
    if (drive > 0) {
      for (let i = 0; i < 100000 && world.distance < drive && world.phase === 'running'; i++) if (step(world, SIM_DT).includes('puncture')) view.puncture();
      if (q.has('duck')) slam(world); // &duck: freeze mid-duck
      paused = true;
    }
    stampDraws = true; // the fps overlay needs real frame time; stamp the draw calls every frame for headless shots
  }, Number(q.get('wait') ?? 2500));
}
