import * as THREE from "three";

interface Connection {
  a: number;
  b: number;
  strength: number;
}

export class ConnectionSystem {
  public readonly instance: THREE.LineSegments;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly positions: Float32Array;

  private readonly maxConnectionsPerNeuron: number;
  private readonly connectionRadius: number;

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
    const cellX = Math.floor(x / this.connectionRadius);
    const cellY = Math.floor(y / this.connectionRadius);
    const cellZ = Math.floor(z / this.connectionRadius);
    return `${cellX},${cellY},${cellZ}`;
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

    const candidates: {
      index: number;
      distanceSquared: number;
    }[] = [];

    const position = new THREE.Vector3(x, y, z);
    const candidatePosition = new THREE.Vector3();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cellX + dx},${cellY + dy},${cellZ + dz}`;
          const cell = this.grid.get(key);

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

            if (
              distanceSquared <=
              this.connectionRadius * this.connectionRadius
            )
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
    maxStrength: number = 1.0,
  ): boolean {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const key = `${min}-${max}`;

    if (this.connected.has(key)) return false;
    this.connected.add(key);

    const distance = Math.sqrt(distanceSquared);
    const strength = THREE.MathUtils.clamp(
      1.0 - distance / radius,
      0.15,
      maxStrength,
    );

    this.connections.push({ a, b, strength });

    return true;
  }
  private createLocalConnections(): void {
    const count = this.positions.length / 3;
    for (let i = 0; i < count; i++) {
      const candidates = this.findNearbyNeurons(i);
      const connectionCount = Math.min(
        this.maxConnectionsPerNeuron,
        candidates.length,
      );

      for (let k = 0; k < connectionCount; k++) {
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

    const componentIds = new Int32Array(count);
    componentIds.fill(-1);

    const components: number[][] = [];
    for (let i = 0; i < count; i++) {
      if (componentIds[i] !== -1) continue;

      const componentIndex = components.length;
      const component: number[] = [];
      const queue = [i];

      componentIds[i] = componentIndex;

      for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
        const current = queue[queueIndex];
        component.push(current);

        for (const neighbor of adjacency[current]) {
          if (componentIds[neighbor] !== -1) continue;
          componentIds[neighbor] = componentIndex;
          queue.push(neighbor);
        }
      }

      components.push(component);
    }

    return components;
  }
  private findClosestComponents(components: number[][]): {
    a: number;
    b: number;
    distanceSquared: number;
  } | null {
    let bestA = -1;
    let bestB = -1;
    let bestDistanceSquared = Infinity;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let componentA = 0; componentA < components.length; componentA++) {
      for (
        let componentB = componentA + 1;
        componentB < components.length;
        componentB++
      ) {
        for (const i of components[componentA]) {
          a.set(
            this.positions[i * 3],
            this.positions[i * 3 + 1],
            this.positions[i * 3 + 2],
          );

          for (const j of components[componentB]) {
            b.set(
              this.positions[j * 3],
              this.positions[j * 3 + 1],
              this.positions[j * 3 + 2],
            );

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

    if (bestA === -1 || bestB === -1) return null;

    return {
      a: bestA,
      b: bestB,
      distanceSquared: bestDistanceSquared,
    };
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
    const linePositions = new Float32Array(this.connections.length * 2 * 3);
    const strengths = new Float32Array(this.connections.length * 2);

    let offset = 0;
    for (const connection of this.connections) {
      const a = connection.a;
      const b = connection.b;

      linePositions[offset++] = this.positions[a * 3];
      linePositions[offset++] = this.positions[a * 3 + 1];
      linePositions[offset++] = this.positions[a * 3 + 2];

      linePositions[offset++] = this.positions[b * 3];
      linePositions[offset++] = this.positions[b * 3 + 1];
      linePositions[offset++] = this.positions[b * 3 + 2];
    }

    for (let i = 0; i < this.connections.length; i++) {
      strengths[i * 2] = this.connections[i].strength;
      strengths[i * 2 + 1] = this.connections[i].strength;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3),
    );

    geometry.setAttribute("aStrength", new THREE.BufferAttribute(strengths, 1));

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

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
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
