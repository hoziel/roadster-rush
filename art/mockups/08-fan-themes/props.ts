import * as THREE from 'three';
import { GeometryKit } from './players';
const NAVY='#30334c',CREAM='#fff1d8',BLUE='#2466d4',TEAL='#00aaa6';
function finish(kit:GeometryKit,name:string,scale:number){const geometry=kit.finish(),material=new THREE.MeshToonMaterial({vertexColors:true}),mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;const group=new THREE.Group();group.name=name;group.add(mesh);group.scale.setScalar(scale);group.visible=false;group.userData.dispose=()=>{geometry.dispose();material.dispose();};return group;}
/** Same origin, scale and rim target as startline.ts's original hoop(). */
export function hoop():THREE.Group{
  const b=new GeometryKit();b.box([.9,.16,.9],[0,.08,-.35],NAVY);b.beam([0,.16,-.35],[0,3.55,-.35],.10,NAVY,0,0,8);b.box([.38,1.35,.38],[0,.78,-.35],TEAL);b.beam([0,2.9,-.35],[0,3.75,.22],.07,NAVY,0,0,6);
  b.box([2.04,1.24,.12],[0,3.78,.21],NAVY);b.box([1.90,1.10,.04],[0,3.78,.291],CREAM);for(const x of[-.32,.32])b.box([.035,.40,.025],[x,3.60,.325],NAVY);for(const y of[3.40,3.80])b.box([.67,.035,.025],[0,y,.325],NAVY);
  b.box([.19,.06,.22],[0,3.25,.43],'#ef7837');b.add(new THREE.TorusGeometry(.30,.032,5,18).rotateX(Math.PI/2).translate(0,3.25,.60),'#ef7837');
  for(let i=0;i<10;i++){const a=i*Math.PI/5,next=a+Math.PI/5;const top: [number,number,number]=[Math.cos(a)*.285,3.22,.60+Math.sin(a)*.285];b.beam(top,[Math.cos(next)*.18,2.83,.60+Math.sin(next)*.18],.009,CREAM,0,0,4);b.beam(top,[Math.cos(a-Math.PI/5)*.18,2.83,.60+Math.sin(a-Math.PI/5)*.18],.009,CREAM,0,0,4);}
  const g=finish(b,'FanHoop',1.3);g.userData.rim=[0,3.25,.60];return g;
}
/** Same 5.2 m span, 2.45 m tape height and 1.25 outer scale as the current net(). */
export function net():THREE.Group{
  const b=new GeometryKit();for(const x of[-2.6,2.6]){b.beam([x,0,0],[x,2.65,0],.075,NAVY,0,0,6);b.box([.26,1.45,.26],[x,.74,0],BLUE);b.box([.52,.08,.55],[x,.04,0],NAVY);b.ell([.11,.11,.11],[x,2.66,0],CREAM,0,0,8,5);}
  for(let i=0;i<=16;i++){const x=-2.53+i*5.06/16;b.beam([x,1.56,0],[x,2.43,0],.009,NAVY,0,0,4);}
  for(let i=0;i<=4;i++){const y=1.56+i*.87/4;b.beam([-2.53,y,0],[2.53,y,0],.009,NAVY,0,0,4);}
  b.box([5.22,.105,.05],[0,2.45,0],CREAM);b.box([5.22,.052,.045],[0,1.53,0],CREAM);for(const x of[-2.52,2.52])b.box([.055,.98,.048],[x,1.98,0],CREAM);
  b.ell([.20,.20,.20],[-2.6,2.94,0],CREAM,0,0,12,7);b.add(new THREE.TorusGeometry(.201,.012,3,12).translate(-2.6,2.94,0),BLUE);b.add(new THREE.TorusGeometry(.202,.012,3,12).rotateY(Math.PI/2).translate(-2.6,2.94,0),'#ffd264');
  return finish(b,'FanVolleyballNet',1.25);
}
export function foamFinger(color=TEAL){const b=new GeometryKit(),s=new THREE.Shape();s.moveTo(-.11,0);s.lineTo(.13,0);s.lineTo(.17,.26);s.lineTo(.10,.30);s.lineTo(.10,.55);s.quadraticCurveTo(.03,.63,-.03,.55);s.lineTo(-.03,.25);s.lineTo(-.12,.31);s.lineTo(-.19,.25);s.lineTo(-.11,.13);s.closePath();b.add(new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:false,curveSegments:3}),color);b.box([.022,.18,.008],[.035,.39,.075],CREAM);const g=finish(b,'FoamFinger',1);g.visible=true;return g;}
/** Dispose one returned prop. Safe to call repeatedly. */
export function disposeProp(group:THREE.Group){const f=group.userData.dispose as (()=>void)|undefined;if(f){delete group.userData.dispose;f();}}
