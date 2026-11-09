import * as THREE from 'three';

// Sunset -> dusk -> night -> back to sunset. Keyframes are placeholders until the
// art direction is chosen: tune colors and intensities here.
interface Key {
  at: number; // cycle phase 0..1
  top: string; middle: string; horizon: string; // sky gradient
  fog: string;
  hemiSky: string; hemiGround: string; hemi: number;
  sun: string; sunI: number;
  silhouette: string; // landmark color against the sky
  stars: number;
}

const KEYS: Key[] = [
  { at: 0, top: '#2a1650', middle: '#b0407a', horizon: '#ff9a3c', fog: '#e9784a', hemiSky: '#ffd9a8', hemiGround: '#4a2a6a', hemi: 1.4, sun: '#ffb070', sunI: 1.8, silhouette: '#7a3060', stars: 0 },
  { at: 0.3, top: '#160e3c', middle: '#5e2672', horizon: '#d8584e', fog: '#8a4068', hemiSky: '#d8a8d0', hemiGround: '#3a2060', hemi: 1.15, sun: '#ff7a6a', sunI: 1.0, silhouette: '#3e1a4c', stars: 0.25 },
  { at: 0.5, top: '#050716', middle: '#121846', horizon: '#3a2c6e', fog: '#221f4c', hemiSky: '#8a98d8', hemiGround: '#221a40', hemi: 0.8, sun: '#9aacff', sunI: 0.55, silhouette: '#0d0b20', stars: 1 },
  { at: 0.82, top: '#050716', middle: '#121846', horizon: '#3a2c6e', fog: '#221f4c', hemiSky: '#8a98d8', hemiGround: '#221a40', hemi: 0.8, sun: '#9aacff', sunI: 0.55, silhouette: '#0d0b20', stars: 1 },
];

// Night lights (string lights, neon) fade on/off over these phase windows.
const LIGHTS_ON_FROM = 0.27, LIGHTS_ON_TO = 0.42;
const LIGHTS_OFF_FROM = 0.86, LIGHTS_OFF_TO = 0.97;

// Keep gameplay pieces readable in the dark: coins glow more, cones get a warm emissive.
const COIN_EMISSIVE_DAY = '#7a5200', COIN_EMISSIVE_NIGHT = '#e0a018';
const CONE_EMISSIVE_DAY = '#000000', CONE_EMISSIVE_NIGHT = '#8a3000';

type Col = THREE.Color;
interface KeyCols { top: Col; middle: Col; horizon: Col; fog: Col; hemiSky: Col; hemiGround: Col; sun: Col; silhouette: Col }
const COLOR_FIELDS = ['top', 'middle', 'horizon', 'fog', 'hemiSky', 'hemiGround', 'sun', 'silhouette'] as const;

export interface DayNightTargets {
  sky: THREE.Mesh;
  fog: THREE.Fog;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  coinMat: THREE.MeshToonMaterial;
  coneMat: THREE.MeshToonMaterial;
}

/** Animates sky, fog, lights and gameplay-piece glow from the cycle phase. No per-frame allocation. */
export class DayNight {
  /** 0 = lights off (day), 1 = full night lights. */
  lights = 0;
  /** Current landmark silhouette color (shared, read by landmarks). */
  readonly silhouette = new THREE.Color();
  private keys: KeyCols[];
  private uniforms: { top: { value: Col }; middle: { value: Col }; horizon: { value: Col }; stars: { value: number } };
  private coinDay = new THREE.Color(COIN_EMISSIVE_DAY);
  private coinNight = new THREE.Color(COIN_EMISSIVE_NIGHT);
  private coneDay = new THREE.Color(CONE_EMISSIVE_DAY);
  private coneNight = new THREE.Color(CONE_EMISSIVE_NIGHT);

  constructor(private t: DayNightTargets) {
    this.keys = KEYS.map((k) => {
      const c = {} as KeyCols;
      for (const f of COLOR_FIELDS) c[f] = new THREE.Color(k[f]);
      return c;
    });
    this.uniforms = (t.sky.material as THREE.ShaderMaterial).uniforms as DayNight['uniforms'];
    this.update(0);
  }

  update(phase: number): void {
    // Find the segment; the last key loops back to the first at phase 1.
    let i = KEYS.length - 1;
    for (let k = 0; k < KEYS.length - 1; k++) if (phase < KEYS[k + 1].at) { i = k; break; }
    const j = (i + 1) % KEYS.length;
    const a = KEYS[i], b = KEYS[j];
    const end = j === 0 ? 1 : b.at;
    const s = smooth((phase - a.at) / (end - a.at));
    const ca = this.keys[i], cb = this.keys[j];

    this.uniforms.top.value.lerpColors(ca.top, cb.top, s);
    this.uniforms.middle.value.lerpColors(ca.middle, cb.middle, s);
    this.uniforms.horizon.value.lerpColors(ca.horizon, cb.horizon, s);
    this.uniforms.stars.value = lerp(a.stars, b.stars, s);
    this.t.fog.color.lerpColors(ca.fog, cb.fog, s);
    this.t.hemi.color.lerpColors(ca.hemiSky, cb.hemiSky, s);
    this.t.hemi.groundColor.lerpColors(ca.hemiGround, cb.hemiGround, s);
    this.t.hemi.intensity = lerp(a.hemi, b.hemi, s);
    this.t.sun.color.lerpColors(ca.sun, cb.sun, s);
    this.t.sun.intensity = lerp(a.sunI, b.sunI, s);
    this.silhouette.lerpColors(ca.silhouette, cb.silhouette, s);

    this.lights = phase < LIGHTS_OFF_FROM
      ? smooth((phase - LIGHTS_ON_FROM) / (LIGHTS_ON_TO - LIGHTS_ON_FROM))
      : 1 - smooth((phase - LIGHTS_OFF_FROM) / (LIGHTS_OFF_TO - LIGHTS_OFF_FROM));
    this.t.coinMat.emissive.lerpColors(this.coinDay, this.coinNight, this.lights);
    this.t.coneMat.emissive.lerpColors(this.coneDay, this.coneNight, this.lights);
  }
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
