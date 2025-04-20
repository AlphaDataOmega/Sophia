declare module 'ExpressionEngine' {
  export interface Expression {
    name: string;
    weights: { [key: string]: number };
    duration: number;
    easing: string;
  }

  export interface ExpressionState {
    primaryExpression: string;
    secondaryExpression: string;
    blendWeight: number;
    intensity: number;
  }

  export interface BlendshapeWeights {
    browInnerUp: number;
    browInnerDown: number;
    browOuterUp: number;
    browOuterDown: number;
    eyeSquint: number;
    mouthSmile: number;
    mouthFrown: number;
    noseSneer: number;
  }

  export class ExpressionEngine {
    constructor();
    updateFromEmotionalState(emotionalState: any): void;
    setExpression(emotion: string, intensity: number): void;
    update(deltaTime: number): BlendshapeWeights;
    getCurrentState(): ExpressionState;
    getCurrentExpression(): Expression;
    getCurrentWeights(): BlendshapeWeights;
    setTransitionDuration(duration: number): void;
    dispose(): void;
  }
}

declare module 'LipSync' {
  export interface Viseme {
    type: string;
    start: number;
    end: number;
    weight: number;
  }

  export class LipSyncController {
    constructor();
    updateVisemes(visemes: Viseme[]): void;
    update(deltaTime: number): { [key: string]: number };
    getCurrentVisemes(): Viseme[];
    getCurrentWeights(): { [key: string]: number };
    dispose(): void;
  }
} 