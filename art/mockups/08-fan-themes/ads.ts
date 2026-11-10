export type AdDraw=(g:CanvasRenderingContext2D,w:number,h:number)=>void;
const INK='#282239',CREAM='#fff1d5',BLUE='#2466d4',TEAL='#00aaa6',PINK='#ed4e83',GOLD='#ffd264';
function rounded(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
function stroke(g:CanvasRenderingContext2D,points:number[][],width:number,color:string){g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
function circle(g:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
function label(g:CanvasRenderingContext2D,s:string,x:number,y:number,size:number,color:string,max=420,shadow=false){g.textAlign='left';g.textBaseline='middle';g.font=`700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;while(g.measureText(s).width>max&&size>18){size-=2;g.font=`700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;}if(shadow){g.fillStyle=INK;g.fillText(s,x+3,y+5);}g.fillStyle=color;g.fillText(s,x,y);}
function star(g:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){g.fillStyle=color;g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;(i?g.lineTo:g.moveTo).call(g,x+Math.cos(a)*d,y+Math.sin(a)*d);}g.closePath();g.fill();}
function ball(g:CanvasRenderingContext2D,x:number,y:number,r:number,volley=false){circle(g,x+4,y+7,r+4,INK);circle(g,x,y,r,volley?CREAM:'#fb9443');g.save();g.beginPath();g.arc(x,y,r-2,0,Math.PI*2);g.clip();g.lineWidth=r*.055;g.strokeStyle=volley?BLUE:INK;for(let i=0;i<(volley?3:2);i++){g.save();g.translate(x,y);g.rotate(i*Math.PI/(volley?1.5:2));g.beginPath();g.moveTo(-r,-r*.35);g.bezierCurveTo(-r*.15,-r*.95,r*.15,r*.95,r,r*.35);g.stroke();if(volley){g.strokeStyle=i%2?GOLD:BLUE;g.lineWidth=r*.28;g.beginPath();g.arc(0,0,r*.68,.1,2.05);g.stroke();}g.restore();}if(!volley){stroke(g,[[x-r,y],[x+r,y]],r*.04,INK);stroke(g,[[x,y-r],[x,y+r]],r*.04,INK);}g.restore();circle(g,x-r*.32,y-r*.38,r*.10,volley?'#ffffff':'#ffbd6f');}
function athlete(g:CanvasRenderingContext2D,x:number,y:number,kind:'kick'|'jump'|'bump'|'wheel',color:string,scale=1){
  g.save();g.translate(x,y);g.scale(scale,scale);const skin='#e9b18c';
  let arms:number[][][]=[],legs:number[][][]=[];
  if(kind==='kick'){arms=[[[-22,-55],[-45,-48],[-60,-75]],[[22,-55],[42,-30],[53,-48]]];legs=[[[-14,20],[-25,65],[-35,113]],[[14,20],[58,22],[106,2]]];}
  else if(kind==='jump'){arms=[[[-22,-55],[-30,-98],[-10,-130]],[[22,-55],[31,-99],[13,-130]]];legs=[[[-14,20],[-29,62],[-46,90]],[[14,20],[40,54],[39,88]]];}
  else if(kind==='bump'){arms=[[[-22,-55],[-34,-22],[-9,-5]],[[22,-55],[34,-22],[9,-5]]];legs=[[[-14,20],[-35,62],[-34,108]],[[14,20],[35,62],[37,108]]];}
  else{g.rotate(-Math.PI*.85);arms=[[[-22,-55],[-30,-95],[-39,-127]],[[22,-55],[30,-95],[39,-127]]];legs=[[[-14,20],[-60,60],[-90,96]],[[14,20],[60,60],[90,96]]];}
  for(const limb of legs){stroke(g,limb,25,INK);stroke(g,limb,19,kind==='wheel'?skin:color);const end=limb[2];stroke(g,[[end[0]-4,end[1]],[end[0]+14,end[1]+2]],19,INK);}
  rounded(g,-33,-73,66,105,17,INK);rounded(g,-28,-68,56,94,13,color);
  if(kind==='kick'){stroke(g,[[-20,-64],[0,-35],[20,-64]],8,'#c5c5c5');stroke(g,[[-29,4],[29,4]],13,INK);stroke(g,[[0,4],[-5,33]],9,INK);}
  else{stroke(g,[[-18,-63],[0,-51],[18,-63]],5,kind==='wheel'?GOLD:CREAM);if(kind==='jump'){rounded(g,-4,-36,10,33,2,CREAM);rounded(g,-11,-7,25,6,2,CREAM);}}
  for(const limb of arms){stroke(g,limb,22,INK);stroke(g,limb,16,kind==='kick'?color:skin);const end=limb[2];circle(g,end[0],end[1],10,skin);}
  circle(g,0,-100,28,INK);circle(g,0,-99,24,skin);g.fillStyle='#4c332b';g.beginPath();g.arc(0,-108,23,Math.PI,Math.PI*2);g.fill();if(kind==='wheel'||kind==='bump')circle(g,21,-118,12,'#4c332b');circle(g,-8,-100,2.7,INK);circle(g,8,-100,2.7,INK);stroke(g,[[-7,-89],[0,-86],[7,-89]],2.5,INK);g.restore();
}
function base(g:CanvasRenderingContext2D,w:number,h:number,bg:string,accent:string,draw:()=>void){g.save();g.scale(w/768,h/384);g.fillStyle=INK;g.fillRect(0,0,768,384);rounded(g,8,8,752,368,28,bg);g.fillStyle=accent;g.beginPath();g.moveTo(20,20);g.lineTo(305,20);g.lineTo(253,364);g.lineTo(20,364);g.closePath();g.fill();g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.moveTo(305,25);g.lineTo(253,358);g.stroke();draw();g.restore();}
const badge=(g:CanvasRenderingContext2D,s:string,color=CREAM)=>{rounded(g,333,39,385,39,16,INK);label(g,s,351,59,21,color,345);};
const headline=(g:CanvasRenderingContext2D,a:string,b:string,color:string,size=82)=>{label(g,a,328,148,size,color,405,true);label(g,b,328,229,size,color,405,true);};

export const nevoAds:AdDraw[]=[
  (g,w,h)=>base(g,w,h,'#17202c','#c6ced4',()=>{[TEAL,PINK,'#ff853b'].forEach((c,i)=>{rounded(g,41+i*65,46,42,278,17,c);});ball(g,162,203,83);badge(g,'SAN ANTONIO',CREAM);headline(g,'GO SPURS','GO!',CREAM,82);label(g,'BRING THE FIESTA',336,318,24,'#9fe6df');star(g,685,278,25,PINK);}),
  (g,w,h)=>base(g,w,h,CREAM,TEAL,()=>{circle(g,159,194,116,'#98e0d7');athlete(g,157,200,'jump','#1c2533',.86);ball(g,160,67,30);star(g,75,98,18,GOLD);badge(g,'BLACK + SILVER',CREAM);headline(g,'WEMBY','#1',INK,92);label(g,'ALIEN MODE',337,319,33,INK);star(g,668,245,29,PINK);}),
  (g,w,h)=>base(g,w,h,CREAM,'#dc5b54',()=>{circle(g,152,187,110,'#b83e42');athlete(g,122,206,'kick','#fff8e9',.90);star(g,246,170,19,GOLD);badge(g,'BLACK BELT DOJO',CREAM);headline(g,'HI-YA!','LET’S GO','#b83e42',76);label(g,'FOCUS · RESPECT · FUN',336,319,24,INK);}),
  (g,w,h)=>base(g,w,h,TEAL,'#ffd264',()=>{g.strokeStyle=INK;g.lineWidth=9;g.strokeRect(88,46,132,92);g.strokeStyle=CREAM;g.lineWidth=6;g.strokeRect(128,80,55,43);stroke(g,[[119,137],[134,180],[184,180],[201,137]],5,CREAM);stroke(g,[[110,135],[208,135]],10,'#e65f3b');ball(g,157,261,69);badge(g,'SPURS BASKETBALL',CREAM);headline(g,'DUNK','CITY',CREAM,94);label(g,'BIG AIR. BIG SMILES.',336,319,24,INK);}),
];
export const oriAds:AdDraw[]=[
  (g,w,h)=>base(g,w,h,BLUE,'#a8d7f3',()=>{circle(g,161,188,113,'#e2f1eb');athlete(g,155,241,'jump',BLUE,.72);ball(g,207,74,40,true);star(g,71,121,17,GOLD);badge(g,'TEAM BLUE VOLLEYBALL');headline(g,'SPIKE','IT!',CREAM,94);label(g,'REACH FOR THE SKY',336,319,25,GOLD);}),
  (g,w,h)=>base(g,w,h,'#f5d9e5',BLUE,()=>{circle(g,156,192,111,'#93c6ec');athlete(g,149,190,'wheel',BLUE,.69);[0,1,2].forEach(i=>star(g,64+i*85,55,15,GOLD));badge(g,'GYMNASTICS CLUB');headline(g,'PERFECT','10',BLUE,83);label(g,'BRAVE. BRIGHT. BLUE.',336,319,24,INK);}),
  (g,w,h)=>base(g,w,h,CREAM,BLUE,()=>{ball(g,159,197,94,true);star(g,71,68,22,GOLD);star(g,241,303,18,PINK);badge(g,'SERVE · SET · SPIKE');headline(g,'GO TEAM','BLUE!',BLUE,80);label(g,'BETTER TOGETHER',336,319,27,INK);}),
  (g,w,h)=>base(g,w,h,'#a8d7f3',CREAM,()=>{circle(g,151,188,113,BLUE);athlete(g,153,197,'wheel',BLUE,.73);g.strokeStyle=GOLD;g.lineWidth=9;g.beginPath();g.arc(153,188,127,3.9,6.9);g.stroke();star(g,63,99,18,PINK);badge(g,'GYMNASTICS CLUB');headline(g,'FLIP','CITY',BLUE,93);label(g,'CARTWHEELS ALL DAY',336,319,24,INK);}),
];
export const adsFor=(id:string):AdDraw[]=>id==='nevo'?nevoAds:id==='ori'?oriAds:[];
