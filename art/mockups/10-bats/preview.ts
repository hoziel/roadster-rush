import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildBat} from './bat';
import {buildRoadster} from '../01-player-roadster/roadster';
const canvas=document.querySelector('canvas')!,renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,300),orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;
const hemi=new THREE.HemisphereLight('#fff1df','#6a4c86',2.5),sun=new THREE.DirectionalLight('#ffe0bb',2.8),rim=new THREE.DirectionalLight('#c7c3ff',1.8);sun.position.set(-3,5,-4);rim.position.set(3,2,4);scene.add(hemi,sun,rim);
const bat=buildBat();scene.add(bat.group);
const road=new THREE.Group();scene.add(road);
function box(w:number,h:number,d:number,x:number,y:number,z:number,color:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshToonMaterial({color}));m.position.set(x,y,z);road.add(m);return m;}
box(100,.1,180,0,-.13,-55,'#50364e');box(8.6,.10,160,0,-.025,-50,'#4d4661');
for(const x of[-4.4,4.4])box(.28,.16,150,x,0,-50,'#dd997e');
for(let z=6;z>-105;z-=6)for(const x of[-1.25,1.25])box(.09,.02,2.0,x,.035,z,'#ffdca5');
// Simplified Congress bridge and city context, authored for this staging study.
box(23,.65,7,0,6.2,-30,'#c28c7e');box(23,.23,.25,0,7.15,-26.55,'#e3b099');box(23,.23,.25,0,7.15,-33.45,'#e3b099');
for(const x of[-10,-5,5,10])box(1,6.0,1.4,x,3,-30,'#b2827c');
for(let x=-10.5;x<=10.5;x+=1.5)box(.12,.8,.12,x,6.65,-26.55,'#e3b099');
for(let i=0;i<12;i++){const side=i%2?-1:1,z=-18-Math.floor(i/2)*14,h=6+(i*7%13);box(5,h,7,side*(11+i%3*3),h/2,z,'#745c85');for(let y=2;y<h-1;y+=2.5)box(.03,.7,4,side*(8.49+i%3*3),y,z,'#ffd08c');}
for(const side of[-1,1])for(let i=0;i<5;i++){const x=side*6.4,z=-8-i*17;box(.35,3,.35,x,1.5,z,'#735464');const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(2,0),new THREE.MeshToonMaterial({color:'#506d68'}));leaves.position.set(x,4,z);leaves.scale.set(1,.7,1);road.add(leaves);}
const car=buildRoadster();road.add(car.group);car.group.position.set(0,.02,0);
const stars=new THREE.Group();road.add(stars);const starMat=new THREE.MeshBasicMaterial({color:'#fff1da'}),starGeo=new THREE.IcosahedronGeometry(.07,0);for(let i=0;i<40;i++){const s=new THREE.Mesh(starGeo,starMat);s.position.set(Math.sin(i*11)*50,18+(i*13%35),-85-(i*17%60));stars.add(s);}
const count=70,swarm=new THREE.Group();scene.add(swarm);const meshes=[bat.geometries.body,bat.geometries.leftWing,bat.geometries.rightWing].map(g=>{const m=new THREE.InstancedMesh(g,bat.material,count);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;swarm.add(m);return m;});
const root=new THREE.Matrix4(),body=new THREE.Matrix4(),left=new THREE.Matrix4(),right=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),euler=new THREE.Euler(),size=new THREE.Vector3();
function updateSwarm(time:number){for(let i=0;i<count;i++){const j=i%10,k=Math.floor(i/10),phase=i*2.399;pos.set((j-4.5)*1.1+Math.sin(phase)*.30,5.0+(i*7%11)*.22+Math.sin(time*2+phase)*.16,-9-k*4.3-Math.cos(phase)*.8);rot.setFromEuler(euler.set(.08+Math.sin(phase)*.15,Math.PI+Math.sin(phase)*.28,Math.sin(phase+time)*.14));size.setScalar(1.4+(i*17%9)*.1);root.compose(pos,rot,size);bat.writeInstanceMatrices(root,Math.sin(time*14+phase)*.82,body,left,right);meshes[0].setMatrixAt(i,body);meshes[1].setMatrixAt(i,left);meshes[2].setMatrixAt(i,right);}meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);}
let current='three-quarter',animating=false,time=0;const stats=document.querySelector('#stats')!,note=document.querySelector('#note')!;
const portrait=()=>current.startsWith('swarm')||current==='splat-screen';
function resize(){const area=Math.max(340,innerWidth-340),h=innerHeight,w=portrait()?Math.min(area,h*540/1170):area;renderer.setSize(w,h,false);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.style.marginLeft=`${340+(area-w)/2}px`;camera.aspect=w/h;camera.updateProjectionMatrix();}
function view(name:string){current=name;animating=false;time=0;document.querySelector('#animate')!.textContent='Animate';const game=portrait(),night=name==='swarm-night';road.visible=game;swarm.visible=name.startsWith('swarm');bat.group.visible=!swarm.visible;stars.visible=night;
 bat.group.position.set(0,0,0);bat.group.rotation.set(0,0,0);bat.setPose(name.startsWith('splat')?'splat':'glide');camera.fov=game?62:32;orbit.enabled=!game;
 scene.background=new THREE.Color(game?(night?'#18152f':'#eaa480'):'#e8dacc');scene.fog=game?new THREE.Fog(night?'#29213c':'#cc9b9b',48,145):null;
 hemi.intensity=game?(night?.65:1.65):2.5;sun.intensity=game?(night?.35:2):2.8;rim.intensity=game?(night?1.7:1.1):1.8;
 if(game){camera.position.set(0,5,9.5);orbit.target.set(0,1,-12);camera.lookAt(orbit.target);if(name==='splat-screen'){camera.updateMatrixWorld();bat.group.position.copy(camera.position).add(new THREE.Vector3(.018,-.018,-.6).applyQuaternion(camera.quaternion));bat.group.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI));bat.group.scale.multiplyScalar(.32);}}
 else{const target=new THREE.Vector3(0,.035,0),d=name.startsWith('flap')?1.85:1.60;orbit.target.copy(target);camera.position.set(name==='side'?-d:name==='three-quarter'?-.9:0,.11,name==='side'?0:name==='back'?d:name==='three-quarter'?-1.25:-d);camera.lookAt(target);}
 const angles:Record<string,number>={'flap-1':.82,'flap-2':.10,'flap-3':-.82,'flap-4':-.10};bat.setFlap(angles[name]??0);updateSwarm(0);resize();orbit.update();
 stats.textContent=`713 triangles / bat · 3 meshes · 1 opaque material${swarm.visible?' · 70 bats / 3 instanced draws':''}`;
 note.textContent=game?'Portrait chase-camera art study · 62° FOV · native models; simplified road staging.':name.startsWith('splat')?'Glass pose: width 108%, height 86%, depth 28%. No transparency.':'Round body, pink ears and scalloped plum wings. Each wing rotates at its shoulder.';
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));document.querySelector<HTMLButtonElement>('#animate')!.onclick=()=>{animating=!animating;document.querySelector('#animate')!.textContent=animating?'Pause':'Animate';};
document.querySelector<HTMLButtonElement>('#save')!.onclick=()=>{const ratio=renderer.getPixelRatio(),w=portrait()?540:1200,h=portrait()?1170:900;renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);document.querySelector('#render-download')?.remove();const a=document.createElement('a');a.id='render-download';a.download=`bat-${current}.png`;a.href=canvas.toDataURL('image/png');a.textContent='Download image';document.querySelector('nav')!.append(a);renderer.setPixelRatio(ratio);resize();};
addEventListener('resize',resize);view('three-quarter');let last=0;renderer.setAnimationLoop(ms=>{const delta=Math.min((ms-last)/1000,.05);last=ms;if(animating){time+=delta;if(swarm.visible)updateSwarm(time);else bat.update(time);}orbit.update();renderer.render(scene,camera);});
