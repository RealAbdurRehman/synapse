import * as THREE from "three";

export class Scene {
  public readonly instance: THREE.Scene;
  constructor() {
    this.instance = new THREE.Scene();
    this.init();
  }
  private init(): void {
    this.instance.background = new THREE.Color(0x020617);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.instance.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 5, 5);
    this.instance.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1);
    fillLight.position.set(-5, 2, -5);
    this.instance.add(fillLight);
  }
}
