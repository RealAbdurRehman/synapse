import * as THREE from "three";

import { Background } from "./Background";

export class Scene {
  public readonly instance: THREE.Scene;
  public readonly background: Background;
  constructor() {
    this.instance = new THREE.Scene();
    this.background = new Background();
    this.init();
  }
  private init(): void {
    this.instance.add(this.background.instance);

    const ambientLight = new THREE.AmbientLight(0x101525, 0.15);
    this.instance.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x6f8cff, 1.8);
    keyLight.position.set(4, 6, 5);
    this.instance.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9b6cff, 2.0);
    rimLight.position.set(-5, 2, -6);
    this.instance.add(rimLight);
  }
}
