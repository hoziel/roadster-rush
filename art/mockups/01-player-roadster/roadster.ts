import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarParts } from '../../../src/view/cars';

export interface RoadsterParts extends CarParts {
  wheels: THREE.Group[];
  thrusters: THREE.Object3D[];
  dispose(): void;
}

/** Original electric roadster. +Y up, -Z forward, ground at Y=0.
 * Matches CarParts; legacy CarStyle box overlays require reshaping before integration.
 * Thruster local -Y is the exhaust direction. All geometry is generated locally.
 */
export function buildRoadster(color = '#e8344e'): RoadsterParts {
  const group = new THREE.Group(); group.name = 'AustinRoadster';
  const paint = new THREE.MeshToonMaterial({ color });
  const dark = new THREE.MeshToonMaterial({ color: '#1b1b22' });
  const glass = new THREE.MeshToonMaterial({ color: '#202737' });

  const metal = new THREE.MeshToonMaterial({ color: '#8993a7' });
  const light = new THREE.MeshToonMaterial({ color: '#f4e9d8', emissive: '#f4e9d8', emissiveIntensity: 0.4 });
  const brake = new THREE.MeshToonMaterial({ color: '#ff4860', emissive: '#ff4860', emissiveIntensity: 0.6 });
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function add(g: THREE.BufferGeometry, m: THREE.Material, x=0, y=0, z=0) {
    g.translate(x,y,z);
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    flat.deleteAttribute('uv');
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m)!.push(flat);
  }
  function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,rx=0) {
    add(new THREE.BoxGeometry(w,h,d).rotateX(rx),m,x,y,z);
  }
  // Cross-section loft: z, half-width, deck height. Broad bevels keep the silhouette readable.
  function loft(rows:number[][], bottom:number) {
    const vertices:number[]=[]; const indices:number[]=[];
    for (const [z,w,h] of rows) {
      const base=Math.min(bottom,h-.11);
      for (const [x,y] of [[-w*.84,base],[-w,base+.07],[-w,h-.09],[-w*.76,h],[w*.76,h],[w,h-.09],[w,base+.07],[w*.84,base]]) vertices.push(x,y,z);
    }
    for(let r=0;r<rows.length-1;r++) for(let j=0;j<8;j++) {
      const a=r*8+j,b=r*8+(j+1)%8,c=b+8,d=a+8;
      indices.push(a,b,d,b,c,d);
    }
    for(let j=1;j<7;j++){indices.push(0,j+1,j); const k=(rows.length-1)*8;indices.push(k,k+j,k+j+1);}
    for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // Revision 2: the approved reference's wedge and canopy proportions.
  // Continuous side skins with wheel cutouts replace the separate raised fender rings.
  add(loft([[-1.65,.54,.37],[-1.4,.58,.47],[1.38,.58,.48],[1.63,.55,.38]],.20),dark);
  add(loft([[-1.65,.63,.45],[-1.39,.73,.56],[-.98,.77,.70],[-.57,.73,.70]],.64),paint);
  add(loft([[.73,.73,.71],[1.06,.79,.73],[1.45,.74,.64],[1.65,.64,.55]],.59),paint);

  const skin=new THREE.Shape();
  skin.moveTo(-1.65,.44);
  for(const [z,y] of [[-1.4,.60],[-1.05,.72],[-.6,.71],[.28,.72],[1.05,.76],[1.45,.66],[1.65,.54],[1.60,.25],[1.375,.25]]) skin.lineTo(z,y);
  // Follow each arch from its rear bottom edge, over the wheel, toward the nose.
  for(const z of [1.02,-1.02]) {
    skin.lineTo(z+.355,.32);
    for(let i=0;i<=24;i++){const a=i*Math.PI/24;skin.lineTo(z+Math.cos(a)*.355,.32+Math.sin(a)*.355);}
    skin.lineTo(z-.355,.25);
  }
  skin.lineTo(-1.60,.25);skin.closePath();
  for(const side of [-1,1]) {
    const g=new THREE.ExtrudeGeometry(skin,{depth:.10,bevelEnabled:false,steps:1});
    // Shape local X is longitudinal Z, extrusion local Z becomes lateral X.
    g.rotateY(-Math.PI/2);
    const widths=[[-1.65,.65],[-1.4,.77],[-1.05,.83],[-.6,.79],[.28,.79],[1.05,.83],[1.45,.78],[1.65,.65]];
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const z=pos.getZ(i);let w=.65;
      for(let k=0;k<widths.length-1;k++)if(z>=widths[k][0]&&z<=widths[k+1][0]){
        const t=(z-widths[k][0])/(widths[k+1][0]-widths[k][0]);w=THREE.MathUtils.lerp(widths[k][1],widths[k+1][1],t);break;
      }
      pos.setX(i,pos.getX(i)+side*(w-.83));
    }
    g.computeVertexNormals();add(g,paint,side<0?-.73:.83,0,0);
    box(.15,.055,1.25,dark,side*.73,.25,0);
    box(.14,.065,1.30,paint,side*.69,.675,.05);
    box(.56,.025,.035,light,side*.345,.45,-1.662);
    box(.50,.025,.035,brake,side*.345,.515,1.662);
    // Short camera pod / mirror, no oversized detached stalk.
    box(.10,.035,.14,dark,side*.81,.75,-.38);
  }
  // Roof, windshield and side glazing are one uninterrupted faceted canopy.
  const canopyRows=[[-.69,.63,.705,.695],[-.24,.51,1.045,.705],[.13,.50,1.095,.71],[.51,.52,1.02,.715],[.99,.65,.755,.73]];
  // Shoulder surfaces close the gap between the narrow canopy and wide door skins.
  for(const side of [-1,1]) {
    const vertices:number[]=[];const indices:number[]=[];
    canopyRows.forEach(([z,w,_top,base],i)=>{
      const outer=[.79,.79,.79,.80,.83][i];
      vertices.push(side*w,base-.004,z,side*(outer-.015),[.705,.71,.72,.735,.75][i],z);
    });
    for(let i=0;i<4;i++){
      const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);
    }
    if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const shoulder=new THREE.BufferGeometry();shoulder.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shoulder.setIndex(indices);shoulder.computeVertexNormals();add(shoulder,paint);
  }
  const cp:number[]=[];const ci:number[]=[];
  for(const [z,w,top,base] of canopyRows) {
    for(const [x,y] of [[-w,base],[-w*.94,top-.085],[-w*.67,top-.018],[0,top],[w*.67,top-.018],[w*.94,top-.085],[w,base]]) cp.push(x,y,z);
  }
  for(let r=0;r<canopyRows.length-1;r++)for(let j=0;j<6;j++){
    const a=r*7+j,b=a+1,c=a+7,d=c+1;ci.push(a,c,b,b,c,d);
  }
  const canopy=new THREE.BufferGeometry();canopy.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));canopy.setIndex(ci);canopy.computeVertexNormals();add(canopy,glass);
  function strut(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material){
    const axis=b.clone().sub(a);const g=new THREE.CylinderGeometry(r,r,axis.length(),6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize()));
    const center=a.clone().add(b).multiplyScalar(.5);add(g,m,center.x,center.y,center.z);
  }
  // Thin painted roof rails and rear pillars frame the dark canopy.
  for(const side of [-1,1]){
    const rail=[new THREE.Vector3(side*.63,.70,-.69),new THREE.Vector3(side*.48,.963,-.24),new THREE.Vector3(side*.47,1.013,.13),new THREE.Vector3(side*.489,.938,.51),new THREE.Vector3(side*.65,.735,.99)];
    for(let j=0;j<rail.length-1;j++)strut(rail[j],rail[j+1],.017,paint);
    strut(new THREE.Vector3(side*.51,.72,.50),new THREE.Vector3(side*.489,.938,.51),.011,dark);
    // Rear shoulder ridge provides a clear silhouette from the chase camera.
    strut(new THREE.Vector3(side*.66,.74,.92),new THREE.Vector3(side*.73,.65,1.44),.024,paint);
  }
  box(1.3,.04,.12,dark,0,.235,-1.61);
  box(1.15,.13,.08,dark,0,.32,1.63);
  for(const x of [-.44,-.22,0,.22,.44]) box(.025,.10,.19,dark,x,.27,1.58);
  const thrusters:THREE.Object3D[]=[];
  for(const x of [-.57,.57]) for(const z of [-1.28,1.28]) {
    add(new THREE.CylinderGeometry(.095,.12,.09,12),metal,x,.25,z);
    add(new THREE.CylinderGeometry(.076,.093,.012,12),dark,x,.199,z);
    const socket=new THREE.Object3D();socket.name=`thruster_${x<0?'L':'R'}_${z<0?'front':'rear'}`;
    socket.position.set(x,.19,z);group.add(socket);thrusters.push(socket);
  }
  let body!:THREE.Mesh;
  for(const [material,geos] of buckets) {
    const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.name=material===paint?'paint_body':`detail_${material.id}`;
    group.add(mesh);if(material===paint)body=mesh;
  }
  const wheels:THREE.Group[]=[];
  for(const x of [-.76,.76])for(const z of [-1.02,1.02]) {
    const wheel=new THREE.Group();wheel.name=`wheel_${x<0?'L':'R'}_${z<0?'front':'rear'}`;
    wheel.position.set(x,.32,z);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.22,40,1).rotateZ(Math.PI/2),dark);
    const face=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.012,24).rotateZ(Math.PI/2),metal);
    face.position.x=Math.sign(x)*.116;
    const spokes:THREE.BufferGeometry[]=[new THREE.CylinderGeometry(.075,.075,.018,24).rotateZ(Math.PI/2)];
    for(let j=0;j<5;j++) spokes.push(new THREE.BoxGeometry(.014,.17,.085).translate(0,.125,0).rotateX(j*Math.PI*2/5+.2));
    const hub=new THREE.Mesh(mergeGeometries(spokes),dark);spokes.forEach(g=>g.dispose());hub.position.x=Math.sign(x)*.127;
    wheel.add(tire,face,hub);tire.castShadow=true;group.add(wheel);wheels.push(wheel);
  }
  return {group,body,paint,wheels,thrusters,dispose(){
    const geos=new Set<THREE.BufferGeometry>(); const mats=new Set<THREE.Material>();
    group.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }};
}
