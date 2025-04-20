import { LLMService } from './index';
import { MemoryManager } from '../MemoryService/MemoryManager';
import { MemoryType } from '../MemoryService/types';

export class MemoryEnhancedLLM extends LLMService {
  constructor(
    private baseService: LLMService,
    private memoryManager: MemoryManager
  ) {
    super();
  }

  async generateText(params: {
    messages: { role: string; content: string }[];
    useMemory?: boolean;
    storeResponse?: boolean;
  }): Promise<string> {
    if (params.useMemory !== false) {
      // Get relevant memories for context
      const context = params.messages.map(m => m.content).join('\n');
      const relevantMemories = await this.memoryManager.getRelevantMemories(context, {
        types: [
          MemoryType.CONVERSATION,
          MemoryType.USER_PREFERENCE,
          MemoryType.EMOTIONAL
        ],
        limit: 5
      });

      // Add memory context to the prompt
      if (relevantMemories.length > 0) {
        const memorySummary = await this.memoryManager.summarizeMemories(
          relevantMemories.map(r => r.memory)
        );

        params.messages.unshift({
          role: 'system',
          content: `Relevant context from memory:\n${memorySummary}`
        });
      }
    }

    // Generate response
    const response = await this.baseService.generateText(params);

    // Store response if requested
    if (params.storeResponse !== false) {
      await this.memoryManager.storeConversationMemory({
        role: 'assistant',
        content: response
      });
    }

    return response;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.baseService.generateEmbedding(text);
  }
}
