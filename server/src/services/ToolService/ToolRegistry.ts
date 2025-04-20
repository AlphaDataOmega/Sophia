import { Tool, ToolExecutionResult, ToolValidationResult, ToolMetadata, ToolVersion, ToolDependency, ToolCategory, ToolMetrics, InstallationResult } from './types';
import { ToolRunner } from './ToolRunner';
import { ChromaClient, Collection } from 'chromadb';
import { LLMService } from '../LLMService/LLMService';
import { LLMTaskType } from '../LLMService/types';
import { SchemaValidator } from './SchemaValidator';
import { EventEmitter } from 'events';
import { DependencyInstaller } from './DependencyInstaller';

// Create a type for metadata values that properly includes arrays
type MetadataValuePrimitive = string | number | boolean;
type MetadataValue = MetadataValuePrimitive | string[] | ToolMetrics | undefined;

// Create a type for the standard metadata fields
interface StandardMetadata {
  schema: string;
  lastModified: number;
  author?: string;
  tags?: string[];
  lastUsed?: number;
  useCount?: number;
  category?: string;
  metrics?: ToolMetrics;
}

// Create the final Metadata type that allows additional string keys
interface Metadata extends StandardMetadata {
  [key: string]: MetadataValue;
}

// Create a type for tool execution results
interface ExtendedToolExecutionResult extends ToolExecutionResult {
  warnings?: string[];
  suggestions?: string[];
}

// Create a type for ChromaDB compatible metadata
type ChromaMetadata = {
  [key: string]: string | number | boolean;
  name: string;
  description: string;
  schema: string;
  author: string;
  tags: string;
  lastUsed: number;
  useCount: number;
  category: string;
  metrics: string;
};

// Helper function to validate semantic version strings
const isValidVersion = (version: string): boolean => {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+)?$/.test(version);
};

// Helper function to convert ToolMetadata to ChromaDB compatible format
const toChromaMetadata = (metadata: ToolMetadata): ChromaMetadata => ({
  name: metadata.name,
  description: metadata.description,
  schema: metadata.schema,
  author: metadata.author || '',
  tags: JSON.stringify(metadata.tags || []),
  lastUsed: metadata.lastUsed || 0,
  useCount: metadata.useCount || 0,
  category: metadata.category || '',
  metrics: JSON.stringify(metadata.metrics || {
    executionCount: 0,
    averageExecutionTime: 0,
    errorRate: 0,
    lastExecuted: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    popularInputPatterns: [],
    lastErrors: []
  })
});

export class ToolRegistry extends EventEmitter {
  private collection: Collection | null = null;
  private toolRunner: ToolRunner;
  private llmService: LLMService;
  private schemaValidator: SchemaValidator;
  private toolCache: Map<string, Tool> = new Map();
  private dependencyInstaller: DependencyInstaller;
  private categories: Map<string, ToolCategory> = new Map();
  private metrics: Map<string, ToolMetrics> = new Map();

  constructor(llmService: LLMService, private readonly workspacePath: string) {
    super();
    this.toolRunner = new ToolRunner();
    this.llmService = llmService;
    this.schemaValidator = new SchemaValidator();
    this.dependencyInstaller = new DependencyInstaller(workspacePath, this);
  }

  async initialize(): Promise<void> {
    const client = new ChromaClient();
    this.collection = await client.getOrCreateCollection({
      name: 'tool_registry',
      metadata: { description: 'Sophia AI Tool Registry' }
    });

    // Load existing tools into cache
    await this.loadToolsIntoCache();
  }

  private async loadToolsIntoCache(): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
    const results = await this.collection.get();
    results.documents.forEach((doc) => {
      if (doc === null) return;
      const tool = JSON.parse(doc) as Tool;
      this.toolCache.set(tool.name, {
        ...tool,
        metadata: {
          ...tool.metadata,
          lastUsed: 0,
          useCount: 0
        }
      });
    });
  }

  async addTool(tool: Tool): Promise<void> {
    // Validate tool
    const validation = await this.validateTool(tool);
    if (!validation.isValid) {
      throw new Error(`Invalid tool: ${validation.errors?.join(', ')}`);
    }

    // Check for existing tool
    if (this.toolCache.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' already exists`);
    }

    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    // Generate tool embedding for semantic search
    const embedding = await this.llmService.generateEmbedding(
      `${tool.name}\n${tool.description}\n${Object.keys(tool.inputSchema.properties || {}).join(' ')}`
    );

    // Add to ChromaDB
    await this.collection.add({
      ids: [tool.name],
      embeddings: [embedding],
      metadatas: [toChromaMetadata({
        name: tool.name,
        description: tool.description,
        schema: JSON.stringify(tool.inputSchema),
        ...tool.metadata
      })],
      documents: [JSON.stringify(tool)]
    });

    // Add to cache
    this.toolCache.set(tool.name, {
      ...tool,
      metadata: {
        ...tool.metadata,
        lastUsed: Date.now(),
        useCount: 0
      }
    });

    this.emit('toolAdded', tool.name);
  }

  async updateTool(name: string, updates: Partial<Tool>): Promise<void> {
    const existingTool = this.toolCache.get(name);
    if (!existingTool) {
      throw new Error(`Tool '${name}' not found`);
    }

    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    const updatedTool = {
      ...existingTool,
      ...updates,
      name, // Prevent name changes
      metadata: {
        ...existingTool.metadata,
        ...updates.metadata,
        lastModified: Date.now()
      }
    };

    // Validate updated tool
    const validation = await this.validateTool(updatedTool);
    if (!validation.isValid) {
      throw new Error(`Invalid tool update: ${validation.errors?.join(', ')}`);
    }

    // Update in ChromaDB
    const embedding = await this.llmService.generateEmbedding(
      `${updatedTool.name}\n${updatedTool.description}`
    );
    await this.collection.update({
      ids: [name],
      embeddings: [embedding],
      metadatas: [toChromaMetadata({
        name: updatedTool.name,
        description: updatedTool.description,
        schema: JSON.stringify(updatedTool.inputSchema),
        ...updatedTool.metadata
      })],
      documents: [JSON.stringify(updatedTool)]
    });

    // Update cache
    this.toolCache.set(name, updatedTool);
    this.emit('toolUpdated', name);
  }

  async deleteTool(name: string): Promise<void> {
    if (!this.toolCache.has(name)) {
      throw new Error(`Tool '${name}' not found`);
    }

    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    // Remove from ChromaDB
    await this.collection.delete({ ids: [name] });

    // Remove from cache
    this.toolCache.delete(name);
    this.emit('toolDeleted', name);
  }

  async findTool(query: string): Promise<Tool[]> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    const embedding = await this.llmService.generateEmbedding(query);
    const results = await this.collection.query({
      queryEmbeddings: [embedding],
      nResults: 5
    });

    return (results.documents[0] || [])
      .filter((doc): doc is string => doc !== null)
      .map(doc => JSON.parse(doc) as Tool)
      .filter(tool => tool !== null);
  }

  async executeTool(name: string, input: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.toolCache.get(name);
    
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    try {
      // Validate input
      const inputValidation = await this.validateInput(input, tool.inputSchema);
      if (!inputValidation.isValid) {
        throw new Error(`Invalid input: ${inputValidation.errors?.join(', ')}`);
      }

      // Execute in VM
      const { result, logs } = await this.toolRunner.execute(tool.code, input);

      // Validate output
      const outputValidation = await this.validateOutput(result, tool.outputSchema);
      if (!outputValidation.isValid) {
        throw new Error(`Invalid output: ${outputValidation.errors?.join(', ')}`);
      }

      const executionResult: ToolExecutionResult = {
        success: true,
        output: result,
        logs,
        executionTime: Date.now() - startTime
      };

      // Update metrics
      await this.updateMetrics(name, executionResult);

      this.emit('toolExecuted', {
        name,
        result: executionResult,
        timestamp: Date.now()
      });

      return executionResult;

    } catch (error) {
      if (error instanceof Error) {
        return this.handleFailedExecution(name, error, startTime);
      } else {
        return this.handleFailedExecution(name, new Error('Unknown error occurred'), startTime);
      }
    }
  }

  private async handleFailedExecution(name: string, error: Error | string, startTime: number): Promise<ToolExecutionResult> {
    const failedResult: ToolExecutionResult = {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : error,
      logs: [],
      executionTime: Date.now() - startTime
    };

    // Update metrics for failed execution
    await this.updateMetrics(name, failedResult);

    this.emit('toolExecutionFailed', {
      name,
      error: failedResult.error,
      timestamp: Date.now()
    });

    return failedResult;
  }

  private async updateToolStats(name: string): Promise<void> {
    const tool = this.toolCache.get(name);
    if (tool) {
      const metadata = tool.metadata || {};
      tool.metadata = {
        ...metadata,
        lastUsed: Date.now(),
        useCount: (metadata.useCount || 0) + 1
      };
      await this.updateTool(name, tool);
    }
  }

  async listTools(): Promise<ToolMetadata[]> {
    return Array.from(this.toolCache.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      author: tool.metadata?.author,
      tags: tool.metadata?.tags,
      lastUsed: tool.metadata?.lastUsed,
      useCount: tool.metadata?.useCount,
      category: tool.metadata?.category,
      metrics: tool.metadata?.metrics,
      schema: JSON.stringify(tool.inputSchema)
    }));
  }

  async getToolStats(): Promise<{
    total: number;
    recentlyUsed: Tool[];
    mostUsed: Tool[];
  }> {
    const tools = Array.from(this.toolCache.values());
    return {
      total: tools.length,
      recentlyUsed: tools
        .sort((a, b) => ((b.metadata?.lastUsed || 0) - (a.metadata?.lastUsed || 0)))
        .slice(0, 5),
      mostUsed: tools
        .sort((a, b) => ((b.metadata?.useCount || 0) - (a.metadata?.useCount || 0)))
        .slice(0, 5)
    };
  }

  private async validateTool(tool: Tool): Promise<ToolValidationResult> {
    const errors: string[] = [];

    if (!tool.name) {
      errors.push('Tool name is required');
    }

    const currentVersion = tool.currentVersion;
    if (!currentVersion || !isValidVersion(currentVersion)) {
      errors.push('Invalid version format');
    }

    if (!tool.code) {
      errors.push('Tool code is required');
    }

    if (!tool.inputSchema || !tool.outputSchema) {
      errors.push('Input and output schemas are required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private validateSchema(schema: NonNullable<Tool['inputSchema'] | Tool['outputSchema']>, data: unknown): boolean {
    if (!schema || !data || typeof data !== 'object' || data === null) return false;
    
    // Check if all required fields are present
    if (schema.required) {
      for (const field of schema.required) {
        if ((data as Record<string, unknown>)[field] === undefined) return false;
      }
    }

    // Check if all properties match the schema
    for (const [key, value] of Object.entries(data)) {
      const propertySchema = schema.properties?.[key];
      if (!propertySchema) return false;
      
      // Basic type checking
      if (propertySchema.type && typeof value !== propertySchema.type) {
        return false;
      }
    }

    return true;
  }

  private async validateInput(input: unknown, schema: Tool['inputSchema']): Promise<ToolValidationResult> {
    const isValid = schema ? this.validateSchema(schema, input) : false;
    return {
      isValid,
      errors: isValid ? undefined : ['Input validation failed']
    };
  }

  private async validateOutput(output: unknown, schema: Tool['outputSchema']): Promise<ToolValidationResult> {
    const isValid = schema ? this.validateSchema(schema, output) : false;
    return {
      isValid,
      errors: isValid ? undefined : ['Output validation failed']
    };
  }

  private async updateMetadata(toolId: string, metadata: Partial<ToolMetadata>): Promise<void> {
    const tool = this.toolCache.get(toolId);
    if (!tool || !this.collection) return;

    const currentMetadata = tool.metadata || {};
    const updatedMetadata: ToolMetadata = {
      name: tool.name,
      description: tool.description,
      schema: JSON.stringify(tool.inputSchema || {}),
      author: metadata.author || currentMetadata.author || '',
      tags: metadata.tags || currentMetadata.tags || [],
      lastUsed: metadata.lastUsed || currentMetadata.lastUsed || Date.now(),
      useCount: metadata.useCount || currentMetadata.useCount || 0,
      category: metadata.category || currentMetadata.category || '',
      metrics: metadata.metrics || currentMetadata.metrics || {
        executionCount: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        lastExecuted: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        popularInputPatterns: [],
        lastErrors: []
      }
    };

    const embedding = await this.llmService.generateEmbedding(
      `${tool.name}\n${tool.description}`
    );
    await this.collection.update({
      ids: [toolId],
      embeddings: [embedding],
      metadatas: [toChromaMetadata(updatedMetadata)],
      documents: [JSON.stringify(tool)]
    });
  }

  private generateTestInput(schema: any): any {
    const input: any = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      const propSchema = value as { type: string };
      switch (propSchema.type) {
        case 'string':
          input[key] = 'test';
          break;
        case 'number':
          input[key] = 1;
          break;
        case 'boolean':
          input[key] = true;
          break;
        case 'array':
          input[key] = [];
          break;
        case 'object':
          input[key] = {};
          break;
      }
    }
    return input;
  }

  private parseToolDefinition(content: string): Tool {
    // Extract tool definition from LLM response
    try {
      const toolMatch = content.match(/```typescript\n([\s\S]*?)\n```/);
      if (!toolMatch) {
        throw new Error('No tool definition found in content');
      }
      
      const toolDefinition = toolMatch[1];
      // Parse and validate the tool definition
      // This is a placeholder - implement proper parsing logic
      return JSON.parse(toolDefinition) as Tool;
    } catch (error) {
      throw new Error(`Failed to parse tool definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateMetrics(name: string, result: ToolExecutionResult): Promise<void> {
    const tool = this.toolCache.get(name);
    if (!tool) return;

    const metrics: ToolMetrics = {
      executionCount: 1,
      averageExecutionTime: result.executionTime,
      errorRate: result.error ? 1 : 0,
      lastExecuted: Date.now(),
      successfulExecutions: result.error ? 0 : 1,
      failedExecutions: result.error ? 1 : 0,
      popularInputPatterns: [],
      lastErrors: result.error ? [{ error: result.error, timestamp: Date.now() }] : []
    };

    await this.updateMetadata(name, { metrics });
  }
}