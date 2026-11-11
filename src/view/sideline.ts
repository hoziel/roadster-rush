import * as THREE from 'three';

// People playing the driver's favourite sports on the sidelines: shooting hoops, dribbling, karate kicks,
// volleyball bumps, cartwheels. Simple rigged figures (torso, head, four limbs) drawn as instances:
// 4 draw calls for every player and ball on screen.

export type Activity = 'shoot' | 'dribble' | 'karate' | 'bump' | 'cartwheel';

/** One player, placed in its anchor's local space (metres, facing -z unless yaw turns it). */
export interface PlayerSpec {
  activity: Activity;
  x: number; z: number; yaw: number;
  shirt: string; legs: string;
  phase?: number; // s offset in the loop
  /** bump: where the partner stands (ball flies between); shoot: the rim position (all in anchor space). */
  target?: [number, number, number];
}

const MAX_PLAYERS = 24, MAX_BALLS = 14;
const HIP = 0.72, SHOULDER = 1.28, HEAD = 1.55, LEG = 0.72, ARM = 0.58;
const SKINS = ['#f2c7a5', '#e0a77e', '#b9774f', '#8a5434'];
const BASKETBALL = '#f08a24', VOLLEYBALL = '#ffd23f';

interface Scene { anchor: THREE.Object3D; players: PlayerSpec[]; scale: number; size: number }

export class Sideline {
  readonly group = new THREE.Group();
  private torso: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private limbs: THREE.InstancedMesh;
  private balls: THREE.InstancedMesh;
  private scenes: Scene[] = [];
  private nPlayers = 0; private nLimbs = 0; private nBalls = 0;
  private m = new THREE.Matrix4(); private pm = new THREE.Matrix4(); private am = new THREE.Matrix4(); private lm = new THREE.Matrix4();
  private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v = new THREE.Vector3(); private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor() {
    const toon = () => new THREE.MeshToonMaterial({ color: '#ffffff' });
    const inst = (geo: THREE.BufferGeometry, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, toon(), n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      for (let i = 0; i < n; i++) mesh.setColorAt(i, this.c.set('#ffffff'));
      mesh.count = 0;
      this.group.add(mesh);
      return mesh;
    };
    this.torso = inst(new THREE.CylinderGeometry(0.19, 0.22, SHOULDER - HIP + 0.1, 10).translate(0, (SHOULDER + HIP) / 2, 0), MAX_PLAYERS);
    this.heads = inst(new THREE.SphereGeometry(0.17, 12, 10).translate(0, HEAD, 0), MAX_PLAYERS);
    this.limbs = inst(new THREE.CylinderGeometry(0.07, 0.06, 1, 8).translate(0, -0.5, 0), MAX_PLAYERS * 4);
    this.balls = inst(new THREE.SphereGeometry(0.13, 12, 10), MAX_BALLS);
  }

  /** Replace every scene: each anchor's players (anchor scale is undone, so players are always life size). */
  /** size: draw the players this much bigger than life (along the road, so they read from the car). */
  setScenes(scenes: { anchor: THREE.Object3D; players: PlayerSpec[]; size?: number }[]): void {
    this.scenes = scenes.map((sc) => ({ ...sc, scale: 1, size: sc.size ?? 1 }));
  }

  update(time: number): void {
    this.nPlayers = this.nLimbs = this.nBalls = 0;
    for (const sc of this.scenes) {
      if (!isShown(sc.anchor)) continue;
      sc.anchor.updateWorldMatrix(true, false);
      sc.anchor.matrixWorld.decompose(this.v, this.q, this.s);
      sc.scale = this.s.x;
      this.am.compose(this.v, this.q, this.s.setScalar(1)); // anchor without its scale
      sc.players.forEach((p, i) => this.player(sc, p, i, time + (p.phase ?? 0)));
    }
    for (const [mesh, n] of [[this.torso, this.nPlayers], [this.heads, this.nPlayers], [this.limbs, this.nLimbs], [this.balls, this.nBalls]] as const) {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Pose and draw one player (and its ball). */
  private player(sc: Scene, p: PlayerSpec, idx: number, t: number): void {
    if (this.nPlayers >= MAX_PLAYERS) return;
    const k = sc.scale; // anchor positions are in scaled units
    let x = p.x * k, y = 0, z = p.z * k, yaw = p.yaw, roll = 0;
    // Limb angles: [forward swing (rad), sideways (rad)] for armL, armR, legL, legR.
    const L = { aL: [0.2, -0.15], aR: [0.2, 0.15], lL: [0, -0.06], lR: [0, 0.06] };
    let ball: THREE.Vector3 | null = null, ballColor = BASKETBALL;

    switch (p.activity) {
      case 'karate': {
        const u = (t % 1.6) / 1.6;
        const kick = u < 0.35 ? Math.sin((u / 0.35) * Math.PI) : 0;
        L.lR = [1.5 * kick, 0.08]; L.lL = [-0.25, -0.12];
        const punch = Math.floor(t / 0.8) % 2;
        L.aL = [punch ? 1.55 : 1.1, -0.25]; L.aR = [punch ? 1.1 : 1.55, 0.25];
        y = kick * 0.05;
        break;
      }
      case 'shoot': {
        const T = 2.2, u = (t % T) / T;
        const jump = u > 0.15 && u < 0.45 ? Math.sin(((u - 0.15) / 0.3) * Math.PI) : 0;
        y = jump * 0.45;
        const up = u > 0.1 && u < 0.5;
        L.aL = [up ? 2.9 : 0.9, -0.1]; L.aR = [up ? 2.9 : 0.9, 0.1];
        L.lL = [jump * 0.3, -0.06]; L.lR = [jump * 0.3, 0.06];
        const hand = this.local(x, y + 2.25, z, yaw, 0, -0.25);
        const rim = p.target ? new THREE.Vector3(p.target[0] * k, p.target[1] * k, p.target[2] * k) : hand.clone().add(new THREE.Vector3(0, 1.5, -4));
        if (u < 0.4) ball = hand;
        else if (u < 0.75) { const f = (u - 0.4) / 0.35; ball = hand.clone().lerp(rim, f); ball.y += Math.sin(f * Math.PI) * 1.6; }
        else { // drops through the net, bounces back to the player
          const f = (u - 0.75) / 0.25;
          ball = rim.clone().lerp(this.local(x, 0, z, yaw, 0, -0.6), f);
          ball.y = THREE.MathUtils.lerp(rim.y, 1.2, f) + Math.abs(Math.sin(f * Math.PI * 2)) * 0.8 - f * 0.3;
        }
        break;
      }
      case 'dribble': {
        const b = Math.abs(Math.sin(t * 5));
        L.aR = [0.6 + b * 0.3, 0.25];
        ball = this.local(x, 0.14 + b * 0.75, z, yaw, 0.38, -0.25);
        x += Math.sin(t * 0.8) * 0.6;
        break;
      }
      case 'bump': {
        // The ball goes back and forth to the partner; this player bumps it on its turn.
        const T = 1.7, n = Math.floor(t / T), f = (t % T) / T;
        const me = this.local(x, 0, z, yaw, 0, -0.35);
        const other = p.target ? new THREE.Vector3(p.target[0] * k, 0, p.target[2] * k) : me.clone().add(new THREE.Vector3(0, 0, -4));
        const mine = n % 2 === idx % 2; // whose hit
        const from = mine ? me : other, to = mine ? other : me;
        if (idx % 2 === 0) { // one ball per pair, drawn by the first
          ball = from.clone().lerp(to, f);
          ball.y = 0.9 + Math.sin(f * Math.PI) * 3.2;
          ballColor = VOLLEYBALL;
        }
        const hit = mine ? Math.max(0, 1 - f * 5) : Math.max(0, (f - 0.85) * 6);
        L.aL = [0.9 + hit * 0.5, 0.15]; L.aR = [0.9 + hit * 0.5, -0.15]; // arms together, forward-down
        L.lL = [0.15, -0.12]; L.lR = [0.15, 0.12];
        y = -0.08 + hit * 0.12;
        break;
      }
      case 'cartwheel': {
        const T = 2.6, f = (t % T) / T;
        const dir = Math.floor(t / T) % 2 ? -1 : 1;
        x += dir * (f * 2 - 1) * 1.6;
        roll = -dir * f * Math.PI * 2;
        L.aL = [0, -2.7]; L.aR = [0, 2.7]; L.lL = [0, -0.55]; L.lR = [0, 0.55];
        break;
      }
    }

    // Player transform: anchor * (position, yaw), rolling round the body's middle for a cartwheel.
    this.e.set(0, yaw, 0); this.q.setFromEuler(this.e);
    this.pm.compose(this.v.set(x, y, z), this.q, this.s.setScalar(sc.size));
    if (roll) this.pm.multiply(this.m.makeTranslation(0, 1.0, 0)).multiply(this.lm.makeRotationZ(roll)).multiply(this.m.makeTranslation(0, -1.0, 0));
    this.pm.premultiply(this.am);
    const pi = this.nPlayers++;
    this.torso.setMatrixAt(pi, this.pm); this.torso.setColorAt(pi, this.c.set(p.shirt));
    this.heads.setMatrixAt(pi, this.pm); this.heads.setColorAt(pi, this.c.set(SKINS[(idx * 3 + pi) % SKINS.length]));
    const limb = (jx: number, jy: number, a: number[], len: number, color: string) => {
      this.e.set(a[0], 0, a[1]); this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(jx, jy, 0), this.q, this.s.set(1, len, 1));
      this.limbs.setMatrixAt(this.nLimbs, this.lm.multiplyMatrices(this.pm, this.m));
      this.limbs.setColorAt(this.nLimbs++, this.c.set(color));
    };
    limb(-0.25, SHOULDER, L.aL, ARM, p.shirt); limb(0.25, SHOULDER, L.aR, ARM, p.shirt);
    limb(-0.11, HIP, L.lL, LEG, p.legs); limb(0.11, HIP, L.lR, LEG, p.legs);
    if (ball && this.nBalls < MAX_BALLS) {
      this.m.compose(ball.applyMatrix4(this.am), this.q.identity(), this.s.setScalar(ballColor === VOLLEYBALL ? 1.25 : 1.1));
      this.balls.setMatrixAt(this.nBalls, this.m);
      this.balls.setColorAt(this.nBalls++, this.c.set(ballColor));
    }
  }

  /** A point in the anchor's (unscaled) space: player at (x, y, z) facing yaw, offset sideways dx and forward -dz. */
  private local(x: number, y: number, z: number, yaw: number, dx: number, dz: number): THREE.Vector3 {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return new THREE.Vector3(x + dx * c + dz * s, y, z - dx * s + dz * c);
  }
}

/** Is the object and every parent visible? */
function isShown(o: THREE.Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}
