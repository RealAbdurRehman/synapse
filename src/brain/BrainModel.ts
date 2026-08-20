import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class BrainModel {
  private loader: GLTFLoader;
  public instance: THREE.Group;
  public readonly meshes: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  constructor(manager: THREE.LoadingManager) {
    this.loader = new GLTFLoader(manager);
    this.instance = new THREE.Group();
  }
  public async load(): Promise<void> {
    const gltf = await this.loader.loadAsync("/models/brain.glb");
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.meshes.push(object);
        object.geometry.computeBoundsTree();

        const material = this.createBrainMaterial();
        this.materials.push(material);
        object.material = material;
      }
    });

    gltf.scene.scale.setScalar(3);
    this.instance.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
  }
  private createBrainMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCoreColor: { value: new THREE.Color(0x0e2a6b) },
        uRimColor: { value: new THREE.Color(0x8fdcff) },
        uOpacity: { value: 0.1 },
        uFresnelPower: { value: 5.0 },
        uFresnelStrength: { value: 0.75 },
        uTime: { value: 0 },
        uPulseAmount: { value: 0.2 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);

          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uCoreColor;
        uniform vec3 uRimColor;
        uniform float uOpacity;
        uniform float uFresnelPower;
        uniform float uFresnelStrength;
        uniform float uTime;
        uniform float uPulseAmount;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;

        void main() {
          vec3 normal = normalize(vWorldNormal);
          if (!gl_FrontFacing) normal = -normal;

          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);

          float pulse = 1.0 + sin(uTime * 1.2) * uPulseAmount;

          float fresnel = pow(1.0 - facing, uFresnelPower);
          float rim = smoothstep(0.0, 1.0, fresnel) * uFresnelStrength * pulse;

          vec3 lightDir = normalize(vec3(0.4, 0.8, 0.6));
          float diffuse = max(dot(normal, lightDir), 0.0) * 0.15;

          vec3 color = mix(uCoreColor, uRimColor, rim);

          float camDist = length(vWorldPosition - cameraPosition);
          float distanceFade = smoothstep(110.0, 25.0, camDist);

          float alpha = (uOpacity + rim * 0.6) * distanceFade;
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }
  public update(elapsedTime: number): void {
    for (const material of this.materials)
      material.uniforms.uTime.value = elapsedTime;
  }
}
