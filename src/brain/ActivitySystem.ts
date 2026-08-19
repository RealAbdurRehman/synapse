import { NeuronSystem } from "./NeuronSystem";
import { ConnectionSystem } from "./ConnectionSystem";

interface Signal {
  from: number;
  neuron: number;
  time: number;
  strength: number;
  decay: number;
  visited: Set<number>;
}

export class ActivitySystem {
  private readonly neurons: NeuronSystem;
  private readonly connections: ConnectionSystem;

  private readonly signals: Signal[] = [];
  private readonly lastFired: Float32Array;

  private readonly spontaneousRate = 0.8;
  private readonly signalTravelDuration = 0.5;

  private readonly propagationChance = 0.85;
  private readonly manualDecay = 0.85;
  private readonly spontaneousDecay = 0.6;
  private readonly refractoryTime = 0.08;

  private nextSpontaneousFire = 0;
  private readonly maxSignals = 500;
  constructor(neurons: NeuronSystem, connections: ConnectionSystem) {
    this.neurons = neurons;
    this.connections = connections;
    this.lastFired = new Float32Array(neurons.getPositions().length / 3).fill(
      -1000,
    );
  }
  private receive(signal: Signal, time: number): void {
    if (time - this.lastFired[signal.neuron] < this.refractoryTime) return;

    this.lastFired[signal.neuron] = time;
    this.neurons.fire(signal.neuron);

    this.propagate(signal, time);
  }
  public update(time: number): void {
    if (time >= this.nextSpontaneousFire) {
      this.fireRandomNeuron(time, 1);
      this.nextSpontaneousFire =
        time + (1 / this.spontaneousRate) * (0.5 + Math.random());
    }

    for (let i = this.signals.length - 1; i >= 0; i--) {
      const signal = this.signals[i];
      if (time < signal.time) continue;

      this.signals.splice(i, 1);
      this.receive(signal, time);
    }
  }
  private fireRandomNeuron(time: number, strength: number): void {
    const count = this.lastFired.length;
    const neuron = Math.floor(Math.random() * count);

    if (time - this.lastFired[neuron] < this.refractoryTime) return;
    this.fire(neuron, time, strength, this.spontaneousDecay);
  }
  private propagate(signal: Signal, time: number): void {
    const neighbors = this.connections
      .getNeighbors(signal.neuron)
      .filter((neighbor) => !signal.visited.has(neighbor));

    const shuffled = [...neighbors].sort(() => Math.random() - 0.5);
    const propagationCount = Math.min(
      shuffled.length,
      Math.random() < 0.7 ? 1 : 2,
    );

    for (let i = 0; i < propagationCount; i++) {
      if (this.signals.length >= this.maxSignals) break;

      const neighbor = shuffled[i];
      if (time - this.lastFired[neighbor] < this.refractoryTime) continue;
      if (Math.random() > this.propagationChance) continue;

      const strength = signal.strength * signal.decay;
      if (strength < 0.15) continue;

      this.connections.emitSignal(
        signal.neuron,
        neighbor,
        time,
        strength,
        this.signalTravelDuration,
      );

      const visited = new Set(signal.visited);
      visited.add(neighbor);

      this.signals.push({
        from: signal.neuron,
        neuron: neighbor,
        time: time + this.signalTravelDuration,
        strength,
        decay: signal.decay,
        visited,
      });
    }
  }
  private fire(
    neuron: number,
    time: number,
    strength: number,
    decay: number,
  ): void {
    this.lastFired[neuron] = time;
    this.neurons.fire(neuron);

    this.propagate(
      {
        from: neuron,
        neuron,
        time,
        strength,
        decay,
        visited: new Set([neuron]),
      },
      time,
    );
  }
  public fireNeuron(index: number, time: number, strength: number = 1): void {
    if (index < 0 || index >= this.lastFired.length) return;
    if (time - this.lastFired[index] < this.refractoryTime) return;

    this.fire(index, time, strength, this.manualDecay);
  }
}
