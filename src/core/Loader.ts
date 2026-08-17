import * as THREE from "three";

export class Loader {
  public manager: THREE.LoadingManager;
  constructor(onProgress?: (progress: number) => void) {
    this.manager = new THREE.LoadingManager();
    this.init(onProgress);
  }
  private init(onProgress?: (progress: number) => void): void {
    this.manager.onStart = (url, loaded, total) => {
      console.log(`Started loading: ${url}`);
      console.log(`${loaded}/${total}`);
    };

    this.manager.onProgress = (url, loaded, total) => {
      const progress = loaded / total;
      console.log(`Loading (${url}): ${(progress * 100).toFixed(0)}%`);
      onProgress?.(progress);
    };

    this.manager.onLoad = () => console.log("Finished loading");
    this.manager.onError = (url) => console.error(`Failed to load: ${url}`);
  }
}
