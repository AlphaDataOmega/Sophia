import { EventEmitter } from 'events';
import {
  PersonalityProfile,
  EmotionalState,
  EmotionalTrigger,
  PersonalityResponse,
  PersonalityTrait
} from './types.ts';
import { EmotionEngine } from './EmotionEngine';
import { ResponseStyler } from './ResponseStyler';

export class PersonalityService extends EventEmitter {
  private profile: PersonalityProfile;
  private currentEmotionalState: EmotionalState;
  private emotionalHistory: EmotionalState[] = [];
  private readonly historyLength = 10;
  private emotionEngine: EmotionEngine;
  private responseStyler: ResponseStyler;

  constructor(initialProfile: PersonalityProfile) {
    super();
    this.profile = initialProfile;
    this.currentEmotionalState = { ...initialProfile.baselineEmotion };
    this.emotionEngine = new EmotionEngine();
    this.responseStyler = new ResponseStyler();
  }

  initialize(): void {
    // Validate personality profile
    this.validateProfile();
    
    // Start emotional state decay timer
    this.startEmotionalDecay();
  }

  private validateProfile(): void {
    const requiredTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const missingTraits = requiredTraits.filter(trait => 
      !this.profile.traits.some(t => t.name.toLowerCase() === trait)
    );

    if (missingTraits.length > 0) {
      throw new Error(`Missing required personality traits: ${missingTraits.join(', ')}`);
    }
  }

  private startEmotionalDecay(): void {
    setInterval(() => {
      this.decayEmotionalState();
    }, 1000); // Check every second
  }

  private decayEmotionalState(): void {
    const decayRate = 0.05; // 5% decay per second
    const baseline = this.profile.baselineEmotion;

    // Decay current emotional state towards baseline
    this.currentEmotionalState = {
      ...this.currentEmotionalState,
      intensity: Math.max(
        baseline.intensity,
        this.currentEmotionalState.intensity - decayRate
      ),
      valence: this.moveTowardsBaseline(
        this.currentEmotionalState.valence,
        baseline.valence,
        decayRate
      ),
      arousal: this.moveTowardsBaseline(
        this.currentEmotionalState.arousal,
        baseline.arousal,
        decayRate
      )
    };

    this.emit('emotionalStateUpdate', this.currentEmotionalState);
  }

  private moveTowardsBaseline(current: number, baseline: number, rate: number): number {
    if (current > baseline) {
      return Math.max(baseline, current - rate);
    }
    return Math.min(baseline, current + rate);
  }

  processEmotionalTrigger(trigger: EmotionalTrigger): PersonalityResponse {
    // Store previous state
    this.emotionalHistory.push({ ...this.currentEmotionalState });
    if (this.emotionalHistory.length > this.historyLength) {
      this.emotionalHistory.shift();
    }

    // Calculate new emotional state using EmotionEngine
    const newState = this.emotionEngine.calculateEmotionalTransition(
      this.currentEmotionalState,
      trigger,
      this.profile.traits
    );

    this.currentEmotionalState = newState;

    // Generate response modifications
    const response = this.generatePersonalityResponse(newState);

    this.emit('emotionalStateUpdate', newState);
    return response;
  }

  private getTraitValue(traitName: string): number {
    const trait = this.profile.traits.find(t => t.name.toLowerCase() === traitName.toLowerCase());
    return trait ? trait.value : 0.5; // Default to neutral if trait not found
  }

  private calculateNewEmotionalState(
    trigger: EmotionalTrigger,
    neuroticism: number,
    extraversion: number
  ): EmotionalState {
    // Calculate emotional impact based on personality traits
    const emotionalReactivity = neuroticism * 0.7 + extraversion * 0.3;
    const impactIntensity = trigger.intensity * emotionalReactivity;

    return {
      primary: trigger.type,
      intensity: Math.min(1, impactIntensity),
      valence: this.calculateNewValence(trigger, impactIntensity),
      arousal: this.calculateNewArousal(trigger, impactIntensity)
    };
  }

  private calculateNewValence(trigger: EmotionalTrigger, intensity: number): number {
    // Map emotional triggers to valence changes
    const valenceMap: { [key: string]: number } = {
      'joy': 1,
      'sadness': -1,
      'anger': -0.8,
      'fear': -0.7,
      'surprise': 0.2,
      'disgust': -0.6
    };

    const valenceChange = (valenceMap[trigger.type] || 0) * intensity;
    return Math.max(-1, Math.min(1, this.currentEmotionalState.valence + valenceChange));
  }

  private calculateNewArousal(trigger: EmotionalTrigger, intensity: number): number {
    // Map emotional triggers to arousal changes
    const arousalMap: { [key: string]: number } = {
      'joy': 0.6,
      'sadness': -0.4,
      'anger': 0.8,
      'fear': 0.7,
      'surprise': 0.5,
      'disgust': 0.3
    };

    const arousalChange = (arousalMap[trigger.type] || 0) * intensity;
    return Math.max(0, Math.min(1, this.currentEmotionalState.arousal + arousalChange));
  }

  private generatePersonalityResponse(state: EmotionalState): PersonalityResponse {
    return {
      emotion: state,
      voiceModification: {
        stability: this.calculateVoiceStability(state),
        style: this.calculateVoiceStyle(state),
        similarity_boost: this.calculateSimilarityBoost(state)
      },
      animationModification: {
        expressionIntensity: state.intensity,
        gestureIntensity: state.arousal
      },
      responseModification: {
        tone: this.calculateTone(state),
        formality: this.calculateFormality(),
        verbosity: this.calculateVerbosity()
      }
    };
  }

  private calculateVoiceStability(state: EmotionalState): number {
    return Math.max(0.3, 1 - state.arousal);
  }

  private calculateVoiceStyle(state: EmotionalState): number {
    return Math.min(1, (state.arousal + state.intensity) / 2);
  }

  private calculateSimilarityBoost(state: EmotionalState): number {
    return 0.75 - (Math.abs(state.valence) * 0.25);
  }

  private calculateTone(state: EmotionalState): string {
    if (state.valence > 0.5) return 'positive';
    if (state.valence < -0.5) return 'negative';
    return 'neutral';
  }

  private calculateFormality(): number {
    return Math.max(0, Math.min(1, 
      this.getTraitValue('conscientiousness') * 0.7 +
      this.getTraitValue('openness') * 0.3
    ));
  }

  private calculateVerbosity(): number {
    return Math.max(0, Math.min(1,
      this.getTraitValue('extraversion') * 0.6 +
      this.getTraitValue('openness') * 0.4
    ));
  }

  getCurrentEmotionalState(): EmotionalState {
    return { ...this.currentEmotionalState };
  }

  getEmotionalHistory(): EmotionalState[] {
    return [...this.emotionalHistory];
  }

  getPersonalityProfile(): PersonalityProfile {
    return { ...this.profile };
  }

  updatePersonalityTrait(trait: PersonalityTrait): void {
    const index = this.profile.traits.findIndex(t => t.name === trait.name);
    if (index >= 0) {
      this.profile.traits[index] = trait;
      this.emit('traitUpdate', trait);
    }
  }

  styleResponse(response: string): string {
    return this.responseStyler.styleResponse(
      response,
      this.currentEmotionalState,
      this.profile.traits
    );
  }
}
