import * as THREE from 'three';
import {MeshKit,type Point,type TrafficModel} from '../06-robotaxis/mesh-kit.js';
export type {Point};
export interface CityModel extends TrafficModel {setNight(amount:number):void;frontage?:number;}
/** One vertex-colored Lambert mesh, with an emissive vertex channel for signs/windows. */
export class CityKit extends MeshKit {
  private glowing=false;
  override add(g:THREE.BufferGeometry,color:string){g.setAttribute('aGlow',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(this.glowing?1:0),1));super.add(g,color);}
  lit(fn:()=>void){this.glowing=true;try{fn();}finally{this.glowing=false;}}
  plane(x:number,y:number,z:number,w:number,h:number,color:string,side:'front'|'side'='front'){
    this.panel(side==='front'?[[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]]:[[x,y-h/2,z-w/2],[x,y-h/2,z+w/2],[x,y+h/2,z+w/2],[x,y+h/2,z-w/2]],color,side==='front'?[0,0,1]:[1,0,0]);
  }
  ell(size:Point,pos:Point,color:string,detail=1){this.add(new THREE.IcosahedronGeometry(1,detail).scale(...size).translate(...pos),color);}
  override finish(name:string):CityModel{
    const m=super.finish(name),night={value:0};m.geometry.computeBoundingBox();m.geometry.translate(0,-m.geometry.boundingBox!.min.y,0);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
    m.material.onBeforeCompile=s=>{s.uniforms.uNight=night;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aGlow;varying float vGlow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=aGlow;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uNight;varying float vGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * uNight * .95;');};m.material.customProgramCacheKey=()=> 'austin-city-glow-v1';
    return{...m,setNight(amount:number){night.value=THREE.MathUtils.clamp(amount,0,1);}};
  }
}
// Authored compact block lettering, geometry only. No font asset or canvas texture.
const GLYPHS:Record<string,string[]>={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],Q:['010','101','101','111','011'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],' ':['000','000','000','000','000']};
export function lettering(b:CityKit,text:string,x:number,y:number,z:number,cell:number,color:string,side=false){const total=(text.length*4-1)*cell;for(let i=0;i<text.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(GLYPHS[text[i]]?.[row][col]==='1'){const u=-total/2+(i*4+col+.5)*cell,v=y+(2-row)*cell;if(side){b.plane(x,v,z-u,cell*.88,cell*.88,color,'side');b.panel([[x-.314,v-cell*.44,z+u-cell*.44],[x-.314,v+cell*.44,z+u-cell*.44],[x-.314,v+cell*.44,z+u+cell*.44],[x-.314,v-cell*.44,z+u+cell*.44]],color,[-1,0,0]);}else b.plane(x+u,v,z,cell*.88,cell*.88,color);}}
export function star(b:CityKit,x:number,y:number,z:number,r:number,color:string){const points:Point[]=[];for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,d=i%2?r*.42:r;points.push([x+Math.cos(a)*d,y+Math.sin(a)*d,z]);}for(let i=0;i<10;i++)b.panel([[x,y,z],points[i],points[(i+1)%10]],color,[0,0,1]);}
export const P={cream:'#f4e9d8',stone:'#ddc9a5',brick:'#ad5146',terra:'#cd7655',pink:'#d39787',teal:'#359b9b',gold:'#e6b653',plum:'#69516d',glass:'#283d54',trim:'#343244',leaf:'#718a3d',leafLight:'#a0ab4c',leafDark:'#426f44',bark:'#685046',cyan:'#35e0ff',magenta:'#ff4fd8',warm:'#ffd58b'};
