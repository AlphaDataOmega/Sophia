export enum LLMTaskType {
  BASIC = 'basic',           // Simple Q&A
  STRUCTURED = 'structured', // Code/JSON generation
  HIGH_CONTEXT = 'high_context', // Complex reasoning
  ANIMATION = 'animation',   // Expression control
  VOICE = 'voice'           // Speech synthesis
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

export class LLMService {
  private static instance: LLMService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/llm/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in LLM generation:', error);
      throw error;
    }
  }

  async generateStructured(content: string, codeContext?: string): Promise<LLMResponse> {
    return this.generateResponse({
      content,
      taskType: LLMTaskType.STRUCTURED,
      context: {
        complexity: 0.8,
        codeContext,
      },
    });
  }

  async generateConversational(
    content: string, 
    memories?: string[], 
    emotion?: string
  ): Promise<LLMResponse> {
    return this.generateResponse({
      content,
      taskType: LLMTaskType.HIGH_CONTEXT,
      context: {
        complexity: 0.7,
        memories,
        emotion,
      },
    });
  }

  async generateAnimation(content: string, currentEmotion?: string): Promise<LLMResponse> {
    return this.generateResponse({
      content,
      taskType: LLMTaskType.ANIMATION,
      context: {
        complexity: 0.5,
        emotion: currentEmotion,
      },
    });
  }
}

// Export a singleton instance
export const llmService = LLMService.getInstance();
