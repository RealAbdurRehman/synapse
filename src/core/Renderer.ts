import * as THREE from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 2.0 },
    offset: { value: 1.2 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = vUv - 0.5;
      uv.x *= 1.15;

      float distanceFromCenter = length(uv);
      float vignette = smoothstep(0.25, offset, distanceFromCenter);

      vignette = pow(vignette, 1.5);
      color.rgb *= 1.0 - vignette * darkness;
      gl_FragColor = color;
    }
  `,
};

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.01 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;

    varying vec2 vUv;

    void main() {
      vec2 direction = vUv - 0.5;
      float distanceFromCenter = length(direction);
      float aberration = smoothstep(0.15, 0.75, distanceFromCenter);

      vec2 offset = direction * strength * aberration;

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    intensity: { value: 0.05 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float intensity;

    varying vec2 vUv;
    float random(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      float noise = random(vUv * 1000.0 + uTime);
      noise = noise - 0.5;

      color.rgb += noise * intensity;
      gl_FragColor = color;
    }
  `,
};

export class Renderer {
  public readonly instance: THREE.WebGLRenderer;

  private composer: EffectComposer;
  private bokehPass!: BokehPass;
  private filmGrainPass!: ShaderPass;

  private targetFocus = 5.0;
  private focusSpeed = 5.0;
  constructor() {
    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",
    });

    this.init();

    this.composer = new EffectComposer(this.instance);
  }
  private init(): void {
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.2;
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const container = document.getElementById("app")!;
    container.appendChild(this.instance.domElement);
  }
  public setupPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.bokehPass = new BokehPass(scene, camera, {
      focus: this.targetFocus,
      aperture: 0.001,
      maxblur: 0.0013,
    });
    this.composer.addPass(this.bokehPass);

    const vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(vignettePass);

    const chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(chromaticAberrationPass);

    this.filmGrainPass = new ShaderPass(FilmGrainShader);
    this.composer.addPass(this.filmGrainPass);
  }
  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.instance.setSize(width, height);
    this.composer.setSize(width, height);
  }
  public render(): void {
    this.composer.render();
  }
  public setTime(time: number, delta: number): void {
    this.filmGrainPass.uniforms.uTime.value = time;

    const uniforms = this.bokehPass.materialBokeh.uniforms;
    const currentFocus = uniforms.focus.value as number;
    const alpha = 1 - Math.exp(-this.focusSpeed * delta);
    uniforms.focus.value = THREE.MathUtils.lerp(
      currentFocus,
      this.targetFocus,
      alpha,
    );
  }
  public setFocus(distance: number): void {
    this.targetFocus = distance;
  }
  public clearFocus(): void {
    this.targetFocus = 5.0;
  }
}
