import * as THREE from 'three';
import {CityKit,P,type CityModel,type Point} from './kit.js';
export const TOWER_IDS=['crown-tower','slim-tower','stack-tower','blue-tower'] as const;
export type TowerId=typeof TOWER_IDS[number];
function windows(b:CityKit,w:number,h:number,d:number,y0:number,x0=0,z0=0,cols=5,rows=13){
 for(const side of[-1,1])for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const y=y0+(row+.5)*h/rows,x=x0+(col-(cols-1)/2)*w/cols,z=z0+(col-(cols-1)/2)*d/cols,lit=(row*7+col*3+(side>0?1:0))%5<3;
  const color=lit?((row+col)%3===0?'#8acbd5':'#558ea5'):P.glass;
  const face=()=>{b.plane(x,y,z0+side*(d/2+.025),w/cols*.64,h/rows*.64,color);b.plane(x0+side*(w/2+.025),y,z,d/cols*.64,h/rows*.64,color,'side');};
  // Explicit outward faces on the back/left keep the model opaque from all four views.
  const draw=()=>{if(side>0)face();else{
   const fw=w/cols*.64,fh=h/rows*.64,fd=d/cols*.64;
   b.panel([[x-fw/2,y-fh/2,z0-d/2-.025],[x-fw/2,y+fh/2,z0-d/2-.025],[x+fw/2,y+fh/2,z0-d/2-.025],[x+fw/2,y-fh/2,z0-d/2-.025]],color,[0,0,-1]);
   b.panel([[x0-w/2-.025,y-fh/2,z-fd/2],[x0-w/2-.025,y+fh/2,z-fd/2],[x0-w/2-.025,y+fh/2,z+fd/2],[x0-w/2-.025,y-fh/2,z+fd/2]],color,[-1,0,0]);
  }};if(lit)b.lit(draw);else draw();
 }
}
export function buildTower(id:TowerId):CityModel{
 const b=new CityKit();
 if(id==='crown-tower'){
  b.box(19,5,17,0,2.5,0,P.stone);b.box(15,42,13,0,26,0,'#467f9a');b.box(12,11,11,0,52.5,0,'#729daf');windows(b,15,40,13,7,0,0,5,14);windows(b,12,10,11,48,0,0,4,4);
  for(const x of[-7.5,-3.8,0,3.8,7.5])for(const z of[-6.55,6.55])b.box(.28,43,.22,x,26.5,z,P.cream);
  for(const z of[-6.5,0,6.5])for(const x of[-7.55,7.55])b.box(.22,43,.26,x,26.5,z,P.cream);
  for(const y of[5,16,27,38,47,58])b.box(y===58?12.6:15.5,.28,y===58?11.6:13.5,0,y,0,P.stone);
  for(const x of[-3.2,3.2])for(const z of[-2.7,2.7]){b.add(new THREE.ConeGeometry(3.2,12,4).rotateY(Math.PI/4).translate(x,64,z),'#bdd9db');b.lit(()=>b.beam([x-2.1,58,z],[x,70,z],.12,P.cyan));}
  b.box(4,6,4,0,60,0,'#97b9c6');
 }else if(id==='slim-tower'){
  b.box(19,5,15,0,2.5,0,P.stone);b.box(13,74,11,0,42,0,'#65899b');windows(b,13,70,11,7,0,0,5,24);
  for(const side of[-1,1]){b.box(1.5,79,11.5,side*5.7,42.5,0,P.cream);b.box(.65,78,.65,0,42,side*5.65,P.stone);}
  // Rounded pale crown contrasts with the stepped blue crown tower.
  b.add(new THREE.CylinderGeometry(5.7,5.7,7,12).scale(1,1,.83).translate(0,82.5,0),P.cream);b.add(new THREE.SphereGeometry(1,12,5,0,Math.PI*2,0,Math.PI/2).scale(5.7,2.4,4.73).translate(0,86,0),P.stone);
  for(let y=8;y<80;y+=3.4)b.box(13.5,.13,11.6,0,y,0,P.cream);
  b.lit(()=>b.box(10,.3,9.5,0,80,0,P.warm));
 }else if(id==='stack-tower'){
  b.box(24,5,20,0,2.5,0,P.stone);
  for(let i=0;i<6;i++){const x=[-2,1,-1.2,2,-.8,1.2][i],z=i%2?-.6:.6,y=5+i*10.5;b.box(17,10.5,15,x,y+5.25,z,i%2?'#779fa9':'#56869d');windows(b,17,9.8,15,y+.3,x,z,6,3);for(let j=0;j<=3;j++)b.box(17.45,.20,15.4,x,y+j*3.5,z,P.cream);}
  b.box(15,.35,13,1.2,68,0,P.cream);
  for(const x of[-6.3,1.2,8.7])for(const z of[-6.5,6.5])b.box(.22,5,.22,x,70.5,z,P.cream);
  b.lit(()=>{b.box(15,.30,13,1.2,73,0,P.cyan);});
 }else{
  b.box(23,5,18,0,2.5,0,P.stone);b.box(18,45,14,0,27.5,0,'#39768f');windows(b,18,42,14,6,0,0,6,14);
  b.box(13,8,11,0,54,0,'#5699ac');windows(b,13,7,11,50,0,0,4,3);b.box(8,4,7,0,60,0,'#699aa6');
  for(const x of[-9,-4.5,0,4.5,9])for(const z of[-7.06,7.06])b.box(.20,45,.18,x,27.5,z,P.stone);
  for(const y of[5,20,35,50,58])b.box(y>50?13.4:18.4,.28,y>50?11.4:14.4,0,y,0,P.cream);
  b.lit(()=>b.box(8.3,.24,7.3,0,62,0,P.cyan));
 }
 return b.finish(id);
}
/** Original pink-granite dome silhouette for the north-facing Congress vista. */
export function buildCapitolVista():CityModel{
 const b=new CityKit(),stone='#dca493',light='#f1c8ad',dark='#644e62';
 b.box(39,1,16,0,.5,0,light);b.box(36,9,13,0,5.5,-.5,stone);b.box(14,13,15,0,7.5,.2,stone);
 for(const y of[1,5,10,14])b.box(y===14?15:37,.45,y===14?15.8:13.8,0,y,0,light);
 for(const side of[-1,1])for(let i=0;i<5;i++)for(const y of[3.2,7.7]){const x=side*(9+i*1.8);b.lit(()=>b.plane(x,y,6.53,.9,1.75,P.warm));}
 for(const x of[-5.2,-3.1,-1,1,3.1,5.2]){b.cylinder(.31,.38,7,x,5.0,8.1,light,8);b.box(.9,.35,.9,x,1.65,8.1,light);}
 b.panel([[-7,9,8.55],[0,12,8.55],[7,9,8.55]],light,[0,0,1]);b.plane(0,4.2,7.8,3,5,dark);
 b.cylinder(5.2,5.2,3.3,0,15.7,0,stone,16);b.cylinder(5.7,5.7,.50,0,14.25,0,light,16);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*4.9,z=Math.sin(a)*4.9;b.cylinder(.23,.28,5, x,19.5,z,light,6);}
 b.cylinder(4.55,4.55,5.2,0,19.5,0,dark,16);b.cylinder(5.55,5.55,.55,0,22.3,0,light,16);
 b.add(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2).scale(5.2,7.2,5.2).translate(0,22.5,0),stone);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,points:Point[]=[];for(let j=0;j<=5;j++){const t=j*Math.PI/10;points.push([Math.cos(a)*5.23*Math.cos(t),22.5+7.23*Math.sin(t),Math.sin(a)*5.23*Math.cos(t)]);}for(let j=1;j<points.length;j++)b.beam(points[j-1],points[j],.055,light);}
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a)*4.97,z=Math.cos(a)*4.97;b.add(new THREE.TorusGeometry(.43,.055,3,8).scale(.8,1.3,.65).rotateY(a).translate(x,25.2,z),light);b.add(new THREE.SphereGeometry(1,6,4).scale(.28,.46,.07).rotateY(a).translate(x,25.2,z),dark);}
 b.cylinder(1.0,1.35,2.0,0,30,0,light,10);b.cylinder(.5,.7,1.2,0,31.6,0,stone,8);b.add(new THREE.ConeGeometry(.45,1.6,6).translate(0,33,0),P.gold);
 return b.finish('capitol-vista');
}
