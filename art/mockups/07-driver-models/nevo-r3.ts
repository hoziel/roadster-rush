import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {R3Sculpt,type V} from './r3-sculpt';
import {DRIVER_PALETTES,SEAT_POSITION,type DriverPose,type DriverParts} from './drivers';
export type NevoStyle='real'|'anime';
export interface NevoR3Parts extends DriverParts{style:NevoStyle;headRatio:number;standingHeight:number;}
function joint(parent:THREE.Group,name:string,p:V){const g=new THREE.Group();g.name=name;g.position.set(...p);parent.add(g);return g;}
/** Revision 3 style study. Independent geometry; Revision 2 and the other drivers are untouched. */
export function buildNevoR3(style:NevoStyle,pose:DriverPose='standing'):NevoR3Parts{
 const anime=style==='anime',p=DRIVER_PALETTES.nevo,s=new R3Sculpt(anime),ink='#252731',seam='#233039',white='#f4eee3';
 const leg=.285,shin=.275,boot=.075,hipY=leg+shin+boot,torsoH=.350,shoulder=.145,arm=.215,forearm=.200;
 const hw=anime?.076:.073,hh=anime?.106:.103,hd=anime?.061:.067,headY=1.135,seatScale=anime?.82:.84;
 const group=new THREE.Group();group.name=`Nevo_R3_${style}`;const pelvis=joint(group,'pelvis',[0,hipY,0]),torso=joint(pelvis,'torso',[0,0,0]),head=joint(torso,'head',[0,headY-hipY,-.003]);
 // Slim tailored coveralls: distinct shoulder plane, waist and longer trouser legs.
 s.loft(pelvis,p.suit,[[-.054,.074,.049],[-.038,.098,.064],[0,.109,.066],[.025,.104,.062]],16);
 s.loft(torso,p.suit,[[0,.102,.062],[.065,.103,.064],[.15,.111,.067],[.24,.123,.069],[.305,.133,.062],[.335,.115,.053],[.350,.073,.043]],20);
 s.loft(torso,p.accent,[[.005,.109,.067],[.028,.111,.069],[.041,.106,.066]],16);
 s.patch(torso,'#a9b0b1',[0,.023,-.074],.033,.023,.003,.004);
 s.ell(torso,p.accent,[0,.350,0],[.073,.006,.043],12,5);
 s.loft(torso,p.skin,[[.35,.031,.031],[.385,.032,.032],[.430,.036,.034],[.455,.044,.034]],14);
 // Open collar lapels; seam and zipper are thin, not padded blocks.
 for(const side of[-1,1]){
  const a:V=[side*.008,.333,-.057],b:V=[side*.039,.363,-.048],c:V=[side*.077,.331,-.056],d:V=[side*.039,.298,-.071];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(side<0?[...a,...c,...b,...a,...d,...c]:[...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();s.add(torso,geo,p.trim);
  s.patch(torso,seam,[side*.060,.223,-.070],.071,.078,.005,.003);s.patch(torso,p.suit,[side*.060,.225,-.074],.065,.072,.004,.003);s.patch(torso,p.trim,[side*.060,.257,-.078],.066,.010,.002,.002);
  s.tube(torso,p.trim,[[side*.131,.313,.025],[side*.128,.324,-.024],[side*.095,.321,-.052]],.008,6,5);
  s.tube(torso,seam,[[side*.091,.05,-.035],[side*.100,.13,-.040],[side*.115,.255,-.042]],.0021,6,4);
  for(let i=0;i<2;i++)s.tube(torso,'#46525a',[[side*.027,.085+i*.030,-.066],[side*.061,.075+i*.030,-.064],[side*.094,.083+i*.030,-.046]],.0017,4,4);
 }
 s.tube(torso,seam,[[0,.046,-.071],[0,.19,-.072],[0,.30,-.060],[0,.329,-.054]],.0028,10,4);
 s.tube(torso,'#b6b7b0',[[.004,.048,-.073],[.004,.19,-.074],[.004,.300,-.062]],.0011,8,4);
 s.patch(torso,'#bfc5c3',[.005,.287,-.069],.008,.016,.002,.002);
 // Authored cranial/jaw sections. Cheek mass is reduced, with a tapered chin.
 const rings:[number,number,number][]=[[-1,anime?.06:.22,.32],[-.92,anime?.24:.40,.50],[-.76,anime?.43:.60,.69],[-.52,anime?.64:.78,.82],[-.28,anime?.86:.92,.92],[-.05,1,1],[.20,1,1],[.48,.95,.96],[.73,.80,.78],[.9,.52,.49],[1,.02,.02]];
 const cross=(y:number)=>{const u=THREE.MathUtils.clamp(y/hh,-1,1);let a=rings[0],b=rings[1];for(let i=1;i<rings.length;i++)if(u<=rings[i][0]){a=rings[i-1];b=rings[i];break;}const t=(u-a[0])/(b[0]-a[0]);return[THREE.MathUtils.lerp(a[1],b[1],t)*hw,THREE.MathUtils.lerp(a[2],b[2],t)*hd];};
 const g=(x:number,y:number,cx:number,cy:number,wx:number,wy:number)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
 const surface=(x:number,y:number)=>{const[w,d]=cross(y);let z=-d*Math.pow(Math.max(.005,1-(x/w)**2),.46);
  if(!anime){z-=.010*g(x,y,0,.010,.010,.033)+.014*g(x,y,0,-.019,.010,.010);z-=.0035*(g(x,y,-.010,-.022,.007,.007)+g(x,y,.010,-.022,.007,.007));z+=.0035*(g(x,y,-.030,.020,.018,.013)+g(x,y,.030,.020,.018,.013));}
  else z-=.004*g(x,y,0,-.022,.008,.017);
  return z;};
 const verts:number[]=[],indices:number[]=[],rows=anime?28:42,segs=anime?40:56;
 for(let j=0;j<=rows;j++){const y=(j/rows*2-1)*hh,[w,d]=cross(y);for(let i=0;i<=segs;i++){const a=i/segs*Math.PI*2,x=Math.sin(a)*w,z=Math.cos(a)>=0?surface(x,y):Math.pow(Math.abs(Math.cos(a)),.88)*d*.98+.003;verts.push(x,y,z);}}
 for(let j=1;j<=rows;j++)for(let i=0;i<segs;i++){const a=(j-1)*(segs+1)+i,b=j*(segs+1)+i;indices.push(a,b,a+1,a+1,b,b+1);}const skull=new THREE.BufferGeometry();skull.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));skull.setIndex(indices);const welded=mergeVertices(skull,1e-6);skull.dispose();welded.computeVertexNormals();
 const skin=new THREE.Color(p.skin),tint=new THREE.Color('#cc9277');s.add(head,welded,(x,y,z)=>skin.clone().lerp(tint,z<0?.08*g(Math.abs(x),y,.046,-.015,.018,.014):.02));
 for(const side of[-1,1]){s.ell(head,p.skin,[side*(hw+.002),-.005,.003],[.012,.023,.012],10,7);s.ell(head,'#c18b73',[side*(hw+.007),-.005,-.006],[.0065,.013,.003],8,5);s.tube(head,p.skin,[[side*(hw+.004),.010,-.010],[side*(hw+.010),.008,-.011],[side*(hw+.009),-.009,-.011]],.002,5,4);}
 // Almond eye surfaces hug the face; actual-size eyes for A, larger graphic eyes for B.
 const ex=anime?.031:.030,ey=anime?.017:.019,ew=anime?.024:.0155,eh=anime?.0135:.0067;
 for(const side of[-1,1]){
  const cx=side*ex,outline:V[]=[];const samples=18;
  for(let i=0;i<=samples;i++){const t=i/samples,dx=(t*2-1)*ew,y=ey+Math.sin(t*Math.PI)*eh+side*dx*.10;outline.push([cx+dx,y,surface(cx+dx,y)-.0028]);}
  for(let i=samples-1;i>=0;i--){const t=i/samples,dx=(t*2-1)*ew,y=ey-Math.sin(t*Math.PI)*eh*.72+side*dx*.10;outline.push([cx+dx,y,surface(cx+dx,y)-.0028]);}
  const vp:number[]=[],ix:number[]=[],center:V=[cx,ey,surface(cx,ey)-.005];vp.push(...center);outline.forEach(v=>vp.push(...v));for(let i=0;i<outline.length;i++)ix.push(0,i+1,(i+1)%outline.length+1);const eye=new THREE.BufferGeometry();eye.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));eye.setIndex(ix);eye.computeVertexNormals();s.add(head,eye,white);
  const irisR=anime?.0097:.0058,z=surface(cx,ey)-.0059;s.ell(head,p.eye,[cx,ey,z],[irisR,irisR*(anime?1.15:1),.0016],anime?14:12,6);s.ell(head,ink,[cx,ey,z-.0016],[irisR*.46,irisR*(anime?.80:.49),.0008],10,5);
  s.ell(head,'#fffef5',[cx-.0028,ey+.0032,z-.0025],[anime?.003:.0017,anime?.0036:.0018,.0005],8,4);
  const top=outline.slice(0,samples+1);s.tube(head,anime?ink:'#775240',top,anime?.0018:.0008,16,4);
  s.tube(head,'#b7836d',outline.slice(samples),anime?.0008:.0007,14,4);
  if(anime)s.tube(head,ink,[[cx+side*ew*.78,ey+eh*.62,z+.0008],[cx+side*(ew+.007),ey+eh*.93,z+.003]],.0011,3,4);
  const browY=anime?.042:.040;s.lock(head,p.hair,[[cx-side*ew,browY-.001,surface(cx-side*ew,browY)-.002],[cx-side*.002,browY+.004,surface(cx-side*.002,browY+.004)-.0025],[cx+side*ew,browY+.001,surface(cx+side*ew,browY+.001)-.0015]],anime?.0028:.0019,.35,8,5);
 }
 // Small integrated nose shading and natural smile. No separate ball nose or cheek spheres.
 if(!anime)for(const side of[-1,1])s.tube(head,'#a56d57',[[side*.008,-.025,surface(side*.008,-.025)-.0007],[side*.012,-.026,surface(side*.012,-.026)-.0007]],.00065,2,4);
 else s.tube(head,'#b37d66',[[.002,-.015,surface(.002,-.015)-.0006],[.005,-.022,surface(.005,-.022)-.0006],[.001,-.024,surface(.001,-.024)-.0006]],.0008,3,4);
 const mouthW=anime?.016:.025,smile=(x:number)=>-.050+.007*(x/mouthW)**2+.025*x;
 const lip:V[]=Array.from({length:13},(_,i)=>{const x=(i/12*2-1)*mouthW,y=smile(x);return[x,y,surface(x,y)-.0013];});s.tube(head,'#844d44',lip,anime?.0009:.0007,12,4);
 if(!anime)s.tube(head,'#d59b87',Array.from({length:11},(_,i)=>{const x=(i/10*2-1)*mouthW*.86,y=smile(x)-.002;return[x,y,surface(x,y)-.0014] as V;}),.0009,10,4);
 // Closed scalp cap, compact at the sides. Swept quiff clumps sit over it.
 const hv:number[]=[],hi:number[]=[],hs=anime?24:32,hr=7;
 for(let j=0;j<=hr;j++)for(let i=0;i<=hs;i++){const a=i/hs*Math.PI*2,c=Math.cos(a),edge=c>0?.056+.004*Math.sin(a):-.045,th=j/hr*Math.acos(edge/(hh+.006)),y=Math.cos(th)*(hh+.006),[cw,cd]=cross(Math.min(hh,y));hv.push(j===0?0:Math.sin(a)*(cw+.010),y,j===0?0:-Math.sign(c)*Math.pow(Math.abs(c),.88)*(cd+.010));}
 for(let j=1;j<=hr;j++)for(let i=0;i<hs;i++){const a=(j-1)*(hs+1)+i,b=j*(hs+1)+i;hi.push(a,a+1,b,a+1,b+1,b);}const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(hv,3));cap.setIndex(hi);cap.computeVertexNormals();s.add(head,cap,p.hair);
 s.loft(head,p.hair,[[.055,.062,.051],[.078,.071,.054],[.105,.060,.044],[.122,.037,.026],[.133,.002,.002]],anime?14:20);
 const hairBase=new THREE.Color(p.hair),hairLight=new THREE.Color(p.highlight);for(let i=0;i<8;i++){const x=-.056+i*.016,peak=.121+Math.sin(i*.47)*.009;const pts:V[]=[[x,.061,-.050],[x*.94-.006,.093,-.051],[x*.75-.010,peak,-.017],[x*.58-.012,peak+.004,.012],[x*.43-.011,anime?peak+.006:.103,.041]];s.lock(head,anime?(i%3?'#52362a':'#735039'):(x,y,z)=>hairBase.clone().lerp(hairLight,.15+.28*Math.sin(x*60+y*6+z*7)**2),pts,anime?.013:.011,anime?.31:.55,anime?7:10,anime?5:6);if(!anime)s.tube(head,'#8b6246',pts.slice(0,4).map(([a,b,c])=>[a-.002,b+.001,c-.002] as V),.0006,8,3);}
 for(const side of[-1,1])s.lock(head,p.hair,[[side*.065,.047,-.006],[side*.071,.020,-.003],[side*.066,-.009,-.001]],.008,.4,6,5);
 // Factory safety goggles: narrow connected lenses and strap on the forehead.
 for(const side of[-1,1]){
  s.patch(head,'#323b42',[side*.032,.068,-.062],.056,.030,.009,.004);
  s.patch(head,'#b5c4c5',[side*.032,.068,-.067],.049,.024,.007,.0015);
  s.tube(head,'#fff5df',[[side*.050,.066,-.071],[side*.038,.076,-.071],[side*.020,.076,-.071]],.0009,5,4);
  s.tube(head,'#3f454a',[[side*.058,.066,-.060],[side*.076,.060,-.022],[side*.077,.049,.023]],.003,6,5);
 }
 s.tube(head,'#323b42',[[-.007,.068,-.062],[0,.074,-.064],[.007,.068,-.062]],.0027,4,5);
 const arms:THREE.Group[]=[],elbows:THREE.Group[]=[],hips:THREE.Group[]=[],knees:THREE.Group[]=[],hands:THREE.Object3D[]=[];
 for(const side of[-1,1]){
  const upper=joint(torso,side<0?'arm_L':'arm_R',[side*shoulder,.317,0]),elbow=joint(upper,side<0?'elbow_L':'elbow_R',[0,-arm,0]);arms.push(upper);elbows.push(elbow);
  s.loft(upper,p.suit,[[-arm,.032,.034],[-.16,.035,.037],[-.08,.039,.043],[-.018,.043,.044],[.012,.031,.032]],12);
  s.ell(upper,p.suit,[0,-.004,0],[.042,.042,.043],12,7);s.ell(elbow,p.suit,[0,0,0],[.033,.032,.035],10,6);
  s.loft(elbow,p.suit,[[-forearm,.026,.029],[-.15,.031,.033],[-.07,.036,.039],[-.018,.034,.036]],12);
  s.tube(upper,p.trim,[[side*.037,-.018,-.017],[side*.036,-.085,-.023],[side*.028,-.180,-.018]],.005,7,5);
  s.loft(elbow,p.accent,[[-forearm-.005,.028,.030],[-forearm+.018,.029,.031]],12);
  for(let f=0;f<2;f++)s.tube(elbow,seam,[[-.025,-.038-f*.017,-.021],[0,-.044-f*.017,-.037],[.025,-.031-f*.017,-.021]],.0016,5,4);
  const py=-forearm-.030;s.ell(elbow,p.skin,[0,py,-.003],[.022,.032,.012],12,7);
  for(let f=0;f<4;f++){const x=(f-1.5)*.0105,len=[.026,.033,.031,.024][f];s.lock(elbow,p.skin,[[x,py-.016,-.004],[x*1.05,py-.027,-.007],[x*1.09,py-.016-len,-.005]],.0059,.85,5,5);}
  s.lock(elbow,p.skin,[[-side*.019,py+.005,-.001],[-side*.030,py-.008,-.006],[-side*.027,py-.025,-.011]],.008,.8,5,5);
  hands.push(joint(elbow,'grip',[0,-forearm-.038,-.003]));
  const hip=joint(pelvis,side<0?'hip_L':'hip_R',[side*.061,0,0]),knee=joint(hip,side<0?'knee_L':'knee_R',[0,-leg,0]);hips.push(hip);knees.push(knee);
  s.loft(hip,p.suit,[[-leg,.037,.040],[-.23,.040,.044],[-.13,.047,.051],[-.025,.052,.055],[.020,.048,.047]],14);
  s.ell(knee,p.suit,[0,0,0],[.038,.037,.040],10,6);s.loft(knee,p.suit,[[-shin,.030,.033],[-.22,.034,.036],[-.15,.036,.039],[-.06,.036,.039],[-.012,.038,.040]],14);
  s.patch(hip,p.trim,[side*.022,-.13,-.052],.040,.064,.004,.003);s.patch(hip,p.suit,[side*.022,-.101,-.056],.040,.016,.003,.002);
  s.tube(hip,seam,[[side*.040,-.04,-.026],[side*.039,-.15,-.027],[side*.030,-.25,-.022]],.0018,6,4);
  for(let i=0;i<2;i++)s.tube(knee,'#48525a',[[-.024,-.11-i*.065,-.025],[0,-.12-i*.065,-.040],[.024,-.114-i*.065,-.025]],.0017,5,4);
  s.loft(knee,p.accent,[[-shin-.003,.031,.035],[-shin+.017,.032,.035]],12);
  s.ell(knee,p.boot,[0,-shin-.034,-.032],[.046,.040,.092],14,8);s.ell(knee,'#1e2730',[0,-shin-.065,-.032],[.047,.011,.094],14,5);
  s.ell(knee,p.accent,[0,-shin-.004,-.022],[.030,.018,.043],10,6);for(let i=0;i<3;i++)s.tube(knee,'#738088',[[-.024,-shin+.005-i*.005,-.025-i*.018],[.024,-shin+.001-i*.005,-.033-i*.018]],.0018,2,4);
 }
 head.scale.setScalar(anime?1:.95);
 const dispose=s.finish();let normalization=1,current:DriverPose='standing',sole=0;
 const down=new THREE.Vector3(0,-1,0);
 function aimArm(i:number,target:THREE.Vector3,pole:THREE.Vector3){const start=arms[i].position,delta=target.clone().sub(start),distance=delta.length(),dir=delta.normalize(),l2=forearm+.038,a=(arm*arm-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,arm*arm-a*a));pole.addScaledVector(dir,-pole.dot(dir)).normalize();const e=start.clone().addScaledVector(dir,a).addScaledVector(pole,height);arms[i].quaternion.setFromUnitVectors(down,e.clone().sub(start).normalize());elbows[i].quaternion.setFromUnitVectors(down,target.sub(e).applyQuaternion(arms[i].quaternion.clone().invert()).normalize());}
 function setPose(next:DriverPose){current=next;group.scale.setScalar(normalization*(next==='seated'?seatScale:1));pelvis.position.set(0,next==='seated'?.05:hipY+sole,0);torso.rotation.set(next==='seated'?-.18:0,0,0);head.rotation.set(next==='seated'?.12:0,0,0);
  for(let i=0;i<2;i++){const side=i===0?-1:1;arms[i].rotation.set(.05,0,side*.17);elbows[i].rotation.set(.12,0,0);hips[i].rotation.set(next==='seated'?Math.PI/2:0,0,next==='seated'?0:side*.035);knees[i].rotation.set(next==='seated'?-.22:0,0,0);}
  group.updateMatrixWorld(true);
  for(let i=0;i<2;i++){const side=i===0?-1:1;if(next==='seated'){const target=new THREE.Vector3(side*.102,.22,-.34-SEAT_POSITION.z).divideScalar(normalization*seatScale);group.localToWorld(target);torso.worldToLocal(target);aimArm(i,target,new THREE.Vector3(side*.55,-1,0));}else aimArm(i,new THREE.Vector3(side*.096,.031,-.071),new THREE.Vector3(side,0,0));}
  group.updateMatrixWorld(true);
 }
 setPose('standing');let b=new THREE.Box3().setFromObject(group);sole=-b.min.y;normalization=1.30/(b.max.y-b.min.y);setPose('standing');b=new THREE.Box3().setFromObject(group);const headBox=new THREE.Box3().setFromObject(head),standingHeight=b.max.y-b.min.y,headRatio=standingHeight/(headBox.max.y-headBox.min.y);setPose(pose);
 return{style,group,joints:{pelvis,torso,head,arms,elbows,hips,knees,hands},seatedScale:seatScale,headRatio,standingHeight,setPose,setWave(angle){if(current==='standing'){arms[0].rotation.set(.05,0,-.9);elbows[0].rotation.set(.1,0,-1.6+angle);}},dispose};
}
