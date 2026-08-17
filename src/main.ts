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

const scene = new Scene();
const camera = new Camera();
const renderer = new Renderer();
const controls = new Controls(camera.instance, renderer.instance);

const loadingScreen = new LoadingScreen();
const loader = new Loader((progress) => loadingScreen.setProgress(progress));

const clock = new THREE.Clock();

let neurons: NeuronSystem;
async function init() {
  const brain = new BrainModel(loader.manager);
  await brain.load();

  neurons = new NeuronSystem(brain.meshes, 3000);
  scene.instance.add(neurons.instance);

  loadingScreen.hide();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  neurons.setTime(elapsedTime);

  controls.update();
  renderer.render(scene.instance, camera.instance);
}

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
});

init();
