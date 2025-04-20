export interface PersonalityTrait {
  name: string;
  value: number; // 0-1 scale
  description: string;
}

export interface EmotionalState {
  primary: string;
  intensity: number; // 0-1 scale
  secondary?: string;
  valence: number; // -1 to 1 scale (negative to positive)
  arousal: number; // 0-1 scale (calm to excited)
}

export interface PersonalityProfile {
  traits: PersonalityTrait[];
  baselineEmotion: EmotionalState;
  voicePreferences: {
    defaultVoiceId: string;
    emotionalModulation: boolean;
  };
  animationPreferences: {
    expressiveness: number; // 0-1 scale
    gestureFrequency: number; // 0-1 scale
  };
}

export interface EmotionalTrigger {
  type: string;
  intensity: number;
  duration: number;
  decay: number;
}

export interface PersonalityResponse {
  emotion: EmotionalState;
  voiceModification: {
    stability: number;
    style: number;
    similarity_boost: number;
  };
  animationModification: {
    expressionIntensity: number;
    gestureIntensity: number;
  };
  responseModification: {
    tone: string;
    formality: number;
    verbosity: number;
  };
}
