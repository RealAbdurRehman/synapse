import * as THREE from "three";

export class NeuronSystem {
  public instance: THREE.Points;
  private positions: Float32Array;
  constructor(meshes: THREE.Mesh[], count: number = 1000) {
    this.positions = this.createPositions(meshes, count);
    this.instance = this.createInstance();
  }
  private createPositions(meshes: THREE.Mesh[], count: number): Float32Array {
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);

    const candidate = new THREE.Vector3();
    const positions = new Float32Array(count * 3);

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(1, 0, 0);

    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 10;
    while (placed < count && attempts < maxAttempts) {
      attempts++;
      candidate.set(
        THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random()),
        THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random()),
        THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random()),
      );

      raycaster.set(candidate, direction);

      let intersections = 0;
      for (const mesh of meshes)
        intersections += raycaster.intersectObject(mesh, true).length;

      if (intersections % 2 === 1) {
        positions[placed * 3] = candidate.x;
        positions[placed * 3 + 1] = candidate.y;
        positions[placed * 3 + 2] = candidate.z;

        placed++;
      }
    }

    console.log("Meshes:", meshes.length);
    console.log(
      "Triangles:",
      meshes.reduce((total, mesh) => {
        const position = mesh.geometry.getAttribute("position");
        return total + position.count / 3;
      }, 0),
    );
    console.log(`Placed ${placed}/${count}`);

    return positions;
  }
  private createInstance(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });

    return new THREE.Points(geometry, material);
  }
}
