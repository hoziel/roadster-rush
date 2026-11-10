import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Shared loader for the optimized theme models (scripts/optimize-assets.mjs writes them).
let loader: GLTFLoader | null = null;
const BASE = `${import.meta.env.BASE_URL}themes/austin/models/`;

/** Loads a model's scene graph from public/themes/austin/models/. */
export async function loadModel(file: string): Promise<THREE.Group> {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(BASE + file);
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}

/**
 * The model as one geometry in model space (node transforms baked in), plus the first mesh's material.
 * The optimizer already joins static models into a single mesh, so this is normally just a copy.
 */
export function modelGeometry(root: THREE.Object3D): { geometry: THREE.BufferGeometry; material: THREE.Material } {
  const parts: THREE.BufferGeometry[] = [];
  let material: THREE.Material | null = null;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    material ??= mesh.material as THREE.Material;
    parts.push(dequantize(mesh.geometry).applyMatrix4(mesh.matrixWorld));
  });
  if (!material || parts.length === 0) throw new Error('model has no meshes');
  const geometry = parts.length === 1 ? parts[0] : mergeSimple(parts);
  return { geometry, material };
}

/** Copy with plain float attributes (quantized ones can't be transformed in place). */
function dequantize(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const a = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  if (src.index) g.setIndex(src.index.clone());
  return g;
}

/** Concatenates geometries that share the same attribute set. */
function mergeSimple(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const names = Object.keys(parts[0].attributes).filter((n) => parts.every((p) => p.attributes[n]));
  const total = parts.reduce((s, p) => s + p.attributes.position.count, 0);
  const g = new THREE.BufferGeometry();
  for (const n of names) {
    const size = parts[0].attributes[n].itemSize;
    const out = new Float32Array(total * size);
    let off = 0;
    for (const p of parts) { out.set(p.attributes[n].array as Float32Array, off); off += p.attributes[n].count * size; }
    g.setAttribute(n, new THREE.BufferAttribute(out, size));
  }
  const index: number[] = [];
  let base = 0;
  for (const p of parts) {
    const n = p.attributes.position.count;
    if (p.index) for (let i = 0; i < p.index.count; i++) index.push(p.index.getX(i) + base);
    else for (let i = 0; i < n; i++) index.push(i + base);
    base += n;
  }
  g.setIndex(index);
  return g;
}
