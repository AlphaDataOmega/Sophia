import { LLMTaskType, LLMRequest, LLMResponse } from './types';
import { OllamaProvider } from './providers/OllamaProvider';

export class LLMRouter {
  private providers: Map<string, OllamaProvider>;

  constructor() {
    // Initialize providers with different models for different tasks
    this.providers = new Map([
      ['chat', new OllamaProvider(process.env.OLLAMA_MODEL || 'llama2:7b-chat')],
      ['code', new OllamaProvider(process.env.OLLAMA_CODEGEN_MODEL || 'codellama')],
      ['embedding', new OllamaProvider(process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text')],
      ['simple', new OllamaProvider(process.env.OLLAMA_SIMPLE_MODEL || 'llama2-uncensored')]
    ]);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const provider = this.providers.get('embedding');
    if (!provider) {
      throw new Error('Embedding provider not initialized');
    }
    const response = await provider.generate(text);
    return JSON.parse(response);
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.route(request);
  }

  async route(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.selectProvider(request);
    const prompt = this.buildPrompt(request);
    
    const response = await provider.generateResponse(prompt);
    return this.processResponse(response, request.taskType);
  }

  private selectProvider(request: LLMRequest): OllamaProvider {
    switch (request.taskType) {
      case LLMTaskType.STRUCTURED:
        return this.providers.get('code')!;
      case LLMTaskType.BASIC:
        return this.providers.get('simple')!;
      case LLMTaskType.HIGH_CONTEXT:
        return this.providers.get('chat')!;
      default:
        return this.providers.get('chat')!;
    }
  }

  private buildPrompt(request: LLMRequest): string {
    const { content, taskType, context } = request;
    let systemPrompt = '';

    switch (taskType) {
      case LLMTaskType.STRUCTURED:
        systemPrompt = `You are a code generation expert. Generate only valid code without explanations.
Previous context: ${context?.codeContext || 'None'}`;
        break;
      
      case LLMTaskType.HIGH_CONTEXT:
        systemPrompt = `You are Sophia, an AI assistant with access to these relevant memories:
${context?.memories?.join('\n') || 'No relevant memories.'}
Current emotional state: ${context?.emotion || 'neutral'}`;
        break;
      
      // Add other task types...
    }

    return `${systemPrompt}\n\nUser: ${content}`;
  }

  private processResponse(response: string, taskType: LLMTaskType): LLMResponse {
    // Extract metadata based on task type
    const metadata = {
      confidence: 0.8, // Default confidence
      ...this.extractMetadata(response, taskType)
    };

    return {
      content: this.cleanResponse(response, taskType),
      metadata
    };
  }

  private extractMetadata(response: string, taskType: LLMTaskType) {
    // Extract relevant metadata based on task type
    const metadata: any = {};
    
    if (taskType === LLMTaskType.STRUCTURED) {
      metadata.codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    }
    
    // Extract emotion markers if present
    const emotionMatch = response.match(/\[EMOTION:(.*?)\]/);
    if (emotionMatch) {
      metadata.emotion = emotionMatch[1].trim();
    }
    
    // Extract tool suggestions
    const toolMatch = response.match(/\[TOOL:(.*?)\]/);
    if (toolMatch) {
      metadata.suggestedTool = toolMatch[1].trim();
    }
    
    return metadata;
  }

  private cleanResponse(response: string, taskType: LLMTaskType): string {
    // Remove metadata markers and clean up response based on task type
    return response
      .replace(/\[EMOTION:.*?\]/g, '')
      .replace(/\[TOOL:.*?\]/g, '')
      .trim();
  }
}
