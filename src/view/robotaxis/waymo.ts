import { MeshKit, type BodyRow, type RoofRow, type TrafficModel } from './mesh-kit';

/** I-PACE-inspired sensor crossover, simplified from photos, no logos or text. */
export function buildWaymo(): TrafficModel {
  const b = new MeshKit(), white = '#edece6', dark = '#262c36', glass = '#243544', teal = '#55b9b0';
  const rows: BodyRow[] = [[-2.35,.73,.84],[-2.13,.86,1.0],[-1.5,.94,1.09],[-.93,.94,1.115],[.40,.95,1.12],[1.48,.95,1.14],[2.15,.86,1.10],[2.35,.79,1.02]];
  b.body(rows,[-1.48,1.43],.39,white,dark);
  const canopy: RoofRow[] = [[-1.24,.84,.84,1.13,1.13],[-.65,.84,.68,1.57,1.12],[.10,.85,.70,1.63,1.12],[1.03,.85,.71,1.58,1.13],[1.78,.82,.77,1.28,1.12],[2.12,.80,.80,1.12,1.12]];
  b.canopy(canopy,glass,white,'#2c3741');
  for(const side of [-1,1]) {
    // B pillar, door seams and the rear quarter pillar preserve the crossover profile.
    b.beam([side*.85,1.12,.15],[side*.70,1.62,.15],.026,dark);
    b.beam([side*.85,1.12,1.10],[side*.72,1.56,1.10],.022,white);
    for(const z of [-.85,.22,1.12]) b.beam([side*(b.width(rows,z)+.002),.36,z],[side*(b.width(rows,z)+.002),1.11,z],.005,'#b1b4b6');
    for(const z of [-.12,.92]) b.box(.018,.025,.14,side*.953,1.015,z,'#6f7982');
    b.box(.035,.045,1.78,side*.943,.39,.08,teal);
    // White mirror with black optical face and compact forward fender sensor.
    b.box(.16,.08,.19,side*.98,1.18,-.81,white);
    b.box(.165,.065,.018,side*.98,1.18,-.705,dark);
    b.cylinder(.10,.12,.15,side*.93,1.18,-1.42,white,10);
    b.cylinder(.09,.095,.075,side*.934,1.265,-1.42,dark,10);
    b.box(.12,.17,.15,side*.84,1.13,1.94,white);
    b.box(.125,.095,.024,side*.84,1.16,2.02,dark);
    // Slender swept lamps and corner intakes; no badges or lettering.
    b.panel([[side*.48,.825,-2.36],[side*.73,.845,-2.36],[side*.855,.985,-2.12],[side*.82,.92,-2.15]],'#c8e5ec',[side*.2,.1,-1]);
    b.box(.22,.054,.028,side*.62,.814,-2.37,'#def2f3');
    b.box(.12,.25,.03,side*.64,.58,-2.36,dark);
    b.box(.49,.058,.025,side*.50,.99,2.365,'#ee5668');
    b.beam([side*.74,.99,2.35],[side*.87,1.02,2.10],.023,'#ee5668');
  }
  // Wide rounded octagonal grille; a few bars imply mesh without a photo texture.
  b.panel([[-.45,.88,-2.369],[.45,.88,-2.369],[.51,.81,-2.369],[.46,.58,-2.369],[.34,.53,-2.369],[-.34,.53,-2.369],[-.46,.58,-2.369],[-.51,.81,-2.369]],dark,[0,0,-1]);
  for(const y of [.61,.68,.75,.82]) b.box(.83,.012,.01,0,y,-2.378,'#46515b');
  b.box(1.14,.065,.035,0,.325,-2.36,dark);
  b.box(1.35,.08,.03,0,.44,2.363,dark);
  b.box(1.25,.038,.18,0,1.45,1.38,white);
  // Fixed integrated fifth-generation sensor rack: one merged mesh for instancing.
  b.box(.91,.065,.88,0,1.675,.04,dark);
  b.cylinder(.41,.46,.13,0,1.765,.04,white,16);
  b.cylinder(.34,.35,.14,0,1.895,.04,dark,16);
  b.cylinder(.32,.34,.045,0,1.987,.04,white,16);
  b.cylinder(.185,.22,.13,0,2.07,.04,dark,12);
  b.cylinder(.19,.19,.018,0,2.143,.04,teal,12);
  b.box(.52,.09,.025,0,1.77,-.405,dark);
  b.wheels(.85,[-1.48,1.43],.39,false,'#aeb6c0');
  return b.finish('WaymoStudy');
}
