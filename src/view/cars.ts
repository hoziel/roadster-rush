import * as THREE from 'three';

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

/** Friendly police roadster: same body, white paint, red/blue light bar. */
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
  car.group.add(l, r, stripe);
  return { ...car, red, blue };
}
