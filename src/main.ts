import "./style.css";

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

async function init() {
  const brain = new BrainModel(loader.manager);
  await brain.load();

  const neurons = new NeuronSystem(brain.meshes, 1000);
  scene.instance.add(neurons.instance);

  loadingScreen.hide();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene.instance, camera.instance);
}

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
});

init();
