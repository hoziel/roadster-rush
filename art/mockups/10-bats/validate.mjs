import assert from 'node:assert/strict';
import {writeFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import sharp from 'sharp';
import {createServer} from 'vite';
const folder=new URL('./',import.meta.url);
const server=await createServer({cacheDir:'/private/tmp/roadster-bats-validation',server:{middlewareMode:true,hmr:false,ws:false}});
try{
 const {buildBat,WING_PIVOTS}=await server.ssrLoadModule('/art/mockups/10-bats/bat.ts');
 const bat=buildBat(),geometries=Object.values(bat.geometries),counts=Object.fromEntries(Object.entries(bat.geometries).map(([key,g])=>[key,g.attributes.position.count/3]));
 const total=Object.values(counts).reduce((a,b)=>a+b,0);assert(total<=800);assert.equal(bat.group.children.length,3);assert(bat.group.children.every(m=>m.material===bat.material));assert.equal(bat.material.transparent,false);assert.equal(bat.material.opacity,1);
 for(const g of geometries){for(const a of Object.values(g.attributes))assert([...a.array].every(Number.isFinite));assert(g.hasAttribute('color'));assert([...g.attributes.color.array].every(v=>v>=0&&v<=1));assert(g.boundingSphere.radius>0);}
 bat.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(bat.group),dimensions=bounds.getSize(new THREE.Vector3());assert(dimensions.x>.79&&dimensions.x<.82);assert(dimensions.y>.30&&dimensions.y<.33);
 const original=geometries.map(g=>Array.from(g.attributes.position.array));
 const parent=new THREE.Group();parent.position.set(2,6,-20);parent.rotation.set(.2,Math.PI+.13,.1);parent.scale.set(1.5,1.7,1.6);parent.add(bat.group);parent.updateMatrixWorld(true);
 const matrices=[new THREE.Matrix4(),new THREE.Matrix4(),new THREE.Matrix4()];let maxMatrixError=0,frames=0;
 // Compare the three instanced transforms to the independent scene graph across a full cycle,
 // arbitrary placement/nonuniform scale, and both clamped and splat states.
 for(const pose of ['glide','splat'])for(let i=0;i<=180;i++){
  const angle=Math.sin(i/180*Math.PI*2)*1.8;bat.setPose(pose);bat.setFlap(pose==='splat'?0:angle);parent.updateMatrixWorld(true);bat.writeInstanceMatrices(parent.matrixWorld,angle,...matrices,pose);
  for(let j=0;j<3;j++)for(let n=0;n<16;n++){const delta=Math.abs(bat.group.children[j].matrixWorld.elements[n]-matrices[j].elements[n]);maxMatrixError=Math.max(maxMatrixError,delta);assert(delta<1e-10);}
  assert(Math.abs(bat.leftWing.rotation.z)<=1.05);assert(Math.abs(bat.rightWing.rotation.z)<=1.05);frames++;
 }
 for(let i=0;i<geometries.length;i++)assert.deepEqual(Array.from(geometries[i].attributes.position.array),original[i]);
 bat.setPose('glide');bat.update(.2,1);assert(Math.abs(bat.leftWing.rotation.z)>0);bat.setPose('splat');bat.update(.2,1);assert.equal(Math.abs(bat.leftWing.rotation.z),0);
 const disposed=[0,0,0,0];[...geometries,bat.material].forEach((g,i)=>g.addEventListener('dispose',()=>disposed[i]++));bat.dispose();bat.dispose();assert.deepEqual(disposed,[1,1,1,1]);
 const images=[];for(const f of(await readdir(folder)).filter(f=>f.endsWith('.png'))){const path=fileURLToPath(new URL(f,folder)),m=await sharp(path).metadata(),bytes=(await stat(path)).size;assert(bytes<2_000_000);assert(m.width===540&&m.height===1170||m.width===1200&&m.height===900);images.push({file:f,width:m.width,height:m.height,bytes});}
 assert.equal(images.length,13);
 const result={triangles:counts,total,meshes:3,materials:1,opaque:true,dimensions:dimensions.toArray(),pivots:WING_PIVOTS.map(v=>v.toArray()),transformFrames:frames,maxMatrixError,swarmAt70:{draws:3,triangles:total*70},images,checks:'finite attributes/colors; geometry budget; dimensions; scene/instance pose equivalence; flap clamp; rigid geometry; splat; idempotent disposal; PNG limits'};
 await writeFile(new URL('validation.json',folder),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({total,counts,dimensions:result.dimensions,frames,maxMatrixError,images:images.length,maxImageBytes:Math.max(...images.map(i=>i.bytes))}));
}finally{await server.close();}
