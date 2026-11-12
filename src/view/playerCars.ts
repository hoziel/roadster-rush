import * as THREE from 'three';
import type { ModelId } from '../sim/shop';
import { buildRoadster, type RoadsterParts } from './roadster';
import { buildCybercab } from './robotaxis/cybercab';
import { buildCybertruck } from './robotaxis/cybertruck';
import { buildWaymo } from './robotaxis/waymo';
import { MeshKit } from './robotaxis/mesh-kit';

// The player's car bodies (garage → Car). They all drive, jump, hover and flip the same; only the look changes.
// The roadster is Codex's player car; the Cybercab, Cybertruck and Waymo reuse Codex's traffic models (issue #45)
// with their body panels split off to take the paint. Each is scaled to about the roadster's footprint so it
// fits a 2.5 m lane and the camera framing stays right.

export interface PlayerCar extends RoadsterParts {
  /** Uniform scale for the car group. */
  scale: number;
  /** Has the roadster's stripe and two-tone accent panels. */
  accents: boolean;
}

export function buildPlayerCar(model: ModelId): PlayerCar {
  if (model === 'cybercab') {
    // Gold body panels take the paint; the shut lines keep a darker shade of it.
    return fromKit(buildCybercab, new Map([['#d3b66e', 1], ['#a28b55', 0.75]]), 0.8, new THREE.Vector3(-0.33, 0.95, 0.1));
  }
  if (model === 'cybertruck') {
    // Stainless panels in three shades (hood and cabin brightest, folded lower doors darkest).
    return fromKit(buildCybertruck, new Map([['#b8bfc0', 0.92], ['#d1d5d3', 1], ['#949ea2', 0.74]]), 0.66, new THREE.Vector3(-0.4, 1.4, -0.4));
  }
  if (model === 'waymo') {
    // White body panels (and mirrors and sensor caps) take the paint; the dark roof and sensors stay.
    return fromKit(buildWaymo, new Map([['#edece6', 1]]), 0.72, new THREE.Vector3(-0.4, 1.3, -0.2));
  }
  return { ...buildRoadster('#e8344e', { liveDoors: true }), scale: 0.9, accents: true };
}

function fromKit(build: (b: MeshKit) => { group: THREE.Group; geometry: THREE.BufferGeometry; material: THREE.Material }, tones: Map<string, number>, scale: number, seat: THREE.Vector3): PlayerCar {
  const kit = new MeshKit();
  kit.paintTones = tones;
  const model = build(kit);
  const paint = new THREE.MeshToonMaterial({ color: '#e8344e', vertexColors: true });
  const body = new THREE.Mesh(kit.paintGeometry!, paint);
  body.name = 'paint';
  model.group.add(body);
  model.geometry.computeBoundingBox();
  const box = model.geometry.boundingBox!;
  const thrusters: THREE.Object3D[] = [];
  for (const x of [box.min.x * 0.7, box.max.x * 0.7]) for (const z of [box.min.z * 0.65, box.max.z * 0.65]) {
    const socket = new THREE.Object3D();
    socket.position.set(x, 0.18, z);
    model.group.add(socket);
    thrusters.push(socket);
  }
  return {
    group: model.group, body, paint, thrusters, doors: [], seat, scale, accents: false,
    setDoorOpen() { /* no opening doors on these */ },
    dispose() {
      model.geometry.dispose(); model.material.dispose(); body.geometry.dispose(); paint.dispose();
    },
  };
}
