import * as THREE from "three";

export class Renderer {
  public readonly instance: THREE.WebGLRenderer;
  constructor() {
    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",
    });

    this.init();
  }
  private init(): void {
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const container = document.getElementById("app")!;
    container.appendChild(this.instance.domElement);
  }
  resize(): void {
    this.instance.setSize(window.innerWidth, window.innerHeight);
  }
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }
}
