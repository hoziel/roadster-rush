import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarParts } from '../../../src/view/cars';

export interface RoadsterParts extends CarParts {
  wheels: THREE.Group[];
  thrusters: THREE.Object3D[];
  doors: THREE.Group[];
  /** Both butterfly doors, 0 = closed, 1 = fully open. */
  setDoorOpen(amount: number): void;
  dispose(): void;
}

type Row = [number, number, number];
type Point = [number, number, number];

/** Original reference-informed electric roadster. +Y up, -Z forward, Y=0 road.
 * Native CarParts shape. Legacy CarStyle overlays need adaptation before integration.
 * Moving doors share the paint material; thruster local -Y is the exhaust direction.
 */
export function buildRoadster(color = '#e8344e'): RoadsterParts {
  const group = new THREE.Group(); group.name = 'AustinRoadster';
  const paint = new THREE.MeshToonMaterial({ color });
  const dark = new THREE.MeshToonMaterial({ color: '#171a22' });
  const glass = new THREE.MeshToonMaterial({ color: '#161d2c', side: THREE.DoubleSide });
  const metal = new THREE.MeshToonMaterial({ color: '#98a2b2' });
  const upholstery = new THREE.MeshToonMaterial({ color: '#57545b' });
  const light = new THREE.MeshToonMaterial({ color: '#f4e9d8', emissive: '#f4e9d8', emissiveIntensity: .5 });
  const brake = new THREE.MeshToonMaterial({ color: '#ff4860', emissive: '#ff4860', emissiveIntensity: .6 });
  const buckets = new Map<THREE.Group, Map<THREE.Material, THREE.BufferGeometry[]>>();
  const doors = [-1, 1].map(side => {
    const door = new THREE.Group(); door.name = side < 0 ? 'door_left' : 'door_right';
    door.position.set(side * .77, .64, -.59); group.add(door); return door;
  });
  function add(g: THREE.BufferGeometry, material: THREE.Material, target = group) {
    if (target !== group) g.translate(-target.position.x, -target.position.y, -target.position.z);
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    flat.deleteAttribute('uv');
    if (!buckets.has(target)) buckets.set(target, new Map());
    const mats = buckets.get(target)!;
    if (!mats.has(material)) mats.set(material, []);
    mats.get(material)!.push(flat);
  }
  function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,target=group,rx=0) {
    add(new THREE.BoxGeometry(w,h,d).rotateX(rx).translate(x,y,z),m,target);
  }
  function panel(points:Point[], m:THREE.Material, target=group, reverse=false) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    const indices:number[]=[];
    for(let i=1;i<points.length-1;i++) indices.push(0,reverse?i+1:i,reverse?i:i+1);
    g.setIndex(indices);g.computeVertexNormals();add(g,m,target);
  }
  function beam(a:Point,b:Point,r:number,m:THREE.Material,target=group) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(r,r,axis.length(),8);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize()));
    g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,m,target);
  }
  // Broad hood/deck: smooth crown with sharp shoulder boundaries, not separate fender rings.
  function deck(rows:Row[]) {
    for(let i=0;i<rows.length-1;i++){
      const [z,w,y]=rows[i], [nz,nw,ny]=rows[i+1];
      const sections=[[-1,1],[-.88,.75],[-.64,.15],[0,0],[.64,.15],[.88,.75],[1,1]];
      const edge=(at:number)=>-.01+.05*Math.exp(-Math.pow((at-(at<0?-1.12:1.10))/.38,2));
      for(let j=0;j<sections.length-1;j++) {
        const [u,v]=sections[j],[nu,nv]=sections[j+1];
        panel([[u*w,y+.008+v*edge(z),z],[u*nw,ny+.008+v*edge(nz),nz],[nu*nw,ny+.008+nv*edge(nz),nz],[nu*w,y+.008+nv*edge(z),z]],paint);
      }
    }
  }
  deck([[-1.81,.73,.475],[-1.66,.79,.51],[-1.35,.875,.64],[-1.12,.91,.665],[-.83,.872,.68]]);
  deck([[.78,.83,.735],[1.10,.92,.75],[1.47,.86,.70],[1.78,.77,.62]]);
  // Closed nose/tail, recessed lower surfaces and a thin horizontal running light.
  panel([[-.73,.475,-1.81],[.73,.475,-1.81],[.70,.31,-1.79],[-.70,.31,-1.79]],dark);
  panel([[-.77,.62,1.78],[-.73,.30,1.78],[.73,.30,1.78],[.77,.62,1.78]],paint);
  box(1.35,.105,.055,dark,0,.295,-1.80);
  box(1.49,.026,.09,dark,0,.225,-1.79);
  box(1.40,.021,.025,light,0,.463,-1.823);
  box(1.38,.025,.025,brake,0,.565,1.797);
  box(1.37,.16,.055,dark,0,.315,1.811);
  for(const x of [-.52,-.26,0,.26,.52])box(.026,.105,.20,dark,x,.25,1.73);
  box(1.19,.09,3.34,dark,0,.22,0);

  const widthRows:Row[]=[[-1.82,.74,0],[-1.5,.84,0],[-1.12,.91,0],[-.59,.84,0],[.3,.84,0],[.73,.87,0],[1.1,.92,0],[1.5,.87,0],[1.82,.77,0]];
  function width(z:number) {
    for(let i=0;i<widthRows.length-1;i++)if(z>=widthRows[i][0]&&z<=widthRows[i+1][0])
      return THREE.MathUtils.lerp(widthRows[i][1],widthRows[i+1][1],(z-widthRows[i][0])/(widthRows[i+1][0]-widthRows[i][0]));
    return .77;
  }
  for(const side of [-1,1]) {
    const door=doors[side<0?0:1];
    // Front and rear quarter panels: wheel arches are actual cutouts.
    for(const front of [true,false]) {
      const center=front?-1.12:1.1;
      const s=new THREE.Shape();
      const outline=front?[[-1.82,.465],[-1.50,.58],[-1.12,.705],[-.59,.70],[-.59,.25]]:[[.73,.73],[1.10,.79],[1.50,.705],[1.82,.61],[1.82,.25]];
      s.moveTo(outline[0][0],outline[0][1]);outline.slice(1).forEach(([z,y])=>s.lineTo(z,y));
      s.lineTo(center+.365,.25);s.lineTo(center+.365,.335);
      for(let j=0;j<=28;j++){const a=j*Math.PI/28;s.lineTo(center+Math.cos(a)*.365,.335+Math.sin(a)*.365);}
      s.lineTo(center-.365,.25);s.lineTo(front?-1.78:.73,.25);s.closePath();
      const geo=new THREE.ExtrudeGeometry(s,{depth:.085,bevelEnabled:false,steps:1}).rotateY(-Math.PI/2);
      const p=geo.attributes.position;
      for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+side*width(p.getZ(i))+(side<0?.085:0));
      geo.computeVertexNormals();add(geo,paint);
    }
    // Door outer skin, inset inner trim, shoulder and window all move together.
    const xf=side*width(-.58),xr=side*width(.72);
    panel([[xf,.69,-.58],[xr,.725,.72],[xr-side*.07,.27,.72],[xf-side*.07,.27,-.58]],paint,door,side<0);
    panel([[xf-side*.055,.66,-.58],[xf-side*.09,.30,-.58],[xr-side*.09,.30,.72],[xr-side*.055,.69,.72]],dark,door,side<0);
    for(const z of [-.58,.72])beam([side*(width(z)-.045),.30,z],[side*(width(z)-.015),.70,z],.025,paint,door);
    box(.12,.06,1.34,dark,side*.77,.245,.07);
    box(.035,.025,.16,metal,side*(width(.40)+.004),.64,.40,door);
    box(.11,.034,.16,dark,side*.875,.735,-.49,door);
  }
  // Canopy is deliberately wider and longer than Revision 2, with a shallow curved roof.
  // z, sill width, roof width, crown height, sill height
  const cr=[[-.83,.73,.73,.69,.69],[-.59,.73,.69,.84,.70],[-.28,.735,.63,1.015,.705],[.02,.74,.63,1.075,.71],[.32,.75,.64,1.07,.715],[.52,.76,.665,1.015,.72],[.73,.78,.71,.90,.73],[1.02,.80,.80,.745,.745]];
  function ring(row:number[]):Point[]{const [z,w,r,y,b]=row;return [[-w,b,z],[-r,y-.028,z],[-r*.6,y,z],[0,y+.009,z],[r*.6,y,z],[r,y-.028,z],[w,b,z]];}
  for(let i=0;i<cr.length-1;i++) {
    const a=ring(cr[i]),b=ring(cr[i+1]);
    for(let j=0;j<6;j++) {
      const moving=i>=1&&i<=5&&(j===0||j===5);
      const target=moving?doors[j===0?0:1]:group;
      panel([a[j],b[j],b[j+1],a[j+1]],glass,target);
    }
    for(const side of [-1,1]) {
      const target=i>=1&&i<=5?doors[side<0?0:1]:group;
      const [z,w,,,base]=cr[i],[nz,nw,,,nb]=cr[i+1];
      panel([[side*w,base,z],[side*nw,nb,nz],[side*(width(nz)-.015),nb,nz],[side*(width(z)-.015),base,z]],paint,target,side<0);
      beam([side*cr[i][2],cr[i][3]-.028,z],[side*cr[i+1][2],cr[i+1][3]-.028,nz],.012,paint,target);
    }
  }
  // Cabin becomes visible through the open doors. Everything stays below the roof.
  box(1.35,.07,1.34,dark,0,.30,.08);
  box(1.25,.11,.18,dark,0,.59,-.48);
  box(.15,.19,.90,dark,0,.42,.06);
  for(const x of [-.33,.33]) {
    box(.43,.10,.45,upholstery,x,.38,.13);
    box(.42,.43,.12,upholstery,x,.58,.45,group,-.13);
    box(.25,.12,.13,dark,x,.82,.49);
  }
  add(new THREE.TorusGeometry(.115,.022,6,20).rotateX(-.3).translate(-.33,.65,-.34),dark);
  const thrusters:THREE.Object3D[]=[];
  for(const x of [-.61,.61])for(const z of [-1.38,1.38]){
    add(new THREE.CylinderGeometry(.09,.115,.085,16).translate(x,.235,z),metal);
    add(new THREE.CylinderGeometry(.07,.088,.015,16).translate(x,.188,z),dark);
    const socket=new THREE.Object3D();socket.name=`thruster_${x<0?'L':'R'}_${z<0?'front':'rear'}`;socket.position.set(x,.18,z);group.add(socket);thrusters.push(socket);
  }
  let body!:THREE.Mesh;
  for(const [target,mats] of buckets)for(const [material,geos] of mats){
    const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.name=`${target===group?'fixed':target.name}_${material===paint?'paint':material.id}`;
    target.add(mesh);if(target===group&&material===paint)body=mesh;
  }
  const wheels:THREE.Group[]=[];
  for(const x of [-.80,.80])for(const z of [-1.12,1.1]){
    const wheel=new THREE.Group();wheel.name=`wheel_${x<0?'L':'R'}_${z<0?'front':'rear'}`;wheel.position.set(x,.335,z);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.335,.335,.22,40).rotateZ(Math.PI/2),dark);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.267,.267,.014,32).rotateZ(Math.PI/2),metal);rim.position.x=Math.sign(x)*.115;
    const spokes:THREE.BufferGeometry[]=[new THREE.CylinderGeometry(.07,.07,.018,20).rotateZ(Math.PI/2)];
    for(let j=0;j<5;j++)spokes.push(new THREE.BoxGeometry(.018,.20,.07).translate(0,.145,0).rotateX(j*Math.PI*2/5+.26));
    const hub=new THREE.Mesh(mergeGeometries(spokes),dark);spokes.forEach(g=>g.dispose());hub.position.x=Math.sign(x)*.129;
    tire.castShadow=true;wheel.add(tire,rim,hub);group.add(wheel);wheels.push(wheel);
  }
  return {group,body,paint,wheels,thrusters,doors,setDoorOpen(amount){
    const t=THREE.MathUtils.clamp(amount,0,1);
    doors.forEach((door,i)=>door.rotation.set(-t*1.16,(i===0?-1:1)*t*.34,(i===0?-1:1)*t*.13));
  },dispose(){
    const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();
    group.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }};
}
