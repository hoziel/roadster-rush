// Each driver's favourite things: the start-line crowd's shirts and signs, a prop by the start line,
// and the ad billboards along the road. All art is drawn here on canvases (no logos, no photos).
// Brand / real-person names (Spurs, Wemby) are fine while the repo is private; review at publish (SCOPE.md -> Risks).

import type { Sport } from './hobbyBalls';
import type { PlayerSpec } from './sideline';

export type StartProp = 'hoop' | 'net' | null;

export interface FanTheme {
  shirts: string[]; // crowd shirt colours
  signs: (name: string) => string[]; // exactly 4 sign lines (NAME is upper-cased)
  signBgs: string[]; // 4 sign backgrounds
  signInks: string[]; // 4 sign ink colours
  prop: StartProp; // by the start line
  ads: ((g: CanvasRenderingContext2D, w: number, h: number) => void)[]; // roadside billboards, drawn on 2:1 canvases
  cutouts: ((g: CanvasRenderingContext2D, w: number, h: number) => void)[]; // die-cut figures bursting out of the billboards (3:4, transparent)
  sport: Sport | null; // teammates throw these across the road (jump to catch)
  startPlayers: PlayerSpec[]; // playing by the start-line prop (in its space)
  boardPlayers: PlayerSpec[][]; // under the roadside billboards (in a board's space; boards take turns)
}

const H = Math.PI / 2;
const GI = { shirt: '#ffffff', legs: '#ffffff' }; // karate gi
const SPURS = { shirt: '#111214', legs: '#c4ced4' }; // black jersey, silver shorts
const TEAM_BLUE = { shirt: '#2f6fdc', legs: '#ffffff' };
const LEOTARD = { shirt: '#ff69b4', legs: '#ff69b4' };

const FONT = (px: number) => `700 ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
const SPURS_SILVER = '#c4ced4', SPURS_BLACK = '#111214', FIESTA = ['#00b2a9', '#ef426f', '#ff8200'];
const ORI_BLUE = '#2f6fdc', ORI_LIGHT = '#a8d4ff';

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string, maxW: number, align: CanvasTextAlign = 'center'): void {
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  let size = px;
  g.font = FONT(size);
  while (g.measureText(s).width > maxW && size > 14) { size -= 4; g.font = FONT(size); }
  g.fillText(s, x, y);
}

function basketball(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.fillStyle = '#f08a24'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3a1a08'; g.lineWidth = r * 0.08;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke();
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  g.beginPath(); g.arc(x - r * 1.35, y, r, -0.75, 0.75); g.stroke();
  g.beginPath(); g.arc(x + r * 1.35, y, r, Math.PI - 0.75, Math.PI + 0.75); g.stroke();
}

function volleyball(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.fillStyle = '#fdfcf7'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  const panels = [ORI_BLUE, '#ffd23f'];
  for (let i = 0; i < 3; i++) {
    g.save(); g.translate(x, y); g.rotate((i * Math.PI * 2) / 3);
    g.fillStyle = panels[i % 2];
    g.beginPath(); g.moveTo(0, 0); g.arc(-r * 0.55, -r * 0.9, r * 1.05, 0.95, 1.75); g.closePath(); g.fill();
    g.restore();
  }
  g.strokeStyle = '#1f2d6b'; g.lineWidth = r * 0.08;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
}

/** A chunky cartoon figure: head, body, limbs as thick round strokes. pose: angles (rad) of the limbs. */
function figure(
  g: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, skin: string,
  pose: { armL: number; armR: number; legL: number; legR: number; lean?: number }, belt?: string,
): void {
  g.save(); g.translate(x, y); g.rotate(pose.lean ?? 0);
  g.lineCap = 'round'; g.strokeStyle = body; g.lineWidth = s * 0.22;
  const limb = (ox: number, oy: number, a: number, len: number) => {
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.sin(a) * len, oy + Math.cos(a) * len); g.stroke();
  };
  limb(-s * 0.12, s * 0.05, pose.legL, s * 0.85);
  limb(s * 0.12, s * 0.05, pose.legR, s * 0.85);
  g.fillStyle = body;
  g.beginPath(); g.roundRect(-s * 0.26, -s * 0.75, s * 0.52, s * 0.85, s * 0.18); g.fill();
  if (belt) { g.fillStyle = belt; g.fillRect(-s * 0.27, -s * 0.12, s * 0.54, s * 0.1); }
  limb(-s * 0.2, -s * 0.62, pose.armL, s * 0.7);
  limb(s * 0.2, -s * 0.62, pose.armR, s * 0.7);
  g.fillStyle = skin; g.beginPath(); g.arc(0, -s * 0.98, s * 0.24, 0, Math.PI * 2); g.fill();
  g.restore();
}

function frame(g: CanvasRenderingContext2D, w: number, h: number, bg: string, edge: string): void {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const lw = h * 0.05;
  g.strokeStyle = edge; g.lineWidth = lw; g.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
}

// Nevo: martial arts (white gi), the Spurs, Wemby.
const nevoAds: FanTheme['ads'] = [
  (g, w, h) => { // GO SPURS GO
    frame(g, w, h, SPURS_BLACK, SPURS_SILVER);
    FIESTA.forEach((c, i) => { g.fillStyle = c; g.fillRect(w * 0.06 + i * w * 0.05, h * 0.12, w * 0.035, h * 0.76); });
    text(g, 'GO SPURS GO', w * 0.6, h * 0.38, h * 0.28, SPURS_SILVER, w * 0.62);
    text(g, 'SAN ANTONIO', w * 0.6, h * 0.7, h * 0.14, '#ffffff', w * 0.5);
    basketball(g, w * 0.9, h * 0.72, h * 0.12);
  },
  (g, w, h) => { // WEMBY 1: a very tall player rising for a dunk
    frame(g, w, h, SPURS_SILVER, SPURS_BLACK);
    figure(g, w * 0.22, h * 0.6, h * 0.36, SPURS_BLACK, '#7a4a2c', { armL: Math.PI * 0.95, armR: Math.PI * 1.05, legL: -0.15, legR: 0.45, lean: 0.08 });
    basketball(g, w * 0.26, h * 0.12, h * 0.08);
    text(g, 'WEMBY', w * 0.63, h * 0.38, h * 0.34, SPURS_BLACK, w * 0.55);
    text(g, '#1  ALIEN MODE', w * 0.63, h * 0.72, h * 0.15, FIESTA[0], w * 0.55);
  },
  (g, w, h) => { // karate dojo: a white gi, black belt, high kick
    frame(g, w, h, '#fff6e0', '#c0392b');
    g.fillStyle = '#c0392b'; g.beginPath(); g.arc(w * 0.22, h * 0.5, h * 0.36, 0, Math.PI * 2); g.fill();
    figure(g, w * 0.22, h * 0.62, h * 0.32, '#ffffff', '#f2c7a5', { armL: Math.PI * 0.6, armR: -Math.PI * 0.55, legL: 0.1, legR: -Math.PI * 0.55, lean: -0.15 }, '#111214');
    text(g, 'HI-YA!', w * 0.64, h * 0.36, h * 0.32, '#c0392b', w * 0.55);
    text(g, 'BLACK BELT DOJO', w * 0.64, h * 0.7, h * 0.13, '#3a1440', w * 0.55);
  },
  (g, w, h) => { // basketball court ad
    frame(g, w, h, FIESTA[0], '#ffffff');
    basketball(g, w * 0.2, h * 0.5, h * 0.3);
    text(g, 'DUNK CITY', w * 0.62, h * 0.4, h * 0.3, '#ffffff', w * 0.6);
    text(g, 'SPURS BASKETBALL', w * 0.62, h * 0.72, h * 0.13, SPURS_BLACK, w * 0.55);
  },
];

// Ori: gymnastics and volleyball, her team's blue.
const oriAds: FanTheme['ads'] = [
  (g, w, h) => { // volleyball: spike
    frame(g, w, h, ORI_BLUE, '#ffffff');
    figure(g, w * 0.2, h * 0.62, h * 0.34, '#ffffff', '#f2c7a5', { armL: Math.PI * 0.85, armR: Math.PI * 1.25, legL: -0.25, legR: 0.35, lean: 0.12 });
    volleyball(g, w * 0.33, h * 0.16, h * 0.1);
    text(g, 'SPIKE IT!', w * 0.65, h * 0.38, h * 0.3, '#ffffff', w * 0.55);
    text(g, 'TEAM BLUE VOLLEYBALL', w * 0.65, h * 0.72, h * 0.12, '#ffd23f', w * 0.58);
  },
  (g, w, h) => { // gymnastics: a split leap
    frame(g, w, h, '#ffe3f1', ORI_BLUE);
    figure(g, w * 0.24, h * 0.5, h * 0.3, ORI_BLUE, '#f2c7a5', { armL: Math.PI * 0.75, armR: -Math.PI * 0.75, legL: Math.PI * 0.5, legR: -Math.PI * 0.5 });
    g.strokeStyle = '#ffd23f'; g.lineWidth = h * 0.03; g.beginPath(); g.arc(w * 0.24, h * 0.45, h * 0.42, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    text(g, 'PERFECT 10', w * 0.65, h * 0.38, h * 0.3, ORI_BLUE, w * 0.55);
    text(g, 'GYMNASTICS', w * 0.65, h * 0.72, h * 0.15, '#c0392b', w * 0.55);
  },
  (g, w, h) => { // team blue
    frame(g, w, h, '#ffffff', ORI_BLUE);
    volleyball(g, w * 0.2, h * 0.5, h * 0.3);
    text(g, 'GO TEAM BLUE!', w * 0.62, h * 0.42, h * 0.26, ORI_BLUE, w * 0.6);
    text(g, 'SERVE · SET · SPIKE', w * 0.62, h * 0.74, h * 0.12, '#1f2d6b', w * 0.55);
  },
  (g, w, h) => { // balance beam / cartwheel
    frame(g, w, h, ORI_LIGHT, ORI_BLUE);
    g.fillStyle = '#8a5a2b'; g.fillRect(w * 0.06, h * 0.78, w * 0.34, h * 0.05);
    figure(g, w * 0.23, h * 0.5, h * 0.28, '#ff69b4', '#f2c7a5', { armL: Math.PI, armR: Math.PI, legL: -0.1, legR: 0.1, lean: Math.PI }); // handstand
    text(g, 'FLIP CITY', w * 0.65, h * 0.38, h * 0.3, ORI_BLUE, w * 0.55);
    text(g, 'CARTWHEELS ALL DAY', w * 0.65, h * 0.72, h * 0.12, '#3a1440', w * 0.55);
  },
];

// Die-cut figures that burst out of the top of the billboards: big, bold, with a white sticker edge.
// Drawn on a transparent 3:4 canvas; the figure's head and arms poke out above the board.

/** Draw `art` with a thick white sticker edge round everything it paints. */
function sticker(g: CanvasRenderingContext2D, w: number, h: number, art: (g: CanvasRenderingContext2D) => void): void {
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d')!;
  art(t);
  const edge = document.createElement('canvas');
  edge.width = w; edge.height = h;
  const e = edge.getContext('2d')!;
  const r = w * 0.03;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) e.drawImage(tmp, Math.cos(a) * r, Math.sin(a) * r);
  e.globalCompositeOperation = 'source-in';
  e.fillStyle = '#ffffff'; e.fillRect(0, 0, w, h);
  g.drawImage(edge, 0, 0);
  g.drawImage(tmp, 0, 0);
}

/** A happy face on a figure() head: the head is at (x, y) with radius r (lean already applied). */
function face(g: CanvasRenderingContext2D, x: number, y: number, r: number, hair: string): void {
  g.fillStyle = hair; g.beginPath(); g.arc(x, y - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.fillStyle = '#2a1430';
  g.beginPath(); g.arc(x - r * 0.35, y + r * 0.05, r * 0.12, 0, Math.PI * 2); g.arc(x + r * 0.35, y + r * 0.05, r * 0.12, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1430'; g.lineWidth = r * 0.12; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + r * 0.25, r * 0.38, 0.2, Math.PI - 0.2); g.stroke();
}

/** figure() plus its face: head position worked out from the pose's lean. */
function person(
  g: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, skin: string, hair: string,
  pose: { armL: number; armR: number; legL: number; legR: number; lean?: number }, belt?: string,
): void {
  figure(g, x, y, s, body, skin, pose, belt);
  const a = pose.lean ?? 0;
  face(g, x + Math.sin(a) * s * 0.98, y - Math.cos(a) * s * 0.98, s * 0.24, hair);
}

const nevoCutouts: FanTheme['cutouts'] = [
  (g, w, h) => sticker(g, w, h, (t) => { // the very tall one dunking: long limbs, ball up high
    t.save(); t.translate(w / 2, 0); t.scale(0.9, 1.08); t.translate(-w / 2, 0);
    person(t, w * 0.5, h * 0.6, h * 0.29, SPURS_BLACK, '#7a4a2c', '#1a0e08', { armL: Math.PI * 0.94, armR: Math.PI * 1.06, legL: -0.2, legR: 0.5, lean: 0.05 });
    t.fillStyle = '#ffffff'; t.font = FONT(h * 0.07); t.textAlign = 'center'; t.fillText('1', w * 0.5, h * 0.52);
    t.restore();
    basketball(t, w * 0.52, h * 0.08, h * 0.065);
  }),
  (g, w, h) => sticker(g, w, h, (t) => { // a karate kid's flying kick
    person(t, w * 0.48, h * 0.58, h * 0.27, '#ffffff', '#f2c7a5', '#4a2e1c', { armL: Math.PI * 0.7, armR: -Math.PI * 0.6, legL: 0.2, legR: -Math.PI * 0.6, lean: -0.15 }, '#111214');
    t.fillStyle = '#c0392b'; t.font = FONT(h * 0.1); t.textAlign = 'center'; t.fillText('HI-YA!', w * 0.5, h * 0.12);
  }),
];

const oriCutouts: FanTheme['cutouts'] = [
  (g, w, h) => sticker(g, w, h, (t) => { // a volleyball spike, ball just above her hand
    person(t, w * 0.46, h * 0.6, h * 0.28, ORI_BLUE, '#f2c7a5', '#6b4226', { armL: Math.PI * 0.8, armR: Math.PI * 1.2, legL: -0.3, legR: 0.4, lean: 0.12 });
    volleyball(t, w * 0.66, h * 0.1, h * 0.075);
  }),
  (g, w, h) => sticker(g, w, h, (t) => { // a gymnast's split leap, with a ribbon arc
    t.strokeStyle = '#ff69b4'; t.lineWidth = h * 0.025; t.lineCap = 'round';
    t.beginPath(); t.moveTo(w * 0.1, h * 0.3); t.bezierCurveTo(w * 0.3, h * 0.02, w * 0.7, h * 0.02, w * 0.9, h * 0.25); t.stroke();
    person(t, w * 0.5, h * 0.55, h * 0.25, '#ff69b4', '#f2c7a5', '#6b4226', { armL: Math.PI * 0.75, armR: -Math.PI * 0.75, legL: Math.PI * 0.5, legR: -Math.PI * 0.5 });
  }),
];

export const DEFAULT_THEME: FanTheme = {
  shirts: ['#e8452c', '#2f7de1', '#ffd23f', '#3fbf7f', '#ff69b4', '#8a5bd6', '#f4e9d8', '#ff8a3d'],
  signs: (n) => [`GO ${n}!`, `${n} ROCKS!`, `WE ♥ ${n}`, `GO GO ${n}!`],
  signBgs: ['#fff6e0', '#ffd23f', '#ffb3d1', '#a8dcff'],
  signInks: ['#3a1440', '#c0392b', '#1f2d6b', '#3a1440'],
  prop: null,
  ads: [],
  cutouts: [],
  sport: null,
  startPlayers: [],
  boardPlayers: [],
};

const THEMES: Record<string, FanTheme> = {
  nevo: {
    // White karate gis and Spurs black/silver jerseys.
    shirts: ['#ffffff', SPURS_BLACK, '#ffffff', SPURS_SILVER, '#ffffff', SPURS_BLACK, FIESTA[0], '#ffffff'],
    signs: (n) => [`HI-YA ${n}!`, 'GO SPURS GO!', `${n} + WEMBY`, `BLACK BELT ${n}`],
    signBgs: ['#ffffff', SPURS_BLACK, SPURS_SILVER, '#fff6e0'],
    signInks: ['#c0392b', SPURS_SILVER, SPURS_BLACK, '#111214'],
    prop: 'hoop',
    ads: nevoAds,
    cutouts: nevoCutouts,
    sport: 'basketball',
    startPlayers: [ // round the hoop (its space is scaled 1.3; the rim is at 0, 3.25, 0.6)
      { activity: 'shoot', x: 0, z: 3.4, yaw: 0, ...SPURS, target: [0, 3.25, 0.6] },
      { activity: 'dribble', x: 1.5, z: 2.3, yaw: 0.5, ...SPURS, phase: 0.7 },
      { activity: 'karate', x: -2.1, z: 2.2, yaw: H, ...GI },
      { activity: 'karate', x: -3.3, z: 2.2, yaw: -H, ...GI, phase: 0.8 },
    ],
    boardPlayers: [
      [{ activity: 'karate', x: -0.8, z: 2.6, yaw: H, ...GI }, { activity: 'karate', x: 0.8, z: 2.6, yaw: -H, ...GI, phase: 0.8 }],
      [{ activity: 'dribble', x: -1.4, z: 2.6, yaw: 0.4, ...SPURS }, { activity: 'dribble', x: 1.4, z: 2.8, yaw: -0.4, ...SPURS, phase: 0.3 }],
    ],
  },
  ori: {
    // Her team's blue, with a few white and yellow volleyball shirts.
    shirts: [ORI_BLUE, ORI_BLUE, '#ffffff', ORI_LIGHT, ORI_BLUE, '#ffd23f', ORI_BLUE, '#ffffff'],
    signs: (n) => [`SPIKE IT ${n}!`, `PERFECT 10 ${n}`, 'GO TEAM BLUE!', `FLIP ${n} FLIP!`],
    signBgs: [ORI_BLUE, '#ffffff', ORI_LIGHT, '#ffd23f'],
    signInks: ['#ffffff', ORI_BLUE, '#1f2d6b', ORI_BLUE],
    prop: 'net',
    ads: oriAds,
    cutouts: oriCutouts,
    sport: 'volleyball',
    startPlayers: [ // either side of the net (its space is scaled 1.25), and a gymnast beside it
      { activity: 'bump', x: 0.8, z: 2.0, yaw: 0, ...TEAM_BLUE, target: [-0.8, 0, -2.0] },
      { activity: 'bump', x: -0.8, z: -2.0, yaw: Math.PI, ...TEAM_BLUE, target: [0.8, 0, 2.0] },
      { activity: 'cartwheel', x: 4.4, z: 2.2, yaw: Math.PI, ...LEOTARD },
    ],
    boardPlayers: [
      [{ activity: 'bump', x: -1.7, z: 2.6, yaw: -H, ...TEAM_BLUE, target: [1.7, 0, 2.6] }, { activity: 'bump', x: 1.7, z: 2.6, yaw: H, ...TEAM_BLUE, target: [-1.7, 0, 2.6] }],
      [{ activity: 'cartwheel', x: 0, z: 2.8, yaw: Math.PI, ...LEOTARD }],
    ],
  },
};

export const themeFor = (driverId: string): FanTheme => THEMES[driverId] ?? DEFAULT_THEME;
