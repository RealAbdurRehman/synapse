import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class BrainModel {
  private loader: GLTFLoader;
  public instance: THREE.Group;
  public readonly meshes: THREE.Mesh[] = [];
  constructor(manager: THREE.LoadingManager) {
    this.loader = new GLTFLoader(manager);
    this.instance = new THREE.Group();
  }
  public async load(): Promise<void> {
    const gltf = await this.loader.loadAsync("/models/brain.glb");
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) this.meshes.push(object);
    });

    gltf.scene.scale.setScalar(3);
    this.instance.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
  }
}
