import * as THREE from 'three';

// Garage driver showcase: a roadside billboard beside the parked car, showing the chosen driver's picture.
const PANEL_W = 2.4, PANEL_H = 3.2; // m; the pictures are 3:4 portraits
const FRAME = 0.14; // m of cream frame round the picture
const POST_H = 1.3; // m from the road to the bottom of the frame
const CREAM = '#f4e9d8', POSTS = '#3a2d4a';

/** Billboard group (posts, frame, picture). `show(url)` swaps the picture; `show(null)` hides it. 3 draw calls when shown. */
export class DriverBillboard {
  readonly group = new THREE.Group();
  private picture: THREE.MeshBasicMaterial;
  private loader = new THREE.TextureLoader();
  private textures = new Map<string, THREE.Texture>();
  private url: string | null = null;

  constructor() {
    const frameY = POST_H + PANEL_H / 2;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(PANEL_W + FRAME * 2, PANEL_H + FRAME * 2, 0.12),
      new THREE.MeshLambertMaterial({ color: CREAM }),
    );
    frame.position.y = frameY;
    const posts = new THREE.Mesh(
      mergeBoxes([[-PANEL_W * 0.32, POST_H / 2 + 0.2], [PANEL_W * 0.32, POST_H / 2 + 0.2]], POST_H + 0.4),
      new THREE.MeshLambertMaterial({ color: POSTS }),
    );
    posts.position.z = -0.12;
    this.picture = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), this.picture);
    panel.position.set(0, frameY, 0.065);
    this.group.add(posts, frame, panel);
    this.group.visible = false;
  }

  show(url: string | null): void {
    this.group.visible = !!url;
    if (!url || url === this.url) return;
    this.url = url;
    let tex = this.textures.get(url);
    if (!tex) {
      tex = this.loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      this.textures.set(url, tex);
    }
    this.picture.map = tex;
    this.picture.needsUpdate = true;
  }
}

function mergeBoxes(at: [number, number][], h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const parts = at.map(([x, y]) => new THREE.BoxGeometry(0.16, h, 0.16).translate(x, y, 0));
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  let base = 0;
  for (const p of parts) {
    pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array);
    for (const i of p.index!.array) idx.push(i + base);
    base += p.attributes.position.count;
    p.dispose();
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
