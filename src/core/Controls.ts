import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class Controls {
  public readonly instance: OrbitControls;
  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.instance = new OrbitControls(camera, renderer.domElement);
    this.init();
  }
  private init(): void {
    this.instance.enablePan = false;
    this.instance.enableDamping = true;
    this.instance.maxDistance = 120;
  }
  update(): void {
    this.instance.update();
  }
}
