import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoadster } from './roadster';
import { ThrusterVapor } from './thruster-vapor';
const canvas=document.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e3de');
scene.add(new THREE.HemisphereLight('#f3f6ff','#666476',1.8));
const sun=new THREE.DirectionalLight('#ffffff',1.7);sun.position.set(-3,7,-5);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.025;scene.add(sun);
const car=buildRoadster('#d7dbe2');scene.add(car.group);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshToonMaterial({color:'#d8d3d0'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(32,1,.05,200);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.5,0);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=18;controls.enableDamping=true;
const road=new THREE.Group();road.visible=false;scene.add(road);
const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(6,90),new THREE.MeshToonMaterial({color:'#4a4458'}));asphalt.rotation.x=-Math.PI/2;asphalt.position.set(0,.002,-25);asphalt.receiveShadow=true;road.add(asphalt);
for(const x of [-1,1])for(let z=-65;z<12;z+=3){const line=new THREE.Mesh(new THREE.PlaneGeometry(.05,1.3),new THREE.MeshBasicMaterial({color:'#f4e9d8'}));line.rotation.x=-Math.PI/2;line.position.set(x,.008,z);road.add(line);}
const views:Record<string,number[]>={'three-quarter':[4.4,1.9,-5.6],front:[0,1.2,-6.5],side:[6.8,1.2,0],back:[0,1.4,6.5],gameplay:[0,4.6,7.6]};
function view(name:string){const v=views[name]??views['three-quarter'];camera.position.set(v[0],v[1],v[2]);controls.target.set(0,name==='gameplay'?0:.50,name==='gameplay'?-2:0);road.visible=name==='gameplay';controls.update();}
view(new URLSearchParams(location.search).get('view')??'three-quarter');
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
let paintIndex=0;document.querySelector<HTMLButtonElement>('#paint')!.onclick=()=>car.paint.color.set(['#e8344e','#4382b8','#b3ee48','#8056b8','#d7dbe2'][paintIndex++%5]);
const vapor=new ThrusterVapor();scene.add(vapor.mesh);
const origin=new THREE.Vector3(),direction=new THREE.Vector3();const rotation=new THREE.Quaternion();
let jump=-1,last=0,jetClock=0,doorTarget=0,doorAmount=0;
const doorButton=document.querySelector<HTMLButtonElement>('#doors')!;
doorButton.onclick=()=>{doorTarget=1-doorTarget;doorButton.textContent=doorTarget?'Close doors':'Open doors';doorButton.setAttribute('aria-pressed',String(!!doorTarget));};
function burst(landing=false){car.group.updateMatrixWorld(true);for(const socket of car.thrusters){socket.getWorldPosition(origin);vapor.burst(origin,landing);}}
function jets(){car.group.updateMatrixWorld(true);for(const socket of car.thrusters){socket.getWorldPosition(origin);socket.getWorldQuaternion(rotation);direction.set(0,-1,0).applyQuaternion(rotation);vapor.jet(origin,direction);}}
document.querySelector<HTMLButtonElement>('#jump')!.onclick=()=>{if(jump<0){jump=0;jetClock=0;burst();}};
let triangles=0,meshes=0;car.group.traverse(o=>{if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;meshes++;}});
document.querySelector('#stats')!.textContent=`${triangles.toLocaleString()} triangles · ${meshes} meshes`;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.zoom=Math.min(1,camera.aspect/1.1);camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function frame(now:number){
 const dt=Math.min((now-last)/1000,.05);last=now;
 doorAmount=THREE.MathUtils.damp(doorAmount,doorTarget,6,dt);car.setDoorOpen(doorAmount);
 if(jump>=0){
   jump+=dt;const t=Math.min(jump/2.1,1);
   car.group.position.y=2.4*4*t*(1-t);
   const roll=THREE.MathUtils.smoothstep(t,.24,.77);car.group.rotation.z=roll*Math.PI*2;
   jetClock+=dt;
   if(jetClock>.035&&(t<.30||(t>.36&&t<.65)||t>.82)){jets();jetClock=0;}
   if(t>=1){car.group.position.y=0;car.group.rotation.z=0;jump=-1;burst(true);}
 }
 vapor.update(dt);controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
