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
  const glass = new THREE.MeshToonMaterial({ color: '#2b2f4a' });
  const cabin = new THREE.MeshToonMaterial({ color: '#b88f5a' });
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
      for (const [x,y] of [[-w*.84,bottom],[-w,bottom+.07],[-w,h-.09],[-w*.76,h],[w*.76,h],[w,h-.09],[w,bottom+.07],[w*.84,bottom]]) vertices.push(x,y,z);
    }
    for(let r=0;r<rows.length-1;r++) for(let j=0;j<8;j++) {
      const a=r*8+j,b=r*8+(j+1)%8,c=b+8,d=a+8;
      indices.push(a,b,d,b,c,d);
    }
    for(let j=1;j<7;j++){indices.push(0,j+1,j); const k=(rows.length-1)*8;indices.push(k,k+j,k+j+1);}
    for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // Lower center tub leaves tires exposed; independent fender shells have real arch cutouts.
  add(loft([[-1.6,.54,.42],[-1.4,.64,.47],[1.37,.64,.48],[1.57,.54,.44]],.20),dark);
  add(loft([[-1.65,.57,.47],[-1.46,.72,.56],[-.98,.73,.64],[-.48,.67,.69]],.37),paint);
  add(loft([[.68,.69,.68],[1.04,.78,.73],[1.46,.72,.64],[1.61,.62,.56]],.40),paint);
  for(const side of [-1,1]) {
    // Doors / sill form the cockpit rim without filling the cabin.
    box(.18,.32,1.23,paint,side*.67,.48,.12);
    box(.19,.09,1.35,dark,side*.68,.27,.12);
    for(const z of [-1.02,1.02]) {
      const shape=new THREE.Shape();
      const radius=.355, outer=.445;
      shape.moveTo(-outer,0);
      for(let i=0;i<=16;i++){const a=Math.PI-i*Math.PI/16;shape.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);}
      shape.lineTo(radius,0);
      for(let i=0;i<=16;i++){const a=i*Math.PI/16;shape.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);}
      shape.closePath();
      const g=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false,steps:1,curveSegments:1});
      g.rotateY(Math.PI/2);add(g,paint,side<0?-.83:.59,.32,z);
    }
    // Distinct two-piece headlamps rather than the reference car's full-width face.
    box(.35,.045,.05,light,side*.42,.515,-1.57);
    box(.09,.03,.13,light,side*.60,.50,-1.49);
    box(.25,.035,.035,brake,side*.43,.505,1.62);
    box(.14,.055,.20,paint,side*.79,.77,-.36);
  }
  // Cockpit with visible two seats, center console, tilted windscreen.
  box(1.12,.08,1.12,dark,0,.39,.13);
  box(1.12,.16,.16,dark,0,.64,-.43);
  box(1.12,.31,.025,glass,0,.85,-.48,-.45);
  box(1.17,.045,.04,paint,0,.99,-.41);
  for(const x of [-.56,.56]) box(.045,.35,.04,paint,x,.84,-.48,-.45);
  for(const x of [-.30,.30]) {
    box(.40,.10,.40,cabin,x,.48,.17);
    box(.40,.39,.12,cabin,x,.69,.43,-.12);
    box(.23,.16,.13,dark,x,.91,.47,-.12);
    // Solid rear buttress with a broad silver roll hoop.
    add(loft([[.49,.16,.77],[.64,.18,.91],[.94,.17,.76]],.64).translate(x,0,0),paint);
    const hoop=new THREE.TorusGeometry(.17,.024,5,12,Math.PI);add(hoop,metal,x,.88,.56);
  }
  box(.13,.20,.60,dark,0,.50,.12);
  add(new THREE.TorusGeometry(.13,.025,6,16).rotateX(-.42),dark,-.30,.76,-.22);
  box(.11,.026,.025,metal,-.30,.76,-.22);
  // Rear bridge lamp and compact diffuser fins; no badges or text.
  box(.62,.028,.034,brake,0,.53,1.62);
  box(1.13,.12,.08,dark,0,.31,1.56);
  for(const x of [-.44,-.22,0,.22,.44]) box(.022,.11,.22,dark,x,.27,1.48);
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
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.22,24,1).rotateZ(Math.PI/2),dark);
    const face=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.012,12).rotateZ(Math.PI/2),metal);
    face.position.x=Math.sign(x)*.116;
    const spokes:THREE.BufferGeometry[]=[new THREE.CylinderGeometry(.075,.075,.018,12).rotateZ(Math.PI/2)];
    for(let j=0;j<5;j++) spokes.push(new THREE.BoxGeometry(.014,.18,.042).translate(0,.12,0).rotateX(j*Math.PI*2/5));
    const hub=new THREE.Mesh(mergeGeometries(spokes),dark);spokes.forEach(g=>g.dispose());hub.position.x=Math.sign(x)*.127;
    wheel.add(tire,face,hub);tire.castShadow=true;group.add(wheel);wheels.push(wheel);
  }
  return {group,body,paint,wheels,thrusters,dispose(){
    const geos=new Set<THREE.BufferGeometry>(); const mats=new Set<THREE.Material>();
    group.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }};
}
