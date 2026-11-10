import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoadster } from './roadster';
const canvas=document.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e3de');
scene.add(new THREE.HemisphereLight('#fff4e5','#605875',1.7));
const sun=new THREE.DirectionalLight('#fff2dd',1.8);sun.position.set(-3,7,-5);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.025;scene.add(sun);
const car=buildRoadster();scene.add(car.group);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshToonMaterial({color:'#d8d3d0'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(32,1,.05,200);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.5,0);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=18;controls.enableDamping=true;
const road=new THREE.Group();road.visible=false;scene.add(road);
const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(6,90),new THREE.MeshToonMaterial({color:'#4a4458'}));asphalt.rotation.x=-Math.PI/2;asphalt.position.set(0,.002,-25);asphalt.receiveShadow=true;road.add(asphalt);
for(const x of [-1,1])for(let z=-65;z<12;z+=3){const line=new THREE.Mesh(new THREE.PlaneGeometry(.05,1.3),new THREE.MeshBasicMaterial({color:'#f4e9d8'}));line.rotation.x=-Math.PI/2;line.position.set(x,.008,z);road.add(line);}
const views:Record<string,number[]>={'three-quarter':[4,2.8,-5],front:[0,1.2,-6.5],side:[6.8,1.2,0],back:[0,1.4,6.5],gameplay:[0,4.6,7.6]};
function view(name:string){const v=views[name]??views['three-quarter'];camera.position.set(v[0],v[1],v[2]);controls.target.set(0,name==='gameplay'?0:.50,name==='gameplay'?-2:0);road.visible=name==='gameplay';controls.update();}
view(new URLSearchParams(location.search).get('view')??'three-quarter');
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
let paintIndex=0;document.querySelector<HTMLButtonElement>('#paint')!.onclick=()=>car.paint.color.set(['#4382b8','#b3ee48','#f4e9d8','#8056b8','#e8344e'][paintIndex++%5]);
// Preview only: bounded particle pool. Geometry/material are allocated once.
const puffMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.38,depthWrite:false});
const puffs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),puffMat,64);puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);puffs.frustumCulled=false;scene.add(puffs);
const particles=Array.from({length:64},()=>({pos:new THREE.Vector3(),vel:new THREE.Vector3(),age:10}));let cursor=0,jump=-1,last=0;
const dummy=new THREE.Object3D();const q=new THREE.Quaternion();
function burst(){car.group.updateMatrixWorld(true);for(const socket of car.thrusters)for(let n=0;n<5;n++){
 const p=particles[cursor++%64];socket.getWorldPosition(p.pos);socket.getWorldQuaternion(q);p.vel.set((Math.random()-.5)*.6,-2.5,(Math.random()-.5)*.6).applyQuaternion(q);p.age=0;
}}
document.querySelector<HTMLButtonElement>('#jump')!.onclick=()=>{if(jump<0){jump=0;burst();}};
let triangles=0,meshes=0;car.group.traverse(o=>{if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;meshes++;}});
document.querySelector('#stats')!.textContent=`${triangles.toLocaleString()} triangles · ${meshes} meshes`;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.zoom=Math.min(1,camera.aspect/1.1);camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function frame(now:number){const dt=Math.min((now-last)/1000,.05);last=now;if(jump>=0){const prev=jump;jump+=dt;const t=Math.min(jump/1.8,1);car.group.position.y=2.4*4*t*(1-t);const roll=THREE.MathUtils.smoothstep(t,.2,.78);car.group.rotation.z=roll*Math.PI*2;if(prev<.35&&jump>=.35)burst();if(t>=1){car.group.position.y=0;car.group.rotation.z=0;jump=-1;burst();}}
 particles.forEach((p,i)=>{p.age+=dt;p.pos.addScaledVector(p.vel,dt);dummy.position.copy(p.pos);dummy.scale.setScalar(p.age<.65?.045+p.age*.32:0);dummy.updateMatrix();puffs.setMatrixAt(i,dummy.matrix);});puffs.instanceMatrix.needsUpdate=true;
 controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
