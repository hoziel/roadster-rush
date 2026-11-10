import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoadster } from '../01-player-roadster/roadster';
import { buildCybercab } from './cybercab.js';
import { buildWaymo } from './waymo.js';
import { buildCybertruck } from './cybertruck.js';

const canvas = document.querySelector('canvas')!;
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
const hemi=new THREE.HemisphereLight('#f2f4ff','#716777',1.4);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff2dc',2.2);sun.position.set(-4,8,-6);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:8,bottom:-24,near:.5,far:50});sun.shadow.normalBias=.035;scene.add(sun);
const models={cybercab:buildCybercab(),waymo:buildWaymo(),cybertruck:buildCybertruck()};
Object.values(models).forEach(m=>scene.add(m.group));
const player=buildRoadster();player.group.traverse(o=>{if(o instanceof THREE.Mesh)o.receiveShadow=false;});scene.add(player.group);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshLambertMaterial({color:'#c7c9cf'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const environment=new THREE.Group();scene.add(environment);
const road=new THREE.Mesh(new THREE.PlaneGeometry(8.1,120),new THREE.MeshLambertMaterial({color:'#4a4458'}));road.rotation.x=-Math.PI/2;road.position.set(0,.003,-45);road.receiveShadow=true;environment.add(road);
for(const x of [-1.25,1.25])for(let z=6;z>-100;z-=4){const g=new THREE.Mesh(new THREE.PlaneGeometry(.07,1.8),new THREE.MeshBasicMaterial({color:'#f4e9d8'}));g.rotation.x=-Math.PI/2;g.position.set(x,.008,z);environment.add(g);}
for(const side of [-1,1])for(let i=0;i<15;i++){
 const h=2.8+(i*7%11)*.45;
 const b=new THREE.Mesh(new THREE.BoxGeometry(2.3,h,3.7),new THREE.MeshLambertMaterial({color:['#9a729a','#bf8b8c','#8a6995'][i%3]}));b.position.set(side*(6+(i%3)*1.1),h/2,-12-i*5);environment.add(b);
}
const sky=new THREE.Mesh(new THREE.SphereGeometry(100,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#493365')},bottom:{value:new THREE.Color('#efab75')}},vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(0.,35.,v.y)),1.); #include <colorspace_fragment> }'.replace('; #include',';\n#include').replace('fragment> }','fragment>\n}') }));environment.add(sky);
const disc=new THREE.Mesh(new THREE.SphereGeometry(5,24,12),new THREE.MeshBasicMaterial({color:'#ffd893'}));disc.position.set(-7,10,-65);environment.add(disc);
const camera=new THREE.PerspectiveCamera(33,1,.05,150);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;
let selected:'cybercab'|'waymo'|'cybertruck'='cybercab',currentView='three-quarter';
const views:Record<string,number[]>={'three-quarter':[5.5,2.9,-7.5],side:[8.6,1.8,0],front:[0,1.7,-8.4],back:[0,1.9,8.4],gameplay:[0,6.3,11.0]};
function view(name:string){
 currentView=name;const driving=name==='gameplay';
 environment.visible=driving;player.group.visible=driving;
 scene.background=driving?null:new THREE.Color('#d5d8df');scene.fog=driving?new THREE.Fog('#d99c8f',20,88):null;
 (floor.material as THREE.MeshLambertMaterial).color.set(driving?'#b88f75':'#c7c9cf');
 for(const [id,m] of Object.entries(models)){m.group.visible=driving||id===selected;m.group.position.set(driving?(id==='cybercab'?-2.5:id==='waymo'?2.5:0):0,0,driving?(id==='cybercab'?-7.2:id==='waymo'?-12:-21):0);}
 player.group.position.set(0,0,2.1);
 const v=views[name]??views['three-quarter'];const scale=selected==='cybertruck'&&!driving?1.25:1;camera.position.set(v[0]*scale,v[1]*scale,v[2]*scale);controls.target.set(0,driving?.7:selected==='cybertruck'?1:.82,driving?-8:0);controls.update();
 const m=models[selected],n=m.geometry.getAttribute('position').count/3,b=m.geometry.boundingBox!;
 document.querySelector('#stats')!.textContent=driving?'All three traffic models face −Z · red player roadster behind':`${selected} · ${n.toLocaleString()} triangles · 1 mesh · 1 material · ${(b.max.x-b.min.x).toFixed(2)} × ${(b.max.y-b.min.y).toFixed(2)} × ${(b.max.z-b.min.z).toFixed(2)} m`;
 resize();
}
document.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(b=>b.onclick=()=>{selected=b.dataset.car as typeof selected;document.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));view(currentView);});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.zoom=currentView==='gameplay'?1:Math.min(1.25,camera.aspect/1.1);camera.updateProjectionMatrix();}addEventListener('resize',resize);
view('three-quarter');resize();
document.querySelector<HTMLButtonElement>('#save')!.onclick=()=>{
 const portrait=currentView==='gameplay',w=portrait?540:1200,h=portrait?1170:800;
 const ratio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.zoom=portrait?.48:1.25;camera.updateProjectionMatrix();renderer.render(scene,camera);
 document.querySelector('#render-download')?.remove();const a=document.createElement('a');a.id='render-download';a.textContent='Download image';a.download=portrait?'gameplay.png':`${selected}-${currentView}.png`;a.href=canvas.toDataURL('image/png');document.querySelector('nav')!.append(a);
 renderer.setPixelRatio(ratio);resize();
};
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
