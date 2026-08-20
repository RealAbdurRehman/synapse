import "./style.css";
import "./core/BVH";

import * as THREE from "three";

import { Scene } from "./core/Scene";
import { Camera } from "./core/Camera";
import { Renderer } from "./core/Renderer";
import { Controls } from "./core/Controls";
import { Loader } from "./core/Loader";
import { LoadingScreen } from "./core/LoadingScreen";

import { BrainModel } from "./brain/BrainModel";
import { NeuronSystem } from "./brain/NeuronSystem";
import { ConnectionSystem } from "./brain/ConnectionSystem";
import { ActivitySystem } from "./brain/ActivitySystem";

const scene = new Scene();
const camera = new Camera();
const renderer = new Renderer();
renderer.setupPostProcessing(scene.instance, camera.instance);

const controls = new Controls(camera.instance, renderer.instance);

const loadingScreen = new LoadingScreen();
const loader = new Loader((progress) => loadingScreen.setProgress(progress));

const timer = new THREE.Timer();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredNeuron = -1;

let brain: BrainModel;
let neurons: NeuronSystem;
let connections: ConnectionSystem;
let activity: ActivitySystem;
async function init() {
  brain = new BrainModel(loader.manager);
  await brain.load();

  neurons = new NeuronSystem(brain.meshes, 3000);
  connections = new ConnectionSystem(neurons.getPositions(), 3);
  activity = new ActivitySystem(neurons, connections);

  scene.instance.add(brain.instance);
  scene.instance.add(connections.instance);
  scene.instance.add(neurons.instance);

  loadingScreen.hide();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const elapsedTime = timer.getElapsed();
  const deltaTime = timer.getDelta();

  scene.background.setTime(elapsedTime);

  brain.update(elapsedTime);
  neurons.setTime(elapsedTime);
  connections.setTime(elapsedTime);
  activity.update(elapsedTime);
  renderer.setTime(elapsedTime, deltaTime);

  controls.update();
  renderer.render();
}

function getNeuronAtPointer(event: PointerEvent): number {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.params.Points!.threshold = 0.1;
  raycaster.setFromCamera(mouse, camera.instance);

  const hits = raycaster.intersectObject(neurons.instance);

  if (hits.length === 0) return -1;

  return hits[0].index ?? -1;
}

function focusOnNeuron(neuronIndex: number): void {
  if (neuronIndex === -1) {
    renderer.clearFocus();
    return;
  }

  const positions = neurons.getPositions();
  const position = new THREE.Vector3(
    positions[neuronIndex * 3],
    positions[neuronIndex * 3 + 1],
    positions[neuronIndex * 3 + 2],
  );

  neurons.instance.localToWorld(position);

  const cameraToNeuron = new THREE.Vector3().subVectors(
    position,
    camera.instance.position,
  );

  const focusDistance = cameraToNeuron.dot(
    camera.instance.getWorldDirection(new THREE.Vector3()),
  );

  if (focusDistance > 0) renderer.setFocus(focusDistance);
}

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
  scene.background.resize();
});

window.addEventListener("pointerdown", (event) => {
  const neuronIndex = getNeuronAtPointer(event);
  if (neuronIndex === -1) return;

  activity.fireNeuron(neuronIndex, timer.getElapsed(), 1);
});

window.addEventListener("pointermove", (event) => {
  const neuronIndex = getNeuronAtPointer(event);
  if (neuronIndex === hoveredNeuron) return;

  hoveredNeuron = neuronIndex;
  neurons.setHighlighted(
    neuronIndex === -1 ? new Set() : new Set([neuronIndex]),
  );

  connections.setHighlighted(neuronIndex);
  focusOnNeuron(neuronIndex);
});

init();
