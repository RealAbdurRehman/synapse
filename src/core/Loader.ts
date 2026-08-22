import * as THREE from "three";

export class Loader {
  public manager: THREE.LoadingManager;
  constructor(onProgress?: (url: string, progress: number) => void) {
    this.manager = new THREE.LoadingManager();
    this.init(onProgress);
  }
  private init(onProgress?: (url: string, progress: number) => void): void {
    this.manager.onProgress = (url, loaded, total) =>
      onProgress?.(url, loaded / total);
    this.manager.onError = (url) => console.error(`Failed to load: ${url}`);
  }
}
