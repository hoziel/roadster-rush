import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { createServer } from 'vite';

// Run from the repository root: node art/mockups/07-driver-models/validate.mjs
const server=await createServer({configFile:false,cacheDir:'/tmp/roadster-driver-validation-cache',server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
  const {buildDriver,SEAT_POSITION}=await server.ssrLoadModule('/art/mockups/07-driver-models/drivers.ts');
  const {buildRoadster}=await server.ssrLoadModule('/art/mockups/01-player-roadster/roadster.ts');const car=buildRoadster();car.group.updateMatrixWorld(true);const glazing=[];car.group.traverse(o=>{if(o.isMesh&&o.material.shininess===85)glazing.push(o);});const ray=new THREE.Raycaster();
  const results=[];
  for(const [id,height] of [['nevo',1.28],['ori',1.33],['shiri',1.75],['ofir',1.75]]){
    const d=buildDriver(id),geometries=new Set(),materials=new Set();let triangles=0,meshes=0;
    d.group.traverse(o=>{if(!o.isMesh)return;meshes++;geometries.add(o.geometry);materials.add(o.material);triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;
      for(const attr of Object.values(o.geometry.attributes))for(const n of attr.array)assert.ok(Number.isFinite(n));
      for(const n of o.geometry.attributes.color.array)assert.ok(n>=0&&n<=1);
      assert.equal(o.material.isMeshToonMaterial,true);assert.equal(o.material.transparent,false);assert.equal(o.material.map,null);
    });
    assert.ok(triangles<=25000);assert.ok(materials.size<=8);
    const bounds=()=>{const b=new THREE.Box3().setFromObject(d.group);return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()};};
    const standing=bounds();assert.ok(Math.abs(standing.size[1]-height)<1e-6);assert.ok(Math.abs(standing.min[1])<1e-6);
    const original=[];d.group.traverse(o=>original.push(o.matrixWorld.toArray()));
    d.setPose('seated');const seated=bounds();assert.ok(seated.size[1]<standing.size[1]);const seatedScale=d.seatedScale;const gripErrors=d.joints.hands.map((h,i)=>{const actual=new THREE.Vector3();h.getWorldPosition(actual);return actual.distanceTo(new THREE.Vector3(i===0?-.102:.102,.22,-.34-SEAT_POSITION.z));});const seatedTop=seated.max[1]+SEAT_POSITION.y;assert.ok(seatedTop<1.065,'head below canopy');assert.ok(gripErrors.every(e=>e<.02),'hands at wheel');
    let canopyClearance=Infinity,roofSamples=0;d.group.position.copy(SEAT_POSITION);d.group.updateMatrixWorld(true);d.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<.72)continue;ray.set(new THREE.Vector3(v.x,2,v.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(glazing,false)[0];assert.ok(hit,'high vertex inside roof footprint');canopyClearance=Math.min(canopyClearance,hit.point.y-v.y);roofSamples++;}});assert.ok(canopyClearance>.005,'clear of actual canopy');const floorClearance=seated.min[1]+SEAT_POSITION.y-.335;assert.ok(floorClearance>0,'feet above cabin floor');d.group.position.set(0,0,0);
    d.setPose('standing');const restored=[];d.group.traverse(o=>restored.push(o.matrixWorld.toArray()));assert.deepEqual(restored,original);
    d.setWave(.2);assert.ok(Math.abs(d.joints.elbows[0].rotation.z+1.4)<1e-9);d.setPose('standing');
    let geometryDisposals=0,materialDisposals=0;geometries.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));materials.forEach(m=>m.addEventListener('dispose',()=>materialDisposals++));d.dispose();d.dispose();assert.equal(geometryDisposals,geometries.size);assert.equal(materialDisposals,materials.size);
    results.push({id,triangles,meshes,materials:materials.size,standing,seated,seatedScale,seatedTop,gripErrors,canopyClearance,roofSamples,floorClearance,finiteGeometry:true,poseRoundTrip:true,disposalIdempotent:true});
  }
  await fs.writeFile('art/mockups/07-driver-models/validation.json',JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}finally{await server.close();}
