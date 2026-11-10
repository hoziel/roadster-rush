import type * as THREE from 'three';

/** What the game needs from a car model. Built by `buildRoadster` / `buildPoliceRoadster`. */
export interface CarParts {
  group: THREE.Group;
  body: THREE.Mesh;
  paint: THREE.MeshToonMaterial;
}
