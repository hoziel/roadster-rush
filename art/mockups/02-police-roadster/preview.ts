import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoadster } from '../01-player-roadster/roadster';
import { buildPoliceRoadster } from './police-roadster';
import { ThrusterVapor } from '../01-player-roadster/thruster-vapor';
const canvas=document.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#d8dbe0');scene.fog=new THREE.Fog('#d8dbe0',14,38);
scene.add(new THREE.HemisphereLight('#f3f6ff','#666476',1.1));
const sun=new THREE.DirectionalLight('#fff6eb',2.1);sun.position.set(-3,7,-5);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.camera.near=.5;sun.shadow.camera.far=20;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);
const car=buildPoliceRoadster();scene.add(car.group);
const player=buildRoadster();player.group.visible=false;scene.add(player.group);
// Studio presentation: keep the ground shadow and clean toon panel shading.
for(const vehicle of [car,player])vehicle.group.traverse(o=>{if(o instanceof THREE.Mesh)o.receiveShadow=false;});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({color:'#c8cbd2'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(32,1,.05,200);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.5,0);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=18;controls.enableDamping=true;
const road=new THREE.Group();road.visible=false;scene.add(road);
const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(6,90),new THREE.MeshToonMaterial({color:'#4a4458'}));asphalt.rotation.x=-Math.PI/2;asphalt.position.set(0,.002,-25);asphalt.receiveShadow=true;road.add(asphalt);
for(const x of [-1,1])for(let z=-65;z<12;z+=3){const line=new THREE.Mesh(new THREE.PlaneGeometry(.05,1.3),new THREE.MeshBasicMaterial({color:'#f4e9d8'}));line.rotation.x=-Math.PI/2;line.position.set(x,.008,z);road.add(line);}
const views:Record<string,number[]>={'three-quarter':[4.4,1.9,-5.6],front:[0,1.2,-6.5],side:[6.8,1.2,0],back:[0,1.4,6.5],gameplay:[0,4.6,7.6],chase:[0,4.6,7.6]};
let currentView='three-quarter';
function view(name:string){
 currentView=name;const v=views[name]??views['three-quarter'];camera.position.set(v[0],v[1],v[2]);
 const driving=name==='gameplay'||name==='chase';controls.target.set(0,driving?0:.55,driving?-2:0);
 car.group.position.z=name==='chase'?15:0;player.group.visible=name==='chase';road.visible=driving;controls.update();
 document.querySelector('#mirror-label')!.classList.toggle('visible',name==='chase');
}
const mirrorCamera=new THREE.PerspectiveCamera(35,2.5,.1,90);mirrorCamera.position.set(0,2.5,1.8);mirrorCamera.lookAt(0,.6,19);
const renderSize=new THREE.Vector2();
function render(){
 renderer.getSize(renderSize);const w=renderSize.x,h=renderSize.y;
 renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);renderer.render(scene,camera);
 if(currentView==='chase'){
  const mw=w*.66,mh=mw/2.5,mx=(w-mw)/2,my=h*.78;
  renderer.setScissorTest(true);renderer.setScissor(mx-3,my-3,mw+6,mh+6);renderer.setClearColor('#293d65');renderer.clear();
  renderer.setViewport(mx,my,mw,mh);renderer.setScissor(mx,my,mw,mh);renderer.render(scene,mirrorCamera);
  renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
 }
}
view(new URLSearchParams(location.search).get('view')??'three-quarter');
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
let lights=true;
const lightsButton=document.querySelector<HTMLButtonElement>('#lights')!;
lightsButton.onclick=()=>{lights=!lights;car.setLights(lights);lightsButton.textContent=lights?'Lights on':'Lights off';lightsButton.setAttribute('aria-pressed',String(lights));};
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
// Render an actual model still at artifact resolution, restoring the live viewport afterwards.
document.querySelector<HTMLButtonElement>('#save')!.onclick=()=>{
 const portrait=currentView==='gameplay'||currentView==='chase';
 const width=portrait?540:1200,height=portrait?1170:800;
 const pixelRatio=renderer.getPixelRatio(),aspect=camera.aspect,zoom=camera.zoom;
 renderer.setPixelRatio(1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.zoom=portrait?.52:jump>=0?.65:1;camera.updateProjectionMatrix();
 render();
 document.querySelector('#render-download')?.remove();
 const link=document.createElement('a');link.id='render-download';link.textContent='Download image';link.download=`police-roadster-${currentView}.png`;link.href=canvas.toDataURL('image/png');
 document.querySelector('nav')!.append(link);
 renderer.setPixelRatio(pixelRatio);resize();camera.aspect=aspect;camera.zoom=zoom;camera.updateProjectionMatrix();render();
};
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
 car.updateLights(now/1000);vapor.update(dt);controls.update();render();requestAnimationFrame(frame);
}requestAnimationFrame(frame);
