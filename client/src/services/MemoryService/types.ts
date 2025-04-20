export enum MemoryType {
  CONVERSATION = 'conversation',
  TOOL_USAGE = 'tool_usage',
  EMOTIONAL = 'emotional',
  FACTUAL = 'factual',
  USER_PREFERENCE = 'user_preference'
}

export interface Memory {
  id: string;
  content: string;
  metadata: {
    timestamp: number;
    type: MemoryType;
    emotion?: string;
    tags: string[];
    importance: number;
    linkedMemories?: MemoryLink[];
  };
}

export interface MemoryLink {
  targetId: string;
  strength: number;
  type: MemoryLinkType;
  timestamp: number;
}

export enum MemoryLinkType {
  SEMANTIC = 'semantic',
  TEMPORAL = 'temporal',
  EMOTIONAL = 'emotional',
  CAUSAL = 'causal',
  REFERENTIAL = 'referential'
}

export interface MemorySearchResult {
  memory: Memory;
  similarity: number;
}

export interface SearchOptions {
  type?: MemoryType;
  limit?: number;
  minSimilarity?: number;
  timeframe?: { start: number; end: number };
  filter?: Record<string, any>;
}
