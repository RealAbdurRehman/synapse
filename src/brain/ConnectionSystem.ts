import * as THREE from "three";

interface Connection {
  a: number;
  b: number;
  strength: number;
  curveAmount: number;
  curveSeed: number;
}

export class ConnectionSystem {
  public readonly instance: THREE.LineSegments;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly positions: Float32Array;

  private readonly maxConnectionsPerNeuron: number;
  private readonly connectionRadius: number;
  private readonly segmentsPerConnection = 12;

  private readonly grid: Map<string, number[]>;
  private readonly connections: Connection[] = [];
  private readonly connected = new Set<string>();
  constructor(
    positions: Float32Array,
    maxConnectionsPerNeuron: number = 3,
    connectionRadius: number = 1,
  ) {
    this.positions = positions;
    this.maxConnectionsPerNeuron = maxConnectionsPerNeuron;
    this.connectionRadius = connectionRadius;

    this.grid = this.buildSpatialGrid();
    this.createConnections();

    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.instance = new THREE.LineSegments(this.geometry, this.material);
  }
  public setTime(time: number): void {
    this.material.uniforms.uTime.value = time;
  }
  private getCellKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.connectionRadius)},${Math.floor(
      y / this.connectionRadius,
    )},${Math.floor(z / this.connectionRadius)}`;
  }
  private buildSpatialGrid(): Map<string, number[]> {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < this.positions.length / 3; i++) {
      const key = this.getCellKey(
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2],
      );

      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }

      cell.push(i);
    }

    return grid;
  }
  private findNearbyNeurons(
    index: number,
  ): { index: number; distanceSquared: number }[] {
    const x = this.positions[index * 3];
    const y = this.positions[index * 3 + 1];
    const z = this.positions[index * 3 + 2];

    const cellX = Math.floor(x / this.connectionRadius);
    const cellY = Math.floor(y / this.connectionRadius);
    const cellZ = Math.floor(z / this.connectionRadius);

    const candidates: { index: number; distanceSquared: number }[] = [];

    const position = new THREE.Vector3(x, y, z);
    const candidatePosition = new THREE.Vector3();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.grid.get(
            `${cellX + dx},${cellY + dy},${cellZ + dz}`,
          );

          if (!cell) continue;

          for (const j of cell) {
            if (index === j) continue;

            candidatePosition.set(
              this.positions[j * 3],
              this.positions[j * 3 + 1],
              this.positions[j * 3 + 2],
            );

            const distanceSquared =
              position.distanceToSquared(candidatePosition);

            if (distanceSquared <= this.connectionRadius ** 2)
              candidates.push({ index: j, distanceSquared });
          }
        }
      }
    }

    candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);

    return candidates;
  }
  private addConnection(
    a: number,
    b: number,
    distanceSquared: number,
    radius: number,
    maxStrength: number = 1,
  ): boolean {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;

    if (this.connected.has(key)) return false;
    this.connected.add(key);

    const distance = Math.sqrt(distanceSquared);
    const strength = THREE.MathUtils.clamp(
      1 - distance / radius,
      0.15,
      maxStrength,
    );

    this.connections.push({
      a,
      b,
      strength,
      curveAmount: distance * THREE.MathUtils.lerp(0.08, 0.22, Math.random()),
      curveSeed: Math.random(),
    });

    return true;
  }
  private createLocalConnections(): void {
    const count = this.positions.length / 3;
    for (let i = 0; i < count; i++) {
      const candidates = this.findNearbyNeurons(i);

      for (
        let k = 0;
        k < Math.min(this.maxConnectionsPerNeuron, candidates.length);
        k++
      ) {
        const candidate = candidates[k];
        this.addConnection(
          i,
          candidate.index,
          candidate.distanceSquared,
          this.connectionRadius,
        );
      }
    }
  }
  private findComponents(): number[][] {
    const count = this.positions.length / 3;
    const adjacency: number[][] = Array.from({ length: count }, () => []);
    for (const connection of this.connections) {
      adjacency[connection.a].push(connection.b);
      adjacency[connection.b].push(connection.a);
    }

    const ids = new Int32Array(count);
    ids.fill(-1);

    const components: number[][] = [];
    for (let i = 0; i < count; i++) {
      if (ids[i] !== -1) continue;

      const id = components.length;
      const component: number[] = [];
      const queue = [i];

      ids[i] = id;

      for (let q = 0; q < queue.length; q++) {
        const current = queue[q];
        component.push(current);

        for (const neighbor of adjacency[current]) {
          if (ids[neighbor] !== -1) continue;

          ids[neighbor] = id;
          queue.push(neighbor);
        }
      }

      components.push(component);
    }

    return components;
  }
  private findClosestComponents(
    components: number[][],
  ): { a: number; b: number; distanceSquared: number } | null {
    let bestA = -1;
    let bestB = -1;
    let bestDistanceSquared = Infinity;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();

    for (let ca = 0; ca < components.length; ca++) {
      for (let cb = ca + 1; cb < components.length; cb++) {
        for (const i of components[ca]) {
          a.fromArray(this.positions, i * 3);

          for (const j of components[cb]) {
            b.fromArray(this.positions, j * 3);

            const distanceSquared = a.distanceToSquared(b);
            if (distanceSquared < bestDistanceSquared) {
              bestA = i;
              bestB = j;
              bestDistanceSquared = distanceSquared;
            }
          }
        }
      }
    }
    if (bestA === -1) return null;

    return { a: bestA, b: bestB, distanceSquared: bestDistanceSquared };
  }
  private ensureConnectivity(): void {
    let components = this.findComponents();
    while (components.length > 1) {
      const closest = this.findClosestComponents(components);
      if (!closest) break;

      this.addConnection(
        closest.a,
        closest.b,
        closest.distanceSquared,
        this.connectionRadius * 2,
        0.8,
      );

      components = this.findComponents();
    }
  }
  private createConnections(): void {
    this.createLocalConnections();
    this.ensureConnectivity();
  }
  private createGeometry(): THREE.BufferGeometry {
    const positions: number[] = [];
    const strengths: number[] = [];

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const midpoint = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const perpendicular = new THREE.Vector3();
    const perpendicular2 = new THREE.Vector3();
    const curveDirection = new THREE.Vector3();
    const point = new THREE.Vector3();

    for (const connection of this.connections) {
      start.fromArray(this.positions, connection.a * 3);
      end.fromArray(this.positions, connection.b * 3);

      direction.subVectors(end, start).normalize();

      const reference =
        Math.abs(direction.y) < 0.9
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);

      perpendicular.crossVectors(direction, reference).normalize();
      perpendicular2.crossVectors(direction, perpendicular).normalize();

      const angle = connection.curveSeed * Math.PI * 2;

      curveDirection
        .copy(perpendicular)
        .multiplyScalar(Math.cos(angle))
        .add(perpendicular2.clone().multiplyScalar(Math.sin(angle)))
        .normalize();

      midpoint.addVectors(start, end).multiplyScalar(0.5);

      for (let i = 0; i < this.segmentsPerConnection; i++) {
        const t0 = i / this.segmentsPerConnection;
        const t1 = (i + 1) / this.segmentsPerConnection;

        const bend0 = Math.sin(t0 * Math.PI) * connection.curveAmount;
        const bend1 = Math.sin(t1 * Math.PI) * connection.curveAmount;

        const p0 = point
          .lerpVectors(start, end, t0)
          .addScaledVector(curveDirection, bend0);

        positions.push(p0.x, p0.y, p0.z);
        strengths.push(connection.strength);

        const p1 = point
          .lerpVectors(start, end, t1)
          .addScaledVector(curveDirection, bend1);

        positions.push(p1.x, p1.y, p1.z);
        strengths.push(connection.strength);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "aStrength",
      new THREE.Float32BufferAttribute(strengths, 1),
    );

    return geometry;
  }
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aStrength;
        varying float vStrength;
        varying vec3 vWorldPosition;

        void main() {
          vStrength = aStrength;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vStrength;
        varying vec3 vWorldPosition;

        void main() {
          vec3 color = vec3(0.2, 0.65, 1.0);
          float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
          float brightness = 0.6 + vStrength * 0.9 + pulse * 0.4;

          float camDist = length(vWorldPosition - cameraPosition);
          float distanceFade = smoothstep(45.0, 8.0, camDist);
          float alpha = (0.15 + vStrength * 0.35) * distanceFade;

          gl_FragColor = vec4(color * brightness, alpha);
        }
      `,
    });
  }
}
