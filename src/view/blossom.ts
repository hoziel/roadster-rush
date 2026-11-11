import * as THREE from 'three';

// "Blossom" paint (Ori's default): a pearl-white body blushing pink toward the nose, with watercolour cherry
// blossoms and budding branches along the doors. Painted once on a canvas; the car body gets side-projected
// UVs (u along the car, nose to tail; v up), so both sides show the same branch.

const W = 1024, H = 512;

export function blossomTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Body: blush pink at the nose (u = 0) fading to pearl white by the doors.
  const base = g.createLinearGradient(0, 0, W, 0);
  base.addColorStop(0, '#f6c4c8');
  base.addColorStop(0.22, '#fbe2e2');
  base.addColorStop(0.42, '#ffffff');
  base.addColorStop(1, '#ffffff');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  // Soft watercolour washes behind the flowers.
  const wash = (x: number, y: number, r: number, col: string, a: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, col); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = a; g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
  };
  for (let i = 0; i < 9; i++) wash(330 + rnd() * 420, 250 + rnd() * 200, 90 + rnd() * 110, '#f08ba0', 0.3);

  // Branches: dark plum strokes from low by the front wheel arching back over the doors, with twigs.
  g.lineCap = 'round';
  const branch = (pts: number[], width: number) => {
    g.strokeStyle = '#6e2f3b'; g.lineWidth = width;
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (let i = 2; i + 3 < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    g.stroke();
  };
  branch([300, 470, 420, 400, 520, 360, 640, 320, 760, 230], 13);
  branch([520, 360, 560, 300, 600, 250], 5);
  branch([640, 320, 720, 330, 830, 300], 5);
  branch([760, 230, 800, 190, 860, 170], 4);
  branch([430, 405, 400, 340, 420, 290], 4);

  // Blossoms: five rounded petals, deep pink at the heart, with a dark centre and stamens.
  const flower = (x: number, y: number, r: number, rot: number) => {
    for (let k = 0; k < 5; k++) {
      const a = rot + (k * Math.PI * 2) / 5;
      const px = x + Math.cos(a) * r * 0.55, py = y + Math.sin(a) * r * 0.55;
      const grad = g.createRadialGradient(x, y, r * 0.1, px, py, r * 0.75);
      grad.addColorStop(0, '#c2284a'); grad.addColorStop(0.55, '#ee7d97'); grad.addColorStop(1, 'rgba(252,214,222,0.9)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(px, py, r * 0.55, r * 0.42, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#7a1630'; g.beginPath(); g.arc(x, y, r * 0.16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8f1d3a'; g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
      const a = rnd() * Math.PI * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); g.stroke();
    }
  };
  const bud = (x: number, y: number, r: number) => {
    g.fillStyle = '#d9476a'; g.beginPath(); g.ellipse(x, y, r, r * 1.25, 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6a5b6'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.55, 0.4, 0, Math.PI * 2); g.fill();
  };
  const flowers: [number, number, number][] = [
    [380, 330, 58], [455, 395, 46], [560, 300, 64], [620, 380, 50], [700, 290, 44], [505, 440, 38],
    [340, 420, 40], [655, 230, 36], [765, 330, 34], [600, 245, 30],
  ];
  for (const [x, y, r] of flowers) flower(x, y, r * 1.45, rnd() * Math.PI); // big enough to read from the chase camera
  for (const [x, y] of [[830, 300], [860, 170], [800, 190], [420, 290], [720, 330], [600, 250]]) bud(x, y, 9 + rnd() * 5);
  // A few loose petals drifting back along the body.
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(236, 120, 148, ${0.5 + rnd() * 0.4})`;
    g.beginPath(); g.ellipse(700 + rnd() * 300, 120 + rnd() * 330, 6 + rnd() * 5, 4, rnd() * 3, 0, Math.PI * 2); g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Give every mesh painted with `mat` side-projected UVs over the car's length and height (in `root`'s space). */
export function projectSideUVs(root: THREE.Object3D, mat: THREE.Material): void {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => { if (o instanceof THREE.Mesh && o.material === mat) meshes.push(o); });
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4();
  for (const mesh of meshes) {
    m.multiplyMatrices(inv, mesh.matrixWorld);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  }
  const len = box.max.z - box.min.z || 1, hgt = box.max.y - box.min.y || 1;
  for (const mesh of meshes) {
    m.multiplyMatrices(inv, mesh.matrixWorld);
    const p = mesh.geometry.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      uv[i * 2] = (v.z - box.min.z) / len; // 0 at the nose (-z), 1 at the tail
      uv[i * 2 + 1] = (v.y - box.min.y) / hgt;
    }
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
}
