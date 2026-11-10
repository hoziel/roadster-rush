import {CityKit,P,lettering,star,type CityModel,type Point} from './kit.js';
export const FRONT_IDS=['brick-arc','limestone-hall','teal-corner','rose-bay','gold-market','plum-music'] as const;
export type FrontId=typeof FRONT_IDS[number];
const DATA:Record<FrontId,{w:number;h:number;color:string;name:string;glow:string;rows:number}>={
 'brick-arc':{w:10,h:11,color:P.brick,name:'BATBOP',glow:P.cyan,rows:2},
 'limestone-hall':{w:12,h:12,color:P.stone,name:'MOONPOP',glow:P.magenta,rows:2},
 'teal-corner':{w:8.5,h:9,color:P.teal,name:'STARHOP',glow:P.warm,rows:1},
 'rose-bay':{w:10.5,h:10.5,color:P.pink,name:'SUNUP',glow:P.cyan,rows:2},
 'gold-market':{w:11.5,h:8.5,color:P.gold,name:'PEACHY',glow:P.magenta,rows:1},
 'plum-music':{w:9,h:13,color:P.plum,name:'ZOOP',glow:P.cyan,rows:2},
};
function arch(b:CityKit,x:number,y:number,w:number,h:number,lit:boolean){const r=w/2,cy=y+h/2-r,z=.071,points:Point[]=[[x-r,y-h/2,z],[x+r,y-h/2,z],[x+r,cy,z]];for(let i=1;i<=8;i++){const a=i*Math.PI/8;points.push([x+Math.cos(a)*r,cy+Math.sin(a)*r,z]);}const draw=()=>b.panel(points,lit?P.warm:P.glass,[0,0,1]);if(lit)b.lit(draw);else draw();
 for(let i=0;i<8;i++){const a=i*Math.PI/8,c=(i+1)*Math.PI/8;b.panel([[x+Math.cos(a)*r,cy+Math.sin(a)*r,.10],[x+Math.cos(c)*r,cy+Math.sin(c)*r,.10],[x+Math.cos(c)*(r+.16),cy+Math.sin(c)*(r+.16),.10],[x+Math.cos(a)*(r+.16),cy+Math.sin(a)*(r+.16),.10]],P.cream,[0,0,1]);}
 for(const s of[-1,1])b.box(.13,h-r,.15,x+s*(r+.065),y-r/2,.06,P.cream);b.box(w+.4,.18,.35,x,y-h/2-.10,.11,P.stone);b.plane(x,y,.135,.07,h,P.cream);b.plane(x,cy-.20,.135,w,.065,P.cream);
}
export function buildHistoricFront(id:FrontId):CityModel{
 const b=new CityKit(),d=DATA[id],w=d.w,h=d.h;
 b.box(w,h,7.5,0,h/2,-3.75,d.color);b.box(w+.35,.32,7.8,0,.16,-3.7,P.stone);
 for(const y of[3.45,h-.62,h-.28])b.box(w+.42,.19,.54,0,y,.03,P.cream);
 for(let i=0;i<Math.floor(w/.9);i++)b.box(.24,.29,.35,-w/2+.4+i*.9,h-.45,.28,P.stone);
 for(const x of[-w/2+.23,w/2-.23]){b.box(.32,h-.5,.22,x,h/2,.05,P.cream);for(let y=.8;y<h-1;y+=1.6)b.box(.43,.22,.28,x,y,.09,P.stone);}
 const columns=id==='teal-corner'?3:4;
 for(let row=0;row<d.rows;row++)for(let i=0;i<columns;i++){const x=(i-(columns-1)/2)*(w-1.5)/columns,y=d.rows===1?6.1:5.1+row*(h-5.7)/d.rows;arch(b,x,y,(w-2.4)/columns*.65,d.rows===1?2.8:2.35,(i+row)%3!==0);}
 // Ground-floor shop glazing and strong broad stripes on the awning.
 for(let i=0;i<3;i++){const x=(i-1)*(w-1.3)/3;b.plane(x,1.57,.04,(w-1.8)/3,2.6,P.glass);b.lit(()=>b.plane(x,2.30,.06,(w-2.2)/3,.75,P.warm));b.box(.14,3.0,.19,x-(w-1.3)/6,1.5,.13,P.cream);}
 const awningZ=.95;for(let i=0;i<12;i++){const sw=(w-.6)/12,x=-w/2+.3+sw*(i+.5);b.panel([[x-sw/2,3.22,.1],[x+sw/2,3.22,.1],[x+sw/2,2.70,awningZ],[x-sw/2,2.70,awningZ]],i%2?P.cream:d.color,[0,1,1]);b.box(sw,.19,.10,x,2.61,awningZ,i%2?P.cream:d.color);}
 // An invented fun-name blade sign, readable from along the street.
 const sx=-w/2+.54,sy=5.7;b.box(.24,3.2,1.50,sx,sy,.94,P.trim);b.box(.25,3.08,1.38,sx,sy,.94,d.glow);
 b.box(.28,2.83,1.16,sx,sy,.94,P.trim);const words=d.name.length>6?[d.name.slice(0,4),d.name.slice(4)]:[d.name.slice(0,3),d.name.slice(3)];b.lit(()=>{for(let i=0;i<words.length;i++)lettering(b,words[i],sx+.157,sy+.55-i*1.15,.94,.11,d.glow,true);});
 b.beam([sx,h-.6,.05],[sx,sy+1.25,1.45],.045,P.trim);
 if(id==='limestone-hall')b.panel([[-3.8,h,.20],[0,h+1.5,.20],[3.8,h,.20]],P.cream,[0,0,1]);
 else if(id==='teal-corner')for(let i=0;i<3;i++)b.box(5-i*1.2,.45,.55,0,h+i*.4,.04,P.cream);
 else if(id==='plum-music'){b.box(4.8,.8,.40,0,h-.05,.08,P.cream);b.lit(()=>star(b,0,h-.05,.30,.30,P.magenta));}
 else if(id==='rose-bay'){b.box(3.5,.23,.7,0,h+.04,0,P.cream);star(b,0,h-.65,.12,.34,P.cream);}
 else star(b,0,h-.92,.14,.28,P.gold);
 for(let i=0;i<12;i++){const x=(i*1.73% (w-1.5))-w/2+.75,y=3.75+(i*2.17%(h-4.7));b.plane(x,y,.014,.40,.095,i%2?P.stone:P.terra);}
 const m=b.finish(id);m.frontage=w;return m;
}
