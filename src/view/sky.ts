import * as THREE from 'three';

// Sunset gradient sky, generated in code (nothing to download).
export function createSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#2a1650') },
      middle: { value: new THREE.Color('#b0407a') },
      horizon: { value: new THREE.Color('#ff9a3c') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 middle; uniform vec3 horizon;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = h < 0.15
          ? mix(horizon, middle, smoothstep(-0.05, 0.15, h))
          : mix(middle, top, smoothstep(0.15, 0.7, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
}
