import * as THREE from 'three';
import {CityKit,P,lettering,star,type Point,type CityModel} from './kit.js';
export const PROP_IDS=['live-oak','moonlight-tower','texas-flag','pedicab','string-lights','postcard-mural'] as const;
export type PropId=typeof PROP_IDS[number];
export function buildLiveOak():CityModel{
 const b=new CityKit();b.cylinder(.29,.49,3.8,0,1.9,0,P.bark,8);
 const limbs:Point[]=[[-2.5,4.1,.4],[2.5,4.4,.2],[-1.1,4.5,-2],[1.3,4.7,1.8]];for(const v of limbs)b.beam([0,2.5,0],v,.17,P.bark);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;b.beam([0,.3,0],[Math.cos(a)*.8,.05,Math.sin(a)*.8],.13,P.bark);}
 const canopies:[Point,Point,string][]=[[[2.6,1.8,2.0],[-1.65,5.1,0],P.leaf],[[2.5,1.8,2.0],[1.65,5.3,0],P.leafLight],[[2.3,1.7,2.2],[0,5.35,-1.5],P.leafDark],[[2.4,1.7,2.0],[0,5.55,1.4],P.leaf],[[2.5,1.7,2.3],[0,6.1,0],P.leafLight],[[1.7,1.4,1.5],[-2.3,4.5,1.3],P.leafDark]];
 for(const[size,pos,color]of canopies)b.ell(size,pos,color,1);return b.finish('live-oak');
}
export function buildMoonlightTower():CityModel{
 const b=new CityKit(),h=22,point=(i:number,y:number):Point=>{const a=i*Math.PI*2/3,r=1.02-(y/h)*.65;return[Math.cos(a)*r,y,Math.sin(a)*r];};
 for(let i=0;i<3;i++){b.beam(point(i,0),point(i,h),.075,P.trim);const p=point(i,0);b.cylinder(.28,.32,.22,p[0],.11,p[2],P.stone,5);for(let j=0;j<3;j++){const y=j*h/3,Y=(j+1)*h/3;b.beam(point(i,y),point((i+1)%3,Y),.035,'#6e7480');b.beam(point((i+1)%3,y),point(i,Y),.035,'#6e7480');}}
 b.cylinder(1.2,1.2,.18,0,h,0,P.trim,6);for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*1.45,z=Math.sin(a)*1.45;b.beam([0,h+.12,0],[x,h+.4,z],.06,P.trim);b.lit(()=>b.ell([.28,.38,.28],[x,h+.76,z],P.warm,0));}
 return b.finish('moonlight-tower');
}
export function buildTexasFlag():CityModel{
 const b=new CityKit();b.cylinder(.06,.08,7,0,3.5,0,P.trim,8);b.cylinder(.4,.5,.18,0,.09,0,P.stone,8);b.ell([.12,.12,.12],[0,7.06,0],P.gold,0);
 const wave=(x:number,y:number):Point=>[x,y,Math.sin(x*2.8)*.14];
 for(let i=0;i<6;i++){const x=.10+i*.40,X=x+.40;for(const top of[false,true]){const y=top?6.25:5.5,Y=y+.75,color=i<2?'#254c8e':top?P.cream:'#d95b61';const p=[wave(x,y),wave(X,y),wave(X,Y),wave(x,Y)];b.panel(p,color,[0,0,1]);b.panel([...p].reverse(),color,[0,0,-1]);}}
 star(b,.50,6.25,.17,.27,P.cream);const points:Point[]=[];for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.1134:.27;points.push([.5+Math.cos(a)*r,6.25+Math.sin(a)*r,-.17]);}for(let i=0;i<10;i++)b.panel([[.5,6.25,-.17],points[i],points[(i+1)%10]],P.cream,[0,0,-1]);const m=b.finish('texas-flag');return m;
}
export function buildPedicab():CityModel{
 const b=new CityKit();for(const [x,z]of[[-.66,-.72],[.66,-.72],[0,1.14]]){b.add(new THREE.TorusGeometry(.28,.055,4,8).rotateY(Math.PI/2).translate(x,.335,z),'#242833');b.cylinder(.095,.095,.055,x,.335,z,P.stone,4,'x');}
 const beams:[Point,Point][]=[[[0,.36,1.14],[0,1.06,.85]],[[0,1.06,.85],[0,.44,.10]],[[0,.44,.10],[0,.95,-.15]],[[0,.95,-.15],[0,1.06,.85]],[[0,.44,.10],[0,.37,-.72]],[[-.66,.37,-.72],[.66,.37,-.72]],[[0,1.06,.85],[0,1.23,.93]],[[-.30,1.23,.93],[.30,1.23,.93]]];for(const[a,c]of beams)b.beam(a,c,.035,P.teal);
 b.box(.34,.10,.28,0,1.0,-.12,P.trim);b.box(1.15,.24,.70,0,.75,-.68,P.teal);b.box(1.15,.65,.13,0,1.05,-1.02,P.teal);b.box(1.03,.09,.58,0,.92,-.67,P.cream);
 for(const x of[-.57,.57])for(const z of[-1.05,-.24])b.beam([x,.77,z],[x,1.92,z],.025,P.trim);
 b.box(1.35,.12,1.04,0,1.98,-.65,P.gold);b.box(1.35,.16,.10,0,1.88,-.08,P.cream);
 b.box(.24,.12,.12,0,1.06,1.07,P.warm);return b.finish('pedicab');
}
export function buildStringLights(span=16):CityModel{
 const b=new CityKit(),at=(u:number):Point=>[(u-.5)*span,2.2-Math.sin(u*Math.PI)*1.3,0];for(let i=1;i<=16;i++)b.beam(at((i-1)/16),at(i/16),.025,P.trim);
 for(let i=0;i<12;i++){const p=at((i+.5)/12);b.box(.12,.15,.12,p[0],p[1]-.11,0,P.trim);b.lit(()=>b.ell([.14,.18,.14],[p[0],p[1]-.28,0],P.warm,0));}return b.finish('string-lights');
}
export function buildPostcardMural():CityModel{
 const b=new CityKit();b.box(8,4.5,.18,0,2.25,0,P.cream);b.plane(0,2.25,.101,7.7,4.2,P.teal);
 b.plane(-1.45,2.25,.11,4.45,3.8,P.plum);lettering(b,'HELLO',-1.45,3.35,.12,.13,P.warm);lettering(b,'AUSTIN',-1.45,2.30,.12,.17,P.cream);
 for(let i=0;i<5;i++)b.box(.55,.5+(i%3)*.28,.022,1.10+i*.53,.8+(i%3)*.14,.12,i%2?P.pink:P.gold);
 b.add(new THREE.CircleGeometry(.66,12).translate(2.35,3.15,.12),P.warm);
 b.panel([[.80,1.25,.16],[3.6,1.25,.16],[3.6,.3,.16],[.80,.3,.16]],'#6eabb5',[0,0,1]);
 b.panel([[1.5,2.1,.15],[1.8,2.35,.15],[2.1,2.10,.15],[2.4,2.35,.15],[2.7,2.1,.15],[2.1,1.95,.15]],P.plum,[0,0,1]);
 return b.finish('postcard-mural');
}
export function buildProp(id:PropId):CityModel{return({'live-oak':buildLiveOak,'moonlight-tower':buildMoonlightTower,'texas-flag':buildTexasFlag,pedicab:buildPedicab,'string-lights':buildStringLights,'postcard-mural':buildPostcardMural}[id])();}
