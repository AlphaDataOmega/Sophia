export enum LLMTaskType {
  BASIC = 'basic',           // Simple Q&A
  STRUCTURED = 'structured', // Code/JSON generation
  HIGH_CONTEXT = 'high_context', // Complex reasoning
  ANIMATION = 'animation',   // Expression control
  VOICE = 'voice',          // Speech synthesis
  ANALYZE_CAUSAL = 'analyze_causal_relationships', // Memory causal analysis
  EXTRACT_REFERENCES = 'extract_references' // Memory reference extraction
}

export interface LLMRequest {
  content: string;
  taskType: LLMTaskType;
  context?: {
    complexity: number;      // 0-1 scale
    memories?: string[];     // Relevant memory contexts
    emotion?: string;       // Current emotional state
    codeContext?: string;   // For code-related tasks
  };
}

export interface LLMResponse {
  content: string;
  metadata?: {
    emotion?: string;
    suggestedTool?: string;
    codeBlocks?: string[];
    confidence: number;
  };
}
