import { MeshKit, type BodyRow, type RoofRow, type TrafficModel } from './mesh-kit.js';

/** Stylized photo-informed robotaxi, no marks or textures. Metres, +Y up, -Z forward. */
export function buildCybercab(): TrafficModel {
  const b = new MeshKit();
  const gold = '#d3b66e', shadow = '#a28b55', dark = '#25262c', glass = '#263442';
  const rows: BodyRow[] = [[-2.1,.76,.67],[-1.86,.87,.76],[-1.34,.94,.86],[-.80,.94,.87],[.25,.92,.90],[1.30,.95,.95],[1.8,.89,.91],[2.1,.82,.86]];
  b.body(rows, [-1.32,1.30], .37, gold, dark);
  const canopy: RoofRow[] = [[-.96,.85,.85,.885,.885],[-.31,.85,.69,1.30,.895],[.04,.85,.67,1.42,.91],[.50,.86,.70,1.39,.93],[1.05,.87,.77,1.18,.95],[1.83,.86,.86,.94,.94]];
  b.canopy(canopy, glass, gold, gold, true);
  // Large two-seat door and a sloping solid rear sail panel.
  for (const side of [-1,1]) {
    b.beam([side*.945,.31,-.84],[side*.945,.86,-.84],.006,shadow);
    b.beam([side*.936,.31,.76],[side*.923,.93,.76],.006,shadow);
    b.panel([[side*.86,.93,.57],[side*.77,1.18,1.05],[side*.86,.94,1.83],[side*.92,.92,1.30]],gold,[side,0,0]);
    b.beam([side*.76,.671,-2.108],[side*.88,.76,-1.81],.018,'#f4f5e9');
  }
  // Light bar follows the rounded nose; the black intake is recessed below it.
  for(const side of [-1,1]) b.beam([0,.698,-2.116],[side*.76,.663,-2.116],.017,'#f4f5e9');
  b.box(1.16,.105,.025,0,.335,-2.112,'#26282d');
  b.box(1.58,.045,.025,0,.815,2.114,'#ed495c');
  b.box(1.15,.12,.025,0,.365,2.112,dark);
  b.wheels(.84,[-1.32,1.30],.37,true,'#cbb26e');
  return b.finish('CybercabStudy');
}
