import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarParts } from './cars';

export interface RoadsterParts extends CarParts {
  thrusters: THREE.Object3D[];
  /** Door hinge points (empty groups): the doors are merged into the body to save draw calls. */
  doors: THREE.Group[];
  /** Seat a driver's head centre here (left seat, under the canopy). */
  seat: THREE.Vector3;
  dispose(): void;
}

export interface RoadsterOptions {
  /** Door skin colour (the police car's cream doors). Defaults to the body paint. */
  doorColor?: string;
}

type Row = [number, number, number];
type Point = [number, number, number];

// Plan-view half-width of the body along its length (z, half-width).
const widthRows:[number,number][]=[[-1.82,.74],[-1.5,.84],[-1.12,.91],[-.59,.84],[.3,.84],[.73,.87],[1.1,.92],[1.5,.87],[1.82,.77]];
function width(z:number) {
  for(let i=0;i<widthRows.length-1;i++)if(z>=widthRows[i][0]&&z<=widthRows[i+1][0])
    return THREE.MathUtils.lerp(widthRows[i][1],widthRows[i+1][1],(z-widthRows[i][0])/(widthRows[i+1][0]-widthRows[i][0]));
  return .77;
}
const HOOD:Row[]=[[-1.81,.73,.475],[-1.66,.79,.51],[-1.35,.875,.64],[-1.12,.91,.665],[-.83,.872,.68]];
const DECK:Row[]=[[.78,.83,.735],[1.10,.92,.75],[1.47,.86,.70],[1.78,.77,.62]];

function quad(out:number[],a:Point,b:Point,c:Point,d:Point){out.push(...a,...b,...c,...a,...c,...d);}
function geometryOf(pos:number[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}

/** Centre racing stripe over the hood and rear deck (paint finish "stripe"). */
export function stripeGeometry(half=.2): THREE.BufferGeometry {
  const pos:number[]=[];
  for(const rows of [HOOD,DECK])for(let i=0;i<rows.length-1;i++){
    const [z,,y]=rows[i],[nz,,ny]=rows[i+1];
    quad(pos,[-half,y+.014,z],[-half,ny+.014,nz],[half,ny+.014,nz],[half,y+.014,z]);
  }
  return geometryOf(pos);
}

/** Lower body band along both sides, skipping the wheel arches (paint finish "twoTone"). */
export function lowerGeometry(): THREE.BufferGeometry {
  const pos:number[]=[];
  for(const side of [-1,1])for(const [z0,z1] of [[-1.80,-1.50],[-.74,.72],[1.48,1.80]]){
    for(let i=0;i<6;i++){
      const z=z0+(z1-z0)*i/6,nz=z0+(z1-z0)*(i+1)/6,x=side*(width(z)+.014),nx=side*(width(nz)+.014);
      const a:Point=[x,.27,z],b:Point=[nx,.27,nz],c:Point=[nx,.46,nz],d:Point=[x,.46,z];
      if(side>0)quad(pos,a,b,c,d);else quad(pos,a,d,c,b);
    }
  }
  return geometryOf(pos);
}

/** Original reference-informed electric roadster (Codex, art/mockups/01-player-roadster). +Y up, -Z forward, Y=0 road.
 * Everything is merged per material (doors and wheels included) so the car costs ~7 draw calls.
 * Thruster local -Y is the exhaust direction.
 */
export function buildRoadster(color = '#e8344e', opts: RoadsterOptions = {}): RoadsterParts {
  const group = new THREE.Group(); group.name = 'AustinRoadster';
  const paint = new THREE.MeshToonMaterial({ color });
  const dark = new THREE.MeshToonMaterial({ color: '#171a22' });
  // See-through tint so the driver shows from the chase camera.
  const glass = new THREE.MeshPhongMaterial({ color: '#3b4f6e', specular: '#9fb4cc', shininess: 85, side: THREE.DoubleSide, transparent: true, opacity: .45, depthWrite: false });
  const doorPaint = opts.doorColor ? new THREE.MeshToonMaterial({ color: opts.doorColor }) : paint;
  const metal = new THREE.MeshPhongMaterial({ color: '#aeb9c8', specular: '#8b97a5', shininess: 45 });
  const upholstery = new THREE.MeshToonMaterial({ color: '#57545b' });
  const light = new THREE.MeshToonMaterial({ color: '#f4e9d8', emissive: '#f4e9d8', emissiveIntensity: .5 });
  const brake = new THREE.MeshToonMaterial({ color: '#ff4860', emissive: '#ff4860', emissiveIntensity: .6 });
  const buckets = new Map<THREE.Group, Map<THREE.Material, THREE.BufferGeometry[]>>();
  const doors = [-1, 1].map(side => {
    const door = new THREE.Group(); door.name = side < 0 ? 'door_left' : 'door_right';
    door.position.set(side * .77, .64, -.59); group.add(door); return door;
  });
  function add(g: THREE.BufferGeometry, material: THREE.Material, target = group) {
    // Doors are drawn in body space and merged into the body; their skin may be a different colour.
    if (target !== group) { if (material === paint) material = doorPaint; target = group; }
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
  deck(HOOD);
  deck(DECK);
  // Closed nose/tail, recessed lower surfaces and a thin horizontal running light.
  panel([[-.73,.475,-1.81],[.73,.475,-1.81],[.70,.31,-1.79],[-.70,.31,-1.79]],dark);
  panel([[-.77,.62,1.78],[-.73,.30,1.78],[.73,.30,1.78],[.77,.62,1.78]],paint);
  // Lower bumper is faceted and tucked inward instead of a hanging rectangular bar.
  panel([[-.70,.31,-1.79],[.70,.31,-1.79],[.61,.245,-1.77],[-.61,.245,-1.77]],dark);
  for(const side of [-1,1]) {
    panel([[side*.73,.475,-1.81],[side*.83,.51,-1.60],[side*.79,.28,-1.60],[side*.70,.265,-1.79]],paint,group,side>0);
    box(.24,.023,.025,light,side*.48,.344,-1.818);
    box(.27,.034,.035,dark,side*.48,.344,-1.804);
  }
  box(1.49,.026,.09,dark,0,.225,-1.79);
  // Inset bumper backing closes the small gaps beneath the tapered face panels.
  box(1.40,.055,.08,dark,0,.267,-1.745);
  box(1.40,.021,.025,light,0,.463,-1.823);
  box(1.42,.047,.025,dark,0,.565,1.798);
  box(1.38,.021,.027,brake,0,.565,1.813);
  panel([[-.73,.40,1.79],[-.62,.265,1.83],[.62,.265,1.83],[.73,.40,1.79]],dark);
  box(1.44,.075,.10,dark,0,.29,1.72);
  // A small integrated ducktail and tapered bumper returns frame the rear.
  box(1.42,.025,.095,paint,0,.645,1.72);
  for(const side of [-1,1]) {
    panel([[side*.77,.62,1.78],[side*.73,.30,1.78],[side*.84,.32,1.53],[side*.86,.70,1.47]],paint,group,side>0);
  }
  for(const x of [-.52,-.26,0,.26,.52])box(.026,.105,.20,dark,x,.25,1.73);
  box(1.19,.09,3.34,dark,0,.22,0);

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
    // Gentle door crown, a shoulder crease and an inward lower sill.
    const doorRows=[[-.58,.69],[-.27,.701],[.29,.713],[.72,.725]];
    for(let i=0;i<doorRows.length-1;i++) {
      const [z,y]=doorRows[i],[nz,ny]=doorRows[i+1];
      const section=(at:number,top:number):Point[]=>[[side*width(at),top,at],[side*(width(at)+.008),.52,at],[side*(width(at)-.062),.29,at],[side*(width(at)-.07),.27,at]];
      const a=section(z,y),b=section(nz,ny);
      for(let j=0;j<3;j++)panel([a[j],b[j],b[j+1],a[j+1]],paint,door,side<0);
    }
    // Thin shut lines read on silver without decals or text.
    for(const z of [-.585,.725])beam([side*(width(z)+.004),.30,z],[side*(width(z)+.004),z<0?.687:.722,z],.0045,dark);
    beam([side*(width(-.58)-.062),.285,-.58],[side*(width(.72)-.062),.285,.72],.006,dark,door);
    panel([[xf-side*.055,.66,-.58],[xf-side*.09,.30,-.58],[xr-side*.09,.30,.72],[xr-side*.055,.69,.72]],dark,door,side<0);
    for(const z of [-.58,.72])beam([side*(width(z)-.045),.30,z],[side*(width(z)-.015),.70,z],.025,paint,door);
    box(.12,.06,1.34,dark,side*.77,.245,.07);
    box(.012,.022,.13,dark,side*(width(.40)+.010),.64,.40,door);
    box(.014,.009,.095,metal,side*(width(.40)+.017),.642,.40,door);
    box(.10,.031,.14,paint,side*.875,.735,-.49,door);
    box(.082,.021,.012,glass,side*.875,.735,-.415,door);
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
    for(const x of [-.80,.80])for(const z of [-1.12,1.1]){
    // Rounded sidewalls and a recessed wheel face replace the solid disc + bar spokes.
    const profile=[new THREE.Vector2(.275,-.105),new THREE.Vector2(.315,-.105),new THREE.Vector2(.335,-.074),new THREE.Vector2(.335,.074),new THREE.Vector2(.315,.105),new THREE.Vector2(.275,.105)];
    add(new THREE.LatheGeometry(profile,20).rotateZ(Math.PI/2).translate(x,.335,z),dark);
    const sign=Math.sign(x),faceX=sign*.111;
    add(new THREE.CylinderGeometry(.272,.272,.012,20).rotateZ(Math.PI/2).translate(x+faceX,.335,z),dark);
    const alloy:THREE.BufferGeometry[]=[];
    alloy.push(new THREE.TorusGeometry(.251,.012,4,28).rotateY(Math.PI/2).translate(sign*.125,0,0));
    alloy.push(new THREE.CylinderGeometry(.064,.064,.018,16).rotateZ(Math.PI/2).translate(sign*.137,0,0));
    for(let j=0;j<5;j++){
      const angle=j*Math.PI*2/5;
      // Each swept, tapering blade has two triangulated facets.
      const vertices:number[]=[];
      for(const [radius,offset] of [[.063,-.22],[.25,.01],[.25,.30],[.12,.29]]){
        const a=angle+offset;vertices.push(sign*.135,Math.cos(a)*radius,Math.sin(a)*radius);
      }
      const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      blade.setIndex(sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);blade.computeVertexNormals();
      alloy.push(blade);
    }
    for(const g of alloy)add(g.translate(x,.335,z),metal);
  }
  let body!:THREE.Mesh;
  for(const [target,mats] of buckets)for(const [material,geos] of mats){
    let merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
    // Weld only the glazing: smooth highlights, crisp painted panel boundaries.
    if(material===glass){merged.deleteAttribute('normal');const smooth=mergeVertices(merged,1e-5);merged.dispose();merged=smooth;merged.computeVertexNormals();}
    const mesh=new THREE.Mesh(merged,material);
    mesh.name=`${target===group?'fixed':target.name}_${material===paint?'paint':material.id}`;
    target.add(mesh);if(target===group&&material===paint)body=mesh;
  }
  return {group,body,paint,thrusters,doors,seat:new THREE.Vector3(-.33,.80,.30),dispose(){
    const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();
    group.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }};
}
