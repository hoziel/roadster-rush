// Turns raw models in assets-src/ into small, game-ready GLBs in public/themes/austin/models/.
// Usage: node scripts/optimize-assets.mjs            (all models in the manifest)
//        node scripts/optimize-assets.mjs bat bull   (just these)
// Each entry: source file, output name, and an optional triangle target for simplification.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, quantize, resample, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = 'public/themes/austin/models';

// Textures are resized to fit within this many pixels (largest side). The models are flat-shaded and
// colored from small palette atlases, so 128 px keeps every swatch readable.
const DEFAULT_TEXTURE_SIZE = 128;

// name: { src, triangles? (target count; omit to keep), animated?, clips? (animation names to keep;
// omit to keep all), textureSize? (max texture side in px), noTextures? (drop every texture and UV:
// the game colors it itself), bakeColors? (material colors become vertex colors on one shared
// material, so a multi-material model joins into a single draw call) }
// Clip names are matched after stripping the Blender "<Armature>|" prefix, and kept clips are renamed
// to that stripped name (e.g. "BatArmature|Bat_Flying" -> "Bat_Flying").
const KCC = 'assets-src/kenney/city-kit-commercial';
const KCS = 'assets-src/kenney/city-kit-suburban';
const MANIFEST = {
  bat: { src: 'assets-src/quaternius/bat.glb', animated: true, clips: ['Bat_Flying'] },
  bull: { src: 'assets-src/quaternius/bull.glb', animated: true, clips: ['Idle', 'Walk'] },
  cactus: { src: 'assets-src/quaternius/cactus.glb' },
  'cactus-flowers': { src: 'assets-src/quaternius/cactus-flowers.glb' },
  'food-truck': { src: 'assets-src/quaternius/sushi-truck.glb', triangles: 2500 },
  scooter: { src: 'assets-src/polypizza-ccby/scooter-minipoly.glb', triangles: 800 },

  // Kenney City Kit Commercial / Suburban (CC0): buildings lining the road (src/view/buildings.ts).
  'building-c': { src: `${KCC}/building-c.glb` },
  'building-e': { src: `${KCC}/building-e.glb` },
  'building-i': { src: `${KCC}/building-i.glb` },
  'building-l': { src: `${KCC}/building-l.glb` },
  'building-n': { src: `${KCC}/building-n.glb` },
  'skyscraper-a': { src: `${KCC}/building-skyscraper-a.glb` },
  'skyscraper-e': { src: `${KCC}/building-skyscraper-e.glb` },
  'house-d': { src: `${KCS}/building-type-d.glb` },
  'house-h': { src: `${KCS}/building-type-h.glb` },
  // Kenney Car Kit (CC0): the police car (src/view/cars.ts).
  police: { src: 'assets-src/kenney/car-kit/police.glb' },
  // Traffic (src/view/traffic.ts): low cars you can jump, tall trucks you can't. Each is one textured mesh,
  // so one instanced draw call per model.
  'car-sedan': { src: 'assets-src/kenney/car-kit/sedan.glb' },
  'car-taxi': { src: 'assets-src/kenney/car-kit/taxi.glb' },
  'car-hatchback': { src: 'assets-src/kenney/car-kit/hatchback-sports.glb' },
  'car-suv': { src: 'assets-src/kenney/car-kit/suv.glb' },
  'car-van': { src: 'assets-src/kenney/car-kit/van.glb' },
  'truck-delivery': { src: 'assets-src/kenney/car-kit/delivery.glb' },
  'truck-garbage': { src: 'assets-src/kenney/car-kit/garbage-truck.glb' },
  // Kenney City Kit Roads + Nature Kit (CC0): roadside props (src/view/scenery.ts).
  'street-light': { src: 'assets-src/kenney/city-kit-roads/light-curved.glb' },
  'tree-oak': { src: 'assets-src/kenney/nature-kit/tree_oak.glb', bakeColors: true },
  'tree-palm': { src: 'assets-src/kenney/nature-kit/tree_palmTall.glb', bakeColors: true },
  'rock-tall': { src: 'assets-src/kenney/nature-kit/rock_tallA.glb', bakeColors: true },
  // Texas State Capitol by 85 edgecroft (CC-BY 4.0): the vista at the road's end (src/view/landmarks.ts).
  // Drawn as a sky-colored silhouette, so only the shape ships.
  capitol: { src: 'assets-src/sketchfab-ccby/texas-state-capitol/scene.gltf', noTextures: true, triangles: 2400 },
};

// Shrinks every texture larger than maxSize (largest side) and re-encodes it: PNG as an indexed
// 256-color palette (the atlases are flat swatches or simple gradients, so this is visually lossless),
// JPEG at quality 85. Keeps the original bytes whenever the new encoding is not smaller.
async function shrinkTextures(doc, maxSize) {
  for (const tex of doc.getRoot().listTextures()) {
    const [w, h] = tex.getSize() ?? [0, 0];
    if (Math.max(w, h) <= maxSize) continue;
    const img = sharp(tex.getImage()).resize(maxSize, maxSize, { fit: 'inside' });
    const out = tex.getMimeType() === 'image/jpeg'
      ? await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
      : await img.png({ palette: true, colors: 256, compressionLevel: 9 }).toBuffer();
    if (out.byteLength < tex.getImage().byteLength) tex.setImage(new Uint8Array(out));
  }
}

// Drops all textures and the attributes only they used (UVs, tangents); materials become plain white.
function stripTextures(doc) {
  for (const mat of doc.getRoot().listMaterials()) {
    mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null)
      .setOcclusionTexture(null).setEmissiveTexture(null).setBaseColorFactor([1, 1, 1, 1]);
  }
  for (const tex of doc.getRoot().listTextures()) tex.dispose();
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      for (const sem of prim.listSemantics())
        if (sem.startsWith('TEXCOORD_') || sem === 'TANGENT') prim.setAttribute(sem, null);
}

// Writes each primitive's material color into a COLOR_0 vertex attribute and points every primitive
// at one shared white material, so join() can merge the whole model into a single primitive.
function bakeColors(doc) {
  const shared = doc.createMaterial('baked').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0);
  const buffer = doc.getRoot().listBuffers()[0];
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const [r, g, b] = prim.getMaterial()?.getBaseColorFactor() ?? [1, 1, 1, 1];
      const n = prim.getAttribute('POSITION').getCount();
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([r, g, b], i * 3);
      prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(arr).setBuffer(buffer));
      prim.setMaterial(shared);
    }
}

const clipName = (anim) => anim.getName().replace(/^[^|]*\|/, '');

// Keeps one copy of each wanted clip (some exports contain every clip twice, with and without the
// armature prefix) and disposes the rest. prune() then removes the orphaned keyframe data.
function keepClips(doc, keep) {
  const kept = new Set();
  for (const anim of doc.getRoot().listAnimations()) {
    const name = clipName(anim);
    if (keep.includes(name) && !kept.has(name)) {
      anim.setName(name);
      kept.add(name);
    } else {
      // Disposing the animation alone leaves its samplers alive, and they keep the keyframe accessors.
      for (const channel of anim.listChannels()) channel.dispose();
      for (const sampler of anim.listSamplers()) sampler.dispose();
      anim.dispose();
    }
  }
  const missing = keep.filter((n) => !kept.has(n));
  if (missing.length) throw new Error(`clips not found: ${missing.join(', ')}`);
}

function countTriangles(doc) {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      n += Math.floor((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
    }
  return n;
}

const kb = async (f) => ((await stat(f)).size / 1024).toFixed(0) + ' KB';

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await mkdir(OUT_DIR, { recursive: true });

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(MANIFEST);
const rows = [];
for (const name of names) {
  const entry = MANIFEST[name];
  if (!entry) { console.error(`unknown model: ${name}`); process.exitCode = 1; continue; }
  const doc = await io.read(entry.src);
  const before = countTriangles(doc);
  const clipsBefore = doc.getRoot().listAnimations().length;
  if (entry.clips) keepClips(doc, entry.clips);
  if (entry.noTextures) stripTextures(doc);
  if (entry.bakeColors) bakeColors(doc);
  const steps = [dedup(), prune(), weld()];
  // Static props can be flattened and joined into fewer draw calls; animated ones keep their hierarchy.
  if (!entry.animated) steps.push(flatten(), join());
  if (entry.animated) steps.push(resample());
  if (entry.triangles && before > entry.triangles) {
    steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: entry.triangles / before, error: 0.01 }));
  }
  await shrinkTextures(doc, entry.textureSize ?? DEFAULT_TEXTURE_SIZE);
  steps.push(quantize(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await doc.transform(...steps);
  const out = path.join(OUT_DIR, `${name}.glb`);
  await io.write(out, doc);
  const textures = doc.getRoot().listTextures().map((t) => t.getSize()?.join('x')).join(', ') || '-';
  rows.push({
    name,
    triangles: `${before} → ${countTriangles(doc)}`,
    clips: `${clipsBefore} → ${doc.getRoot().listAnimations().length}`,
    textures,
    size: `${await kb(entry.src)} → ${await kb(out)}`,
  });
}
console.table(rows);
