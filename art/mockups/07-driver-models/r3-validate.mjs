import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createServer} from 'vite';
const server=await createServer({configFile:false,cacheDir:'/private/tmp/rr-nevo-r3-validation',server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try{
 const {buildNevoR3}=await server.ssrLoadModule('/art/mockups/07-driver-models/nevo-r3.ts');
 const {SEAT_POSITION}=await server.ssrLoadModule('/art/mockups/07-driver-models/drivers.ts');
 const {buildRoadster}=await server.ssrLoadModule('/art/mockups/01-player-roadster/roadster.ts');
 const car=buildRoadster(),glass=[];car.group.updateMatrixWorld(true);car.group.traverse(o=>{if(o.isMesh&&o.material.shininess===85)glass.push(o);});const ray=new THREE.Raycaster(),results=[];
 for(const style of['real','anime']){
  const d=buildNevoR3(style),geo=new Set(),mat=new Set();let tris=0,meshes=0;d.group.traverse(o=>{if(!o.isMesh)return;meshes++;geo.add(o.geometry);mat.add(o.material);tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const attr of Object.values(o.geometry.attributes))for(const n of attr.array)assert(Number.isFinite(n));assert(!o.material.transparent);});
  assert(tris<=25000);assert(mat.size<=8);const standing=new THREE.Box3().setFromObject(d.group);assert(Math.abs(standing.max.y-standing.min.y-1.3)<1e-8);assert(Math.abs(standing.min.y)<1e-8);assert(d.headRatio>(style==='real'?5.35:5.0)&&d.headRatio<5.65);
  const before=[];d.group.traverse(o=>before.push(o.matrixWorld.toArray()));d.setPose('seated');const seated=new THREE.Box3().setFromObject(d.group);
  const gripErrors=d.joints.hands.map((h,i)=>h.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(i?.102:-.102,.22,-.34-SEAT_POSITION.z)));assert(gripErrors.every(n=>n<.005));
  d.group.position.copy(SEAT_POSITION);d.group.updateMatrixWorld(true);let clearance=Infinity,samples=0;
  d.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<.72)continue;ray.set(new THREE.Vector3(v.x,2,v.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(glass,false)[0];assert(hit,'high vertex outside canopy footprint');clearance=Math.min(clearance,hit.point.y-v.y);samples++;}});assert(clearance>.005,'canopy collision');const floor=seated.min.y+SEAT_POSITION.y-.335;assert(floor>.005,'cabin floor collision');
  d.group.position.set(0,0,0);d.setPose('standing');const after=[];d.group.traverse(o=>after.push(o.matrixWorld.toArray()));assert.deepEqual(after,before);d.setWave(.3);d.group.updateMatrixWorld(true);d.group.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));d.setPose('standing');
  let gd=0,md=0;geo.forEach(g=>g.addEventListener('dispose',()=>gd++));mat.forEach(m=>m.addEventListener('dispose',()=>md++));d.dispose();d.dispose();assert.equal(gd,geo.size);assert.equal(md,mat.size);
  results.push({style,triangles:tris,meshes,materials:mat.size,height:1.3,headRatio:d.headRatio,standing:{min:standing.min.toArray(),max:standing.max.toArray()},seatedScale:d.seatedScale,seatedTop:seated.max.y+.43,canopyClearance:clearance,canopySamples:samples,floorClearance:floor,gripErrors,finiteGeometry:true,poseRoundTrip:true,disposalIdempotent:true});
 }
 car.dispose();await fs.writeFile('art/mockups/07-driver-models/r3-validation.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await server.close();}
