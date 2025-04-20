import { EmotionalState } from '../PersonalityService/types';

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
  private state: ExpressionState;
  private readonly blendshapeMap: Map<string, BlendshapeWeights>;
  private transitionDuration: number;
  private currentWeights: BlendshapeWeights;

  constructor() {
    this.state = {
      primaryExpression: 'neutral',
      secondaryExpression: 'neutral',
      blendWeight: 0,
      intensity: 0.5
    };

    this.transitionDuration = 0.3; // seconds
    this.blendshapeMap = new Map([
      ['happy', {
        browInnerUp: 0.3,
        browInnerDown: 0,
        browOuterUp: 0.4,
        browOuterDown: 0,
        eyeSquint: 0.3,
        mouthSmile: 0.8,
        mouthFrown: 0,
        noseSneer: 0
      }],
      ['sad', {
        browInnerUp: 0.7,
        browInnerDown: 0,
        browOuterUp: 0,
        browOuterDown: 0.6,
        eyeSquint: 0.2,
        mouthSmile: 0,
        mouthFrown: 0.5,
        noseSneer: 0
      }],
      ['angry', {
        browInnerUp: 0,
        browInnerDown: 0.8,
        browOuterUp: 0,
        browOuterDown: 0.7,
        eyeSquint: 0.6,
        mouthSmile: 0,
        mouthFrown: 0.3,
        noseSneer: 0.4
      }],
      ['neutral', {
        browInnerUp: 0,
        browInnerDown: 0,
        browOuterUp: 0,
        browOuterDown: 0,
        eyeSquint: 0,
        mouthSmile: 0,
        mouthFrown: 0,
        noseSneer: 0
      }]
    ]);

    this.currentWeights = this.blendshapeMap.get('neutral')!;
  }

  updateFromEmotionalState(emotionalState: EmotionalState): void {
    this.state.primaryExpression = emotionalState.primary;
    this.state.intensity = emotionalState.intensity;
  }

  setExpression(emotion: string, intensity: number): void {
    this.state.primaryExpression = emotion;
    this.state.intensity = intensity;
  }

  update(deltaTime: number): BlendshapeWeights {
    const primaryWeights = this.blendshapeMap.get(this.state.primaryExpression) || this.blendshapeMap.get('neutral')!;
    const secondaryWeights = this.blendshapeMap.get(this.state.secondaryExpression) || this.blendshapeMap.get('neutral')!;

    // Calculate transition progress
    const transitionProgress = Math.min(1, deltaTime / this.transitionDuration);

    // Interpolate between expressions
    this.currentWeights = {
      browInnerUp: 0,
      browInnerDown: 0,
      browOuterUp: 0,
      browOuterDown: 0,
      eyeSquint: 0,
      mouthSmile: 0,
      mouthFrown: 0,
      noseSneer: 0
    };

    for (const key of Object.keys(this.currentWeights) as (keyof BlendshapeWeights)[]) {
      this.currentWeights[key] = this.lerp(
        secondaryWeights[key],
        primaryWeights[key],
        transitionProgress
      ) * this.state.intensity;
    }

    return { ...this.currentWeights };
  }

  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  getCurrentState(): ExpressionState {
    return { ...this.state };
  }

  getCurrentExpression(): Expression {
    return {
      name: this.state.primaryExpression,
      weights: {
        browInnerUp: this.currentWeights.browInnerUp,
        browInnerDown: this.currentWeights.browInnerDown,
        browOuterUp: this.currentWeights.browOuterUp,
        browOuterDown: this.currentWeights.browOuterDown,
        eyeSquint: this.currentWeights.eyeSquint,
        mouthSmile: this.currentWeights.mouthSmile,
        mouthFrown: this.currentWeights.mouthFrown,
        noseSneer: this.currentWeights.noseSneer
      },
      duration: this.transitionDuration,
      easing: 'linear'
    };
  }

  getCurrentWeights(): BlendshapeWeights {
    return { ...this.currentWeights };
  }

  setTransitionDuration(duration: number): void {
    this.transitionDuration = Math.max(0.1, duration);
  }

  dispose(): void {
    // Clean up any resources if needed
  }
} 