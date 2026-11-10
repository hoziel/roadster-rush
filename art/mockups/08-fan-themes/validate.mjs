import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import {createServer} from 'vite';
const folder='art/mockups/08-fan-themes';
const server=await createServer({configFile:false,cacheDir:'/tmp/roadster-fan-validation-cache',server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const finite=values=>{for(const n of values)assert.ok(Number.isFinite(n));};
const finitePose=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(Array.isArray(value))value.forEach(finitePose);else for(const v of Object.values(value))finitePose(v);};
const triangles=g=>(g.index?.count??g.attributes.position.count)/3;
try {
 const {Sideline,buildPlayerGeometry,samplePose,DURATIONS}=await server.ssrLoadModule('/'+folder+'/players.ts');
 const {hoop,net,foamFinger,disposeProp}=await server.ssrLoadModule('/'+folder+'/props.ts');
 const {themeFor}=await server.ssrLoadModule('/src/view/fanThemes.ts');
 const geo=buildPlayerGeometry(),counts={};
 for(const [name,g]of Object.entries(geo)){counts[name]=triangles(g);for(const attr of Object.values(g.attributes))finite(attr.array);for(const c of g.attributes.color.array)assert.ok(c>=0&&c<=1);g.dispose();}
 const playerTriangles=counts.torso+counts.head+counts.limbs*8+counts.hands*2+counts.shoes*2;
 assert.ok(playerTriangles<=1500);
 const sideline=new Sideline(),anchor=new THREE.Group(),parent=new THREE.Group();parent.add(anchor);anchor.position.set(3,0,-20);anchor.rotation.y=.37;anchor.scale.setScalar(1.3);
 const activities=Object.keys(DURATIONS),players=activities.map((activity,i)=>({activity,x:i,z:0,yaw:i*.2,shirt:'#2466d4',legs:'#30334c',phase:i*.13,target:[0,3.25,.6]}));
 sideline.setScenes([{anchor,players}]);let sampledFrames=0;
 for(let i=-10;i<=720;i++){const t=i/60;for(const a of activities)finitePose(samplePose(a,t));sideline.update(t);sampledFrames++;for(const b of Object.values(sideline.batches)){finite(b.mesh.instanceMatrix.array);for(const attr of Object.values(b.mesh.geometry.attributes))finite(attr.array);assert.ok(b.mesh.count<=b.mesh.instanceMatrix.count);}}
 assert.equal(sideline.group.children.length,6);assert.equal(new Set(sideline.group.children.map(m=>m.material)).size,1);assert.ok(sideline.group.children.every(m=>m.isInstancedMesh&&m.material.isMeshToonMaterial&&!m.material.transparent&&!m.castShadow));
 parent.visible=false;sideline.update(0);assert.ok(sideline.group.children.every(m=>m.count===0));parent.visible=true;
 sideline.setScenes([{anchor,players:Array.from({length:30},()=>players[0])}]);sideline.update(.96);assert.equal(sideline.batches.torso.mesh.count,16);assert.equal(sideline.batches.limbs.mesh.count,128);assert.equal(sideline.batches.balls.mesh.count,16);
 // Anchor scales scene offsets and targets, not body size, matching the existing API.
 sideline.setScenes([{anchor,players:[{...players[0],x:2,z:1,phase:0}]}]);sideline.update(.96);const m1=new THREE.Matrix4(),m2=new THREE.Matrix4(),s1=new THREE.Vector3(),s2=new THREE.Vector3();sideline.batches.head.mesh.getMatrixAt(0,m1);anchor.scale.setScalar(2.6);sideline.update(.96);sideline.batches.head.mesh.getMatrixAt(0,m2);m1.decompose(new THREE.Vector3(),new THREE.Quaternion(),s1);m2.decompose(new THREE.Vector3(),new THREE.Quaternion(),s2);assert.ok(s1.distanceTo(s2)<1e-6);
 for(const theme of ['nevo','ori']){const t=themeFor(theme);for(const list of[t.startPlayers,...t.boardPlayers]){sideline.setScenes([{anchor,players:list}]);sideline.update(1);for(const b of Object.values(sideline.batches))finite(b.mesh.instanceMatrix.array);}}
 let disposal=0;sideline.group.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposal++));sideline.group.children[0].material.addEventListener('dispose',()=>disposal++);sideline.dispose();sideline.dispose();assert.equal(disposal,7);
 const props={};for(const [name,build]of Object.entries({hoop,net,foamFinger})){const p=build();assert.equal(p.children.length,1);const mesh=p.children[0];props[name]={triangles:triangles(mesh.geometry),meshes:1,scale:p.scale.x};assert.ok(props[name].triangles<1000);for(const a of Object.values(mesh.geometry.attributes))finite(a.array);let d=0;mesh.geometry.addEventListener('dispose',()=>d++);mesh.material.addEventListener('dispose',()=>d++);disposeProp(p);disposeProp(p);assert.equal(d,2);}
 const files=(await fs.readdir(folder)).filter(f=>f.endsWith('.png'));let posterBytes=0,maxImageBytes=0;for(const file of files){const bytes=(await fs.stat(folder+'/'+file)).size,m=await sharp(folder+'/'+file).metadata();assert.ok(bytes<2_000_000);maxImageBytes=Math.max(maxImageBytes,bytes);if(file.includes('-ad-')){posterBytes+=bytes;assert.equal(m.width,768);assert.equal(m.height,384);}else if(/-(start|roadside|far|staged)\.png$/.test(file)){assert.equal(m.width,540);assert.equal(m.height,1170);}else{assert.equal(m.width,1200);assert.equal(m.height,800);}}
 assert.equal(files.filter(f=>f.includes('-ad-')).length,8);assert.ok(posterBytes<=256*1024);
 const report={playerTriangles,batchGeometryTriangles:counts,batches:6,materials:1,opaque:true,props,sampledFrames,finiteTransforms:true,capacityClamped:true,ancestorVisibility:true,anchorScaleConvention:true,productionPlayerSpecs:true,disposalIdempotent:true,pngCount:files.length,posterBytes,maxImageBytes};await fs.writeFile(folder+'/validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await server.close();}
