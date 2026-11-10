import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Two Austin robotaxis for the traffic, built in code with vertex colours (one geometry, one draw call each).
// Stylized look-alikes, no logos: a two-seat teardrop "cybercab" and a white SUV with a roof sensor dome.
// Both face -z (the way traffic drives), sit on y = 0, and are sized in metres like the Kenney cars.
// Brand names (Cybercab, Waymo) are fine while the repo is private; rename before publishing (SCOPE.md -> Risks).

type Part = [THREE.BufferGeometry, string];

function paint([g, color]: Part): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}

function build(parts: Part[]): THREE.BufferGeometry {
  const geos = parts.map(paint);
  const out = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  return out;
}

/** A box whose top is narrower than its bottom (a cabin with sloped sides): half-widths wb at the bottom, wt at the top. */
function frustum(wb: number, wt: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const r = Math.SQRT2;
  return new THREE.CylinderGeometry(wt * r, wb * r, h, 4, 1).rotateY(Math.PI / 4).scale(1, 1, d / (2 * wb)).translate(x, y, z);
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

function wheels(xs: number, zs: number[], r: number, tyre: string, hub: string): Part[] {
  const out: Part[] = [];
  for (const sx of [-1, 1]) for (const z of zs) {
    out.push([new THREE.CylinderGeometry(r, r, 0.26, 16).rotateZ(Math.PI / 2).translate(sx * xs, r, z), tyre]);
    out.push([new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.03, 16).rotateZ(Math.PI / 2).translate(sx * (xs + 0.13), r, z), hub]);
  }
  return out;
}

/** Two-seat teardrop robotaxi: champagne-silver body, dark wraparound canopy, light bars front and back. */
export function buildCybercab(): THREE.BufferGeometry {
  const BODY = '#d9cfbf', GLASS = '#1d2230', TYRE = '#1b1b1f', HUB = '#c9ccd2';
  // Canopy: a squashed, stretched half-sphere, its peak ahead of the middle (teardrop tail).
  const canopy = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.82, 0.62, 1.75).translate(0, 0.72, 0.15);
  // Body: a rounded slab (a wide, flat sphere for the curvy sides plus a box for the sills).
  const shell = new THREE.SphereGeometry(1, 24, 12).scale(0.98, 0.38, 2.15).translate(0, 0.72, 0);
  return build([
    [shell, BODY],
    [box(1.7, 0.26, 3.5, 0, 0.42, 0), '#bdb3a3'], // dark lower skirt
    [canopy, GLASS],
    [box(1.15, 0.06, 0.6, 0, 0.8, -1.85), '#f6f3ea'], // front light bar (pokes out of the nose)
    [box(1.2, 0.07, 0.6, 0, 0.82, 1.85), '#ff2a3a'], // rear light bar
    ...wheels(0.86, [-1.35, 1.35], 0.36, TYRE, HUB),
  ]);
}

/** Robotaxi SUV: white body, black glass band, black roof sensor dome with a spinning-lidar cap, side pods. */
export function buildWaymo(): THREE.BufferGeometry {
  const BODY = '#f4f4f1', GLASS = '#181b24', SENSOR = '#22252d', TYRE = '#1b1b1f', HUB = '#8b9099';
  return build([
    [box(1.92, 0.72, 4.5, 0, 0.66, 0), BODY], // lower body
    [box(1.84, 0.12, 4.2, 0, 1.08, 0.05), BODY], // shoulder line
    [frustum(0.9, 0.72, 0.46, 2.6, 0, 1.37, 0.35), GLASS], // glasshouse, sloped sides
    [frustum(0.72, 0.68, 0.08, 2.1, 0, 1.64, 0.35), BODY], // roof
    [new THREE.CylinderGeometry(0.34, 0.42, 0.22, 20).translate(0, 1.79, 0.2), SENSOR], // dome base
    [new THREE.CylinderGeometry(0.24, 0.3, 0.2, 20).translate(0, 2.0, 0.2), SENSOR], // lidar
    [new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20).translate(0, 2.115, 0.2), '#3fb8d6'], // its teal band
    [box(0.12, 0.16, 0.16, -1.02, 1.12, -1.55), SENSOR], // side sensor pods (front fenders)
    [box(0.12, 0.16, 0.16, 1.02, 1.12, -1.55), SENSOR],
    [box(1.6, 0.08, 0.04, 0, 0.82, -2.26), '#f6f3ea'], // headlights
    [box(1.7, 0.1, 0.04, 0, 0.95, 2.26), '#ff2a3a'], // tail lights
    ...wheels(0.9, [-1.45, 1.45], 0.4, TYRE, HUB),
  ]);
}
