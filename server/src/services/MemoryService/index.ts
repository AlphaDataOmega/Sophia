import { ChromaClient, Collection, Metadata } from 'chromadb';
import { 
  Memory, 
  MemoryType, 
  MemorySearchResult, 
  MemoryLink, 
  MemoryLinkType,
  SearchOptions,
  ChromaMetadata
} from './types';
import { llmService } from '../LLMService/LLMService';
import { LLMTaskType } from '../LLMService/types';

export class ChromaMemoryProvider {
  private chroma: ChromaClient;
  private collection: Collection | null = null;
  private readonly COLLECTION_NAME = 'sophia_memory';

  constructor() {
    this.chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
  }

  async initialize(): Promise<void> {
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: this.COLLECTION_NAME,
        metadata: { 
          description: 'Sophia AI memory storage',
          hnsw_space: 'cosine'
        }
      });
      console.log('Memory system initialized');
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      throw error;
    }
  }

  async store(content: string, type: MemoryType, metadata: Partial<Memory['metadata']> = {}): Promise<string> {
    if (!this.collection) throw new Error('Memory system not initialized');

    try {
      const embedding = await llmService.generateEmbedding(content);
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const memory: Memory = {
        id: memoryId,
        content,
        embedding,
        metadata: {
          timestamp: Date.now(),
          type,
          tags: [],
          importance: this.calculateImportance(content),
          ...metadata
        }
      };

      const chromaMetadata: Metadata = {
        timestamp: memory.metadata.timestamp,
        type: memory.metadata.type,
        emotion: memory.metadata.emotion || '',
        tags: JSON.stringify(memory.metadata.tags),
        importance: memory.metadata.importance,
        linkedMemories: memory.metadata.linkedMemories ? JSON.stringify(memory.metadata.linkedMemories) : ''
      };

      await this.collection.add({
        ids: [memoryId],
        embeddings: [embedding],
        metadatas: [chromaMetadata],
        documents: [content]
      });

      await this.linkRelatedMemories(memory);

      return memoryId;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<MemorySearchResult[]> {
    if (!this.collection) throw new Error('Memory system not initialized');

    try {
      const embedding = await llmService.generateEmbedding(query);
      const results = await this.collection.query({
        queryEmbeddings: [embedding],
        nResults: options.limit || 5,
        where: options.filter
      });

      return this.processSearchResults(results, options.minSimilarity);
    } catch (error) {
      console.error('Memory search failed:', error);
      throw error;
    }
  }

  private calculateImportance(content: string): number {
    // TODO: Implement importance calculation based on:
    // - Emotional content
    // - User preferences
    // - Key information markers
    // For now, return a default value
    return 0.5;
  }

  private async linkRelatedMemories(memory: Memory): Promise<void> {
    try {
      // Find semantically related memories
      const semanticLinks = await this.findSemanticLinks(memory);
      
      // Find temporally related memories (within 1 hour)
      const temporalLinks = await this.findTemporalLinks(memory);
      
      // Find emotionally related memories
      const emotionalLinks = await this.findEmotionalLinks(memory);
      
      // Find causal relationships
      const causalLinks = await this.findCausalLinks(memory);
      
      // Find referential links
      const referentialLinks = await this.findReferentialLinks(memory);

      // Combine all links
      const allLinks = [
        ...semanticLinks,
        ...temporalLinks,
        ...emotionalLinks,
        ...causalLinks,
        ...referentialLinks
      ];

      // Update memory with new links
      if (allLinks.length > 0) {
        await this.updateMemoryMetadata(memory.id, {
          linkedMemories: allLinks
        });

        // Create bidirectional links
        await this.createBidirectionalLinks(memory.id, allLinks);
      }
    } catch (error) {
      console.error('Failed to link related memories:', error);
      throw error;
    }
  }

  private async findSemanticLinks(memory: Memory): Promise<MemoryLink[]> {
    const results = await this.search(memory.content, {
      limit: 5,
      minSimilarity: 0.7,
      filter: { id: { $ne: memory.id } }
    });

    return results.map(result => ({
      targetId: result.memory.id,
      strength: result.similarity,
      type: MemoryLinkType.SEMANTIC,
      timestamp: Date.now()
    }));
  }

  private async findTemporalLinks(memory: Memory): Promise<MemoryLink[]> {
    const oneHour = 60 * 60 * 1000;
    const results = await this.search('', {
      limit: 3,
      timeframe: {
        start: memory.metadata.timestamp - oneHour,
        end: memory.metadata.timestamp + oneHour
      },
      filter: { id: { $ne: memory.id } }
    });

    return results.map(result => ({
      targetId: result.memory.id,
      strength: 0.8,
      type: MemoryLinkType.TEMPORAL,
      timestamp: Date.now()
    }));
  }

  private async findEmotionalLinks(memory: Memory): Promise<MemoryLink[]> {
    if (!memory.metadata.emotion) return [];

    const results = await this.search('', {
      limit: 3,
      filter: {
        emotion: memory.metadata.emotion,
        id: { $ne: memory.id }
      }
    });

    return results.map(result => ({
      targetId: result.memory.id,
      strength: 0.9,
      type: MemoryLinkType.EMOTIONAL,
      timestamp: Date.now()
    }));
  }

  private async findCausalLinks(memory: Memory): Promise<MemoryLink[]> {
    // Use LLM to analyze potential causal relationships
    const analysis = await llmService.generateResponse({
      content: memory.content,
      taskType: LLMTaskType.ANALYZE_CAUSAL
    });

    try {
      const relatedIds = JSON.parse(analysis.content);
      const results = await this.collection?.get({
        ids: relatedIds,
        where: {
          id: { $ne: memory.id }
        }
      });

      return (results?.ids || []).map(id => ({
        targetId: id,
        strength: 0.7, // Moderate strength for causal links
        type: MemoryLinkType.CAUSAL,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to parse causal links:', error);
      return [];
    }
  }

  private async findReferentialLinks(memory: Memory): Promise<MemoryLink[]> {
    // Extract potential references (names, IDs, etc.)
    const references = await llmService.generateResponse({
      content: memory.content,
      taskType: LLMTaskType.EXTRACT_REFERENCES
    });

    try {
      const referencedIds = JSON.parse(references.content);
      const results = await this.collection?.get({
        ids: referencedIds,
        where: {
          id: { $ne: memory.id }
        }
      });

      return (results?.ids || []).map(id => ({
        targetId: id,
        strength: 0.6, // Lower strength for referential links
        type: MemoryLinkType.REFERENTIAL,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to parse referential links:', error);
      return [];
    }
  }

  private async createBidirectionalLinks(sourceId: string, links: MemoryLink[]): Promise<void> {
    if (!this.collection) return;

    for (const link of links) {
      const targetMemory = await this.collection.get({
        ids: [link.targetId]
      });

      if (targetMemory?.metadatas?.[0]) {
        const existingLinks: MemoryLink[] = JSON.parse(targetMemory.metadatas[0].linkedMemories as string || '[]');
        const newLink: MemoryLink = {
          targetId: sourceId,
          strength: link.strength,
          type: link.type,
          timestamp: Date.now()
        };

        if (!existingLinks.some(l => l.targetId === sourceId)) {
          existingLinks.push(newLink);
          await this.collection.update({
            ids: [link.targetId],
            metadatas: [{
              ...targetMemory.metadatas[0],
              linkedMemories: JSON.stringify(existingLinks)
            }]
          });
        }
      }
    }
  }

  private processSearchResults(results: any, minSimilarity = 0.7): MemorySearchResult[] {
    if (!results?.ids?.length) return [];

    return results.ids.map((id: string, index: number) => {
      const content = results.documents?.[index] || '';
      const metadata = results.metadatas?.[index] || {};
      const embedding = results.embeddings?.[index] || [];

      if (!content || !metadata || !embedding) {
        return null;
      }

      return {
        memory: {
          id,
          content,
          embedding,
          metadata: {
            timestamp: metadata.timestamp,
            type: metadata.type,
            emotion: metadata.emotion,
            tags: JSON.parse(metadata.tags || '[]'),
            importance: metadata.importance,
            linkedMemories: metadata.linkedMemories ? JSON.parse(metadata.linkedMemories) : []
          }
        },
        similarity: results.distances?.[index] || 0
      };
    }).filter((result: MemorySearchResult | null): result is MemorySearchResult => 
      result !== null && result.similarity >= minSimilarity
    );
  }

  async updateMemoryMetadata(id: string, metadata: Partial<Memory['metadata']>): Promise<void> {
    if (!this.collection) throw new Error('Memory system not initialized');

    const memory = await this.collection.get({
      ids: [id]
    });

    if (!memory?.metadatas?.[0]) {
      throw new Error('Memory not found');
    }

    const updatedMetadata: Metadata = {
      ...memory.metadatas[0],
      ...metadata,
      tags: JSON.stringify(metadata.tags || []),
      linkedMemories: metadata.linkedMemories ? JSON.stringify(metadata.linkedMemories) : ''
    };

    await this.collection.update({
      ids: [id],
      metadatas: [updatedMetadata]
    });
  }

  private convertChromaMetadataToMemoryMetadata(metadata: Record<string, any>): Memory['metadata'] {
    return {
      timestamp: Number(metadata.timestamp),
      type: metadata.type as MemoryType,
      emotion: metadata.emotion || undefined,
      tags: JSON.parse(metadata.tags || '[]') as string[],
      importance: Number(metadata.importance),
      linkedMemories: metadata.linkedMemories ? JSON.parse(metadata.linkedMemories) as MemoryLink[] : undefined
    };
  }

  async getLinkedMemories(id: string, options: {
    types?: MemoryLinkType[];
    minStrength?: number;
    limit?: number;
  } = {}): Promise<Memory[]> {
    const memory = await this.collection?.get({
      ids: [id]
    });

    if (!memory?.ids?.[0] || !memory.metadatas?.[0]) return [];

    const linksStr = memory.metadatas[0].linkedMemories as string;
    const links: MemoryLink[] = linksStr ? JSON.parse(linksStr) : [];
    
    const filteredLinks = links.filter((link: MemoryLink) => {
      if (options.types && !options.types.includes(link.type)) return false;
      if (options.minStrength && link.strength < options.minStrength) return false;
      return true;
    });

    const sortedLinks = filteredLinks.sort((a: MemoryLink, b: MemoryLink) => b.strength - a.strength);
    const limitedLinks = options.limit ? sortedLinks.slice(0, options.limit) : sortedLinks;

    const results = await this.collection?.get({
      ids: limitedLinks.map((link: MemoryLink) => link.targetId)
    });

    if (!results?.ids?.length || !results.documents?.length || !results.embeddings?.length || !results.metadatas?.length) {
      return [];
    }

    const memories: Memory[] = [];
    for (let i = 0; i < results.ids.length; i++) {
      const metadata = results.metadatas[i];
      if (!metadata) continue;

      const memoryMetadata = this.convertChromaMetadataToMemoryMetadata(metadata);
      const embedding = results.embeddings[i];
      if (!embedding) continue;

      memories.push({
        id: results.ids[i],
        content: results.documents[i] || '',
        embedding,
        metadata: memoryMetadata
      });
    }

    return memories;
  }

  async pruneLinks(options: {
    olderThan?: number;
    minStrength?: number;
    types?: MemoryLinkType[];
  } = {}): Promise<void> {
    const memories = await this.collection?.get({});
    if (!memories?.ids?.length || !memories.metadatas?.length) return;

    for (let i = 0; i < memories.ids.length; i++) {
      const metadata = memories.metadatas[i];
      if (!metadata) continue;

      const linksStr = metadata.linkedMemories as string;
      const links: MemoryLink[] = linksStr ? JSON.parse(linksStr) : [];
      
      const prunedLinks = links.filter((link: MemoryLink) => {
        if (options.olderThan && link.timestamp < options.olderThan) return false;
        if (options.minStrength && link.strength < options.minStrength) return false;
        if (options.types && !options.types.includes(link.type)) return false;
        return true;
      });

      if (prunedLinks.length !== links.length) {
        await this.updateMemoryMetadata(memories.ids[i], {
          linkedMemories: prunedLinks
        });
      }
    }
  }

  private buildSearchFilter(options: {
    type?: MemoryType;
    timeframe?: { start: number; end: number };
  }): any {
    const filter: any = {};

    if (options.type) {
      filter.type = options.type;
    }

    if (options.timeframe) {
      filter.timestamp = {
        $gte: options.timeframe.start,
        $lte: options.timeframe.end
      };
    }

    return filter;
  }

  async prune(options: {
    olderThan?: number;
    importance?: number;
    type?: MemoryType;
  } = {}): Promise<void> {
    if (!this.collection) throw new Error('Memory system not initialized');

    try {
      const filter: any = {};
      
      if (options.olderThan) {
        filter.timestamp = { $lt: options.olderThan };
      }
      
      if (options.importance !== undefined) {
        filter.importance = { $lt: options.importance };
      }
      
      if (options.type) {
        filter.type = options.type;
      }

      const results = await this.collection.get({
        where: filter
      });

      if (results.ids.length > 0) {
        await this.collection.delete({
          ids: results.ids
        });
      }
    } catch (error) {
      console.error('Failed to prune memories:', error);
      throw error;
    }
  }
}
