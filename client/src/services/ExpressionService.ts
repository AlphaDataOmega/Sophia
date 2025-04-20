import * as THREE from 'three';
import { EmotionalState } from '../../server/src/services/PersonalityService/types';

interface ExpressionMapping {
  [key: string]: {
    targets: {
      [key: string]: number; // morph target name -> weight
    };
    transitionTime: number; // seconds
    microExpressions?: {
      [key: string]: {
        targets: {
          [key: string]: number;
        };
        duration: number; // seconds
        probability: number; // 0-1
      };
    };
  };
}

export class ExpressionService {
  private static instance: ExpressionService | null = null;
  private mesh: THREE.Mesh | null = null;
  private currentExpression: string = 'neutral';
  private targetWeights: { [key: string]: number } = {};
  private currentWeights: { [key: string]: number } = {};
  private transitionTime: number = 0.3; // seconds
  private isInitialized: boolean = false;
  private currentMicroExpression: string | null = null;
  private microExpressionStartTime: number = 0;
  private microExpressionDuration: number = 0;
  private microExpressionWeights: { [key: string]: number } = {};

  // Mapping of emotional states to expressions
  private readonly expressionMapping: ExpressionMapping = {
    // Positive emotions
    'joy': {
      targets: {
        'smile': 1.0,
        'eyes_wide': 0.5,
        'brows_up': 0.3
      },
      transitionTime: 0.3,
      microExpressions: {
        'joy_blink': {
          targets: {
            'eyes_closed': 0.8,
            'brows_up': 0.2
          },
          duration: 0.2,
          probability: 0.3
        },
        'joy_smile_twitch': {
          targets: {
            'smile': 1.2,
            'eyes_wide': 0.6
          },
          duration: 0.15,
          probability: 0.2
        }
      }
    },
    'contentment': {
      targets: {
        'smile': 0.6,
        'eyes_relaxed': 0.4,
        'brows_relaxed': 0.2
      },
      transitionTime: 0.4,
      microExpressions: {
        'contentment_slow_blink': {
          targets: {
            'eyes_closed': 0.6,
            'brows_relaxed': 0.3
          },
          duration: 0.3,
          probability: 0.4
        }
      }
    },
    'excitement': {
      targets: {
        'smile': 0.8,
        'eyes_wide': 0.7,
        'brows_up': 0.5,
        'mouth_open': 0.3
      },
      transitionTime: 0.2
    },
    'pride': {
      targets: {
        'smile': 0.4,
        'brows_up': 0.6,
        'head_tilt': 0.3
      },
      transitionTime: 0.3
    },
    // Negative emotions
    'sadness': {
      targets: {
        'frown': 0.8,
        'brows_down': 0.6,
        'eyes_sad': 0.7
      },
      transitionTime: 0.4
    },
    'melancholy': {
      targets: {
        'frown': 0.5,
        'brows_down': 0.4,
        'eyes_sad': 0.5
      },
      transitionTime: 0.5
    },
    'anger': {
      targets: {
        'frown': 1.0,
        'brows_angry': 0.9,
        'eyes_narrow': 0.8
      },
      transitionTime: 0.2
    },
    'fear': {
      targets: {
        'eyes_wide': 0.9,
        'brows_up': 0.8,
        'mouth_open': 0.4
      },
      transitionTime: 0.2
    },
    // Neutral state
    'neutral': {
      targets: {
        'smile': 0.1,
        'eyes_neutral': 0.1,
        'brows_neutral': 0.1
      },
      transitionTime: 0.3,
      microExpressions: {
        'neutral_blink': {
          targets: {
            'eyes_closed': 0.8,
            'brows_neutral': 0.1
          },
          duration: 0.2,
          probability: 0.5
        },
        'neutral_eye_shift': {
          targets: {
            'eyes_look_left': 0.3,
            'eyes_look_right': 0.3
          },
          duration: 0.15,
          probability: 0.3
        }
      }
    }
  };

  private constructor() {
    console.log('ExpressionService initialized');
  }

  public static getInstance(): ExpressionService {
    if (!ExpressionService.instance) {
      ExpressionService.instance = new ExpressionService();
    }
    return ExpressionService.instance;
  }

  public initialize(mesh: THREE.Mesh): void {
    if (this.isInitialized) return;

    this.mesh = mesh;
    if (this.mesh.morphTargetInfluences === undefined) {
      this.mesh.morphTargetInfluences = [];
    }

    // Initialize weights for all morph targets
    const morphTargetDictionary = this.mesh.morphTargetDictionary;
    if (morphTargetDictionary) {
      Object.keys(morphTargetDictionary).forEach(target => {
        this.targetWeights[target] = 0;
        this.currentWeights[target] = 0;
      });
    }

    this.isInitialized = true;
    console.log('ExpressionService initialization complete');
  }

  public updateExpression(emotionalState: EmotionalState): void {
    if (!this.isInitialized || !this.mesh) return;

    // Map emotional state to expression
    const expression = this.getExpressionForEmotion(emotionalState);
    const mapping = this.expressionMapping[expression];

    if (!mapping) {
      console.warn(`No expression mapping found for ${expression}`);
      return;
    }

    // Update target weights based on emotional intensity
    Object.keys(mapping.targets).forEach(target => {
      const baseWeight = mapping.targets[target];
      this.targetWeights[target] = baseWeight * emotionalState.intensity;
    });

    // Update transition time
    this.transitionTime = mapping.transitionTime;
  }

  public update(delta: number): void {
    if (!this.isInitialized || !this.mesh || !this.mesh.morphTargetInfluences) return;

    // Update main expression weights
    Object.keys(this.targetWeights).forEach(target => {
      const currentWeight = this.currentWeights[target];
      const targetWeight = this.targetWeights[target];
      
      const lerpFactor = Math.min(1, delta / this.transitionTime);
      this.currentWeights[target] = THREE.MathUtils.lerp(
        currentWeight,
        targetWeight,
        lerpFactor
      );
    });

    // Handle micro-expressions
    this.updateMicroExpressions(delta);

    // Apply combined weights to morph targets
    Object.keys(this.currentWeights).forEach(target => {
      const targetIndex = this.mesh.morphTargetDictionary?.[target];
      if (targetIndex !== undefined) {
        // Combine main expression and micro-expression weights
        const microWeight = this.microExpressionWeights[target] || 0;
        this.mesh.morphTargetInfluences[targetIndex] = 
          this.currentWeights[target] + microWeight;
      }
    });
  }

  private updateMicroExpressions(delta: number): void {
    const currentTime = performance.now() / 1000;

    // Check if we should start a new micro-expression
    if (!this.currentMicroExpression) {
      const mapping = this.expressionMapping[this.currentExpression];
      if (mapping?.microExpressions) {
        const microExpressions = Object.entries(mapping.microExpressions);
        for (const [name, config] of microExpressions) {
          if (Math.random() < config.probability * delta) {
            this.currentMicroExpression = name;
            this.microExpressionStartTime = currentTime;
            this.microExpressionDuration = config.duration;
            this.microExpressionWeights = { ...config.targets };
            break;
          }
        }
      }
    }

    // Update current micro-expression
    if (this.currentMicroExpression) {
      const elapsed = currentTime - this.microExpressionStartTime;
      const progress = Math.min(1, elapsed / this.microExpressionDuration);

      if (progress >= 1) {
        // Micro-expression complete
        this.currentMicroExpression = null;
        this.microExpressionWeights = {};
      } else {
        // Fade out micro-expression
        const fadeOut = Math.min(1, (this.microExpressionDuration - elapsed) / 0.1);
        Object.keys(this.microExpressionWeights).forEach(target => {
          this.microExpressionWeights[target] *= fadeOut;
        });
      }
    }
  }

  private getExpressionForEmotion(emotionalState: EmotionalState): string {
    // Map emotional state to expression based on primary emotion and intensity
    const primaryEmotion = emotionalState.primary.toLowerCase();
    
    // Check if we have a direct mapping
    if (this.expressionMapping[primaryEmotion]) {
      return primaryEmotion;
    }

    // Fallback to neutral if no mapping found
    return 'neutral';
  }

  public dispose(): void {
    this.mesh = null;
    this.targetWeights = {};
    this.currentWeights = {};
    this.isInitialized = false;
  }
} 