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
// omit to keep all), textureSize? (max texture side in px) }
// Clip names are matched after stripping the Blender "<Armature>|" prefix, and kept clips are renamed
// to that stripped name (e.g. "BatArmature|Bat_Flying" -> "Bat_Flying").
const MANIFEST = {
  bat: { src: 'assets-src/quaternius/bat.glb', animated: true, clips: ['Bat_Flying'] },
  bull: { src: 'assets-src/quaternius/bull.glb', animated: true, clips: ['Idle', 'Walk'] },
  cactus: { src: 'assets-src/quaternius/cactus.glb' },
  'cactus-flowers': { src: 'assets-src/quaternius/cactus-flowers.glb' },
  'food-truck': { src: 'assets-src/quaternius/sushi-truck.glb', triangles: 2500 },
  scooter: { src: 'assets-src/polypizza-ccby/scooter-minipoly.glb', triangles: 800 },
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
