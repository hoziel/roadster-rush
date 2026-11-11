import * as THREE from 'three';
import {Sculpt,type V} from './sculpt';
export type DriverId='nevo'|'ori'|'shiri'|'ofir';
export type DriverPose='standing'|'seated';
export const SEATED_SCALE:Record<DriverId,number>={nevo:.74,ori:.72,shiri:.62,ofir:.62};
/** Seat contact anchor for this art roadster, not a production car API. */
export const SEAT_POSITION=new THREE.Vector3(-.33,.43,-.07);
export interface DriverParts {
 group:THREE.Group;
 joints:{pelvis:THREE.Group;torso:THREE.Group;head:THREE.Group;arms:THREE.Group[];elbows:THREE.Group[];hips:THREE.Group[];knees:THREE.Group[];hands:THREE.Object3D[]};
 seatedScale:number;
 setPose(pose:DriverPose):void;
 setWave(angle:number):void;
 dispose():void;
}
export const DRIVER_PALETTES={
 nevo:{skin:'#edb18a',blush:'#d68d74',hair:'#443027',highlight:'#80573d',suit:'#35424b',trim:'#cf493e',accent:'#6c777b',eye:'#673d28',boot:'#27313a'},
 ori:{skin:'#edb394',blush:'#dc8c72',hair:'#422f27',highlight:'#ad713e',suit:'#df452d',trim:'#e7b94e',accent:'#2c3c4a',eye:'#47ad8c',boot:'#293d4b'},
 shiri:{skin:'#edbd9e',blush:'#d29179',hair:'#88613e',highlight:'#d9b777',suit:'#303b4b',trim:'#cda45c',accent:'#606970',eye:'#927349',boot:'#293341'},
 ofir:{skin:'#dca381',blush:'#bd7d66',hair:'#44332a',highlight:'#997047',suit:'#bac9d6',trim:'#e18c4b',accent:'#44566b',eye:'#34485a',boot:'#293441'},
} as const;
function joint(parent:THREE.Group,name:string,position:V){const g=new THREE.Group();g.name=name;g.position.set(...position);parent.add(g);return g;}
/** Revision 2. Authored curved surfaces and details, no sampled reference textures. */
export function buildDriver(id:DriverId,pose:DriverPose='standing'):DriverParts{
 const p=DRIVER_PALETTES[id],child=id==='nevo'||id==='ori',woman=id==='ori'||id==='shiri',space=id==='ofir';
 const desired=id==='nevo'?1.28:id==='ori'?1.33:1.75;
 const leg=child?.245:.365,shin=child?.235:.35,boot=child?.09:.11,hipY=leg+shin+boot,torsoH=child?.29:.37,shoulder=child?.17:woman?.205:.225;
 const arm=child?.205:.275,forearm=child?.18:.245,hw=id==='nevo'?.155:id==='ori'?.154:id==='shiri'?.151:.166,hh=child?.182:.201,hd=child?.143:.155;
 const group=new THREE.Group();group.name=`Driver_${id}_R2`;const pelvis=joint(group,'pelvis',[0,hipY,0]),torso=joint(pelvis,'torso',[0,0,0]),head=joint(torso,'head',[0,torsoH+.08+hh*.78,-.005]);
 const s=new Sculpt(),ink='#282b34',white='#fff5e8',seam=space?'#748b9c':'#222e39';
 // Continuous tailored torso with chest, waist and shoulder transitions.
 s.loft(torso,(x,y,z)=>z<-.035&&Math.abs(x)>shoulder*.61&&y>.055?p.trim:p.suit,[[0,.111,.078],[.035,.135,.091],[torsoH*.25,.133,.097],[torsoH*.50,woman?.134:.148,.107],[torsoH*.77,shoulder*.93,.112],[torsoH*.92,shoulder*.96,.100],[torsoH,shoulder*.77,.081],[torsoH+.018,.085,.064]],24);
 s.loft(pelvis,p.suit,[[-.068,.085,.055],[-.052,.125,.08],[-.02,.143,.095],[.04,.135,.091]],20);
 s.loft(torso,p.accent,[[.015,.139,.097],[.024,.143,.099],[.058,.143,.099],[.067,.136,.094]],20);
 s.patch(torso,space?p.trim:'#a7afb0',[0,.042,-.103],.045,.031,.004,.007);
 s.tube(torso,seam,[[0,.072,-.104],[0,torsoH*.55,-.111],[0,torsoH*.85,-.109],[0,torsoH+.014,-.077]],.004,12,5);
 s.tube(torso,'#c5c4b8',[[.006,.08,-.108],[.006,torsoH*.7,-.115],[.006,torsoH-.016,-.09]],.0016,9,4);
 s.patch(torso,'#bfc6c5',[.006,torsoH*.73,-.119],.014,.025,.003,.003);
 s.loft(torso,p.trim,[[torsoH-.003,.085,.071],[torsoH+.012,.088,.070],[torsoH+.042,.078,.065]],20);
 s.tube(torso,seam,[[-.078,torsoH+.034,-.026],[-.055,torsoH+.038,-.055],[0,torsoH+.039,-.067],[.055,torsoH+.038,-.055],[.078,torsoH+.034,-.026]],.003,14,5);
 s.ell(torso,p.skin,[0,torsoH+.063,0],[.061,.071,.059],16,8);
 for(const side of[-1,1]){
  const x=side*.078;
  if(id==='nevo'){
   s.patch(torso,seam,[x,torsoH*.57,-.108],.073,.079,.008,.004);
   s.patch(torso,p.suit,[x,torsoH*.58,-.114],.066,.071,.007,.004);
   s.patch(torso,p.trim,[x,torsoH*.68,-.121],.066,.013,.003,.003);
   s.tube(torso,p.trim,[[side*.17,torsoH-.004,.015],[side*.15,torsoH+.001,-.07],[side*.102,torsoH-.008,-.09]],.017,8,6);
  }else{
   s.patch(torso,p.trim,[side*.073,torsoH*.40,-.113],.130,.040,.004,.003);
   s.tube(torso,p.trim,[[side*.13,.076,-.064],[side*.126,torsoH*.46,-.069],[side*.14,torsoH*.76,-.067],[side*.165,torsoH*.92,-.04]],.007,12,5);
   s.patch(torso,p.accent,[side*.073,torsoH*.70,-.114],.080,.057,.008,.005);
   s.patch(torso,space?'#a0b4c4':p.suit,[side*.073,torsoH*.71,-.120],.068,.041,.005,.002);
  }
  // Small cloth folds follow the stomach rather than floating as boxes.
  for(let i=0;i<3;i++)s.tube(torso,space?'#8f9eac':'#3f4650',[[side*.035,.085+i*.025,-.101],[side*.076,.078+i*.025,-.096],[side*.113,.085+i*.025,-.080]],.0028,5,4);
  s.tube(torso,seam,[[side*.12,.07,.055],[side*.14,torsoH*.6,.074],[side*.13,torsoH*.86,.071]],.0035,9,5);
  if(space){
   s.tube(torso,ink,[[side*.12,torsoH*.53,-.121],[side*.175,torsoH-.01,-.097],[side*.18,torsoH+.066,.008],[side*.16,torsoH+.005,.12]],.023,16,8);
   s.tube(torso,'#a9b7c1',[[side*.12,torsoH*.53,-.126],[side*.175,torsoH-.01,-.102],[side*.18,torsoH+.066,.004],[side*.16,torsoH+.005,.117]],.016,16,7);
   for(let i=0;i<6;i++)s.tube(torso,'#546775',[[side*(.128+i*.006),torsoH*.55+i*.022,-.14],[side*(.145+i*.005),torsoH*.55+i*.022,-.128]],.003,2,4);
  }
 }
 if(space)s.patch(torso,p.accent,[0,torsoH*.56,.11],.235,.225,.025,.065);
 // Face cross-section: broad cheeks, individual jaw/chin, and a flatter eye plane.
 const jaw=id==='nevo'?.62:id==='ori'?.59:id==='shiri'?.60:.79;
 const rings:[number,number,number][]=[[-1,.12,.24],[-.93,.42,.50],[-.80,jaw,.68],[-.63,.80,.81],[-.43,.94,.90],[-.22,1,.98],[0,.99,1],[.25,.96,.99],[.5,.93,.92],[.73,.79,.77],[.9,.53,.54],[1,.06,.07]];
 const cross=(y:number)=>{const u=THREE.MathUtils.clamp(y/hh,-1,1);let a=rings[0],b=rings[1];for(let i=1;i<rings.length;i++)if(u<=rings[i][0]){a=rings[i-1];b=rings[i];break;}const t=(u-a[0])/(b[0]-a[0]);return[THREE.MathUtils.lerp(a[1],b[1],t)*hw,THREE.MathUtils.lerp(a[2],b[2],t)*hd];};
 const surface=(x:number,y:number)=>{const[w,d]=cross(y);return-d*Math.pow(Math.max(.02,1-(x/w)**2),.34);};
 const vertices:number[]=[],idx:number[]=[],rows=26,segs=36;
 for(let j=0;j<=rows;j++){const y=(j/rows*2-1)*hh,[w,d]=cross(y);for(let i=0;i<=segs;i++){const a=i/segs*Math.PI*2,x=Math.sin(a)*w,z=-Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.68)*d;vertices.push(x,y,z);}}
 for(let j=1;j<=rows;j++)for(let i=0;i<segs;i++){const a=(j-1)*(segs+1)+i,b=j*(segs+1)+i;idx.push(a,b,a+1,a+1,b,b+1);}const face=new THREE.BufferGeometry();face.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));face.setIndex(idx);face.computeVertexNormals();
 const skin=new THREE.Color(p.skin),cheek=new THREE.Color(p.blush),beard=new THREE.Color('#796052');
 s.add(head,face,(x,y,z)=>{const c=skin.clone(),blush=Math.exp(-(((Math.abs(x)-hw*.57)/.038)**2+((y+.039)/.030)**2))*.40*(z<0?1:0);c.lerp(cheek,blush);if(space&&z<.07){const lower=THREE.MathUtils.smoothstep(-y,.025,.08),mouth=Math.exp(-((x/.061)**6+((y+.077)/.026)**4));c.lerp(beard,lower*.50*(1-mouth*.8));}return c;});
 for(const side of[-1,1]){
  s.ell(head,p.skin,[side*hw*.985,-.005,.002],[.031,.048,.025],14,10);
  s.ell(head,p.blush,[side*hw*1.04,-.004,-.016],[.018,.030,.007],12,7);
  s.tube(head,p.skin,[[side*hw*1.03,.021,-.020],[side*hw*1.11,.018,-.022],[side*hw*1.105,-.013,-.025],[side*hw*1.035,-.025,-.023]],.0045,8,5);
 }
 // Almond eyes with curved lids, iris rings, pupils and two catchlights.
 const eyeY=.018,eyeX=hw*.40,ew=child?.038:.034,eh=id==='ori'?.023:child?.026:.021;
 if(!space)for(const side of[-1,1]){
  const x=side*eyeX,z=surface(x,eyeY)-.004;
  s.ell(head,white,[x,eyeY,z],[ew,eh,.012],20,12);
  s.ell(head,p.eye,[x-side*.003,eyeY,z-.010],[eh*.70,eh*.90,.007],18,10);
  s.ell(head,ink,[x-side*.003,eyeY,z-.016],[eh*.35,eh*.60,.004],16,9);
  s.ell(head,'#ffffff',[x-.006,eyeY+.009,z-.020],[.0055,.006,.002],10,6);
  s.ell(head,'#d2ede0',[x+.006,eyeY-.007,z-.020],[.0025,.0025,.0014],8,5);
  s.tube(head,ink,[[x-ew,eyeY,z],[x-ew*.5,eyeY+eh*.90,z-.007],[x+ew*.35,eyeY+eh*.99,z-.007],[x+ew,eyeY+.002,z]],woman?.0038:.003,12,5);
  s.tube(head,p.blush,[[x-ew,eyeY,z+.001],[x,eyeY-eh,z-.004],[x+ew,eyeY+.001,z+.001]],.0025,10,5);
  s.tube(head,p.skin,[[x-ew*.8,eyeY+eh+.008,z+.002],[x,eyeY+eh+.012,z-.001],[x+ew*.8,eyeY+eh+.008,z+.003]],.004,8,5);
  const by=id==='ori'?.052:.062,inner=id==='ori'?.059:.068;
  s.lock(head,p.hair,[[x-side*.032,inner,surface(x-side*.032,inner)-.007],[x-side*.005,by+.010,surface(x-side*.005,by+.010)-.010],[x+side*.026,by+.004,surface(x+side*.026,by+.004)-.008],[x+side*.042,by-.008,surface(x+side*.042,by-.008)-.005]],.0075,.48,10,6);
  if(woman)for(let k=0;k<3;k++)s.tube(head,ink,[[x+side*(ew*.68+k*.004),eyeY+eh*.7-k*.003,z-.005],[x+side*(ew+.009+k*.003),eyeY+eh*.95-k*.003,z-.007]],.0018,3,4);
 }
 // Continuous tapered nose, soft tip and nostril wings.
 // Nose bridge is positioned on the facial surface instead of at the head centre.
 const noseRoot=joint(head,'nose',[0,0,-hd+.008]);
 s.ell(noseRoot,p.skin,[0,.002,0],[.016,.047,.022],14,10);
 s.ell(noseRoot,p.skin,[0,-.034,-.017],[space?.024:.022,.018,.025],18,10);
 for(const side of[-1,1]){s.ell(noseRoot,p.skin,[side*.019,-.038,-.003],[.013,.011,.015],12,7);s.ell(noseRoot,'#aa6f5a',[side*.014,-.046,-.016],[.006,.003,.004],10,5);}
 // A curved smile patch is draped over the face, avoiding a floating flat sticker.
 const smileWidth=id==='shiri'?.054:id==='ofir'?.045:.047,open=id==='shiri'?.028:id==='ofir'?.007:.004;
 const mouthTop=(x:number)=>-.080+(space?.004:.014)*(x/smileWidth)**2+(id==='ori'?x*.07:0),mouthBottom=(x:number)=>mouthTop(x)-open*Math.sqrt(Math.max(0,1-(x/smileWidth)**2));
 const mouthStrip=(color:string,top:(x:number)=>number,bottom:(x:number)=>number,width:number,offset:number)=>{const p:number[]=[],ix:number[]=[];for(let i=0;i<=20;i++){const x=(i/20*2-1)*width,y=top(x),b=bottom(x);p.push(x,y,surface(x,y)-offset,x,b,surface(x,b)-offset);}for(let i=0;i<20;i++){const a=i*2;ix.push(a,a+2,a+1,a+2,a+3,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();s.add(head,g,color);};
 mouthStrip('#713e3b',mouthTop,mouthBottom,smileWidth,.006);
 if(id==='shiri'||space)mouthStrip(white,x=>mouthTop(x)-.002,x=>mouthTop(x)-(id==='shiri'?.009:.0045),smileWidth*.82,.007);
 const lipPoints:V[]=Array.from({length:9},(_,i)=>{const x=(i/8*2-1)*smileWidth,y=mouthBottom(x)-.001;return[x,y,surface(x,y)-.007];});s.tube(head,p.blush,lipPoints,id==='shiri'?.0036:.0027,16,5);
 s.tube(head,'#865445',Array.from({length:9},(_,i)=>{const x=(i/8*2-1)*smileWidth,y=mouthTop(x);return[x,y,surface(x,y)-.008] as V;}),.0024,16,5);
 s.tube(head,p.blush,[[-.022,-.111,surface(-.022,-.111)-.002],[0,-.115,surface(0,-.115)-.003],[.022,-.111,surface(.022,-.111)-.002]],.002,8,4);
 if(id==='shiri')for(const side of[-1,1])for(let i=0;i<9;i++){const x=side*(.035+(i%5)*.010),y=-.023-Math.floor(i/5)*.012-(i%2)*.003;s.ell(head,'#b18464',[x,y,surface(x,y)-.002],[.0018,.0015,.0008],6,4);}
 if(space){
  for(const side of[-1,1])s.lock(head,'#634c3c',[[side*.003,-.057,surface(side*.003,-.057)-.005],[side*.025,-.059,surface(side*.025,-.059)-.007],[side*.046,-.068,surface(side*.046,-.068)-.005]],.006,.46,8,6);
  for(let i=0;i<105;i++){const x=Math.sin(i*2.399)*(.035+.105*Math.sqrt(i/105)),y=-.04-(i%13)/13*.112;if(Math.abs(x)>.14||((x/.056)**2+((y+.078)/.031)**2)<1)continue;const z=surface(x,y);s.tube(head,i%3?'#826651':'#a48469',[[x,y,z-.0018],[x+.0018,y-.004,z-.0018]],.0008,1,3);}
 }
 // A continuous hair cap closes the scalp; locks add layered swept volume over it.
 const hc:number[]=[],hi:number[]=[],hs=32,hr=10;
 for(let j=0;j<=hr;j++)for(let i=0;i<=hs;i++){const a=i/hs*Math.PI*2,front=Math.cos(a),end=front>0?(woman?.72:.87)+.65*Math.abs(Math.sin(a)):1.93,th=j/hr*end,y=Math.cos(th)*hh*1.06+.006,[cw,cd]=cross(y);hc.push(j===0?0:Math.sin(a)*(cw+.009),y,j===0?0:-Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.68)*(cd+.009));}
 for(let j=1;j<=hr;j++)for(let i=0;i<hs;i++){const a=(j-1)*(hs+1)+i,b=j*(hs+1)+i;hi.push(a,a+1,b,a+1,b+1,b);}const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(hc,3));cap.setIndex(hi);cap.computeVertexNormals();s.add(head,cap,p.hair);
 const baseHair=new THREE.Color(p.hair),lightHair=new THREE.Color(p.highlight),hairTint=(x:number,y:number,z:number)=>baseHair.clone().lerp(lightHair,.25+.22*Math.sin(x*18+y*4+z*7)**2);
 if(woman){
  s.ell(head,hairTint,[0,-.09,.105],[hw*1.13,.285,.095],20,14);
  for(const side of[-1,1]){
   for(let i=0;i<5;i++){const z=.01+i*.035,shiri=id==='shiri',sweep=shiri?.025:.035;
    s.lock(head,hairTint,[[side*.06,.18,z-.07],[side*(hw+.006),.087,z],[side*(hw+.015),-.07,z+.005],[side*(hw+sweep),-.19,z-.028],[side*(hw+(shiri?-.006:.042)),-.33,z-.09],[side*(hw+.027),-.40+i*.008,z-.12]],.045,.75,15,8);
   }
   s.lock(head,hairTint,[[side*.004,.198,-.027],[side*.066,.163,-.105],[side*.125,.087,-.117],[side*.154,-.005,-.095],[side*.178,-.15,-.116],[side*.152,-.28,-.132],[side*.205,-.37,-.12]],.041,.55,18,8);
   s.lock(head,p.highlight,[[side*.020,.188,-.056],[side*.079,.140,-.122],[side*.133,.065,-.121],[side*.156,-.019,-.109],[side*.181,-.16,-.131]],.008,.40,16,6);
  }
 }else{
  s.ell(head,p.hair,[0,.025,.106],[hw*1.04,hh*.79,.061],20,12);
  for(let i=0;i<9;i++){const x=-.135+i*.032,y=.206+Math.sin(i*.48)*.025;
   s.lock(head,hairTint,[[x,.115,-.095],[x*.95-.012,.177,-.113],[x*.78-.021,y,-.050],[x*.66-.035,y+.029,.015],[x*.56-.045,y+.014,.061]],.033,.81,12,8);
  }
  for(const side of[-1,1]){s.lock(head,p.hair,[[side*.14,.112,.012],[side*.158,.044,.022],[side*.142,-.016,.014]],.025,.65,8,8);for(let i=0;i<4;i++)s.lock(head,p.highlight,[[side*.147,.085-i*.013,.024],[side*.151,.068-i*.013,.040],[side*.14,.044-i*.013,.054]],.003,.6,5,5);}
 }
 function glasses(y:number,z:number,goggles:boolean){
  for(const side of[-1,1]){const x=side*.067;
   s.patch(head,ink,[x,y,z],.123,.070,.015,.014);
   s.patch(head,goggles?'#a8c0c8':'#43576a',[x,y,z-.004],.103,.052,.011,.003);
   s.tube(head,goggles?'#e9ede1':'#9babb4',[[x-.035,y-.008,z-.008],[x-.012,y+.012,z-.009],[x+.018,y+.015,z-.008]],.0025,7,5);
   s.tube(head,ink,[[side*.124,y,z+.008],[side*.157,y-.006,-.048],[side*.165,y-.023,.024]],.007,8,6);
  }
  s.tube(head,ink,[[-.015,y+.003,z+.004],[0,y+.011,z+.003],[.015,y+.003,z+.004]],.0055,5,6);
 }
 if(id==='nevo')glasses(.116,-.123,true);if(space)glasses(.029,-.158,false);if(id==='shiri')glasses(.197,-.077,false);
 const arms:THREE.Group[]=[],elbows:THREE.Group[]=[],hips:THREE.Group[]=[],knees:THREE.Group[]=[],hands:THREE.Object3D[]=[];
 for(const side of[-1,1]){
  const upper=joint(torso,side<0?'arm_L':'arm_R',[side*shoulder,torsoH-.025,0]),elbow=joint(upper,side<0?'elbow_L':'elbow_R',[0,-arm,0]);arms.push(upper);elbows.push(elbow);
  s.ell(upper,p.suit,[0,-.018,0],[child?.061:.075,.074,child?.062:.076],16,10);
  s.loft(upper,(x,y,z)=>Math.abs(x)>.04&&z<.01&&y>-.18?p.trim:p.suit,[[-arm,.045,.048],[-arm*.8,.049,.053],[-arm*.48,.058,.062],[-.04,child?.059:.069,.064],[.008,.040,.047]],16);
  s.ell(elbow,p.suit,[0,0,0],[.049,.052,.052],14,8);
  s.loft(elbow,p.suit,[[-forearm,.038,.041],[-forearm*.78,.044,.046],[-forearm*.46,.049,.054],[-.035,.052,.053]],16);
  s.tube(upper,seam,[[side*.046,-arm*.91,-.028],[side*.055,-arm*.55,-.039],[side*.058,-.05,-.040]],.003,7,5);
  for(let i=0;i<3;i++)s.tube(elbow,space?'#8f9da9':seam,[[-.032,-.030-i*.015,-.035],[0,-.037-i*.015,-.052],[.032,-.025-i*.015,-.035]],.0026,6,4);
  s.loft(elbow,p.accent,[[-forearm-.008,.041,.043],[-forearm+.025,.043,.045]],16);
  for(let i=0;i<5;i++)s.tube(elbow,seam,[[-.032,-forearm+i*.005,-.026],[0,-forearm+i*.005,-.045],[.032,-forearm+i*.005,-.026]],.0015,6,4);
  if(space){s.patch(elbow,p.accent,[0,-forearm*.57,-.054],.064,.079,.009,.008);s.patch(elbow,'#74bacf',[0,-forearm*.57,-.059],.046,.058,.004,.003);for(let i=0;i<3;i++)s.box(elbow,'#31526d',[0,-forearm*.57+.014-i*.013,-.064],[.028,.003,.002]);}
  const handColor=space?p.suit:p.skin,palmY=-forearm-.041;
  s.ell(elbow,handColor,[0,palmY,-.005],[.033,.043,.020],14,9);
  for(let f=0;f<4;f++){const x=(f-1.5)*.016,len=[.039,.049,.047,.035][f];s.lock(elbow,handColor,[[x,palmY-.020,-.006],[x*1.12,palmY-.038,-.010],[x*1.18,palmY-.020-len,-.008]],.009,.91,6,8);if(!space)s.patch(elbow,'#eec0a4',[x*1.15,palmY-.012-len,-.017],.010,.012,.004,.001);}
  s.lock(elbow,handColor,[[-side*.026,palmY+.009,-.002],[-side*.047,palmY-.008,-.008],[-side*.043,palmY-.032,-.016]],.013,.82,7,8);
  if(space)for(let i=0;i<3;i++)s.tube(elbow,p.accent,[[-.022,palmY+.012-i*.010,-.022],[.022,palmY+.008-i*.010,-.022]],.0025,3,4);
  const hand=joint(elbow,'grip',[0,-forearm-.052,-.005]);hands.push(hand);
  const hip=joint(pelvis,side<0?'hip_L':'hip_R',[side*(child?.075:.09),0,0]),knee=joint(hip,side<0?'knee_L':'knee_R',[0,-leg,0]);hips.push(hip);knees.push(knee);
  s.loft(hip,(x,_y,z)=>side*x>.045&&z<.03?p.trim:p.suit,[[-leg,.055,.061],[-leg*.82,.062,.066],[-leg*.46,.071,.078],[-.015,.077,.076],[.025,.071,.067]],18);
  s.ell(knee,p.suit,[0,0,0],[.058,.060,.062],14,9);
  s.loft(knee,(x,_y,z)=>side*x>.045&&z<.03?p.trim:p.suit,[[-shin,.047,.052],[-shin*.83,.061,.060],[-shin*.60,.062,.065],[-shin*.28,.057,.060],[-.02,.060,.062]],18);
  s.tube(hip,seam,[[side*.057,-.04,-.049],[side*.060,-leg*.55,-.045],[side*.045,-leg+.025,-.045]],.003,8,5);
  for(let i=0;i<3;i++)s.tube(knee,space?'#8899aa':seam,[[-.044,-shin*(.45+i*.16),-.034],[0,-shin*(.48+i*.16),-.061],[.040,-shin*(.46+i*.16),-.035]],.003,6,4);
  if(id==='nevo'){s.patch(hip,p.trim,[side*.035,-leg*.47,-.073],.066,.093,.006,.007);s.patch(hip,p.suit,[side*.035,-leg*.35,-.081],.066,.024,.004,.003);}
  if(space){s.patch(knee,p.accent,[0,-.034,-.065],.104,.106,.024,.016);for(let i=0;i<3;i++)s.patch(knee,p.suit,[0,-.009-i*.027,-.086],.087,.018,.004,.003);}
  s.loft(knee,p.accent,[[-shin-.005,.049,.053],[-shin+.024,.050,.054]],16);
  s.ell(knee,p.boot,[0,-shin-boot*.43,-.038],[.067,boot*.51,.115],20,10);
  s.ell(knee,'#1f2933',[0,-shin-boot*.82,-.038],[.068,boot*.19,.117],20,6);
  s.ell(knee,p.accent,[0,-shin-boot*.16,-.020],[.042,.028,.063],14,8);
  for(let k=0;k<4;k++){const z=-.019-k*.018;s.tube(knee,'#7c878d',[[-.033,-shin+.007-k*.004,z],[.032,-shin+.007-k*.004,z-.008]],.003,2,5);}
  for(const sign of[-1,1])s.tube(knee,p.accent,[[sign*.043,-shin-.045,-.132],[sign*.062,-shin-.048,-.080],[sign*.055,-shin-.033,.020]],.003,8,5);
 }
 const dispose=s.finish();let normalization=1,current:DriverPose='standing';
 const down=new THREE.Vector3(0,-1,0);
 function seatArms(){
  group.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const side=i===0?-1:1,target=new THREE.Vector3(side*.102,.22,-.34-SEAT_POSITION.z),actual=normalization*SEATED_SCALE[id];target.divideScalar(actual);group.localToWorld(target);torso.worldToLocal(target);
   const shoulderPos=arms[i].position,delta=target.clone().sub(shoulderPos),length=delta.length(),dir=delta.clone().normalize(),l1=arm,l2=forearm+.052;
   const a=(l1*l1-l2*l2+length*length)/(2*length),h=Math.sqrt(Math.max(0,l1*l1-a*a));let pole=new THREE.Vector3(side*.5,-1,0);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
   const e=shoulderPos.clone().addScaledVector(dir,a).addScaledVector(pole,h);
   arms[i].quaternion.setFromUnitVectors(down,e.clone().sub(shoulderPos).normalize());
   const localEnd=target.clone().sub(e).applyQuaternion(arms[i].quaternion.clone().invert()).normalize();elbows[i].quaternion.setFromUnitVectors(down,localEnd);
  }
 }
 function setPose(next:DriverPose){current=next;group.scale.setScalar(normalization*(next==='seated'?SEATED_SCALE[id]:1));pelvis.position.set(0,next==='standing'?hipY:.074,0);pelvis.rotation.set(0,0,0);torso.rotation.set(next==='seated'?-.28:0,0,0);head.rotation.set(next==='seated'?.15:0,0,0);
  for(let i=0;i<2;i++){const side=i===0?-1:1;arms[i].rotation.set(.10,0,side*(i===0?.85:.38));elbows[i].rotation.set(.25,0,side*(i===0?1.60:-.95));hips[i].rotation.set(next==='seated'?Math.PI/2:0,0,next==='seated'?0:side*.04);knees[i].rotation.set(next==='seated'?-.25:0,0,0);}
  if(next==='seated')seatArms();else{
   const i=1,target=new THREE.Vector3(child?.125:.15,.055,-.108),start=arms[i].position,delta=target.clone().sub(start),dist=delta.length(),dir=delta.normalize(),l2=forearm+.052,a=(arm*arm-l2*l2+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,arm*arm-a*a)),pole=new THREE.Vector3(1,0,0);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const e=start.clone().addScaledVector(dir,a).addScaledVector(pole,h);arms[i].quaternion.setFromUnitVectors(down,e.clone().sub(start).normalize());elbows[i].quaternion.setFromUnitVectors(down,target.sub(e).applyQuaternion(arms[i].quaternion.clone().invert()).normalize());
  }group.updateMatrixWorld(true);
 }
 setPose('standing');const bounds=new THREE.Box3().setFromObject(group),soleCorrection=-bounds.min.y;normalization=desired/(bounds.max.y-bounds.min.y);
 const applyPose=(next:DriverPose)=>{setPose(next);if(next==='standing')pelvis.position.y+=soleCorrection;group.updateMatrixWorld(true);};applyPose(pose);
 return{group,joints:{pelvis,torso,head,arms,elbows,hips,knees,hands},seatedScale:SEATED_SCALE[id],setPose:applyPose,setWave(angle){if(current==='standing')elbows[0].rotation.z=-1.60+angle;},dispose};
}
