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

  private readonly highlighted: Float32Array;
  private readonly fireTime: Float32Array;
  private readonly material: THREE.ShaderMaterial;
  constructor(meshes: THREE.Mesh[], count: number = 1000) {
    this.positions = this.createPositions(meshes, count);
    this.highlighted = new Float32Array(count);
    this.fireTime = new Float32Array(count).fill(-1000);
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
        varying float vHighlight;
        varying float vFireEnvelope;

        attribute float aSize;
        attribute float aPhase;
        attribute float aHighlight;
        attribute float aFireTime;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = sin(uTime * 1.5 + aPhase) * 0.5 + 0.5;
          vPulse = pulse;
          vHighlight = aHighlight;

          float t = uTime - aFireTime;
          float decayRate = mix(1.8, 3.0, fract(aPhase * 0.318));
          float rise = smoothstep(0.0, 0.09, t);
          float decay = exp(-max(t, 0.0) * decayRate);
          vFireEnvelope = rise * decay;

          float sizeMultiplier = mix(0.6, 1.8, pulse);
          sizeMultiplier *= 1.0 + vFireEnvelope * 1.6;
          if (aHighlight > 0.5) sizeMultiplier *= 1.5;

          gl_PointSize = 5.0 * aSize * sizeMultiplier * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.5, 44.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vPulse;
        varying float vHighlight;
        varying float vFireEnvelope;
        varying vec3 vWorldPosition;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv) * 2.0;
          if (dist > 1.0) discard;

          float glow = pow(1.0 - smoothstep(0.0, 1.0, dist), 1.6);
          float core = pow(1.0 - smoothstep(0.0, 0.25, dist), 2.0);

          vec3 baseColor = vec3(0.35, 0.75, 1.0);
          vec3 hotColor = vec3(0.75, 0.95, 1.0);

          vec3 color = mix(baseColor, hotColor, min(vFireEnvelope, 1.0));
          if (vHighlight > 0.5) color *= 1.5;

          float shimmer = 0.85 + 0.15 * sin(uTime * 3.0 + vWorldPosition.x * 0.5 + vWorldPosition.y * 0.3);
          float brightness = mix(0.55, 1.25, vPulse) * shimmer;
          brightness += vFireEnvelope * 2.2;

          float coreMultiplier = 1.8 + vFireEnvelope * 1.4;

          vec3 finalColor = color * (glow * 0.7 + core * coreMultiplier) * brightness;
          finalColor = finalColor / (1.0 + max(finalColor - 1.4, 0.0));

          float camDist = length(vWorldPosition - cameraPosition);
          float distanceFade = smoothstep(60.0, 8.0, camDist);

          float alpha = (glow * 0.75 + core * 0.35 + vFireEnvelope * 0.3) * distanceFade;

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
    geometry.setAttribute(
      "aHighlight",
      new THREE.BufferAttribute(this.highlighted, 1),
    );
    geometry.setAttribute(
      "aFireTime",
      new THREE.BufferAttribute(this.fireTime, 1),
    );

    return new THREE.Points(geometry, this.material);
  }
  public setHighlighted(indices: Set<number>): void {
    this.highlighted.fill(0);
    for (const index of indices)
      if (index >= 0 && index < this.highlighted.length)
        this.highlighted[index] = 1;

    const attribute = this.instance.geometry.getAttribute(
      "aHighlight",
    ) as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }
  public fire(index: number): void {
    if (index < 0 || index >= this.fireTime.length) return;

    this.fireTime[index] = this.material.uniforms.uTime.value;

    const attribute = this.instance.geometry.getAttribute(
      "aFireTime",
    ) as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }
  public getPositions(): Float32Array {
    return this.positions;
  }
}
