import "./style.css";

import { Scene } from "./core/Scene";
import { Camera } from "./core/Camera";
import { Renderer } from "./core/Renderer";
import { Controls } from "./core/Controls";

const scene = new Scene();
const camera = new Camera();
const renderer = new Renderer();
const controls = new Controls(camera.instance, renderer.instance);

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
});

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene.instance, camera.instance);
}

animate();
