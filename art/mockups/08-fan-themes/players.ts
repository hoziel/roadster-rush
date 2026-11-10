import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Activity='shoot'|'dribble'|'karate'|'bump'|'cartwheel'|'cheer';
export interface PlayerSpec { activity:Activity; x:number; z:number; yaw:number; shirt:string; legs:string; phase?:number; target?:[number,number,number]; height?:number; skin?:string; hair?:string; uniform?:'basketball'|'karate'|'volleyball'|'gymnast' }
type V=[number,number,number];
export interface SportPose { torso:V; head:V; shoulders:V[]; elbows:V[]; hands:V[]; hips:V[]; knees:V[]; ankles:V[]; roll:number; travel:number }
const INK='#282538',CREAM='#fff0d6';
export const DURATIONS:Record<Activity,number>={shoot:3,dribble:.9,karate:3.6,bump:1.8,cartwheel:3,cheer:2};
const clamp=(v:number)=>THREE.MathUtils.clamp(v,0,1),ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a:V,b:V,t:number):V=>a.map((v,i)=>THREE.MathUtils.lerp(v,b[i],t)) as V;
const phase=(t:number,d:number)=>((t%d)+d)%d/d;

/** Shared authored geometry; role selects a per-instance palette channel, feature selects a uniform. */
export class GeometryKit {
  private pieces:THREE.BufferGeometry[]=[];
  add(g:THREE.BufferGeometry,color:string,role=0,feature=0){const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.deleteAttribute('uv');const count=n.attributes.position.count,c=new THREE.Color(color),colors=new Float32Array(count*3);for(let i=0;i<count;i++)colors.set([c.r,c.g,c.b],i*3);n.setAttribute('color',new THREE.BufferAttribute(colors,3));const meta=new Float32Array(count*2);for(let i=0;i<count;i++)meta.set([role,feature],i*2);n.setAttribute('aMeta',new THREE.BufferAttribute(meta,2));this.pieces.push(n);}
  box(size:V,pos:V,color:string,role=0,feature=0,rz=0){this.add(new THREE.BoxGeometry(...size).rotateZ(rz).translate(...pos),color,role,feature);}
  ell(size:V,pos:V,color:string,role=0,feature=0,segments=8,rings=5){this.add(new THREE.SphereGeometry(1,segments,rings).scale(...size).translate(...pos),color,role,feature);}
  beam(a:V,b:V,r:number,color:string,role=0,feature=0,sides=5){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v);const g=new THREE.CylinderGeometry(r,r,d.length(),sides).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...v.add(w).multiplyScalar(.5).toArray());this.add(g,color,role,feature);}
  finish(){const g=mergeGeometries(this.pieces,false);this.pieces.forEach(p=>p.dispose());this.pieces=[];g.computeBoundingBox();g.computeBoundingSphere();return g;}
}

export function buildPlayerGeometry(){
  const b=new GeometryKit();
  b.add(new THREE.CylinderGeometry(.205,.16,.40,8,1).scale(1,1,.63).translate(0,.23,0),'#ffffff',1);
  b.ell([.16,.09,.105],[0,.04,0],'#ffffff',3,0,8,4);
  b.add(new THREE.CylinderGeometry(.074,.079,.058,8).translate(0,.456,0),'#ffffff',2);
  b.beam([-.11,.427,-.095],[0,.34,-.136],.018,CREAM,0,1,4);b.beam([0,.34,-.136],[.11,.427,-.095],.018,CREAM,0,1,4);
  b.box([.34,.046,.226],[0,.075,0],INK,0,1);b.box([.036,.15,.018],[-.035,-.002,-.122],INK,0,1,-.12);b.box([.033,.13,.018],[.025,.005,-.123],INK,0,1,.17);
  // Number one, no badge or team mark, only on the anonymous basketball uniform.
  b.box([.032,.13,.012],[0,.265,-.133],CREAM,0,2);b.box([.07,.024,.012],[.006,.196,-.134],CREAM,0,2);b.box([.046,.022,.012],[-.014,.326,-.134],CREAM,0,2,.38);
  b.beam([-.17,.41,-.075],[0,.36,-.135],.012,CREAM,0,3,4);b.beam([0,.36,-.135],[.17,.41,-.075],.012,CREAM,0,3,4);
  b.beam([-.16,.35,-.09],[0,.22,-.14],.016,'#ffd264',0,4,4);b.beam([0,.22,-.14],[.16,.35,-.09],.016,'#ffd264',0,4,4);
  const h=new GeometryKit();h.ell([.17,.19,.15],[0,0,0],'#ffffff',2,0,10,7);
  h.ell([.027,.038,.025],[-.168,-.01,0],'#ffffff',2,0,5,3);h.ell([.027,.038,.025],[.168,-.01,0],'#ffffff',2,0,5,3);
  h.add(new THREE.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI*.34).scale(.18,.20,.166).translate(0,.005,0),'#ffffff',5);
  h.ell([.08,.08,.08],[0,.15,.13],'#ffffff',5,5,6,4);
  for(const x of[-.059,.059]){h.ell([.028,.032,.008],[x,.018,-.143],CREAM,0,0,6,4);h.ell([.012,.018,.007],[x,.017,-.151],INK,0,0,6,4);h.ell([.004,.006,.003],[x-.004,.026,-.157],'#ffffff',0,0,4,3);h.beam([x-.023,.062,-.132],[x+.021,.066,-.132],.006,INK,0,0,4);}
  h.ell([.022,.020,.019],[0,-.036,-.15],'#ffffff',2,0,6,4);
  h.beam([-.035,-.077,-.139],[0,-.088,-.144],.004,INK,0,0,4);h.beam([0,-.088,-.144],[.034,-.075,-.139],.004,INK,0,0,4);
  const l=new GeometryKit();l.add(new THREE.CylinderGeometry(.064,.052,1,7).translate(0,-.5,0),'#ffffff',1);l.box([.145,.23,.04],[0,-.10,-.059],CREAM,0,6);
  const hand=new GeometryKit();hand.ell([.048,.062,.033],[0,-.023,0],'#ffffff',2,0,7,5);hand.ell([.025,.032,.025],[.038,-.004,-.012],'#ffffff',2,0,5,3);
  const shoe=new GeometryKit();shoe.ell([.074,.065,.137],[0,0,-.045],'#ffffff',4,0,8,5);shoe.box([.145,.027,.225],[0,-.040,-.047],CREAM);shoe.box([.12,.012,.025],[0,.047,-.078],CREAM);
  const ball=new GeometryKit();ball.add(new THREE.SphereGeometry(.13,12,8),'#ffffff',1);for(const axis of[0,1,2]){const g=new THREE.TorusGeometry(.131,.005,3,12);if(axis===1)g.rotateX(Math.PI/2);if(axis===2)g.rotateY(Math.PI/2);ball.add(g,INK);}
  return {torso:b.finish(),head:h.finish(),limbs:l.finish(),hands:hand.finish(),shoes:shoe.finish(),balls:ball.finish()};
}

/** Deterministic key poses. The elbow/knee chains create chamber, reach and extension silhouettes. */
export function samplePose(activity:Activity,t:number):SportPose {
  const u=phase(t,DURATIONS[activity]);
  const p:SportPose={torso:[0,.74,0],head:[0,1.39,0],shoulders:[[-.22,1.15,0],[.22,1.15,0]],elbows:[[-.31,.93,-.05],[.31,.93,-.05]],hands:[[-.32,.71,-.10],[.32,.71,-.10]],hips:[[-.10,.76,0],[.10,.76,0]],knees:[[-.12,.42,0],[.12,.42,0]],ankles:[[-.14,.065,0],[.14,.065,0]],roll:0,travel:0};
  let lift=0;
  if(activity==='shoot'){
    const load=Math.sin(clamp(u/.18)*Math.PI*.5),jump=u>.18&&u<.58?Math.sin((u-.18)/.40*Math.PI)*.43:0;
    lift=u<.18?-.14*load:jump;const raise=ease((u-.12)/.16)*(1-ease((u-.55)/.22));
    for(let i=0;i<2;i++){const side=i?1:-1;p.elbows[i]=mix([side*.23,1.00,-.23],[side*.17,1.47,-.16],raise);p.hands[i]=mix([side*.075,1.26,-.30],[side*.065,1.74,-.25],raise);p.knees[i]=[side*.13,.41-jump*.10,u<.18?-.16*load:.04*jump];}
  }else if(activity==='dribble'){
    const b=(2*u-1)**2;p.hands[1]=[.39,.76+b*.32,-.30];p.elbows[1]=[.36,1.02,-.10];p.hands[0]=[-.31,1.00,-.24];p.elbows[0]=[-.36,1.10,-.08];p.travel=Math.sin(t*.9)*.16;
  }else if(activity==='karate'){
    p.hands=[[-.19,1.18,-.34],[.20,1.07,-.33]];p.elbows=[[-.32,1.05,-.07],[.32,.99,-.09]];p.ankles[0]=[-.16,.065,.16];p.knees[0]=[-.15,.42,.08];
    const chamber=ease((u-.14)/.15)*(1-ease((u-.51)/.15)),extend=ease((u-.29)/.10)*(1-ease((u-.44)/.09));
    p.knees[1]=mix([.13,.42,0],[.12,1.03,-.27],chamber);p.ankles[1]=mix([.14,.065,0],[.12,.79,.02],chamber);p.knees[1]=mix(p.knees[1],[.12,1.01,-.38],extend);p.ankles[1]=mix(p.ankles[1],[.12,1.02,-.76],extend);
    const punch=ease((u-.70)/.08)*(1-ease((u-.83)/.10));p.hands[0]=mix(p.hands[0],[-.13,1.18,-.69],punch);p.elbows[0]=mix(p.elbows[0],[-.17,1.15,-.33],punch);
  }else if(activity==='bump'){
    const hit=(1-ease(u/.19))+ease((u-.88)/.12);lift=-.09+hit*.10;
    p.elbows=[[-.15,.99,-.28],[.15,.99,-.28]];p.hands=[[-.042,.94+hit*.12,-.53],[.042,.94+hit*.12,-.53]];p.knees=[[-.17,.40,-.15],[.17,.40,-.15]];p.ankles=[[-.20,.065,.02],[.20,.065,.02]];
  }else if(activity==='cartwheel'){
    const f=ease((u-.10)/.80),dir=Math.floor(t/DURATIONS.cartwheel)%2?-1:1;p.roll=-dir*f*Math.PI*2;p.travel=dir*(f*2-1)*1.25;
    p.elbows=[[-.25,1.47,0],[.25,1.47,0]];p.hands=[[-.32,1.76,0],[.32,1.76,0]];
    const spread=Math.sin(f*Math.PI)*.40;p.knees=[[-.13-spread*.55,.43,0],[.13+spread*.55,.43,0]];p.ankles=[[-.15-spread,.065,0],[.15+spread,.065,0]];
    const rotate=(v:V):V=>{const y=v[1]-.85,c=Math.cos(p.roll),s=Math.sin(p.roll);return[v[0]*c-y*s,v[0]*s+y*c+.85,v[2]];};
    p.torso=rotate(p.torso);p.head=rotate(p.head);for(const key of['shoulders','elbows','hands','hips','knees','ankles']as const)p[key]=p[key].map(rotate);
    const floor=Math.min(...p.hands.map(v=>v[1]-.090),...p.ankles.map(v=>v[1]-.074));lift=-floor;
  }else if(activity==='cheer'){
    p.elbows=[[-.40,1.36,0],[.40,1.36,0]];p.hands=[[-.55,1.59+Math.sin(t*4)*.06,0],[.55,1.59,0]];lift=Math.max(0,Math.sin(t*4))*.08;
  }
  p.torso[1]+=lift;p.head[1]+=lift;
  for(const key of['shoulders','elbows','hands','hips']as const)for(const v of p[key])v[1]+=lift;
  if(activity==='cartwheel'||activity==='cheer'||activity==='shoot'&&lift>0)for(const key of['knees','ankles']as const)for(const v of p[key])v[1]+=lift;
  return p;
}

type Batch=ReturnType<typeof makeBatch>;
const paletteNames=['iShirt','iSkin','iLegs','iTrim','iHair'] as const;
function makeBatch(g:THREE.BufferGeometry,count:number,material:THREE.MeshToonMaterial){
  for(const name of paletteNames)g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iMeta',new THREE.InstancedBufferAttribute(new Float32Array(count*2),2));const mesh=new THREE.InstancedMesh(g,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;mesh.castShadow=false;return{mesh,next:0};
}
function uniformOf(p:PlayerSpec){return p.uniform??(p.activity==='karate'?'karate':p.activity==='bump'?'volleyball':p.activity==='cartwheel'?'gymnast':'basketball');}
const styleIndex={basketball:0,karate:1,volleyball:2,gymnast:3};
const SKINS=['#efbb91','#c8875b','#8b553c','#f0c9a7'];
export class Sideline {
  readonly group=new THREE.Group();
  readonly batches:Record<keyof ReturnType<typeof buildPlayerGeometry>,Batch>;
  private scenes:{anchor:THREE.Object3D;players:PlayerSpec[]}[]=[];
  private material:THREE.MeshToonMaterial;
  private disposed=false;
  private matrix=new THREE.Matrix4();private anchorMatrix=new THREE.Matrix4();private root=new THREE.Matrix4();private q=new THREE.Quaternion();private v=new THREE.Vector3();private scale=new THREE.Vector3();private rotation=new THREE.Quaternion();private c=new THREE.Color();
  constructor(private capacity=16){
    this.material=new THREE.MeshToonMaterial({vertexColors:true});
    this.material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aMeta; attribute vec2 iMeta; attribute vec3 iShirt; attribute vec3 iSkin; attribute vec3 iLegs; attribute vec3 iTrim; attribute vec3 iHair;');
      shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nif(aMeta.x>.5 && aMeta.x<1.5)vColor.rgb=iShirt; else if(aMeta.x<2.5 && aMeta.x>1.5)vColor.rgb=iSkin; else if(aMeta.x<3.5 && aMeta.x>2.5)vColor.rgb=iLegs; else if(aMeta.x<4.5 && aMeta.x>3.5)vColor.rgb=iTrim; else if(aMeta.x>4.5)vColor.rgb=iHair; if(iMeta.y>2.5 && iMeta.x>1.5 && aMeta.x>.5){float panel=sin(atan(position.z,position.x)*3.+position.y*11.);vColor.rgb=panel>.35?iShirt:panel<-.35?iTrim:iSkin;}');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbool showFeature=aMeta.y<.5 || (aMeta.y<1.5 && abs(iMeta.x-1.)<.1) || (aMeta.y>1.5 && aMeta.y<2.5 && iMeta.x<.1) || (aMeta.y>2.5 && aMeta.y<3.5 && abs(iMeta.x-2.)<.1) || (aMeta.y>3.5 && aMeta.y<4.5 && abs(iMeta.x-3.)<.1) || (aMeta.y>4.5 && aMeta.y<5.5 && iMeta.x>1.5) || (aMeta.y>5.5 && abs(iMeta.x-2.)<.1 && iMeta.y>1.5); if(!showFeature)transformed=vec3(0.);');
    };
    this.material.customProgramCacheKey=()=> 'fan-player-palette-v3';
    const geo=buildPlayerGeometry();this.batches={torso:makeBatch(geo.torso,capacity,this.material),head:makeBatch(geo.head,capacity,this.material),limbs:makeBatch(geo.limbs,capacity*8,this.material),hands:makeBatch(geo.hands,capacity*2,this.material),shoes:makeBatch(geo.shoes,capacity*2,this.material),balls:makeBatch(geo.balls,capacity,this.material)};
    for(const [name,b]of Object.entries(this.batches)){b.mesh.name='fans_'+name;this.group.add(b.mesh);}
  }
  setScenes(scenes:{anchor:THREE.Object3D;players:PlayerSpec[]}[]){this.scenes=scenes;}
  update(time:number){
    Object.values(this.batches).forEach(b=>b.next=0);let n=0;
    for(const scene of this.scenes){let shown=true;for(let o:THREE.Object3D|null=scene.anchor;o;o=o.parent)if(!o.visible)shown=false;if(!shown)continue;
      scene.anchor.updateWorldMatrix(true,false);scene.anchor.matrixWorld.decompose(this.v,this.q,this.scale);const anchorScale=this.scale.x;this.anchorMatrix.compose(this.v,this.q,this.scale.setScalar(1));
      for(let i=0;i<scene.players.length&&n<this.capacity;i++,n++)this.player(scene.players[i],i,n,time,anchorScale);
    }
    for(const b of Object.values(this.batches)){b.mesh.count=b.next;b.mesh.visible=b.next>0;b.mesh.instanceMatrix.needsUpdate=true;for(const name of [...paletteNames,'iMeta'])b.mesh.geometry.getAttribute(name).needsUpdate=true;}
  }
  private put(batch:Batch,matrix:THREE.Matrix4,colors:string[],style:number,part=0){
    const i=batch.next++;batch.mesh.setMatrixAt(i,matrix);for(let k=0;k<paletteNames.length;k++){this.c.set(colors[k]);(batch.mesh.geometry.getAttribute(paletteNames[k])as THREE.InstancedBufferAttribute).setXYZ(i,this.c.r,this.c.g,this.c.b);}(batch.mesh.geometry.getAttribute('iMeta')as THREE.InstancedBufferAttribute).setXY(i,style,part);
  }
  private player(p:PlayerSpec,index:number,total:number,time:number,anchorScale:number){
    const t=time+(p.phase??0),style=styleIndex[uniformOf(p)],height=p.height??(p.activity==='shoot'?2.05:p.activity==='karate'?1.36:p.activity==='cartwheel'?1.40:1.65),size=height/1.60;
    const pose=samplePose(p.activity,t),shirt=style===3?'#2466d4':p.shirt,skin=p.skin??SKINS[(index+total)%SKINS.length];
    const colors=[shirt,skin,style===3?shirt:p.legs,style===0?'#c4ced4':style===1?INK:style===3?CREAM:'#a9d9ff',p.hair??['#362c2c','#5c3a29','#a5703e'][index%3]];
    this.q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw);this.root.compose(this.v.set(p.x*anchorScale+Math.cos(p.yaw)*pose.travel*size,0,p.z*anchorScale-Math.sin(p.yaw)*pose.travel*size),this.q,this.scale.setScalar(size));this.root.premultiply(this.anchorMatrix);
    this.rotation.setFromAxisAngle(new THREE.Vector3(0,0,1),pose.roll);
    const part=(name:'torso'|'head'|'hands'|'shoes',pos:V,q=this.rotation)=>{this.matrix.compose(this.v.set(...pos),q,this.scale.setScalar(1)).premultiply(this.root);this.put(this.batches[name],this.matrix,colors,style);};
    part('torso',pose.torso);part('head',pose.head);
    const limb=(a:V,b:V,color:string,radius:number,part=0)=>{const start=new THREE.Vector3(...a),direction=new THREE.Vector3(...b).sub(start),length=direction.length();this.q.setFromUnitVectors(new THREE.Vector3(0,-1,0),direction.normalize());this.matrix.compose(start,this.q,this.scale.set(radius,length,radius)).premultiply(this.root);const palette=[...colors];palette[0]=color;this.put(this.batches.limbs,this.matrix,palette,style,part);return this.q.clone();};
    for(let i=0;i<2;i++){
      limb(pose.shoulders[i],pose.elbows[i],style===1?shirt:skin,.94);const handRotation=limb(pose.elbows[i],pose.hands[i],style===1?shirt:skin,.82);part('hands',pose.hands[i],handRotation);
      limb(pose.hips[i],pose.knees[i],style===1?p.legs:style===3?skin:p.legs,1.25,1);limb(pose.knees[i],pose.ankles[i],style===1?p.legs:skin,1.05,2);part('shoes',pose.ankles[i],p.activity==='karate'&&pose.ankles[i][1]>.4?new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2):this.rotation);
    }
    // One ball per basketball player or volleyball pair. Targets preserve the existing scaled-anchor convention.
    if(p.activity==='shoot'||p.activity==='dribble'||p.activity==='bump'&&index%2===0){
      let local:V=[0,0,0];const u=phase(t,DURATIONS[p.activity]);
      if(p.activity==='dribble')local=[.40,.135+.91*(2*u-1)**2,-.32];
      else if(p.activity==='shoot')local=[0,pose.hands[0][1]+.075,pose.hands[0][2]-.035];
      else local=[0,1.10,-.56];
      let world=new THREE.Vector3(...local).applyMatrix4(this.root);
      if(p.activity==='shoot'&&u>=.32){
        const releasePose=samplePose('shoot',DURATIONS.shoot*.32),release=new THREE.Vector3(0,releasePose.hands[0][1]+.075,-.285).applyMatrix4(this.root);
        const target=new THREE.Vector3(...(p.target??[p.x,3.25,p.z-3])).multiplyScalar(anchorScale).applyMatrix4(this.anchorMatrix);
        if(u<.70){const f=(u-.32)/.38;world=release.lerp(target,f);world.y+=4*f*(1-f)*1.30;}
        else if(u<.82){const f=(u-.70)/.12;world=target;world.y=THREE.MathUtils.lerp(target.y,.14,f);}
        else{const f=(u-.82)/.18,end=new THREE.Vector3(0,1.335,-.335).applyMatrix4(this.root);world=target.lerp(end,f);world.y=THREE.MathUtils.lerp(.14,end.y,f)+Math.sin(f*Math.PI)*.40;}
      }else if(p.activity==='bump'){
        const me=world.clone(),target=new THREE.Vector3(...(p.target??[p.x,0,p.z-4])).multiplyScalar(anchorScale).applyMatrix4(this.anchorMatrix);target.y=me.y;
        target.add(me.clone().sub(target).setY(0).normalize().multiplyScalar(.56*size));const odd=Math.floor(t/DURATIONS.bump)%2!==0;world=(odd?target:me).clone().lerp(odd?me:target,u);world.y+=Math.sin(u*Math.PI)*3.15;
      }
      const palette=[...colors];palette[0]=p.activity==='bump'?'#2466d4':'#f68c36';if(p.activity==='bump'){palette[1]='#fff1d5';palette[3]='#ffd264';}this.matrix.compose(world,new THREE.Quaternion(),this.scale.setScalar(p.activity==='bump'?1.2:1));this.put(this.batches.balls,this.matrix,palette,style,3);
    }
  }
  dispose(){if(this.disposed)return;this.disposed=true;Object.values(this.batches).forEach(b=>b.mesh.geometry.dispose());this.material.dispose();}
}
