import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
type V=[number,number,number];
export type BatPose='glide'|'splat';
export const BAT_PALETTE={fur:'#9676c6',furLight:'#bea1e3',furDark:'#6c4b97',ear:'#e5a6c9',membrane:'#583475',membraneInner:'#9061b4',bone:'#c9a7df',rim:'#d7bfea',eye:'#fff1da',pupil:'#2c2043',iris:'#604680',nose:'#5b365f',feet:'#bb91d4'};
export const WING_PIVOTS=[new THREE.Vector3(-.065,.027,.014),new THREE.Vector3(.065,.027,.014)] as const;
export interface BatParts{
 group:THREE.Group;body:THREE.Mesh;leftWing:THREE.Mesh;rightWing:THREE.Mesh;
 geometries:{body:THREE.BufferGeometry;leftWing:THREE.BufferGeometry;rightWing:THREE.BufferGeometry};
 material:THREE.MeshToonMaterial;wingPivots:readonly THREE.Vector3[];
 setFlap(angle:number):void;setPose(pose:BatPose):void;update(seconds:number,phase?:number):void;
 /** Allocation-free three-part matrices. root is the complete world placement. */
 writeInstanceMatrices(root:THREE.Matrix4,angle:number,body:THREE.Matrix4,left:THREE.Matrix4,right:THREE.Matrix4,pose?:BatPose):void;
 dispose():void;
}
class Kit{
 parts:THREE.BufferGeometry[]=[];
 add(source:THREE.BufferGeometry,color:string|((x:number,y:number,z:number)=>THREE.Color)){const g=source.index?source.toNonIndexed():source;if(source!==g)source.dispose();g.deleteAttribute('uv');if(!g.hasAttribute('normal'))g.computeVertexNormals();const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const col=typeof color==='string'?new THREE.Color(color):color(p.getX(i),p.getY(i),p.getZ(i));c.set([col.r,col.g,col.b],i*3);}g.setAttribute('color',new THREE.BufferAttribute(c,3));this.parts.push(g);}
 disc(p:V,r:[number,number],color:string,segments=8){this.add(new THREE.CircleGeometry(1,segments).scale(r[0],r[1],1).rotateY(Math.PI).translate(...p),color);}
 ell(p:V,r:V,color:string|((x:number,y:number,z:number)=>THREE.Color),w=8,h=5){this.add(new THREE.SphereGeometry(1,w,h).scale(...r).translate(...p),color);}
 poly(points:V[],color:string,normal:V){const p:number[]=[];for(let i=1;i<points.length-1;i++){const a=new THREE.Vector3(...points[0]),b=new THREE.Vector3(...points[i]),c=new THREE.Vector3(...points[i+1]);if(b.clone().sub(a).cross(c.clone().sub(a)).dot(new THREE.Vector3(...normal))<0)p.push(...points[0],...points[i+1],...points[i]);else p.push(...points[0],...points[i],...points[i+1]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();this.add(g,color);}
 beam(a:V,b:V,r:number,color:string){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),g=new THREE.CylinderGeometry(r,r,delta.length(),3,1,true);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());this.add(g,color);}
 finish(){const g=mergeGeometries(this.parts,false);this.parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();return g;}
}
function bodyGeometry(){const k=new Kit(),p=BAT_PALETTE,base=new THREE.Color(p.fur),light=new THREE.Color(p.furLight);k.ell([0,0,0],[.080,.100,.061],(_x,y,z)=>base.clone().lerp(light,Math.max(0,(-z/.07)*.5+(y+.08)*1.6)),10,7);
 k.ell([0,-.051,-.042],[.046,.038,.020],p.furLight,8,5);
 // Solid ears: three-dimensional outer wedges with inset pink membranes.
 for(const side of[-1,1]){const a:V=[side*.025,.077,.004],b:V=[side*.106,.104,.005],tip:V=[side*.084,.200,.009],back:V=[side*.058,.122,.043];k.poly([a,tip,b],p.furLight,[0,0,-1]);k.poly([a,back,tip],p.furDark,[-side,0,1]);k.poly([tip,back,b],p.fur,[side,0,1]);k.poly([a,b,back],p.fur,[0,-1,0]);k.poly([[side*.041,.096,-.001],[side*.081,.178,.004],[side*.088,.112,0]],p.ear,[0,0,-1]);
  // Cheek tufts and small forehead tufts are silhouette geometry, not transparency.
  k.poly([[side*.055,.033,-.020],[side*.092,.012,-.004],[side*.071,-.002,-.027]],p.furLight,[0,0,-1]);k.poly([[side*.066,.001,-.019],[side*.092,-.021,.002],[side*.061,-.035,-.018]],p.fur,[0,0,-1]);
  const x=side*.032;k.ell([x,.033,-.052],[.030,.034,.012],p.eye,8,5);k.disc([x-side*.003,.032,-.0645],[.016,.024],p.iris,8);k.disc([x-side*.003,.032,-.065],[.011,.019],p.pupil,7);k.disc([x-.006,.042,-.0655],[.006,.007],'#ffffff',5);k.disc([x+.004,.022,-.0655],[.0025,.003],p.eye,4);
  // Two little feet, merged into the body batch.
  k.poly([[side*.015,-.086,-.008],[side*.045,-.114,-.013],[side*.048,-.093,-.029]],p.feet,[0,0,-1]);
 }
 k.poly([[-.010,-.002,-.065],[.010,-.002,-.065],[0,-.011,-.074]],p.nose,[0,0,-1]);
 k.poly([[-.023,-.017,-.065],[0,-.021,-.068],[.023,-.017,-.065],[.013,-.033,-.067],[-.013,-.033,-.067]],p.pupil,[0,0,-1]);
 for(const side of[-1,1])k.poly([[side*.010,-.022,-.069],[side*.019,-.020,-.067],[side*.014,-.032,-.069]],p.eye,[0,0,-1]);
 for(let i=0;i<3;i++)k.poly([[i*.014-.027,.078,-.034],[i*.015-.008,.111,-.008],[i*.014-.006,.082,-.037]],i%2?p.furLight:p.fur,[0,0,-1]);
 return k.finish();}
function wingGeometry(side:number){const k=new Kit(),p=BAT_PALETTE;
 // Coordinates are local to the shoulder. The scalloped trailing edge forms three fingers.
 const outline:V[]=[[0,0,0],[.080,.065,.006],[.205,.108,.010],[.335,.088,.018],[.279,.027,.022],[.268,-.038,.028],[.210,-.007,.021],[.170,-.075,.020],[.115,-.042,.016],[.072,-.093,.011],[.020,-.066,.004]];
 const map=(v:V,dz=0):V=>[side*v[0],v[1],v[2]+dz];const anchor:V=[.040,-.005,.003];
 // A triangle fan gives each panel a distinct inner tone. Back and edge are opaque too.
 for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];k.poly([map(anchor,-.003),map(a,-.003),map(b,-.003)],i%3===0?p.membraneInner:p.membrane,[0,0,-1]);k.poly([map(anchor,.003),map(b,.003),map(a,.003)],p.membrane,[0,0,1]);k.poly([map(a,-.003),map(a,.003),map(b,.003),map(b,-.003)],p.membrane,[side*(a[0]-.1),a[1],0]);}
 const fingers:V[][]=[[[0,0,-.006],[.08,.065,-.001],[.205,.108,.003],[.335,.088,.011]],[[.08,.065,-.001],[.185,.010,.010],[.268,-.038,.022]],[[.08,.065,-.001],[.128,-.017,.008],[.170,-.075,.014]],[[0,0,-.006],[.040,-.045,.003],[.072,-.093,.005]]];
 for(const line of fingers)for(let i=1;i<line.length;i++)k.beam(map(line[i-1]),map(line[i]),.0038,p.bone);
 // Soft lavender edge reads on the dark sky without a fourth outline draw.
 for(let i=0;i<outline.length;i++)k.beam(map(outline[i]),map(outline[(i+1)%outline.length]),.0035,p.rim);
 return k.finish();}
export function buildBat(pose:BatPose='glide'):BatParts{
 const geometries={body:bodyGeometry(),leftWing:wingGeometry(-1),rightWing:wingGeometry(1)},material=new THREE.MeshToonMaterial({vertexColors:true,emissive:'#24132f',emissiveIntensity:.35}),group=new THREE.Group();group.name='FriendlyBat';
 const body=new THREE.Mesh(geometries.body,material),leftWing=new THREE.Mesh(geometries.leftWing,material),rightWing=new THREE.Mesh(geometries.rightWing,material);body.name='bat_body';leftWing.name='bat_wing_L';rightWing.name='bat_wing_R';leftWing.position.copy(WING_PIVOTS[0]);rightWing.position.copy(WING_PIVOTS[1]);group.add(body,leftWing,rightWing);
 let current:BatPose=pose;const squash=new THREE.Matrix4(),base=new THREE.Matrix4(),local=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),scale=new THREE.Vector3(1,1,1);
 const clamp=(angle:number)=>THREE.MathUtils.clamp(angle,-1.05,1.05);
 function setFlap(angle:number){const a=clamp(angle);leftWing.rotation.set(0,-a*.12,-a);rightWing.rotation.set(0,a*.12,a);}
 function setPose(next:BatPose){current=next;group.scale.set(next==='splat'?1.08:1,next==='splat'?.86:1,next==='splat'?.28:1);setFlap(0);}
 let disposed=false;setPose(pose);
 return{group,body,leftWing,rightWing,geometries,material,wingPivots:WING_PIVOTS.map(v=>v.clone()),setFlap,setPose,update(seconds,phase=0){setFlap(current==='splat'?0:Math.sin(seconds*14+phase)*.82);},writeInstanceMatrices(root,angle,outBody,outLeft,outRight,mode='glide'){const a=mode==='splat'?0:clamp(angle);squash.makeScale(mode==='splat'?1.08:1,mode==='splat'?.86:1,mode==='splat'?.28:1);base.copy(root).multiply(squash);outBody.copy(base);q.setFromEuler(e.set(0,-a*.12,-a));local.compose(WING_PIVOTS[0],q,scale);outLeft.copy(base).multiply(local);q.setFromEuler(e.set(0,a*.12,a));local.compose(WING_PIVOTS[1],q,scale);outRight.copy(base).multiply(local);},dispose(){if(disposed)return;disposed=true;Object.values(geometries).forEach(g=>g.dispose());material.dispose();}};
}
