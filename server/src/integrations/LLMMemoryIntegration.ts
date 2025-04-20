import { LLMService } from '../services/LLMService';
import { MemoryService } from '../services/MemoryService';

export class LLMMemoryIntegration {
  private llmService: LLMService;
  private memoryService: MemoryService;
  private contextWindowSize: number = 5; // Number of relevant memories to include

  constructor(llmService: LLMService, memoryService: MemoryService) {
    this.llmService = llmService;
    this.memoryService = memoryService;
  }

  async generateResponseWithContext(
    input: string,
    userId: string
  ): Promise<{
    response: string;
    usedMemories: any[];
    newMemories: any[];
  }> {
    // 1. Search for relevant memories
    const relevantMemories = await this.memoryService.searchMemories({
      query: input,
      limit: this.contextWindowSize,
      userId
    });

    // 2. Format memories for context
    const contextString = this.formatMemoriesForContext(relevantMemories);

    // 3. Generate response with context
    const response = await this.llmService.generateResponse(input, {
      systemContext: contextString,
      userId
    });

    // 4. Store new memories
    const newMemories = await this.storeInteractionMemories(
      input,
      response,
      userId
    );

    // 5. Link memories if relevant
    await this.linkRelatedMemories(newMemories, relevantMemories);

    return {
      response,
      usedMemories: relevantMemories,
      newMemories
    };
  }

  private formatMemoriesForContext(memories: any[]): string {
    if (!memories.length) return '';

    // Sort memories by timestamp
    const sortedMemories = [...memories].sort((a, b) => 
      a.timestamp - b.timestamp
    );

    // Format into conversation context
    return sortedMemories.map(memory => {
      if (memory.type === 'message') {
        return `${memory.role}: ${memory.content}`;
      } else if (memory.type === 'reflection') {
        return `System Reflection: ${memory.content}`;
      }
      return `Context: ${memory.content}`;
    }).join('\n');
  }

  private async storeInteractionMemories(
    input: string,
    response: string,
    userId: string
  ): Promise<any[]> {
    const timestamp = Date.now();
    const newMemories = [];

    // Store user input
    const userMemory = await this.memoryService.storeMemory({
      type: 'message',
      role: 'user',
      content: input,
      userId,
      timestamp
    });
    newMemories.push(userMemory);

    // Store assistant response
    const assistantMemory = await this.memoryService.storeMemory({
      type: 'message',
      role: 'assistant',
      content: response,
      userId,
      timestamp: timestamp + 1
    });
    newMemories.push(assistantMemory);

    // Generate and store interaction summary
    const summary = await this.llmService.generateSummary(
      `User: ${input}\nAssistant: ${response}`
    );
    
    const summaryMemory = await this.memoryService.storeMemory({
      type: 'summary',
      content: summary,
      userId,
      timestamp: timestamp + 2,
      metadata: {
        userMessageId: userMemory.id,
        assistantMessageId: assistantMemory.id
      }
    });
    newMemories.push(summaryMemory);

    return newMemories;
  }

  private async linkRelatedMemories(
    newMemories: any[],
    relevantMemories: any[]
  ): Promise<void> {
    // Create bidirectional links between related memories
    for (const newMemory of newMemories) {
      for (const relevantMemory of relevantMemories) {
        const similarity = await this.calculateMemorySimilarity(
          newMemory,
          relevantMemory
        );

        if (similarity > 0.7) { // Threshold for relatedness
          await this.memoryService.linkMemories(
            newMemory.id,
            relevantMemory.id,
            similarity
          );
        }
      }
    }
  }

  private async calculateMemorySimilarity(
    memory1: any,
    memory2: any
  ): Promise<number> {
    // Get embeddings for both memories
    const [embedding1, embedding2] = await Promise.all([
      this.llmService.generateEmbedding(memory1.content),
      this.llmService.generateEmbedding(memory2.content)
    ]);

    // Calculate cosine similarity
    return this.cosineSimilarity(embedding1, embedding2);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (norm1 * norm2);
  }

  // Utility methods for memory management
  async pruneOldMemories(userId: string, maxAge: number): Promise<void> {
    const cutoffTime = Date.now() - maxAge;
    await this.memoryService.deleteMemories({
      userId,
      beforeTimestamp: cutoffTime
    });
  }

  async consolidateMemories(userId: string): Promise<void> {
    // Get recent memories
    const recentMemories = await this.memoryService.getRecentMemories(userId, 50);
    
    // Group by conversation
    const conversations = this.groupMemoriesByConversation(recentMemories);

    // Generate summaries for each conversation
    for (const conversation of conversations) {
      const summary = await this.llmService.generateSummary(
        conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n')
      );

      // Store consolidated memory
      await this.memoryService.storeMemory({
        type: 'conversation_summary',
        content: summary,
        userId,
        timestamp: Date.now(),
        metadata: {
          messageIds: conversation.messages.map(m => m.id),
          startTime: conversation.startTime,
          endTime: conversation.endTime
        }
      });
    }
  }

  private groupMemoriesByConversation(memories: any[]): any[] {
    // Group messages into conversations based on time gaps
    const conversations: any[] = [];
    let currentConversation: any = null;
    const TIME_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const memory of memories) {
      if (!currentConversation || 
          memory.timestamp - currentConversation.endTime > TIME_GAP_THRESHOLD) {
        currentConversation = {
          messages: [],
          startTime: memory.timestamp,
          endTime: memory.timestamp
        };
        conversations.push(currentConversation);
      }

      currentConversation.messages.push(memory);
      currentConversation.endTime = memory.timestamp;
    }

    return conversations;
  }
}
