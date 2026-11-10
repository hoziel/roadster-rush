import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildRoadster, type RoadsterParts } from './roadster';

export interface PoliceRoadsterParts extends RoadsterParts {
  lightBar: THREE.Group;
  setLights(enabled: boolean): void;
  /** Elapsed seconds; gentle alternating glow, no dynamic lights or allocations. */
  updateLights(time: number): void;
}

/** Friendly patrol variant of the shared body (Codex, art/mockups/02-police-roadster). +Y up, -Z forward. */
export function buildPoliceRoadster(): PoliceRoadsterParts {
  const car = buildRoadster('#293d65', { doorColor: '#f4e9d8' });
  car.group.name = 'FriendlyPoliceRoadster';
  const white = new THREE.MeshToonMaterial({ color: '#f4e9d8' });
  const gold = new THREE.MeshToonMaterial({ color: '#ffd23f' });
  const red = new THREE.MeshToonMaterial({ color: '#f26776', emissive: '#ff4860', emissiveIntensity: .12 });
  const blue = new THREE.MeshToonMaterial({ color: '#54bdeb', emissive: '#35c6ff', emissiveIntensity: .12 });
  let dark!: THREE.Material;
  car.group.traverse(o => {
    if(o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial && o.material.color.getHexString() === '171a22') dark = o.material;
  });
  const batches = new Map<THREE.Group, Map<THREE.Material, THREE.BufferGeometry[]>>();
  function add(g: THREE.BufferGeometry, m: THREE.Material, parent = car.group) {
    // Doors are merged into the body: badge geometry built in door space goes back to body space.
    if(parent !== car.group && car.doors.includes(parent)) { g.translate(parent.position.x, parent.position.y, parent.position.z); parent = car.group; }
    const flat = g.index ? g.toNonIndexed() : g;
    if(flat !== g) g.dispose();
    flat.deleteAttribute('uv');
    if(!batches.has(parent)) batches.set(parent, new Map());
    const materials = batches.get(parent)!;
    if(!materials.has(m)) materials.set(m, []);
    materials.get(m)!.push(flat);
  }
  function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent=car.group) {
    add(new THREE.BoxGeometry(w,h,d).translate(x,y,z),m,parent);
  }
  function face(points:number[][],m:THREE.Material,parent=car.group,reverse=false) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    const indices:number[]=[];
    for(let i=1;i<points.length-1;i++)indices.push(0,reverse?i+1:i,reverse?i:i+1);
    g.setIndex(indices);g.computeVertexNormals();add(g,m,parent);
  }
  // Cream center stripe follows every hood row, without a floating decal plane.
  const hoodRows=[[-1.81,.73,.475],[-1.66,.79,.51],[-1.35,.875,.64],[-1.12,.91,.665],[-.83,.872,.68]];
  const hoodPoint=(row:number[],u:number)=>{
    const [z,w,y]=row,edge=-.01+.05*Math.exp(-Math.pow((z+1.12)/.38,2));
    return [u*w,y+.010+Math.abs(u)*.15/.64*edge,z];
  };
  for(let i=0;i<hoodRows.length-1;i++)for(const [u,v] of [[-.28,0],[0,.28]]){
    face([hoodPoint(hoodRows[i],u),hoodPoint(hoodRows[i+1],u),hoodPoint(hoodRows[i+1],v),hoodPoint(hoodRows[i],v)],white);
  }
  box(1.32,.09,.008,0,.475,1.787,white);
  // Simple invented gold star on a navy disc: no department text or real insignia.
  car.doors.forEach((door,i)=>{
    const side=i===0?-1:1;
    const surface=(y:number,z:number,offset:number)=>[
      side*(y>=.52?.848-(y-.52)*.008/.19:.848-(.52-y)*.07/.23)+side*offset-door.position.x,
      y-door.position.y,z-door.position.z,
    ];
    // Split at the door's shoulder crease so the emblem cannot sink into the skin.
    function badgeFace(points:number[][],material:THREE.Material,offset:number){
      for(const upper of [false,true]){
        const clipped:number[][]=[];
        for(let j=0;j<points.length;j++){
          const a=points[j],b=points[(j+1)%points.length];
          const insideA=upper?a[0]>=.52:a[0]<=.52,insideB=upper?b[0]>=.52:b[0]<=.52;
          if(insideA)clipped.push(a);
          if(insideA!==insideB){const t=(.52-a[0])/(b[0]-a[0]);clipped.push([.52,THREE.MathUtils.lerp(a[1],b[1],t)]);}
        }
        if(clipped.length>=3)face(clipped.map(([y,z])=>surface(y,z,offset)),material,door,side<0);
      }
    }
    const center=[.535,.08];
    const disc:number[][]=[];
    for(let j=0;j<14;j++){const a=j*Math.PI*2/14;disc.push([.535+Math.cos(a)*.125,.08+Math.sin(a)*.125]);}
    for(let j=0;j<14;j++)badgeFace([center,disc[j],disc[(j+1)%14]],car.paint,.003);
    const ring:number[][]=[];
    for(let j=0;j<10;j++){
      const angle=j*Math.PI/5,r=j%2===0?.089:.041;
      ring.push([.535+Math.cos(angle)*r,.08+Math.sin(angle)*r]);
    }
    // Fan about the center supports the concave star without crossing its edges.
    for(let j=0;j<10;j++)badgeFace([center,ring[j],ring[(j+1)%10]],gold,.006);
  });
  // A shallow curved smile sits inside the original dark front fascia.
  const smile=[[-.30,.357],[-.18,.315],[0,.298],[.18,.315],[.30,.357]];
  for(let i=0;i<smile.length-1;i++){
    const [x,y]=smile[i],[nx,ny]=smile[i+1];
    face([[x,y,-1.84],[nx,ny,-1.84],[nx,ny+.014,-1.84],[x,y+.014,-1.84]],white,car.group,true);
  }
  // Roof attachment is narrow enough to clear both butterfly door sweeps.
  const lightBar=new THREE.Group();lightBar.name='patrol_light_bar';lightBar.position.set(0,1.105,.20);car.group.add(lightBar);
  for(const x of [-.28,.28])box(.10,.055,.12,x,-.022,0,dark,lightBar);
  box(.99,.055,.25,0,.027,0,dark,lightBar);
  box(.11,.14,.23,0,.105,0,white,lightBar);
  // Chamfered eight-corner lenses: chunky toy blocks, no transparent overdraw.
  function lens(x:number,m:THREE.Material){
    const ring=[[-.205,-.075],[-.17,-.112],[.17,-.112],[.205,-.075],[.205,.075],[.17,.112],[-.17,.112],[-.205,.075]];
    face(ring.map(([u,z])=>[u+x,.19,z]),m,lightBar,true);
    face(ring.map(([u,z])=>[u+x,.058,z]),m,lightBar);
    for(let j=0;j<8;j++){
      const [u,z]=ring[j],[nu,nz]=ring[(j+1)%8];
      face([[u+x,.058,z],[nu+x,.058,nz],[nu+x,.19,nz],[u+x,.19,z]],m,lightBar,true);
    }
    box(.28,.015,.23,x,.104,0,white,lightBar);
  }
  lens(-.267,red);lens(.267,blue);
  // Compact grille flashers reinforce the light bar without extra light sources.
  box(.12,.024,.018,-.56,.407,-1.835,red);
  box(.12,.024,.018,.56,.407,-1.835,blue);
  for(const [parent,materials] of batches)for(const [material,geometries] of materials){
    const mesh=new THREE.Mesh(mergeGeometries(geometries),material);geometries.forEach(g=>g.dispose());
    parent.add(mesh);
  }
  let enabled=true;
  function updateLights(time:number){
    const wave=(Math.sin(time*Math.PI*2)+1)/2;
    red.emissiveIntensity=enabled?.25+wave*1.55:.12;
    blue.emissiveIntensity=enabled?.25+(1-wave)*1.55:.12;
  }
  function setLights(value:boolean){enabled=value;updateLights(0);}
  updateLights(0);
  // The shared disposer traverses the final group, including these added resources.
  return {...car,lightBar,setLights,updateLights};
}
