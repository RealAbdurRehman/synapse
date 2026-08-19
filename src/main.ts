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
const controls = new Controls(camera.instance, renderer.instance);

const loadingScreen = new LoadingScreen();
const loader = new Loader((progress) => loadingScreen.setProgress(progress));

const timer = new THREE.Timer();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let neurons: NeuronSystem;
let connections: ConnectionSystem;
let activity: ActivitySystem;
async function init() {
  const brain = new BrainModel(loader.manager);
  await brain.load();

  neurons = new NeuronSystem(brain.meshes, 3000);
  connections = new ConnectionSystem(neurons.getPositions(), 3);
  activity = new ActivitySystem(neurons, connections);

  scene.instance.add(connections.instance);
  scene.instance.add(neurons.instance);

  loadingScreen.hide();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const elapsedTime = timer.getElapsed();

  neurons.setTime(elapsedTime);
  connections.setTime(elapsedTime);
  activity.update(elapsedTime);

  controls.update();
  renderer.render(scene.instance, camera.instance);
}

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
});

window.addEventListener("pointerdown", (event) => {
  if (!neurons || !activity) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.params.Points!.threshold = 0.05;
  raycaster.setFromCamera(mouse, camera.instance);

  const hits = raycaster.intersectObject(neurons.instance);
  if (hits.length === 0) return;

  const neuronIndex = hits[0].index;
  if (neuronIndex === undefined) return;

  activity.fireNeuron(neuronIndex, timer.getElapsed(), 1);
});

init();
