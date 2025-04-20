export interface ReflectionTrigger {
  type: 'idle' | 'scheduled' | 'manual';
  duration?: number; // idle duration in ms
  context?: string;
}

export interface ReflectionResult {
  insights: ReflectionInsight[];
  suggestedActions: SuggestedAction[];
  emotionalSummary: EmotionalSummary;
  timestamp: number;
}

export interface ReflectionInsight {
  topic: string;
  observation: string;
  confidence: number;
  relatedMemoryIds: string[];
}

export interface SuggestedAction {
  type: 'tool_creation' | 'workflow_optimization' | 'memory_linking' | 'personality_adjustment';
  description: string;
  priority: number; // 0-1 scale
  reasoning: string;
}

export interface EmotionalSummary {
  dominantEmotion: string;
  emotionalTrajectory: {
    emotion: string;
    intensity: number;
    timestamp: number;
  }[];
  userInteractionQuality: number; // 0-1 scale
}

export interface ReflectionConfig {
  idleThreshold: number; // ms before considering system idle
  minMemoriesToAnalyze: number;
  maxMemoriesToAnalyze: number;
  reflectionInterval: number; // ms between scheduled reflections
  notificationChannels: ('console' | 'sms' | 'telegram')[];
}
