import { ChromaMemoryProvider } from './index';
import { Memory, MemoryType, MemorySearchResult } from './types';
import { LLMService } from '../LLMService';

export class MemoryManager {
  constructor(
    private memoryProvider: ChromaMemoryProvider,
    private llmService: LLMService
  ) {}

  async storeConversationMemory(
    message: { role: string; content: string },
    emotion?: string
  ): Promise<string> {
    const content = `${message.role}: ${message.content}`;
    return this.memoryProvider.store(content, MemoryType.CONVERSATION, {
      emotion,
      timestamp: Date.now(),
      importance: await this.calculateConversationImportance(content)
    });
  }

  async storeToolUsageMemory(
    toolName: string,
    input: any,
    output: any,
    success: boolean
  ): Promise<string> {
    const content = JSON.stringify({
      tool: toolName,
      input,
      output,
      success
    });

    return this.memoryProvider.store(content, MemoryType.TOOL_USAGE, {
      tags: [toolName],
      importance: success ? 0.8 : 0.9 // Failed attempts are slightly more important to remember
    });
  }

  async storeEmotionalMemory(
    emotion: string,
    trigger: string,
    intensity: number
  ): Promise<string> {
    const content = `Felt ${emotion} (${intensity}) because: ${trigger}`;
    return this.memoryProvider.store(content, MemoryType.EMOTIONAL, {
      emotion,
      importance: intensity,
      tags: [emotion]
    });
  }

  async storeUserPreference(
    preference: string,
    value: any
  ): Promise<string> {
    const content = `User prefers ${preference}: ${JSON.stringify(value)}`;
    return this.memoryProvider.store(content, MemoryType.USER_PREFERENCE, {
      tags: [preference],
      importance: 0.9 // User preferences are highly important
    });
  }

  async getRelevantMemories(
    context: string,
    options: {
      types?: MemoryType[];
      limit?: number;
      timeframe?: { start: number; end: number };
    } = {}
  ): Promise<MemorySearchResult[]> {
    const allResults: MemorySearchResult[] = [];

    // Search each requested memory type
    for (const type of options.types || Object.values(MemoryType)) {
      const results = await this.memoryProvider.search(context, {
        type,
        limit: options.limit,
        timeframe: options.timeframe,
        minSimilarity: 0.7
      });
      allResults.push(...results);
    }

    // Sort by similarity and limit
    return allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 5);
  }

  async summarizeMemories(
    memories: Memory[],
    prompt?: string
  ): Promise<string> {
    const memoryTexts = memories.map(m => m.content);
    const defaultPrompt = 'Summarize these memories, focusing on key information and patterns:';
    
    return this.llmService.generateText({
      messages: [
        {
          role: 'system',
          content: prompt || defaultPrompt
        },
        {
          role: 'user',
          content: memoryTexts.join('\n\n')
        }
      ]
    });
  }

  private async calculateConversationImportance(content: string): Promise<number> {
    // Use LLM to analyze importance
    const analysis = await this.llmService.generateText({
      messages: [
        {
          role: 'system',
          content: 'Analyze this conversation snippet and rate its importance from 0 to 1, where 1 is extremely important. Consider factors like: emotional content, key decisions, user preferences, and critical information. Respond with only a number.'
        },
        {
          role: 'user',
          content
        }
      ]
    });

    // Parse the response as a number between 0 and 1
    const importance = parseFloat(analysis);
    return isNaN(importance) ? 0.5 : Math.max(0, Math.min(1, importance));
  }

  async getMemoryStats(): Promise<{
    totalMemories: number;
    byType: Record<MemoryType, number>;
    recentEmotions: { emotion: string; count: number }[];
  }> {
    // Implementation to get memory statistics
    // This would require adding methods to ChromaMemoryProvider to get counts and aggregates
    return {
      totalMemories: 0,
      byType: {} as Record<MemoryType, number>,
      recentEmotions: []
    };
  }
}
