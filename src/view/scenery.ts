import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const SPAN = 220; // m of roadside kept laid out ahead of the camera
const BEHIND = 80; // m kept behind the car too, so the parked-car orbit looks down an endless road
const NEAR_Z = 20; // where props leave the screen behind the camera
const POOL_MARGIN = 2; // spare instances per prop on top of the most that can be live at once

interface PropSpec {
  file: string;
  count: number; // instances per SPAN of road, both sides
  height: number; // m, model is scaled to this height
  x: [number, number]; // distance from road centre (m), mirrored to both sides
  faceRoad?: boolean;
  turn?: number; // extra yaw (rad) on top of faceRoad, e.g. to swing a lamp arm over the road
  lambert?: boolean; // swap the glTF's PBR material for a cheaper Lambert (keeps map / vertex colors)
}

// Roadside props. Instanced so each model part is one draw call however many copies there are.
const PROPS: PropSpec[] = [
  // Downtown Austin (after Congress Ave / 6th St references): live oaks lining the sidewalks, street lights
  // on the curb, rental scooters, the odd food truck. No desert props downtown.
  // Kenney Nature Kit, City Kit Roads and Car Kit (CC0).
  { file: 'tree-oak.glb', count: 26, height: 6.4, x: [6.6, 7.6], lambert: true }, // street trees, a row each side
  { file: 'tree-oak.glb', count: 8, height: 7.5, x: [11, 15], lambert: true }, // plazas behind
  { file: 'street-light.glb', count: 10, height: 6.5, x: [5.3, 5.4], faceRoad: true, turn: Math.PI, lambert: true },
  { file: 'scooter.glb', count: 6, height: 1.1, x: [8.4, 9.6] },
  { file: 'food-truck.glb', count: 2, height: 3.0, x: [10, 11], faceRoad: true },
];

/**
 * One prop's stream. The road is cut into cells of SPAN / count metres, one prop per cell at a
 * random spot inside it, sides alternating (the old looping strip's spacing, but endless and
 * fresh each run). Live props are packed at instance indices 0..n-1 of a fixed-size pool.
 */
interface Placed {
  spec: PropSpec;
  unit: number; // metres per model unit
  meshes: THREE.InstancedMesh[];
  base: THREE.Matrix4[];
  n: number;
  a: Float32Array; // road position (m): z = NEAR_Z - (a - distance)
  x: Float32Array;
  rotY: Float32Array;
  scale: Float32Array;
  cell: number; // m per cell
  next: number; // road position where the next cell starts
  side: number; // side of the next prop (-1 / 1)
}

/** Roadside scenery streamed endlessly ahead of the car. Loads async; renders nothing until ready. */
export class Scenery {
  readonly group = new THREE.Group();
  private placed: Placed[] = [];
  private lastDistance = 0;
  private needsReset = true;
  private m = new THREE.Matrix4();
  private tmp = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  /** Spots (scene x, z) to keep free of roadside props, e.g. in front of a billboard. */
  hideAt: ((x: number, z: number) => boolean) | null = null;

  async load(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const base = `${import.meta.env.BASE_URL}themes/austin/models/`;
    const results = await Promise.allSettled(PROPS.map((p) => loader.loadAsync(base + p.file)));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') this.add(PROPS[i], r.value.scene);
      else console.warn(`scenery: failed to load ${PROPS[i].file}`, r.reason);
    });
    this.needsReset = true;
  }

  /** A fresh random roadside for the next run (laid out on the next update). */
  newRun(): void {
    this.needsReset = true;
  }

  private add(spec: PropSpec, root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const unit = spec.height / Math.max(0.001, box.max.y - box.min.y);
    const lift = -box.min.y * unit;
    // Live props span SPAN plus up to one cell of jitter: at most count + 1 at once.
    const capacity = Math.ceil(spec.count * (SPAN + BEHIND) / SPAN) + 1 + POOL_MARGIN;

    const meshes: THREE.InstancedMesh[] = [];
    const baseMats: THREE.Matrix4[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const inst = new THREE.InstancedMesh(mesh.geometry, spec.lambert ? toLambert(mesh.material as THREE.MeshStandardMaterial) : mesh.material, capacity);
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.frustumCulled = false;
      inst.count = 0;
      inst.visible = false;
      meshes.push(inst);
      // Part transform inside the model, with the model lifted so it stands on the ground.
      baseMats.push(new THREE.Matrix4().makeTranslation(0, lift / unit, 0).multiply(mesh.matrixWorld));
      this.group.add(inst);
    });
    this.placed.push({
      spec, unit, meshes, base: baseMats, n: 0,
      a: new Float32Array(capacity), x: new Float32Array(capacity), rotY: new Float32Array(capacity), scale: new Float32Array(capacity),
      cell: SPAN / spec.count, next: 0, side: 1,
    });
  }

  /** Empty the pools and restart every stream at the car with a random phase and side. */
  private reset(distance: number): void {
    for (const p of this.placed) {
      p.n = 0;
      p.next = distance - BEHIND - Math.random() * p.cell;
      p.side = Math.random() < 0.5 ? -1 : 1;
    }
  }

  /** Drop one prop somewhere in the next cell, on alternating sides. */
  private place(p: Placed): void {
    const spec = p.spec;
    const side = p.side;
    p.side = -side;
    const cellStart = p.next;
    p.next += p.cell;
    if (p.n >= p.a.length) return; // never happens with the capacity above; skip rather than overflow
    const i = p.n++;
    p.a[i] = cellStart + Math.random() * p.cell;
    p.x[i] = side * (spec.x[0] + Math.random() * (spec.x[1] - spec.x[0]));
    p.rotY[i] = spec.faceRoad ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (spec.turn ?? 0) : Math.random() * Math.PI * 2;
    p.scale[i] = p.unit * (spec.faceRoad ? 1 : 0.8 + Math.random() * 0.4);
  }

  update(distance: number): void {
    if (this.placed.length === 0) return;
    // A new run (distance went back) or a big jump ahead: lay a fresh roadside from here.
    if (this.needsReset || distance < this.lastDistance || distance - this.lastDistance > SPAN) {
      this.reset(distance);
      this.needsReset = false;
    }
    this.lastDistance = distance;

    for (const p of this.placed) {
      // Recycle props well behind the camera (z beyond NEAR_Z + BEHIND), keeping the live ones packed.
      for (let i = p.n - 1; i >= 0; i--) {
        if (p.a[i] >= distance - BEHIND) continue;
        const last = --p.n;
        if (i !== last) { p.a[i] = p.a[last]; p.x[i] = p.x[last]; p.rotY[i] = p.rotY[last]; p.scale[i] = p.scale[last]; }
      }
      // Stream new ones in at the far end, in the fog.
      while (p.next < distance + SPAN) this.place(p);

      for (let i = 0; i < p.n; i++) {
        const z = NEAR_Z - (p.a[i] - distance);
        this.q.setFromAxisAngle(this.up, p.rotY[i]);
        const hidden = Math.abs(p.x[i]) < 9 && this.hideAt?.(p.x[i], z);
        this.m.compose(this.v.set(p.x[i], 0, z), this.q, this.s.setScalar(hidden ? 0 : p.scale[i]));
        for (let k = 0; k < p.meshes.length; k++) p.meshes[k].setMatrixAt(i, this.tmp.multiplyMatrices(this.m, p.base[k]));
      }
      for (const mesh of p.meshes) {
        mesh.count = p.n;
        mesh.visible = p.n > 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
}

function toLambert(m: THREE.MeshStandardMaterial): THREE.MeshLambertMaterial {
  const out = new THREE.MeshLambertMaterial({ map: m.map, color: m.color, vertexColors: m.vertexColors });
  m.dispose();
  return out;
}
