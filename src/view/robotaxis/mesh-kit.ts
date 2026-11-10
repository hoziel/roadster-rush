import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Point = [number, number, number];
/** z, half-width, shoulder height. */
export type BodyRow = [number, number, number];
/** z, sill half-width, roof half-width, roof height, sill height. */
export type RoofRow = [number, number, number, number, number];
export interface TrafficModel {
  group: THREE.Group;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshLambertMaterial;
  /** Owns geometry/material; call after all instances that share them have been removed. */
  dispose(): void;
}

/** Geometry-only assembly. All colour is baked per vertex; one final opaque draw call. */
export class MeshKit {
  private pieces: THREE.BufferGeometry[] = [];

  add(source: THREE.BufferGeometry, hex: string) {
    const g = source.index ? source.toNonIndexed() : source;
    if (g !== source) source.dispose();
    g.deleteAttribute('uv');
    if (!g.hasAttribute('normal')) g.computeVertexNormals();
    const c = new THREE.Color(hex), count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.pieces.push(g);
  }

  panel(points: Point[], color: string, outward: Point = [0, 1, 0]) {
    const p = points.map(v => new THREE.Vector3(...v));
    // Sum the polygon normal: the first three vertices can lie on a straight crown edge.
    const n = new THREE.Vector3();
    for (let i = 0; i < p.length; i++) n.add(p[i].clone().cross(p[(i + 1) % p.length]));
    if (n.dot(new THREE.Vector3(...outward)) < 0) p.reverse();
    const verts: number[] = [];
    for (let i = 1; i < p.length - 1; i++) verts.push(...p[0].toArray(), ...p[i].toArray(), ...p[i + 1].toArray());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals(); this.add(g, color);
  }

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, rx = 0) {
    this.add(new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(x, y, z), color);
  }

  cylinder(rt: number, rb: number, h: number, x: number, y: number, z: number, color: string, segments = 12, axis: 'x' | 'y' | 'z' = 'y') {
    const g = new THREE.CylinderGeometry(rt, rb, h, segments);
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    this.add(g.translate(x, y, z), color);
  }

  beam(a: Point, b: Point, radius: number, color: string) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), axis = end.clone().sub(start);
    const g = new THREE.CylinderGeometry(radius, radius, axis.length(), 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize()));
    this.add(g.translate(...start.add(end).multiplyScalar(.5).toArray()), color);
  }

  width(rows: BodyRow[], z: number) {
    for (let i = 1; i < rows.length; i++) if (z <= rows[i][0]) {
      const a = rows[i - 1], b = rows[i];
      return THREE.MathUtils.lerp(a[1], b[1], THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1));
    }
    return rows[rows.length - 1][1];
  }

  /** Crown, bumper faces and real open wheel arches; no slabs passing through tires. */
  body(rows: BodyRow[], axles: number[], radius: number, color: string, skirt: string) {
    const first = rows[0], last = rows[rows.length - 1], bottom = .22;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const fractions = [-1, -.8, 0, .8, 1];
      const at = (r: BodyRow, u: number): Point => [u * r[1], r[2] + (1 - Math.abs(u)) * .045, r[0]];
      for (let j = 1; j < fractions.length; j++) this.panel([at(a, fractions[j - 1]), at(b, fractions[j - 1]), at(b, fractions[j]), at(a, fractions[j])], color);
    }
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(first[0], first[2]);
      rows.slice(1).forEach(r => shape.lineTo(r[0], r[2]));
      shape.lineTo(last[0], bottom);
      for (const axle of [...axles].sort((a, b) => b - a)) {
        const arch = radius + .045;
        shape.lineTo(axle + arch, bottom); shape.lineTo(axle + arch, radius);
        for (let j = 0; j <= 12; j++) {
          const a = j * Math.PI / 12;
          shape.lineTo(axle + arch * Math.cos(a), radius + arch * Math.sin(a));
        }
        shape.lineTo(axle - arch, bottom);
      }
      shape.lineTo(first[0], bottom); shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: .06, bevelEnabled: false, steps: 1 }).rotateY(-Math.PI / 2);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + side * this.width(rows, p.getZ(i)) + (side < 0 ? .06 : 0));
      g.computeVertexNormals(); this.add(g, color);
      const mid = (axles[0] + axles[1]) / 2;
      this.box(.075, .085, axles[1] - axles[0] - 2 * radius - .08, side * (this.width(rows, mid) - .04), .235, mid, skirt);
    }
    for (const [r, sign] of [[first, -1], [last, 1]] as [BodyRow, number][]) {
      // Follow the crown exactly at each end; a flat top edge leaves a visible slit.
      this.panel([[-r[1], r[2], r[0]], [0, r[2]+.045, r[0]], [r[1], r[2], r[0]], [r[1] * .9, bottom, r[0]], [-r[1] * .9, bottom, r[0]]], color, [0, 0, sign]);
      this.box(r[1] * 1.84, .09, .07, 0, .24, r[0] - sign * .01, skirt);
    }
    this.box(1.35, .055, last[0] - first[0] - .3, 0, .25, (last[0] + first[0]) / 2, skirt);
  }

  canopy(rows: RoofRow[], glass: string, paint: string, roof: string, goldTail = false) {
    const ring = ([z, w, rw, h, base]: RoofRow): Point[] => [[-w, base, z], [-rw, h - .025, z], [-rw * .55, h, z], [0, h + .015, z], [rw * .55, h, z], [rw, h - .025, z], [w, base, z]];
    for (let i = 1; i < rows.length; i++) {
      const a = ring(rows[i - 1]), b = ring(rows[i]);
      for (let j = 1; j < a.length; j++) {
        const side = j === 1 || j === 6;
        const color = goldTail && i >= rows.length - 1 ? paint : side || i === 1 ? glass : roof;
        this.panel([a[j - 1], b[j - 1], b[j], a[j]], color, j === 1 ? [-1, .2, 0] : j === 6 ? [1, .2, 0] : [0, 1, 0]);
      }
      for (const s of [-1, 1]) {
        const a = rows[i - 1], b = rows[i];
        this.beam([s * a[2], a[3] - .025, a[0]], [s * b[2], b[3] - .025, b[0]], .014, paint);
      }
    }
  }

  wheels(x: number, axles: number[], radius: number, aero: boolean, metal: string) {
    for (const side of [-1, 1]) for (const z of axles) {
      const px = side * x;
      const profile = [[radius * .76, -.12], [radius * .94, -.12], [radius, -.078], [radius, .078], [radius * .94, .12], [radius * .76, .12]].map(([r, h]) => new THREE.Vector2(r, h));
      const segments = aero ? 20 : 16;
      this.add(new THREE.LatheGeometry(profile, segments).rotateZ(Math.PI / 2).translate(px, radius, z), '#202127');
      const face = px + side * .125;
      this.cylinder(radius * .78, radius * .78, .015, face, radius, z, aero ? metal : '#252c38', segments, 'x');
      if (aero) {
        this.cylinder(radius * .73, radius * .82, .022, face + side * .012, radius, z, metal, 20, 'x');
        this.cylinder(.048, .055, .027, face + side * .035, radius, z, '#c7b381', 10, 'x');
      } else {
        for (let k = 0; k < segments; k++) {
          const points: Point[] = [];
          for (const [r, angle] of [[radius * .72, k], [radius * .78, k], [radius * .78, k + 1], [radius * .72, k + 1]]) points.push([face + side * .018, radius + Math.cos(angle * Math.PI * 2 / segments) * r, z + Math.sin(angle * Math.PI * 2 / segments) * r]);
          this.panel(points, metal, [side, 0, 0]);
        }
        for (let k = 0; k < 5; k++) {
          const theta = k * Math.PI * 2 / 5, points: Point[] = [];
          for (const [r, angle] of [[.07, -.20], [radius * .74, -.08], [radius * .74, .16], [.07, .32]]) points.push([face + side * .025, radius + Math.cos(theta + angle) * r, z + Math.sin(theta + angle) * r]);
          this.panel(points, metal, [side, 0, 0]);
        }
        this.cylinder(.065, .065, .025, face + side * .025, radius, z, metal, 10, 'x');
      }
    }
  }

  finish(name: string): TrafficModel {
    const geometry = mergeGeometries(this.pieces, false);
    this.pieces.forEach(g => g.dispose()); this.pieces = [];
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name + '_merged'; mesh.castShadow = true;
    const group = new THREE.Group(); group.name = name; group.add(mesh);
    let disposed = false;
    return { group, geometry, material, dispose() { if (!disposed) { geometry.dispose(); material.dispose(); disposed = true; } } };
  }
}
