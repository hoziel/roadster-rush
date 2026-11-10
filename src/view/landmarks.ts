import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadModel, modelGeometry } from './models';

// Austin landmark silhouettes: the Capitol (model) at the road's end, code-built side landmarks
// on their own side track (not per chunk). Unlit, fog off, colored from the sky (daynight.ts) so they
// read as silhouettes.
const CAPITOL_Z = -285; // fixed far vista at the end of the road
const CAPITOL_Y = -2; // sink the base a little into the horizon
const CAPITOL_HEIGHT = 52; // m, ground to the top of the statue
// Texas State Capitol by 85 edgecroft, CC-BY 4.0 (shape only; see scripts/optimize-assets.mjs).
const CAPITOL_FILE = 'capitol.glb';

const SIDE_START_Z = -330; // where a side landmark appears (beyond the fog, against the sky)
const SIDE_END_Z = 40; // where it is retired (behind the camera)
const SIDE_GAP = 420; // m of driving between side landmarks
const SIDE_FIRST = 120; // m into a run before the first one
const SIDE_X = 62; // m from the road centre (alternates sides)
const BRIDGE_X = 92; // the bridge is wide: further out so it never crosses the road

type Builder = () => THREE.BufferGeometry;

export class Landmarks {
  readonly group = new THREE.Group();
  private mat = new THREE.MeshBasicMaterial({ color: '#7a3060', fog: false });
  private side: THREE.Mesh[];
  private active = -1;
  private activeFrom = 0; // distance when it appeared
  private nextIndex = 0;
  private nextAt = SIDE_FIRST;
  private lastDistance = 0;

  constructor(silhouette: THREE.Color) {
    this.mat.color = silhouette; // share the live color from DayNight
    void this.loadCapitol();

    const builders: [Builder, number][] = [[buildFrostTower, SIDE_X], [buildBridge360, BRIDGE_X], [buildAustonian, SIDE_X]];
    this.side = builders.map(([b, x]) => {
      const m = new THREE.Mesh(b(), this.mat);
      m.userData.x = x;
      m.visible = false;
      m.frustumCulled = false;
      this.group.add(m);
      return m;
    });
  }

  private async loadCapitol(): Promise<void> {
    try {
      const { geometry, material } = modelGeometry(await loadModel(CAPITOL_FILE));
      material.dispose();
      geometry.deleteAttribute('normal');
      geometry.computeBoundingBox();
      const b = geometry.boundingBox!;
      // Centre the front on the road, base at y = 0, facing the camera (+z).
      geometry.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      const capitol = new THREE.Mesh(geometry, this.mat);
      capitol.position.set(0, CAPITOL_Y, CAPITOL_Z);
      capitol.scale.setScalar(CAPITOL_HEIGHT / (b.max.y - b.min.y));
      this.group.add(capitol);
    } catch (err) {
      console.warn(`landmarks: failed to load ${CAPITOL_FILE}`, err);
    }
  }

  update(distance: number): void {
    if (distance < this.lastDistance) this.reset(); // new run
    this.lastDistance = distance;

    if (this.active < 0 && distance >= this.nextAt) {
      this.active = this.nextIndex;
      this.activeFrom = distance;
      const m = this.side[this.active];
      m.position.x = (this.nextIndex % 2 === 0 ? -1 : 1) * (m.userData.x as number);
      m.visible = true;
      this.nextIndex = (this.nextIndex + 1) % this.side.length;
    }
    if (this.active >= 0) {
      const m = this.side[this.active];
      m.position.z = SIDE_START_Z + (distance - this.activeFrom);
      if (m.position.z > SIDE_END_Z) {
        m.visible = false;
        this.active = -1;
        this.nextAt = distance + SIDE_GAP - (SIDE_END_Z - SIDE_START_Z);
      }
    }
  }

  private reset(): void {
    for (const m of this.side) m.visible = false;
    this.active = -1;
    this.nextAt = SIDE_FIRST;
  }
}

// --- builders (all metres, base at y = 0) ---

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const cyl = (rt: number, rb: number, h: number, y: number, seg = 16, x = 0) =>
  new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, 0);
const merge = (parts: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  for (const p of parts) p.dispose();
  return g;
};

/** Frost Bank tower: tall, stepped crown with two "owl ear" points and a spire. */
function buildFrostTower(): THREE.BufferGeometry {
  return merge([
    box(17, 6, 17), box(15, 52, 15, 0, 6),
    box(13, 5, 13, 0, 58), box(10.5, 5, 10.5, 0, 63), box(8, 4, 8, 0, 68),
    new THREE.ConeGeometry(5.6, 9, 4).rotateY(Math.PI / 4).translate(0, 76.5, 0),
    new THREE.ConeGeometry(1.3, 9, 4).translate(-4.2, 74, 0), // owl ears
    new THREE.ConeGeometry(1.3, 9, 4).translate(4.2, 74, 0),
    cyl(0.25, 0.4, 9, 80, 6), // spire
  ]);
}

/** The Austonian: very tall and slim, a stepped crown and a mast. */
function buildAustonian(): THREE.BufferGeometry {
  return merge([
    box(11, 84, 15),
    box(11, 6, 10, 0, 84, -2.5),
    new THREE.CylinderGeometry(5.5, 5.5, 11, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 90, -2.5),
    cyl(0.25, 0.35, 10, 92, 6, 3),
  ]);
}

/** Pennybacker (360) Bridge: a steel arch under a deck, spanning a side gap. */
function buildBridge360(): THREE.BufferGeometry {
  const R = 34, CY = -12, DECK_Y = 21;
  const parts: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(R, 1.1, 6, 36, Math.PI).translate(0, CY, 0),
    new THREE.TorusGeometry(R - 3, 0.6, 6, 36, Math.PI).translate(0, CY, 0),
    box(104, 1.8, 4, 0, DECK_Y),
    box(104, 0.7, 4.2, 0, DECK_Y + 2.4), // railing line
  ];
  for (const dx of [-26, -18, -10, 10, 18, 26]) {
    const y0 = CY + Math.sqrt(R * R - dx * dx);
    parts.push(box(0.8, DECK_Y - y0, 0.8, dx, y0));
  }
  for (const dx of [-46, -38, 38, 46]) parts.push(box(2, DECK_Y, 2.5, dx, 0)); // approach piers
  return merge(parts);
}
