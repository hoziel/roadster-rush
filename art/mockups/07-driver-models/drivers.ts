import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type DriverId = 'nevo' | 'ori' | 'shiri' | 'ofir';
export type DriverPose = 'standing' | 'seated';
type V = [number, number, number];
type Row = [number, number, number];
export interface DriverParts {
  group: THREE.Group;
  joints: { pelvis: THREE.Group; torso: THREE.Group; head: THREE.Group; arms: THREE.Group[]; elbows: THREE.Group[]; hips: THREE.Group[]; knees: THREE.Group[] };
  /** Seated origin is the seat-contact plane. Standing origin is the soles. */
  setPose(pose: DriverPose): void;
  /** Additive wave, in radians. Call after setPose; zero restores the standing wave angle. */
  setWave(angle: number): void;
  dispose(): void;
}

export const DRIVER_PALETTES = {
  nevo: { skin:'#eab08b', blush:'#d98f76', hair:'#493124', highlight:'#73503a', suit:'#323f49', trim:'#df4942', accent:'#64717a', eye:'#593a2b', boot:'#252d35' },
  ori: { skin:'#edb391', blush:'#d68b73', hair:'#493024', highlight:'#966039', suit:'#e64730', trim:'#eabd51', accent:'#29394a', eye:'#318c78', boot:'#283a4a' },
  shiri: { skin:'#edbd9e', blush:'#d99b83', hair:'#92653e', highlight:'#d7ae69', suit:'#303b4b', trim:'#d3a456', accent:'#5e6976', eye:'#94734d', boot:'#293341' },
  ofir: { skin:'#dca382', blush:'#be8069', hair:'#49352b', highlight:'#8d694b', suit:'#b6c6d5', trim:'#e88741', accent:'#40556d', eye:'#334150', boot:'#293441' },
} as const;

/** Geometry is merged per articulated part. One opaque, vertex-colored Toon material. */
class Sculpt {
  readonly material = new THREE.MeshToonMaterial({ vertexColors:true });
  private pieces = new Map<THREE.Group, THREE.BufferGeometry[]>();
  private geometry: THREE.BufferGeometry[] = [];
  add(target:THREE.Group, source:THREE.BufferGeometry, color:string|((x:number,y:number,z:number)=>string)) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    g.deleteAttribute('uv');if(!g.hasAttribute('normal'))g.computeVertexNormals();
    const pos=g.getAttribute('position'), n=pos.count, a=new Float32Array(n*3);
    for(let i=0;i<n;i++){const c=new THREE.Color(typeof color==='string'?color:color(pos.getX(i),pos.getY(i),pos.getZ(i)));a.set([c.r,c.g,c.b],i*3);}
    g.setAttribute('color',new THREE.BufferAttribute(a,3));
    if(!this.pieces.has(target))this.pieces.set(target,[]);this.pieces.get(target)!.push(g);
  }
  ell(target:THREE.Group,color:string,pos:V,scale:V,segments=12,rings=8) {
    this.add(target,new THREE.SphereGeometry(1,segments,rings).scale(...scale).translate(...pos),color);
  }
  box(target:THREE.Group,color:string,pos:V,scale:V,rx=0) {
    this.add(target,new THREE.BoxGeometry(...scale).rotateX(rx).translate(...pos),color);
  }
  /** Elliptical loft, with smoothed normals and optional color by surface point. */
  loft(target:THREE.Group,color:string,rows:Row[],segments=12,colorAt?:(x:number,y:number,z:number)=>string) {
    const vertices:number[]=[],indices:number[]=[];
    for(const [y,w,d] of rows)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*w,y,-Math.cos(a)*d);}
    for(let j=1;j<rows.length;j++)for(let i=0;i<segments;i++){
      const a=(j-1)*(segments+1)+i,b=j*(segments+1)+i;indices.push(a,b,a+1,a+1,b,b+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    if(!colorAt){this.add(target,g,color);return;}
    const flat=g.toNonIndexed();g.dispose();const p=flat.getAttribute('position'),a=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){const c=new THREE.Color(colorAt(p.getX(i),p.getY(i),p.getZ(i)));a.set([c.r,c.g,c.b],i*3);}
    flat.setAttribute('color',new THREE.BufferAttribute(a,3));if(!this.pieces.has(target))this.pieces.set(target,[]);this.pieces.get(target)!.push(flat);
  }
  tube(target:THREE.Group,color:string,points:V[],radius:number,segments=12,sides=5) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    this.add(target,new THREE.TubeGeometry(curve,segments,radius,sides,false),color);
  }
  /** A tapered swept hair lock; each ring has an elliptical section. */
  lock(target:THREE.Group,color:string,points:V[],radius:number,flat=.65,steps=6) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const frames=curve.computeFrenetFrames(steps,false),vertices:number[]=[],idx:number[]=[],sides=6;
    for(let j=0;j<=steps;j++){
      const p=curve.getPointAt(j/steps),r=radius*(j===steps?.025:Math.pow(1-j/(steps+1),.5));
      for(let i=0;i<=sides;i++){
        const a=i/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r*flat);vertices.push(...v.toArray());
      }
    }
    for(let j=1;j<=steps;j++)for(let i=0;i<sides;i++){const a=(j-1)*(sides+1)+i,b=j*(sides+1)+i;idx.push(a,b,a+1,a+1,b,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(idx);g.computeVertexNormals();this.add(target,g,color);
  }
  finish(){
    for(const [parent,parts]of this.pieces){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,this.material);mesh.castShadow=true;mesh.name=parent.name+'_surface';parent.add(mesh);this.geometry.push(g);}
    this.pieces.clear();let disposed=false;return()=>{if(disposed)return;disposed=true;this.geometry.forEach(g=>g.dispose());this.material.dispose();};
  }
}

function joint(parent:THREE.Group,name:string,position:V){const g=new THREE.Group();g.name=name;g.position.set(...position);parent.add(g);return g;}

/** Original cartoon studies; dimensions in metres, +Y up, facing -Z. No image textures. */
export function buildDriver(id:DriverId,pose:DriverPose='standing'):DriverParts {
  const p=DRIVER_PALETTES[id],child=id==='nevo'||id==='ori',woman=id==='shiri'||id==='ori',space=id==='ofir';
  const desired=id==='nevo'?1.28:id==='ori'?1.33:1.75;
  const leg=child?.245:.365,shin=child?.235:.35,boot=child?.09:.11;
  const hipY=leg+shin+boot,torsoH=child?.29:.37,shoulder=child?.17:woman?.205:.225;
  const arm=child?.205:.275,forearm=child?.18:.245;
  const hw=child?.158:woman?.155:.167,hh=child?.182:.201,hd=child?.143:.155;
  const group=new THREE.Group();group.name=`Driver_${id}`;
  const pelvis=joint(group,'pelvis',[0,hipY,0]),torso=joint(pelvis,'torso',[0,0,0]);
  const head=joint(torso,'head',[0,torsoH+.08+hh*.78,-.005]);
  const s=new Sculpt(),ink='#242936',white='#fff3df';
  // Tailored suit, rounded shoulders and a clear waist rather than stacked boxes.
  s.loft(torso,p.suit,[[0,.10,.075],[.04,.135,.09],[torsoH*.40,woman?.135:.15,.10],[torsoH*.82,shoulder*.94,.105],[torsoH,shoulder*.80,.08],[torsoH+.025,.09,.065]],14,(x,y,z)=>{
    if(z<-.038 && Math.abs(x)>shoulder*.57 && y>.06)return p.trim;
    return p.suit;
  });
  s.loft(pelvis,p.suit,[[-.065,.10,.07],[-.025,.14,.09],[.04,.133,.09]],12);
  s.loft(torso,p.accent,[[.015,.136,.092],[.049,.14,.096],[.063,.135,.092]],14);
  s.box(torso,space?p.trim:'#9aa7b0',[0,.041,-.097],[.05,.035,.014]);
  s.tube(torso,ink,[[0,.07,-.102],[0,torsoH*.7,-.108],[0,torsoH+.01,-.077]],.0035,8,4);
  s.loft(torso,p.trim,[[torsoH-.005,.087,.071],[torsoH+.039,.078,.064]],12);
  s.ell(torso,p.skin,[0,torsoH+.065,0],[.061,.072,.06],10,6);
  for(const side of[-1,1]){
    if(id==='nevo'){
      s.box(torso,p.accent,[side*.075,torsoH*.58,-.101],[.075,.073,.012]);
      s.box(torso,p.trim,[side*.075,torsoH*.67,-.109],[.071,.01,.008]);
      s.box(torso,p.trim,[side*.12,torsoH*.89,-.072],[.083,.036,.022]);
    }else{
      s.box(torso,p.trim,[side*.068,torsoH*.43,-.105],[.128,.036,.015]);
      if(space){
        s.box(torso,p.accent,[side*.073,torsoH*.72,-.107],[.09,.063,.022]);
        s.tube(torso,'#a4b0b8',[[side*.11,torsoH*.65,-.11],[side*.17,torsoH+.04,-.025],[side*.18,torsoH-.01,.10]],.022,10,6);
      }
    }
  }
  if(space)s.box(torso,p.accent,[0,torsoH*.55,.132],[.24,.24,.08]);

  // Sculpted head: oval cranium, softer cheeks, a narrower jaw and chin.
  const hg=new THREE.SphereGeometry(1,20,12),hp=hg.getAttribute('position');
  for(let i=0;i<hp.count;i++){
    const y=hp.getY(i),jaw=y<-.18?THREE.MathUtils.lerp(.84,1,(y+1)/.82):1;
    hp.setXYZ(i,hp.getX(i)*hw*jaw,y*hh,hp.getZ(i)*hd*(y<-.35?.92:1));
  }hg.computeVertexNormals();s.add(head,hg,space?(x,y,z)=>y<-.035&&z<.10&&((x/.066)**2+((y+.084)/.034)**2)>1?'#705345':p.skin:p.skin);
  for(const side of[-1,1]){
    s.ell(head,p.skin,[side*hw*.99,-.013,.006],[.033,.049,.026],10,7);
    s.ell(head,p.blush,[side*hw*1.065,-.014,-.013],[.017,.030,.009],8,5);
  }
  const surface=(x:number,y:number)=>-hd*Math.sqrt(Math.max(.04,1-(x/hw)**2-(y/hh)**2));
  const eyeY=.017,eyeX=hw*.40,eyeW=child?.036:.035,eyeH=child?.025:.022;
  if(!space)for(const side of[-1,1]){
    const x=side*eyeX,z=surface(x,eyeY)-.005;
    s.ell(head,ink,[x,eyeY+.001,z],[eyeW*1.1,eyeH*1.12,.012],12,7);
    s.ell(head,white,[x,eyeY,z-.009],[eyeW,eyeH,.010],12,7);
    s.ell(head,p.eye,[x-side*.003,eyeY,z-.019],[eyeH*.70,eyeH*.91,.006],12,7);
    s.ell(head,ink,[x-side*.003,eyeY,z-.024],[eyeH*.36,eyeH*.61,.004],10,6);
    s.ell(head,'#ffffff',[x-.006,eyeY+.009,z-.028],[.006,.006,.003],8,5);
    s.tube(head,p.hair,[[x-side*.033,.058,surface(x-side*.033,.058)-.009],[x,.073,surface(x,.073)-.012],[x+side*.032,.059,surface(x+side*.032,.059)-.008]],child?.007:.006,7,4);
    if(woman)s.tube(head,ink,[[x+side*.026,eyeY+.012,z-.013],[x+side*.042,eyeY+.023,z-.008]],.0035,2,4);
  }
  // Small bridge, rounded nose tip and nostril shadows; mouth follows the cheek surface.
  s.ell(head,p.skin,[0,-.014,-hd+.002],[.020,.042,.022],10,7);
  s.ell(head,p.skin,[0,-.039,-hd-.012],[child?.024:.025,.020,.022],12,7);
  for(const side of[-1,1])s.ell(head,p.blush,[side*.016,-.048,-hd-.023],[.007,.004,.004],8,4);
  if(space){
    // Stubble is vertex-colored directly on the head, avoiding intersecting beard shells.
    for(const side of[-1,1])s.lock(head,p.highlight,[[side*.005,-.063,-hd-.015],[side*.03,-.064,-hd-.018],[side*.056,-.079,-hd+.003]],.012,.7,4);
  }
  if(id==='shiri'){
    const smile=new THREE.Shape();smile.moveTo(-.048,-.080);smile.quadraticCurveTo(0,-.095,.048,-.080);smile.quadraticCurveTo(.025,-.126,0,-.125);smile.quadraticCurveTo(-.027,-.124,-.048,-.080);
    s.add(head,new THREE.ShapeGeometry(smile,7).rotateY(Math.PI).translate(0,0,-hd+.012),'#733c3a');
    const teeth=new THREE.Shape();teeth.moveTo(-.039,-.088);teeth.quadraticCurveTo(0,-.098,.039,-.088);teeth.lineTo(.028,-.101);teeth.quadraticCurveTo(0,-.108,-.028,-.101);teeth.closePath();
    s.add(head,new THREE.ShapeGeometry(teeth,6).rotateY(Math.PI).translate(0,0,-hd+.010),white);
    for(const side of[-1,1])for(let i=0;i<4;i++){const x=side*(.044+i*.009),y=-.039+(i%2)*.009;s.add(head,new THREE.CircleGeometry(.0023,6).rotateY(Math.PI).translate(x,y,surface(x,y)-.003),'#ae785c');}
  }else{
    s.tube(head,'#8e5145',[[-.044,-.086,surface(-.044,-.086)-.007],[-.015,-.096,surface(-.015,-.096)-.007],[.020,-.094,surface(.02,-.094)-.007],[.047,-.079,surface(.047,-.079)-.008]],.004,10,5);
    s.tube(head,p.blush,[[-.024,-.112,surface(-.024,-.112)-.003],[0,-.115,surface(0,-.115)-.004],[.021,-.110,surface(.021,-.110)-.003]],.003,6,4);
  }

  // Hair mass and hand-authored swept clumps; no reference image is mapped onto geometry.
  if(woman){
    s.ell(head,p.hair,[0,.026,.085],[hw*1.13,hh*1.13,.10],16,10);
    for(const side of[-1,1]){
      const wavy=id==='shiri';
      for(let i=0;i<4;i++){
        const offset=i*.028,z=.015+i*.033;
        s.lock(head,(i%2===0)?p.highlight:p.hair,[[side*.075,.17,z-.08],[side*(hw+.015),.075,z],[side*(hw+offset*.35),-.105,z+.02],[side*(hw+.03+(wavy?.025:0)),-.22,z-.012],[side*(hw+offset*.2+(wavy?-.018:.018)),-.34,z-.03]],.037,.70,7);
      }
      s.lock(head,p.highlight,[[side*.008,.192,-.04],[side*.082,.167,-.105],[side*.135,.085,-.112],[side*.16,-.045,-.075],[side*.19,-.19,-.075]],.037,.42,9);
      s.lock(head,p.hair,[[side*.008,.190,-.062],[side*.064,.145,-.130],[side*.125,.081,-.124],[side*.148,.012,-.095]],.027,.42,7);
    }
  }else{
    const cap=new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI*.32);cap.scale(hw*1.06,hh*1.04,hd*1.10).translate(0,.006,0);s.add(head,cap,p.hair);
    s.ell(head,p.hair,[0,.035,.095],[hw*1.03,hh*.78,.076],12,8);
    for(let i=0;i<8;i++){
      const x=-.132+i*.035;
      s.lock(head,i%3===0?p.highlight:p.hair,[[x,.135,-.074],[x*.84-.008,.196,-.078],[x*.72-.022,.222+Math.sin(i*.6)*.018,-.025],[x*.65-.032,.240+Math.sin(i*.6)*.018,.045]],.035,.72,6);
    }
    for(const side of[-1,1])s.lock(head,p.hair,[[side*.14,.105,.015],[side*.16,.042,.02],[side*.147,-.015,.009]],.025,.65,4);
  }

  function glasses(y:number,z:number,goggles:boolean){
    const lens=(x:number,w:number,h:number,depth:number,color:string,front:number)=>{
      const shape=new THREE.Shape();shape.moveTo(-w+.01,h*.5);shape.lineTo(w-.01,h*.5);shape.quadraticCurveTo(w,h*.5,w,h*.5-.01);shape.lineTo(w*.81,-h*.5+.01);shape.quadraticCurveTo(w*.78,-h*.5,w*.62,-h*.5);shape.lineTo(-w*.62,-h*.5);shape.quadraticCurveTo(-w*.78,-h*.5,-w*.81,-h*.5+.01);shape.lineTo(-w,h*.5-.01);shape.quadraticCurveTo(-w,h*.5,-w+.01,h*.5);
      s.add(head,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:2}).translate(x,y,front),color);
    };
    for(const side of[-1,1]){
      const x=side*.068;
      lens(x,.063,.075,.014,ink,z-.012);
      lens(x,.052,.054,.004,goggles?'#b7ccd2':'#35465a',z-.017);
      s.tube(head,goggles?'#e1e9df':'#8294a7',[[x-.032,y+.010,z-.023],[x-.008,y+.020,z-.023],[x+.018,y+.020,z-.023]],.003,5,4);
      s.tube(head,ink,[[side*.126,y,z],[side*.157,y-.006,-.047],[side*.17,y-.021,.023]],.008,5,5);
    }
    s.tube(head,ink,[[-.014,y+.005,z-.002],[0,y+.013,z-.004],[.014,y+.005,z-.002]],.007,4,5);
  }
  if(id==='nevo')glasses(.105,-.128,true);
  if(space)glasses(.027,-.155,false);
  if(id==='shiri')glasses(.193,-.083,false);

  const arms:THREE.Group[]=[],elbows:THREE.Group[]=[],hips:THREE.Group[]=[],knees:THREE.Group[]=[];
  for(const side of[-1,1]){
    const upper=joint(torso,side<0?'arm_L':'arm_R',[side*shoulder,torsoH-.025,0]);
    const elbow=joint(upper,side<0?'elbow_L':'elbow_R',[0,-arm,0]);arms.push(upper);elbows.push(elbow);
    s.ell(upper,p.suit,[0,-.018,0],[child?.061:.075,.075,child?.062:.076],10,7);
    s.loft(upper,p.suit,[[-arm,.045,.048],[-arm*.66,.052,.057],[-.04,child?.059:.069,.064]],10,(x,y,z)=>Math.abs(x)>.04&&z<.01&&y>-.18?p.trim:p.suit);
    s.ell(elbow,p.suit,[0,0,0],[.049,.052,.052],10,6);
    s.loft(elbow,p.suit,[[-forearm,.039,.041],[-forearm*.7,.046,.049],[-.02,.052,.054]],10);
    s.loft(elbow,p.accent,[[-forearm-.008,.041,.042],[-forearm+.026,.043,.044]],10);
    if(space){s.box(elbow,'#79bbd0',[0,-forearm*.57,-.052],[.057,.073,.015]);s.box(elbow,p.accent,[0,-forearm*.57,-.061],[.037,.048,.005]);}
    const handColor=space?p.suit:p.skin;
    s.ell(elbow,handColor,[0,-forearm-.047,-.005],[.036,.051,.026],10,7);
    s.ell(elbow,handColor,[-side*.029,-forearm-.025,-.021],[.017,.029,.018],8,6);
    for(let f=0;f<3;f++)s.ell(elbow,handColor,[(f-1)*.018,-forearm-.077,-.009],[.012,.026,.013],8,5);
    const hip=joint(pelvis,side<0?'hip_L':'hip_R',[side*(child?.075:.09),0,0]);
    const knee=joint(hip,side<0?'knee_L':'knee_R',[0,-leg,0]);hips.push(hip);knees.push(knee);
    s.loft(hip,p.suit,[[-leg,.055,.061],[-leg*.5,.068,.073],[-.015,.077,.076],[.025,.071,.067]],12,(x,_y,z)=>side*x>.045&&z<.03?p.trim:p.suit);
    s.ell(knee,p.suit,[0,0,0],[.058,.060,.062],10,6);
    s.loft(knee,p.suit,[[-shin,.047,.052],[-shin*.65,.061,.063],[-.02,.060,.062]],12,(x,_y,z)=>side*x>.045&&z<.03?p.trim:p.suit);
    if(id==='nevo')s.box(hip,p.trim,[side*.056,-leg*.47,-.040],[.032,.085,.032]);
    if(space){s.ell(knee,p.accent,[0,-.035,-.059],[.064,.070,.022],10,6);s.box(knee,p.suit,[0,-.035,-.080],[.087,.052,.012]);}
    s.loft(knee,p.accent,[[-shin-.005,.048,.052],[-shin+.018,.049,.053]],12);
    s.ell(knee,p.boot,[0,-shin-boot*.46,-.036],[.066,boot*.52,.115],12,7);
    s.ell(knee,'#202831',[0,-shin-boot*.83,-.037],[.067,boot*.18,.116],12,5);
    for(let k=0;k<3;k++)s.box(knee,p.accent,[0,-shin-boot*.03,-.047-k*.021],[.072,.006,.008]);
  }
  const dispose=s.finish();
  function setPose(next:DriverPose){
    group.scale.setScalar(1);pelvis.position.set(0,next==='standing'?hipY:.085,0);pelvis.rotation.set(0,0,0);torso.rotation.set(next==='seated'?-.12:0,0,0);head.rotation.set(0,0,0);
    for(let i=0;i<2;i++){
      const side=i===0?-1:1;
      arms[i].rotation.set(next==='seated'?1.20:.10,0,next==='seated'?side*.10:side*(i===0?.85:.38));
      elbows[i].rotation.set(next==='seated'?.68:.25,0,next==='seated'?0:side*(i===0?1.60:-.95));
      hips[i].rotation.set(next==='seated'?Math.PI/2:0,0,next==='seated'?0:side*.04);
      knees[i].rotation.set(next==='seated'?-Math.PI/2:0,0,0);
    }
    group.scale.setScalar(normalization);group.updateMatrixWorld(true);
  }
  let normalization=1;setPose('standing');const box=new THREE.Box3().setFromObject(group);normalization=desired/(box.max.y-box.min.y);
  // Standing origin stays at the soles after measuring the complete hair silhouette.
  const soleCorrection=-box.min.y;
  const rawSetPose=setPose;
  const applyPose=(next:DriverPose)=>{rawSetPose(next);if(next==='standing')pelvis.position.y+=soleCorrection;group.updateMatrixWorld(true);};
  applyPose(pose);
  return{group,joints:{pelvis,torso,head,arms,elbows,hips,knees},setPose:applyPose,setWave(angle){elbows[0].rotation.z=-1.60+angle;},dispose};
}
