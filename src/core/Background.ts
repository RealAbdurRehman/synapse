import * as THREE from "three";

export class Background {
  public readonly instance: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  constructor() {
    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uBrightness: { value: 0.55 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;

          for (int i = 0; i < 5; i++) {
            value += noise(p) * amplitude;
            p *= 2.0;
            amplitude *= 0.5;
          }

          return value;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv - 0.5;
          p.x *= uResolution.x / uResolution.y;

          vec3 color = vec3(0.003, 0.006, 0.02);

          float distanceFromCenter = length(p);
          float centralGlow = 1.0 - smoothstep(0.0, 0.9, distanceFromCenter);

          vec3 blue = vec3(0.015, 0.08, 0.22);
          vec3 purple = vec3(0.08, 0.025, 0.18);
          color += blue * centralGlow * 0.45;

          vec2 noisePosition = p * 2.5;
          noisePosition.x += uTime * 0.015;
          noisePosition.y -= uTime * 0.008;

          float nebula = fbm(noisePosition);
          nebula = smoothstep(0.35, 0.75, nebula);

          color += blue * nebula * 0.20;
          color += purple * nebula * 0.14;

          vec2 slowNoise = p * 5.0;
          slowNoise.x -= uTime * 0.15;
          slowNoise.y += uTime * 0.075;

          float clouds = fbm(slowNoise);
          clouds = smoothstep(0.45, 0.75, clouds);
          color += vec3(0.015, 0.03, 0.09) * clouds;

          float halo = exp(-distanceFromCenter * distanceFromCenter * 4.0);
          color += vec3(0.02, 0.12, 0.3) * halo;

          float vignette = 1.0 - smoothstep(0.35, 1.15, distanceFromCenter);
          color *= mix(0.25, 1.0, vignette);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.instance = new THREE.Mesh(geometry, this.material);
    this.instance.frustumCulled = false;
    this.instance.renderOrder = -1000;
  }
  public setTime(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
  public resize(): void {
    this.material.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight,
    );
  }
}
