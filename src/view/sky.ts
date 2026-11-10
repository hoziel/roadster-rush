import * as THREE from 'three';

// Gradient sky with stars, generated in code (nothing to download).
// The colors are animated by daynight.ts; these are the sunset defaults. Uniform colors are linear
// (three's color management), so the shader converts to the output space to show the hex values as written.
export function createSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#2a1650') },
      middle: { value: new THREE.Color('#b0407a') },
      horizon: { value: new THREE.Color('#ff9a3c') },
      stars: { value: 0 }, // 0 = none, 1 = full night
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 middle; uniform vec3 horizon; uniform float stars;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = h < 0.15
          ? mix(horizon, middle, smoothstep(-0.05, 0.15, h))
          : mix(middle, top, smoothstep(0.15, 0.7, h));
        if (stars > 0.0) {
          vec3 d = normalize(vDir);
          vec2 g = vec2(atan(d.z, d.x) * 160.0, d.y * 160.0);
          vec2 cell = floor(g);
          float r = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          float dot2 = smoothstep(0.32, 0.0, length(fract(g) - 0.5)); // round dot inside the cell
          c += step(0.992, r) * dot2 * smoothstep(0.08, 0.35, h) * stars;
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
}
