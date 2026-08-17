import * as THREE from "three";

export class Camera {
  public readonly instance: THREE.PerspectiveCamera;
  constructor() {
    this.instance = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.init();
  }
  private init(): void {
    this.instance.position.z = 12;
  }
  resize(): void {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
}
