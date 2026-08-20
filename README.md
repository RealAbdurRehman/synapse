<h1 align="center">
  SYNAPSE
</h1>

<p align="center">
  <i>An interactive visualization of neural activity in the human brain.</i>
</p>

<p align="center">
	<img src="https://cloud-cittgrs28-hack-club-bot.vercel.app/0preview1.jpeg" alt="Demo">
	<br>
	<a href="https://decay-psi.vercel.app">Live demo</a>
	<br>
</p>

## About

**Synapse** is an experimental 3D visualization built with **Three.js** and **TypeScript**. It simulates a network of interconnected neurons inside a 3D brain model, allowing users to explore neural activity and watch electrical signals propagate through the network.

The project combines procedural neuron placement, spatial connectivity, custom shaders, animated electrical pulses, and real-time interaction to create an immersive visualization of a living neural network.

## Features

- 🧠 **3D brain model** — A transparent brain model provides the environment for the neural network.
- 🔵 **Procedural neurons** — Thousands of neurons are distributed throughout the brain.
- 🕸️ **Neural connections** — Neurons are connected into a spatially generated network.
- ✨ **Organic neural fibers** — Connections are rendered as curved, animated fibers rather than simple straight lines.
- ⚡ **Electrical activity** — Signals travel along neural connections as moving pulses.
- 🖱️ **Interactive neurons** — Select a neuron to trigger activity through the network.
- 🔥 **Signal propagation** — Neural activity spreads from neuron to neuron across connected pathways.
- 🎨 **Custom shaders** — GPU-powered shaders create glowing neurons, pulses, highlights, and atmospheric effects.
- 🌌 **Immersive rendering** — Bloom, transparency, glow, and camera movement bring the neural network to life.

## Technology

- **Three.js** — 3D rendering and scene management
- **TypeScript** — Application architecture and type safety
- **WebGL / GLSL** — Custom GPU shaders and visual effects
- **Vite** — Development and build tooling
- **GLB** — 3D brain model

## How It Works

Synapse generates a neural network inside the brain model.

Each neuron is represented as a GPU-rendered point with its own properties such as size, phase, highlight state, and firing time. Neurons are spatially distributed within the brain and connected to nearby neurons using a spatial lookup system.

The resulting network is then rendered using curved line segments and custom shaders. When a neuron is activated, an electrical pulse travels along its connections, creating the appearance of activity moving through the neural network.

The result is a real-time visualization where the brain isn't just a static model — it behaves like an interconnected system.

## Architecture

The project is organized into separate systems responsible for different parts of the experience:

```text
src/
├── core/
│   ├── Scene
│   ├── Camera
│   ├── Renderer
│   ├── Controls
│   ├── Loader
│   └── Timer
│
├── BrainModel
├── NeuronSystem
├── ConnectionSystem
├── ActivitySystem
└── main.ts
```

This separation keeps rendering, neural simulation, activity propagation, and scene management independent and easier to extend.

## Running Locally

Clone the repository and install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local URL provided by Vite.

## Project

Synapse was built as an exploration of **Three.js, GPU shaders, procedural generation, spatial algorithms, and interactive simulations**.

The goal wasn't to create a scientifically accurate model of the human brain, but to create a visually compelling representation of neural activity that feels alive and responsive.

---

_Built with Three.js and TypeScript._
