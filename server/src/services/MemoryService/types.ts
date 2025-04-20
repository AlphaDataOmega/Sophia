export interface Memory {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    timestamp: number;
    type: MemoryType;
    emotion?: string;
    tags: string[];
    importance: number;  // 0-1 scale
    linkedMemories?: MemoryLink[]; // Enhanced memory links
  };
}

export interface MemoryLink {
  targetId: string;
  strength: number; // 0-1 scale indicating link strength
  type: MemoryLinkType;
  timestamp: number;
}

export enum MemoryLinkType {
  SEMANTIC = 'semantic', // Similar content/meaning
  TEMPORAL = 'temporal', // Related in time
  EMOTIONAL = 'emotional', // Related by emotion
  CAUSAL = 'causal', // Cause-effect relationship
  REFERENTIAL = 'referential' // Direct reference
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  TOOL_USAGE = 'tool_usage',
  EMOTIONAL = 'emotional',
  FACTUAL = 'factual',
  USER_PREFERENCE = 'user_preference'
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

export interface ChromaMetadata {
  timestamp: number;
  type: MemoryType;
  emotion?: string;
  tags: string;
  importance: number;
  linkedMemories?: string;
}
