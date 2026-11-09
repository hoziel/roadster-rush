import * as THREE from 'three';
import { advanceAngle } from './sim/spin';
import { createSky } from './view/sky';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#ff9a3c', 20, 120);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 1.5, 5);

scene.add(createSky());
scene.add(new THREE.HemisphereLight('#ffd9a8', '#3b1f5c', 1.2));
const sun = new THREE.DirectionalLight('#ffb070', 2);
sun.position.set(-3, 4, 2);
scene.add(sun);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.4, 1.4),
  new THREE.MeshToonMaterial({ color: '#e8344e' }),
);
cube.position.y = 1.2;
scene.add(cube);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const hud = document.getElementById('hud')!;
const timer = new THREE.Timer();
let angle = 0;
let frames = 0;
let fpsTime = 0;

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  angle = advanceAngle(angle, dt);
  cube.rotation.set(angle * 0.5, angle, 0);
  renderer.render(scene, camera);

  frames++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    hud.textContent = `${Math.round(frames / fpsTime)} fps · ${renderer.info.render.calls} draws`;
    frames = 0;
    fpsTime = 0;
  }
});
