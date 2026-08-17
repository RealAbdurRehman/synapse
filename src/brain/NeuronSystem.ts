import * as THREE from "three";

export class NeuronSystem {
  public instance: THREE.Points;
  private positions: Float32Array;
  private readonly surfaceRaycaster = new THREE.Raycaster();
  private readonly surfaceDirections = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  private readonly material: THREE.ShaderMaterial;
  constructor(meshes: THREE.Mesh[], count: number = 1000) {
    this.positions = this.createPositions(meshes, count);
    this.material = this.createMaterial();
    this.instance = this.createInstance();
  }
  public setTime(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
  private isFarFromSurface(
    margin: number,
    meshes: THREE.Mesh[],
    position: THREE.Vector3,
  ): boolean {
    for (const direction of this.surfaceDirections) {
      this.surfaceRaycaster.set(position, direction);
      let closestDistance = Infinity;
      for (const mesh of meshes) {
        const hits = this.surfaceRaycaster.intersectObject(mesh, false);
        if (hits.length > 0)
          closestDistance = Math.min(closestDistance, hits[0].distance);
      }

      if (closestDistance < margin) return false;
    }

    return true;
  }
  private createPositions(meshes: THREE.Mesh[], count: number): Float32Array {
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);

    const positions = new Float32Array(count * 3);

    const candidate = new THREE.Vector3();
    const direction = new THREE.Vector3(1, 0, 0);

    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(), direction);

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
        intersections += raycaster.intersectObject(mesh, false).length;

      if (intersections % 2 === 1) {
        const margin = 0.1;
        if (!this.isFarFromSurface(margin, meshes, candidate)) continue;

        positions[placed * 3] = candidate.x;
        positions[placed * 3 + 1] = candidate.y;
        positions[placed * 3 + 2] = candidate.z;

        placed++;
      }
    }

    return positions;
  }
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        varying float vPulse;
        varying vec3 vWorldPosition;
        attribute float aSize;
        attribute float aPhase;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = sin(uTime * 1.5 + aPhase) * 0.5 + 0.5;
          vPulse = pulse;

          float sizeMultiplier = mix(0.6, 1.8, pulse);
          gl_PointSize = 5.0 * aSize * sizeMultiplier * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.5, 40.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vPulse;
        varying vec3 vWorldPosition;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv) * 2.0;
          if (dist > 1.0) discard;

          float glow = pow(1.0 - smoothstep(0.0, 1.0, dist), 1.6);
          float core = pow(1.0 - smoothstep(0.0, 0.25, dist), 2.0);

          vec3 color = vec3(0.35, 0.75, 1.0);

          float shimmer = 0.85 + 0.15 * sin(uTime * 3.0 + vWorldPosition.x * 0.5 + vWorldPosition.y * 0.3);
          float brightness = mix(0.55, 1.25, vPulse) * shimmer;

          vec3 finalColor = color * (glow * 0.7 + core * 1.8) * brightness;

          float camDist = length(vWorldPosition - cameraPosition);
          float distanceFade = smoothstep(60.0, 8.0, camDist);

          float alpha = (glow * 0.75 + core * 0.35) * distanceFade;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
  }
  private createInstance(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );

    const count = this.positions.length / 3;
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = THREE.MathUtils.lerp(0.65, 1.4, Math.random());
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    return new THREE.Points(geometry, this.material);
  }
  public getPositions(): Float32Array {
    return this.positions;
  }
}
