import * as THREE from 'three';
import { loadModel, modelGeometry } from './models';

export interface CarParts {
  group: THREE.Group;
  body: THREE.Mesh;
  paint: THREE.MeshToonMaterial;
}

/** Grey-box roadster: body, cabin, four wheels. Replaced by the real model in M2. */
export function buildCar(color: string): CarParts {
  const group = new THREE.Group();
  const paint = new THREE.MeshToonMaterial({ color });
  const glass = new THREE.MeshToonMaterial({ color: '#2b2f4a' });
  const tyre = new THREE.MeshToonMaterial({ color: '#1b1b22' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 3.0), paint);
  body.position.y = 0.45;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.3), glass);
  cabin.position.set(0, 0.85, 0.2);
  group.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.75, -1.0], [0.75, -1.0], [-0.75, 1.0], [0.75, 1.0]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.position.set(x, 0.32, z);
    group.add(w);
  }
  return { group, body, paint };
}

/**
 * Police car: Kenney Car Kit police.glb (CC0) with a red/blue light bar the scene flashes. Returns at
 * once with the grey-box police (same body, white paint, stripe); the model swaps in when it has loaded.
 */
export function buildPolice(): CarParts & { red: THREE.MeshBasicMaterial; blue: THREE.MeshBasicMaterial } {
  const car = buildCar('#f2f4ff');
  const red = new THREE.MeshBasicMaterial({ color: '#ff2a3a' });
  const blue = new THREE.MeshBasicMaterial({ color: '#2a6bff' });
  const geo = new THREE.BoxGeometry(0.45, 0.18, 0.3);
  const l = new THREE.Mesh(geo, red);
  l.position.set(-0.25, 1.12, 0.2);
  const r = new THREE.Mesh(geo, blue);
  r.position.set(0.25, 1.12, 0.2);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 3.02), new THREE.MeshToonMaterial({ color: '#1f2d6b' }));
  stripe.position.y = 0.5;
  const greyBox = [...car.group.children, stripe];
  car.group.add(l, r, stripe);

  void loadModel('police.glb').then((root) => {
    const { geometry, material } = modelGeometry(root);
    geometry.rotateY(Math.PI); // the kit's cars face +z; ours drive toward -z
    const map = (material as THREE.MeshStandardMaterial).map ?? null;
    material.dispose();
    const model = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map }));
    for (const o of greyBox) o.visible = false;
    car.group.add(model);

    // Cover the kit's roof light with the flashing pair: find the topmost vertices (the light block).
    geometry.computeBoundingBox();
    const top = geometry.boundingBox!.max.y;
    const bar = new THREE.Box3();
    const pos = geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) if (v.fromBufferAttribute(pos, i).y > top - 0.06) bar.expandByPoint(v);
    const size = bar.getSize(new THREE.Vector3()), mid = bar.getCenter(new THREE.Vector3());
    const lamp = new THREE.BoxGeometry(size.x * 0.5 + 0.02, 0.13, size.z + 0.04);
    l.geometry = r.geometry = lamp;
    geo.dispose();
    l.position.set(mid.x - size.x * 0.25, top - 0.045, mid.z);
    r.position.set(mid.x + size.x * 0.25, top - 0.045, mid.z);
  }).catch((err) => console.warn('police: failed to load police.glb', err));

  return { ...car, red, blue };
}
