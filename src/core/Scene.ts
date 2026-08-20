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
