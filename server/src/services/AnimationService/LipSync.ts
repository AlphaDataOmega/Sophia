import { VisemeData } from '../VoiceService';

export interface LipSyncState {
  currentViseme: string;
  blendWeight: number;
  transitionDuration: number;
}

export interface Viseme {
  type: string;
  start: number;
  end: number;
  weight: number;
}

export interface VisemeWeights {
  [key: string]: number;
}

export class LipSyncController {
  private state: LipSyncState;
  private visemeQueue: VisemeData[];
  private lastUpdate: number;
  private currentVisemes: Viseme[];

  constructor() {
    this.state = {
      currentViseme: 'sil',
      blendWeight: 0,
      transitionDuration: 0.1
    };
    this.visemeQueue = [];
    this.currentVisemes = [];
    this.lastUpdate = Date.now();
  }

  updateVisemes(visemes: Viseme[]): void {
    // Convert Viseme[] to VisemeData[] by adding value property
    this.visemeQueue = visemes.map(v => ({
      type: v.type,
      start: v.start,
      end: v.end,
      value: v.weight
    }));
    this.currentVisemes = visemes;
  }

  update(deltaTime: number): LipSyncState {
    const currentTime = Date.now() / 1000; // Convert to seconds

    // Process viseme queue
    while (
      this.visemeQueue.length > 0 && 
      this.visemeQueue[0].start <= currentTime
    ) {
      const viseme = this.visemeQueue.shift();
      if (viseme) {
        this.state.currentViseme = viseme.type;
        this.state.blendWeight = viseme.value;
      }
    }

    // Update blend weights for smooth transitions
    this.state.blendWeight = Math.max(
      0,
      this.state.blendWeight - (deltaTime / this.state.transitionDuration)
    );

    return { ...this.state };
  }

  getCurrentVisemes(): Viseme[] {
    return [...this.currentVisemes];
  }

  getCurrentWeights(): VisemeWeights {
    const weights: VisemeWeights = {};
    weights[this.state.currentViseme] = this.state.blendWeight;
    return weights;
  }

  reset(): void {
    this.state.currentViseme = 'sil';
    this.state.blendWeight = 0;
    this.visemeQueue = [];
    this.currentVisemes = [];
  }

  getCurrentState(): LipSyncState {
    return { ...this.state };
  }

  dispose(): void {
    this.reset();
  }
} 