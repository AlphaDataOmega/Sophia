export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    emotion?: string;
    suggestedTool?: string;
    animation?: {
      expression: string;
      intensity: number;
    };
  };
}

export interface ChatResponse {
  text: string;
  audio?: ArrayBuffer;
  animation?: {
    expression: string;
    visemes: Array<{ type: string; start: number; end: number; }>;
  };
}

export interface ChatContext {
  userId: string;
  sessionId: string;
  emotionalState: string;
  recentMemories: string[];
}
