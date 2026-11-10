import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sideline,DURATIONS,type Activity,type PlayerSpec } from './players';
import { adsFor } from './ads';
import { hoop,net,foamFinger,disposeProp } from './props';
import { themeFor } from '../../../src/view/fanThemes';
import { buildRoadster } from '../01-player-roadster/roadster';

export const KEY_POSES:Record<string,[string,number][]>={shoot:[['Load',.10],['Release',.32],['Follow-through',.46],['Recover',.90]],dribble:[['High',0],['Low',.50]],karate:[['Guard',.05],['Chamber',.26],['Extension',.39],['Punch',.79]],bump:[['Contact',0],['Ready',.50]],cartwheel:[['Prepare',.05],['First hand',.40],['Inverted',.50],['Second hand',.60],['Land',.95]]};
const canvas=document.querySelector<HTMLCanvasElement>('#stage')!,poster=document.querySelector<HTMLCanvasElement>('#poster')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#dcd6d0');scene.add(new THREE.HemisphereLight('#fff3db','#887b9c',2.1));const sun=new THREE.DirectionalLight('#fff0d8',2.1);sun.position.set(-4,7,-6);scene.add(sun);
const camera=new THREE.PerspectiveCamera(34,1,.03,180),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:'#cbc4bb'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
const sideline=new Sideline(24);scene.add(sideline.group);const anchor=new THREE.Group();scene.add(anchor);const hoopProp=hoop(),netProp=net();scene.add(hoopProp,netProp);
const environment=new THREE.Group();scene.add(environment);const car=buildRoadster();scene.add(car.group);
const road=new THREE.Mesh(new THREE.PlaneGeometry(8.6,150),new THREE.MeshLambertMaterial({color:'#4a4458'}));road.rotation.x=-Math.PI/2;road.position.set(0,.001,-50);environment.add(road);for(const x of[-1.25,1.25])for(let z=8;z>-110;z-=4){const mark=new THREE.Mesh(new THREE.PlaneGeometry(.07,1.8),new THREE.MeshBasicMaterial({color:'#fff1d5'}));mark.rotation.x=-Math.PI/2;mark.position.set(x,.005,z);environment.add(mark);}
for(let i=0;i<12;i++)for(const side of[-1,1]){const height=4+(i*7%9);const block=new THREE.Mesh(new THREE.BoxGeometry(3,height,4),new THREE.MeshLambertMaterial({color:['#9d7592','#d39b85','#b98590'][i%3]}));block.position.set(side*15,height/2,-15-i*8);environment.add(block);}
const boardAnchor=new THREE.Group();scene.add(boardAnchor);const boardCanvas=document.createElement('canvas');boardCanvas.width=768;boardCanvas.height=384;const boardTexture=new THREE.CanvasTexture(boardCanvas);boardTexture.colorSpace=THREE.SRGBColorSpace;const board=new THREE.Mesh(new THREE.PlaneGeometry(8.4,4.2),new THREE.MeshBasicMaterial({map:boardTexture}));board.position.set(0,5.5,.06);boardAnchor.add(board);const frame=new THREE.Mesh(new THREE.BoxGeometry(8.68,4.48,.15),new THREE.MeshToonMaterial({color:'#282239'}));frame.position.set(0,5.5,-.05);boardAnchor.add(frame);for(const x of[-2.6,2.6]){const post=new THREE.Mesh(new THREE.BoxGeometry(.20,3.6,.22),frame.material);post.position.set(x,1.8,-.1);boardAnchor.add(post);}
const crowdAnchor=new THREE.Group();scene.add(crowdAnchor);const extras=new THREE.Group();scene.add(extras);let theme:'nevo'|'ori'='nevo',mode='players',activity:Activity='shoot',time=.96,ad=0,viewName='three-quarter',playing=false,poseName='release';
function player(a:Activity,x=0):PlayerSpec{return{activity:a,x,z:0,yaw:0,shirt:a==='karate'?'#fff8e9':a==='bump'||a==='cartwheel'?'#2466d4':'#19212d',legs:a==='karate'?'#fff8e9':a==='bump'?'#25324e':'#c4ced4',target:[0,3.25,-3]};}
function paint(){adsFor(theme)[ad](poster.getContext('2d')!,768,384);adsFor(theme)[ad](boardCanvas.getContext('2d')!,768,384);boardTexture.needsUpdate=true;}
function buttons(){const p=document.querySelector('#pose-buttons')!;p.replaceChildren();for(const [name,f] of KEY_POSES[activity]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{playing=false;document.querySelector('#play')!.textContent='Play animation';time=f*DURATIONS[activity];poseName=name.toLowerCase().replaceAll(' ','-');(document.querySelector('#cycle')as HTMLInputElement).value=String(f*100);draw();};p.append(b);}const a=document.querySelector('#ad-buttons')!;a.replaceChildren();for(let i=0;i<4;i++){const b=document.createElement('button');b.textContent=`Poster ${i+1}`;b.onclick=()=>{ad=i;paint();};a.append(b);}}
function crowd(){const list:PlayerSpec[]=[];for(const side of[-1,1])for(let i=0;i<4;i++){const gi=theme==='nevo'&&i%2===0;list.push({...player('cheer'),x:side*(5.2+(i%2)*.65),z:-7-i*3.0,yaw:side>0?.7:-.7,shirt:gi?'#fff8e9':theme==='nevo'?'#1d2532':'#2466d4',legs:gi?'#fff8e9':theme==='nevo'?'#c4ced4':'#25324e',uniform:gi?'karate':theme==='nevo'?'basketball':'volleyball',height:i%2?1.75:1.30,phase:i*.23});}return list;}
function setMode(next:string){
  mode=next;playing=false;document.querySelector('#play')!.textContent='Play animation';anchor.position.set(0,0,0);anchor.rotation.set(0,0,0);anchor.scale.setScalar(1);hoopProp.visible=netProp.visible=false;hoopProp.position.set(0,0,0);netProp.position.set(0,0,0);hoopProp.rotation.y=netProp.rotation.y=0;
  const chase=['start','roadside','far','staged'].includes(mode);environment.visible=car.group.visible=chase;boardAnchor.visible=mode==='roadside'||mode==='far'||mode==='staged';extras.visible=mode==='start';document.querySelector<HTMLElement>('#posters')!.style.display=mode==='posters'?'block':'none';sideline.group.visible=mode!=='posters'&&mode!=='hoop'&&mode!=='net';floor.visible=mode!=='posters';scene.background=new THREE.Color(chase?'#d39797':'#dcd6d0');scene.fog=chase?new THREE.Fog('#d39797',40,130):null;
  if(mode==='players')sideline.setScenes([{anchor,players:[player(activity)]}]);
  if(mode==='lineup')sideline.setScenes([{anchor,players:(['shoot','karate','bump','cartwheel']as Activity[]).map((a,i)=>({...player(a,(i-1.5)*1.6),activity:'cheer',uniform:a==='shoot'?'basketball':a==='karate'?'karate':a==='bump'?'volleyball':'gymnast',height:i===0?2.05:i===1?1.36:i===2?1.65:1.4}))}]);
  if(mode==='hoop')hoopProp.visible=true;if(mode==='net')netProp.visible=true;
  if(mode==='start'){
    const prop=theme==='nevo'?hoopProp:netProp;prop.visible=true;prop.position.set(theme==='nevo'?-6.4:7.6,0,-30);prop.rotation.y=theme==='nevo'?.75:-.5;
    sideline.setScenes([{anchor:prop,players:themeFor(theme).startPlayers},{anchor:crowdAnchor,players:crowd()}]);
    extras.children.forEach(o=>disposeProp(o as THREE.Group));extras.clear();if(theme==='nevo')for(const side of[-1,1]){const finger=foamFinger(side<0?'#00aaa6':'#ed4e83');finger.position.set(side*5.7,1.5,-10);finger.rotation.y=Math.PI;extras.add(finger);}
  }
  if(mode==='roadside'||mode==='far'){
    boardAnchor.position.set(8.8,0,mode==='far'?-38:-18);boardAnchor.rotation.y=-.35;sideline.setScenes([{anchor:boardAnchor,players:themeFor(theme).boardPlayers[ad%2]}]);
  }
  if(mode==='staged'){boardAnchor.position.set(6.5,0,-38);boardAnchor.rotation.y=-.35;anchor.position.set(5.7,0,-18);anchor.rotation.y=Math.PI/2;sideline.setScenes([{anchor,players:themeFor(theme).boardPlayers[ad%2].map(p=>({...p,z:p.z-2.6,target:p.target?[p.target[0],p.target[1],p.target[2]-2.6] as [number,number,number]:undefined}))}]);}
  const target=new THREE.Vector3();let pos=new THREE.Vector3();camera.fov=chase?62:34;
  if(chase){pos.set(0,5,9.5);target.set(0,1,-12);}
  else if(mode==='hoop'){target.set(0,2.9,.2);pos.set(-7,4.8,9.2);}
  else if(mode==='net'){target.set(0,1.7,0);pos.set(-7,4,10);}
  else if(mode==='lineup'){target.set(0,1,0);pos.set(0,2.4,-10);}
  else if(activity==='shoot'){target.set(0,1.4,0);pos.set(-3.5,2.3,-6.4);}
  else{target.set(0,1,0);pos.set(-3,2.0,-5.2);}
  if(!chase&&mode!=='posters'&&viewName!=='three-quarter'){const d=pos.distanceTo(target),sign=mode==='hoop'||mode==='net'?1:-1;pos=viewName==='front'?target.clone().add(new THREE.Vector3(0,.1,d*sign)):viewName==='back'?target.clone().add(new THREE.Vector3(0,.1,-d*sign)):target.clone().add(new THREE.Vector3(-d,.1,0));}
  camera.position.copy(pos);controls.target.copy(target);controls.update();paint();resize();draw();
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
function draw(){sideline.update(time);document.querySelector('#stats')!.textContent=`${theme} · ${mode} · ${activity} · ${time.toFixed(2)} s · six instanced player/ball batches`;
 document.querySelector('#caption')!.textContent=['start','roadside','far','staged'].includes(mode)?'Isolated staging study using the game’s 62° chase camera. Production integration remains with Claude.':'Original generic athletes. No real-person likeness or team logos.';renderer.render(scene,camera);document.querySelector('#stats')!.textContent+=` · ${renderer.info.render.calls} scene draws`; }
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode!));document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.onclick=()=>{theme=b.dataset.theme as typeof theme;setMode(mode);});document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{viewName=b.dataset.view!;setMode(mode);});
document.querySelector<HTMLSelectElement>('#activity')!.onchange=e=>{activity=(e.target as HTMLSelectElement).value as Activity;time=.3*DURATIONS[activity];poseName='cycle-30';buttons();setMode('players');};document.querySelector<HTMLInputElement>('#cycle')!.oninput=e=>{playing=false;document.querySelector('#play')!.textContent='Play animation';time=Number((e.target as HTMLInputElement).value)/100*DURATIONS[activity];poseName=`cycle-${(e.target as HTMLInputElement).value}`;draw();};document.querySelector<HTMLButtonElement>('#play')!.onclick=()=>{playing=!playing;document.querySelector('#play')!.textContent=playing?'Pause animation':'Play animation';};
document.querySelector<HTMLButtonElement>('#save')!.onclick=()=>{
  const portrait=['start','roadside','far','staged'].includes(mode),w=portrait?540:1200,h=portrait?1170:800;
  let href:string,name:string;if(mode==='posters'){href=poster.toDataURL('image/png');name=`${theme}-ad-${ad+1}.png`;}else{const ratio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();sideline.update(time);renderer.render(scene,camera);href=canvas.toDataURL('image/png');name=mode==='players'?`${activity}-${poseName}${viewName==='three-quarter'?'':'-'+viewName}.png`:mode==='hoop'||mode==='net'?`${mode}-${viewName}.png`:`${theme}-${mode}.png`;renderer.setPixelRatio(ratio);resize();}
  document.querySelector('#render-download')?.remove();const a=document.createElement('a');a.id='render-download';a.href=href;a.download=name;a.textContent='Download image';document.querySelector('nav')!.append(a);
};
buttons();setMode('players');void document.fonts.ready.then(paint);let last=0;renderer.setAnimationLoop(t=>{if(playing)time+=Math.min(.05,(t-last)/1000);last=t;controls.update();draw();});
