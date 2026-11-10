import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildDriver, type DriverId } from './drivers';
import { buildRoadster } from '../01-player-roadster/roadster';

const ids:DriverId[]=['nevo','ori','shiri','ofir'];
const canvas=document.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e2ddd7');
const light=new THREE.HemisphereLight('#fff5e6','#91849f',2.0);scene.add(light);
const sun=new THREE.DirectionalLight('#fff3df',2.5);sun.position.set(-3,7,-5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});sun.shadow.normalBias=.02;scene.add(sun);
const fill=new THREE.DirectionalLight('#c6d5ff',1.2);fill.position.set(3,3,4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshToonMaterial({color:'#d3cbc4'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
const drivers=Object.fromEntries(ids.map(id=>[id,buildDriver(id)])) as Record<DriverId,ReturnType<typeof buildDriver>>;ids.forEach(id=>scene.add(drivers[id].group));
const car=buildRoadster();scene.add(car.group);car.group.traverse(o=>{if(o instanceof THREE.Mesh)o.receiveShadow=false;});
const camera=new THREE.PerspectiveCamera(30,1,.02,100);const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.49;
let selected:DriverId='nevo',current='three-quarter',waving=false;
const stats=document.querySelector('#stats')!,note=document.querySelector('#note')!;
function metrics(){let triangles=0,meshes=0;drivers[selected].group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return{triangles,meshes};}
function view(name:string){
  current=name;waving=false;const lineup=name==='lineup',withCar=['door','chase','cutaway','seat-full'].includes(name),inCar=name==='chase'||name==='cutaway'||name==='seat-full';
  for(const [index,id]of ids.entries()){
    const d=drivers[id];d.group.visible=lineup||id===selected;d.group.position.set(lineup?(index-1.5)*.95:0,0,0);d.group.rotation.set(0,0,0);d.setPose(name==='seated'||inCar?'seated':'standing');
  }
  car.group.visible=withCar;car.group.position.set(0,0,0);car.setDoorOpen(name==='door'||name==='cutaway'||name==='seat-full'?1:0);
  // The glazing is opaque in the actual asset. Cutaway is explicitly a diagnostic view.
  car.group.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)&&(o.material as THREE.MeshPhongMaterial).shininess===85)o.visible=name!=='cutaway';});
  const d=drivers[selected];
  if(name==='door')d.group.position.set(-1.37,0,-.32);
  if(inCar){
    // Preview-only fit study: intentionally expose the required scale reduction in the UI/notes.
    if(name!=='seat-full')d.group.scale.multiplyScalar(selected==='nevo'?.66:selected==='ori'?.65:.55);d.group.position.set(-.33,.43,.22);
  }
  const bounds=new THREE.Box3().setFromObject(d.group),height=bounds.max.y-bounds.min.y;
  floor.position.y=name==='seated'?bounds.min.y-.008:-.008;
  let position:THREE.Vector3,target:THREE.Vector3;
  if(lineup){position=new THREE.Vector3(0,1.8,-7.8);target=new THREE.Vector3(0,.85,0);}
  else if(name==='door'){position=new THREE.Vector3(-5,2.5,-5.7);target=new THREE.Vector3(-.3,.65,0);}
  else if(name==='chase'){position=new THREE.Vector3(0,3.9,6.4);target=new THREE.Vector3(0,.55,-.4);}
  else if(name==='cutaway'||name==='seat-full'){position=new THREE.Vector3(-3.1,2.5,2.4);target=new THREE.Vector3(-.22,.62,-.05);}
  else if(name==='face'){const head=new THREE.Vector3();d.joints.head.getWorldPosition(head);position=head.clone().add(new THREE.Vector3(0,.01,-1.25));target=head;}
  else{const y=height*.51+(name==='seated'?bounds.min.y:0),distance=name==='seated'?3.8:height*3.3;target=new THREE.Vector3(0,y,0);const angled=name==='three-quarter'||name==='seated';position=new THREE.Vector3(name==='side'?-distance:angled?-distance*.61:0,y+height*.10,name==='side'?0:name==='back'?distance:-distance*(angled?.84:1));}
  camera.position.copy(position);orbit.target.copy(target);orbit.update();const m=metrics();stats.textContent=`${selected} · ${m.triangles.toLocaleString()} triangles · ${m.meshes} articulated meshes · 1 opaque Toon material`;
  note.textContent=name==='seat-full'?'Actual character scale: head intersects the existing canopy. This is a failed fit check.':inCar?`Seat fit study: ${Math.round((selected==='nevo'?.66:selected==='ori'?.65:.55)*100)}% size. ${name==='cutaway'?'Glazing hidden for inspection.':'Original opaque canopy retained.'}`:'Likeness study for review; not approved production character art.';
  resize();
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.zoom=1;camera.updateProjectionMatrix();}
addEventListener('resize',resize);document.querySelectorAll<HTMLButtonElement>('[data-driver]').forEach(b=>b.onclick=()=>{selected=b.dataset.driver as DriverId;document.querySelectorAll<HTMLButtonElement>('[data-driver]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));view(current);});document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
document.querySelector<HTMLButtonElement>('#wave')!.onclick=()=>{if(!['front','three-quarter','side','back','face','lineup'].includes(current))view('three-quarter');waving=!waving;};
document.querySelector<HTMLButtonElement>('#save')!.onclick=()=>{
  const portrait=current==='chase',wide=current==='lineup',w=portrait?540:wide?1600:1000,h=portrait?1170:wide?900:1000;
  const ratio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.zoom=portrait?.62:1;camera.updateProjectionMatrix();renderer.render(scene,camera);
  document.querySelector('#render-download')?.remove();const a=document.createElement('a');a.id='render-download';a.textContent='Download image';a.download=wide?'lineup.png':`${selected}-${current}.png`;a.href=canvas.toDataURL('image/png');document.querySelector('nav')!.append(a);renderer.setPixelRatio(ratio);resize();
};
view('three-quarter');renderer.setAnimationLoop(t=>{if(waving)drivers[selected].setWave(Math.sin(t*.006)*.25);orbit.update();renderer.render(scene,camera);});
