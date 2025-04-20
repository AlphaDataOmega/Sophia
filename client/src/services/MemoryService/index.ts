import { Memory, MemoryType, MemorySearchResult, SearchOptions } from './types';
import { LLMService } from '../LLMService.ts';

class ChromaMemoryProvider {
  private static instance: ChromaMemoryProvider | null = null;
  private baseUrl: string;
  private llmService: LLMService;

  private constructor(llmService: LLMService) {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.llmService = llmService;
  }

  public static getInstance(llmService: LLMService): ChromaMemoryProvider {
    if (!ChromaMemoryProvider.instance) {
      ChromaMemoryProvider.instance = new ChromaMemoryProvider(llmService);
    }
    return ChromaMemoryProvider.instance;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/initialize`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<MemorySearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, options }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Memory search failed:', error);
      throw error;
    }
  }

  async store(content: string, type: MemoryType, metadata: Partial<Memory['metadata']> = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, type, metadata }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { id } = await response.json();
      return id;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  async getLinkedMemories(id: string, options: {
    types?: string[];
    minStrength?: number;
    limit?: number;
  } = {}): Promise<Memory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/${id}/linked`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get linked memories:', error);
      throw error;
    }
  }
}

export { ChromaMemoryProvider, MemoryType };
