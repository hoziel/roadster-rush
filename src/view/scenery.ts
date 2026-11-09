import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const SPAN = 220; // m of roadside that loops (treadmill)
const NEAR_Z = 20; // where props leave the screen behind the camera

interface PropSpec {
  file: string;
  count: number; // instances spread over SPAN, both sides
  height: number; // m, model is scaled to this height
  x: [number, number]; // distance from road centre (m), mirrored to both sides
  faceRoad?: boolean;
}

// Roadside props. Instanced so each model part is one draw call however many copies there are.
const PROPS: PropSpec[] = [
  { file: 'cactus.glb', count: 16, height: 2.2, x: [7, 16] },
  { file: 'cactus-flowers.glb', count: 10, height: 1.4, x: [6.5, 12] },
  { file: 'food-truck.glb', count: 2, height: 3.0, x: [8.5, 9.5], faceRoad: true },
];

interface Slot { t: number; x: number; rotY: number; scale: number }
interface Placed { meshes: THREE.InstancedMesh[]; slots: Slot[]; base: THREE.Matrix4[] }

/** Roadside scenery on a looping strip. Loads async; renders nothing until ready. */
export class Scenery {
  readonly group = new THREE.Group();
  private placed: Placed[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  async load(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const base = `${import.meta.env.BASE_URL}themes/austin/models/`;
    const results = await Promise.allSettled(PROPS.map((p) => loader.loadAsync(base + p.file)));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') this.add(PROPS[i], r.value.scene);
      else console.warn(`scenery: failed to load ${PROPS[i].file}`, r.reason);
    });
  }

  private add(spec: PropSpec, root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const unit = spec.height / Math.max(0.001, box.max.y - box.min.y);
    const lift = -box.min.y * unit;

    const slots: Slot[] = [];
    for (let i = 0; i < spec.count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (spec.x[0] + hash(i * 7.1 + spec.count) * (spec.x[1] - spec.x[0]));
      slots.push({
        t: ((i + hash(i * 3.3 + spec.height)) / spec.count) * SPAN,
        x,
        rotY: spec.faceRoad ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : hash(i * 1.7) * Math.PI * 2,
        scale: unit * (spec.faceRoad ? 1 : 0.8 + hash(i * 5.9) * 0.4),
      });
    }

    const meshes: THREE.InstancedMesh[] = [];
    const baseMats: THREE.Matrix4[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, spec.count);
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.frustumCulled = false;
      meshes.push(inst);
      // Part transform inside the model, with the model lifted so it stands on the ground.
      baseMats.push(new THREE.Matrix4().makeTranslation(0, lift / unit, 0).multiply(mesh.matrixWorld));
      this.group.add(inst);
    });
    this.placed.push({ meshes, slots, base: baseMats });
  }

  update(distance: number): void {
    for (const p of this.placed) {
      p.slots.forEach((slot, i) => {
        const z = NEAR_Z - SPAN + ((slot.t + distance) % SPAN);
        this.q.setFromAxisAngle(this.v.set(0, 1, 0), slot.rotY);
        this.m.compose(this.v.set(slot.x, 0, z), this.q, this.s.setScalar(slot.scale));
        p.meshes.forEach((mesh, k) => {
          mesh.setMatrixAt(i, this.tmp.multiplyMatrices(this.m, p.base[k]));
        });
      });
      for (const mesh of p.meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private tmp = new THREE.Matrix4();
}

/** Deterministic 0..1 noise so the layout is the same every run. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
