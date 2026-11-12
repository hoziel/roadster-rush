import * as THREE from 'three';
import { MeshKit, type Point, type TrafficModel } from './mesh-kit.js';

/** Original low-poly photo-informed traffic study. Metres, +Y up, -Z forward. */
export function buildCybertruck(b = new MeshKit()): TrafficModel {
  const steel='#b8bfc0',lightSteel='#d1d5d3',lowerSteel='#949ea2',dark='#242a31',glass='#24343e',tire='#202127';
  const axles=[-1.82,1.67],radius=.45;
  const rows:[number,number,number][]=[[-2.75,.88,1.05],[-2.40,.97,1.14],[-1.55,1,1.265],[.95,1,1.285],[2.75,.96,1.23]];
  const width=(z:number)=>{for(let i=1;i<rows.length;i++)if(z<=rows[i][0]){const a=rows[i-1],c=rows[i];return THREE.MathUtils.lerp(a[1],c[1],(z-a[0])/(c[0]-a[0]));}return .96;};
  // Flat side skins with genuinely cut-out polygonal wheel wells.
  for(const side of[-1,1]){
    const s=new THREE.Shape();s.moveTo(rows[0][0],rows[0][2]);rows.slice(1).forEach(r=>s.lineTo(r[0],r[2]));s.lineTo(2.75,.28);
    for(const z of [...axles].reverse()){s.lineTo(z+.60,.28);s.lineTo(z+.60,.66);s.lineTo(z+.37,1.04);s.lineTo(z-.37,1.04);s.lineTo(z-.60,.66);s.lineTo(z-.60,.28);}s.lineTo(-2.75,.28);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:.055,bevelEnabled:false}).rotateY(-Math.PI/2),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+side*width(p.getZ(i))+(side<0?.055:0));g.computeVertexNormals();b.add(g,steel);
    // Folded lower door plane and black sill, between the wheel wells.
    b.panel([[side*1.004,.64,-1.20],[side*1.004,.64,1.05],[side*.94,.29,1.05],[side*.94,.29,-1.20]],lowerSteel,[side,0,0]);
    b.box(.08,.13,2.26,side*.955,.28,-.075,dark);
    for(const z of axles){
      const inner:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[z-.60,.28],[z-.60,.66],[z-.37,1.04],[z+.37,1.04],[z+.60,.66],[z+.60,.28]];
      b.panel(inner.map(([zz,y])=>[side*.755,y,zz] as Point),'#171e24',[side,0,0]);
      const outer=inner.map(([zz,y],i)=>[zz+(i<3?-.085:.085),y+(i===2||i===3?.09:.015)]);
      for(let i=1;i<inner.length;i++){
        const a=inner[i-1],c=inner[i],d=outer[i],e=outer[i-1];
        b.panel([[side*1.055,a[1],a[0]],[side*1.055,c[1],c[0]],[side*1.055,d[1],d[0]],[side*1.055,e[1],e[0]]],dark,[side,0,0]);
        b.panel([[side*1.055,e[1],e[0]],[side*1.055,d[1],d[0]],[side*width(d[0]),d[1],d[0]],[side*width(e[0]),e[1],e[0]]],'#3b4247',[side,1,0]);
      }
    }
  }
  // Steel hood: one broad plane with two folded outer strips.
  b.panel([[-.88,1.05,-2.75],[.88,1.05,-2.75],[1,1.265,-1.55],[-1,1.265,-1.55]],lightSteel);
  for(const [z,h,w,out] of[[-2.75,1.05,.88,-1],[2.75,1.23,.96,1]]){
    b.panel([[-w,h,z],[w,h,z],[w,.40,z],[-w,.40,z]],steel,[0,0,out]);
    b.box(w*2+.025,.22,.12,0,.38,z-out*.04,dark);
  }
  b.box(1.72,.08,4.95,0,.28,0,dark);
  // Triangular cabin, rear sail and dark covered bed.
  const cabin=[[-1.55,1.265,1],[-.25,1.82,.78],[.86,1.63,.86],[1.04,1.285,1]];
  const sidePoint=(side:number,z:number,y:number,offset=0):Point=>[side*(1-(y-1.265)*.395+offset),y,z];
  for(const side of[-1,1]){
    b.panel(cabin.map(([z,y,w])=>[side*w,y,z] as Point),lightSteel,[side,0,0]);
    const front:Point[]=[sidePoint(side,-1.37,1.292,.006),sidePoint(side,-.21,1.75,.006),sidePoint(side,.12,1.696,.006),sidePoint(side,.12,1.292,.006)];
    const rear:Point[]=[sidePoint(side,.17,1.292,.006),sidePoint(side,.17,1.688,.006),sidePoint(side,.78,1.58,.006),sidePoint(side,.94,1.292,.006)];
    b.panel(front,glass,[side,0,0]);b.panel(rear,'#293a42',[side,0,0]);
    b.panel([[side*.86,1.63,.86],[side*.96,1.23,2.75],[side*1,1.285,1.04]],steel,[side,1,0]);
    b.panel([[side*.86,1.63,.86],[side*.96,1.23,2.75],[side*.91,1.245,2.70],[side*.89,1.47,1.06]],lowerSteel,[side,1,0]);
    b.beam([side*1.008,1.275,.145],[side*1.008,.64,.145],.005,'#67757b');
    b.beam([side*1.007,1.275,1.01],[side*1.007,.68,1.01],.005,'#67757b');
    b.beam([side*.998,1.255,-1.20],[side*1.004,.68,-1.20],.005,'#67757b');
    // Small unbranded folded mirrors; compact enough for the 2.5 m lanes.
    b.beam([side*.98,1.29,-1.03],[side*1.12,1.30,-1.02],.022,dark);
    b.panel([[side*1.08,1.30,-1.20],[side*1.17,1.34,-.94],[side*1.03,1.43,-.94]],dark,[0,1,-1]);
    b.panel([[side*1.08,1.30,-1.20],[side*1.17,1.34,-.94],[side*1.17,1.28,-.94]],'#343e46',[side,0,-1]);
    b.box(.032,.028,.10,side*1.06,.70,-2.39,'#f3ac48');
    b.box(.026,.035,.10,side*.968,.53,2.62,'#ee5262');
  }
  b.panel([[-1,1.265,-1.55],[1,1.265,-1.55],[.78,1.82,-.25],[-.78,1.82,-.25]],glass);
  b.panel([[-.78,1.82,-.25],[.78,1.82,-.25],[.86,1.63,.86],[-.86,1.63,.86]],'#2c3d46');
  b.panel([[-.86,1.63,.86],[.86,1.63,.86],[.89,1.47,1.06],[-.89,1.47,1.06]],dark,[0,1,1]);
  b.panel([[-.89,1.47,1.06],[.89,1.47,1.06],[.91,1.245,2.70],[-.91,1.245,2.70]],'#3b4349');
  b.panel([[-.91,1.245,2.70],[.91,1.245,2.70],[.96,1.23,2.75],[-.96,1.23,2.75]],lowerSteel);
  for(let i=0;i<=12;i++){const z=1.08+i*1.60/12,y=1.47-(z-1.06)*.225/1.64;b.beam([-.89,y+.004,z],[.89,y+.004,z],.006,'#535e63');}
  for(const side of[-1,1]){b.beam([side*1,1.267,-1.55],[side*.78,1.823,-.25],.018,lightSteel);b.beam([side*.78,1.823,-.25],[side*.86,1.633,.86],.017,lightSteel);}
  b.beam([-.83,1.30,-1.47],[-.70,1.72,-.40],.014,dark); // Single wiper, no texture.
  // Full-width front/rear bars and recessed lower headlights, no badges or plates.
  b.box(1.78,.068,.020,0,1.025,-2.764,dark);b.box(1.76,.028,.024,0,1.035,-2.780,'#edf8ef');b.box(1.90,.09,.022,0,1.173,2.766,dark);b.box(1.82,.025,.024,0,1.194,2.780,'#ee5262');
  b.box(1.15,.10,.027,0,.48,-2.777,'#141c24');for(const side of[-1,1])b.box(.25,.04,.027,side*.65,.595,-2.777,'#d6ebed');
  b.box(.46,.16,.026,0,.46,2.778,'#313b41');
  // Faceted tires and broad six-vane covers. All four wheels stay in the merged mesh.
  for(const side of[-1,1])for(const z of axles){
    const x=side*.91,profile=[[.32,-.135],[.415,-.135],[radius,-.085],[radius,.085],[.415,.135],[.32,.135]].map(([r,h])=>new THREE.Vector2(r,h));
    b.add(new THREE.LatheGeometry(profile,20).rotateZ(Math.PI/2).translate(x,radius,z),tire);
    const face=x+side*.139;b.cylinder(.34,.34,.02,face,radius,z,'#30383e',20,'x');
    for(let k=0;k<6;k++){const a=k*Math.PI/3,points:Point[]=[];for(const [r,t]of[[.06,-.3],[.35,-.15],[.35,.19],[.11,.45]])points.push([face+side*.014,radius+Math.cos(a+t)*r,z+Math.sin(a+t)*r]);b.panel(points,'#59646a',[side,0,0]);}
    b.cylinder(.077,.077,.025,face+side*.016,radius,z,'#3c474d',12,'x');
  }
  return b.finish('CybertruckStudy');
}
