import * as THREE from 'three';
import { laneX, type World } from '../sim/world';
import { loadModel, modelGeometry } from './models';
import { buildCybercab } from './robotaxis/cybercab';
import { buildWaymo } from './robotaxis/waymo';
import { buildCybertruck } from './robotaxis/cybertruck';

// Traffic: Kenney Car Kit models (CC0), one InstancedMesh per model (one draw call each), plus one more for
// all the tail lights, which glow at night. A car knocked aside by a crash or a shield gets a "boing":
// squash, hop and spin off the road.

interface ModelSpec {
  file: string;
  kind: 'car' | 'truck';
  scale: number; // uniform scale (the kit is toy-sized; cars come out ~1.35 m tall, trucks ~2.4 m)
  widthScale?: number; // extra squeeze across, so wide trucks fit a lane
}

const MODELS: ModelSpec[] = [
  { file: 'car-sedan.glb', kind: 'car', scale: 1.04 },
  { file: 'car-taxi.glb', kind: 'car', scale: 1.0 },
  { file: 'car-hatchback.glb', kind: 'car', scale: 1.15 },
  { file: 'car-suv.glb', kind: 'car', scale: 1.04 },
  { file: 'car-van.glb', kind: 'car', scale: 1.0 },
  { file: 'truck-delivery.glb', kind: 'truck', scale: 1.45, widthScale: 0.85 },
  { file: 'truck-garbage.glb', kind: 'truck', scale: 1.45, widthScale: 0.82 },
];
const POOL = 24; // per model: SPAWN_AHEAD holds at most ~5 traffic chunks of up to 4 vehicles
const LIGHTS_MAX = POOL * 4;
const TAIL_OFF = new THREE.Color('#5a0c14');
const TAIL_ON = new THREE.Color('#ff2a3a');

interface Loaded { mesh: THREE.InstancedMesh; spec: ModelSpec; rear: number; lightY: number; lightX: number }

export class TrafficView {
  readonly group = new THREE.Group();
  private models: Loaded[] = [];
  private byKind: Record<'car' | 'truck', Loaded[]> = { car: [], truck: [] };
  private counts: number[] = [];
  private lights: THREE.InstancedMesh;
  private lightMat = new THREE.MeshBasicMaterial({ color: TAIL_OFF.clone() });
  private dummy = new THREE.Object3D();
  private m = new THREE.Matrix4();

  constructor() {
    // Two small lamps, one per side; each instance is placed on a vehicle's back and scaled to its width.
    const lamp = new THREE.BoxGeometry(0.28, 0.16, 0.06);
    const pair = mergeBoxes([lamp.clone().translate(-1, 0, 0), lamp.clone().translate(1, 0, 0)]);
    this.lights = new THREE.InstancedMesh(pair, this.lightMat, LIGHTS_MAX);
    this.lights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lights.frustumCulled = false;
    this.lights.count = 0;
    this.group.add(this.lights);
  }

  async load(): Promise<void> {
    const results = await Promise.allSettled(MODELS.map((m) => loadModel(m.file)));
    results.forEach((r, i) => {
      const spec = MODELS[i];
      if (r.status !== 'fulfilled') { console.warn(`traffic: failed to load ${spec.file}`, r.reason); return; }
      const { geometry, material } = modelGeometry(r.value);
      geometry.rotateY(Math.PI); // the kit's cars face +z; traffic drives away from the camera, toward -z
      geometry.scale(spec.scale * (spec.widthScale ?? 1), spec.scale, spec.scale);
      const map = (material as THREE.MeshStandardMaterial).map ?? null;
      material.dispose();
      this.add(geometry, new THREE.MeshLambertMaterial({ map }), spec);
    });
    // Austin's robotaxis and the Cybertruck (Codex's models from issue #45, one vertex-coloured mesh each): they join the car rotation.
    for (const taxi of [buildCybercab(), buildWaymo(), buildCybertruck()]) this.add(taxi.geometry, taxi.material, { file: '', kind: 'car', scale: 1 });
    this.counts = this.models.map(() => 0);
  }

  private add(geometry: THREE.BufferGeometry, material: THREE.Material, spec: ModelSpec): void {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const mesh = new THREE.InstancedMesh(geometry, material, POOL);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    const h = box.max.y - box.min.y;
    const loaded = { mesh, spec, rear: box.max.z + 0.02, lightY: h * (spec.kind === 'car' ? 0.42 : 0.3), lightX: box.max.x * 0.72 };
    this.models.push(loaded);
    this.byKind[spec.kind].push(loaded);
    this.group.add(mesh);
  }

  /** Draw every live car and truck; `lights` 0..1 is how dark it is (tail lights glow). */
  update(w: World, lights: number, time: number, visible: boolean): void {
    this.group.visible = visible;
    this.lightMat.color.copy(TAIL_OFF).lerp(TAIL_ON, lights);
    this.lights.visible = lights > 0.02; // the models' own tail lights read fine by day: save the draw call
    if (!this.models.length) return;
    this.counts.fill(0);
    let nl = 0;
    for (const e of w.entities) {
      if (!e.alive || (e.kind !== 'car' && e.kind !== 'truck')) continue;
      const list = this.byKind[e.kind];
      if (!list.length) continue;
      const v = e.variant ?? 0;
      const model = list[v % list.length];
      const idx = this.models.indexOf(model);
      if (this.counts[idx] >= POOL) continue;
      const z = -(e.s - w.distance);
      if (z < -230 || z > 30) continue;
      let x = laneX(e.lane), y = Math.sin(time * 13 + v) * 0.015, rotY = 0, rotZ = 0, sy = 1, sxz = 1;
      if (e.bumped !== undefined) {
        // Boing: a quick squash, then a hop and a spin off toward the side away from us.
        const t = w.time - e.bumped;
        const dir = Math.sign(x - w.x) || (v % 2 ? 1 : -1);
        if (t < 0.14) { const k = Math.sin((t / 0.14) * Math.PI); sy = 1 - 0.4 * k; sxz = 1 + 0.2 * k; }
        const air = Math.max(0, t - 0.08);
        y = Math.max(0, 7 * air - 12 * air * air);
        x += dir * Math.min(8, 11 * air);
        rotY = dir * Math.min(air, 0.6) * 7;
        rotZ = -dir * Math.sin(Math.min(air, 0.58) / 0.58 * Math.PI) * 0.5;
      }
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, rotY, rotZ);
      this.dummy.scale.set(sxz, sy, sxz);
      this.dummy.updateMatrix();
      model.mesh.setMatrixAt(this.counts[idx]++, this.dummy.matrix);
      if (nl < LIGHTS_MAX) {
        // Tail lights ride along in the vehicle's frame.
        this.m.makeTranslation(0, model.lightY, model.rear);
        this.m.premultiply(this.dummy.matrix);
        this.m.multiply(this.tmp.makeScale(model.lightX, 1, 1));
        this.lights.setMatrixAt(nl++, this.m);
      }
    }
    this.models.forEach((m, i) => { m.mesh.count = this.counts[i]; m.mesh.instanceMatrix.needsUpdate = true; });
    this.lights.count = nl;
    this.lights.instanceMatrix.needsUpdate = true;
  }

  private tmp = new THREE.Matrix4();
}

/** Two boxes as one indexed geometry (position + normal only). */
function mergeBoxes(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], index: number[] = [];
  let base = 0;
  for (const p of parts) {
    pos.push(...(p.attributes.position.array as Float32Array));
    nor.push(...(p.attributes.normal.array as Float32Array));
    for (let i = 0; i < p.index!.count; i++) index.push(p.index!.getX(i) + base);
    base += p.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(index);
  return g;
}
