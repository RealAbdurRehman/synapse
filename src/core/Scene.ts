import * as THREE from "three";

export class Scene {
  public readonly instance: THREE.Scene;
  constructor() {
    this.instance = new THREE.Scene();
    this.init();
  }
  private init(): void {
    this.instance.background = new THREE.Color(0x222222);
  }
}
