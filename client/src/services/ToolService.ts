import { EventEmitter } from '../utils/EventEmitter';
import { Tool, ToolCategory, ToolMetrics, ToolValidationResult, ToolVersion, ToolDependency } from './types';

export interface Tool {
  name: string;
  description: string;
  code: string;
  inputSchema: any;
  outputSchema: any;
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
    lastUsed?: number;
    useCount?: number;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  executionTime: number;
  error?: string;
}

export interface InstallationResult {
  success: boolean;
  installed: {
    name: string;
    version: string;
    type: string;
  }[];
  failed: {
    name: string;
    version: string;
    type: string;
    error: string;
  }[];
  logs: string[];
}

export interface ToolVersion {
  version: string;
  code: string;
  createdAt: number;
  author?: string;
  changelog?: string;
  dependencies: ToolDependency[];
}

export interface ToolDependency {
  name: string;
  version: string;
  type: 'npm' | 'pip' | 'system';
  optional?: boolean;
}

export interface ToolSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  dateRange?: {
    start: number;
    end: number;
  };
}

export interface ToolValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export class ToolService extends EventEmitter {
  private static instance: ToolService | null = null;
  private baseUrl: string;
  private tools: Map<string, Tool> = new Map();
  private metrics: Map<string, ToolMetrics> = new Map();

  private constructor() {
    super();
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  async listTools(): Promise<Tool[]> {
    const response = await fetch(`${this.baseUrl}/api/tools`);
    if (!response.ok) {
      throw new Error('Failed to fetch tools');
    }
    return response.json();
  }

  async getTool(name: string): Promise<Tool> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tool');
    }
    return response.json();
  }

  async createTool(tool: Omit<Tool, 'metadata'>): Promise<Tool> {
    const response = await fetch(`${this.baseUrl}/api/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create tool: ${error}`);
    }
    
    return response.json();
  }

  async updateTool(name: string, updates: Partial<Tool>): Promise<Tool> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update tool: ${error}`);
    }
    
    return response.json();
  }

  async deleteTool(name: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete tool: ${error}`);
    }
  }

  async executeTool(name: string, input: any): Promise<ToolExecutionResult> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute tool: ${error}`);
    }
    
    return response.json();
  }

  async suggestTool(description: string): Promise<Tool> {
    const response = await fetch(`${this.baseUrl}/api/tools/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to suggest tool: ${error}`);
    }
    
    return response.json();
  }

  async validateInput(name: string, input: any): Promise<{ isValid: boolean; errors?: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}/validate-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to validate input: ${error}`);
    }
    
    return response.json();
  }

  async getToolStats(): Promise<{
    total: number;
    recentlyUsed: Tool[];
    mostUsed: Tool[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/tools/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch tool stats');
    }
    return response.json();
  }

  async execute(
    toolName: string,
    input: any,
    options: { version?: string; autoInstall?: boolean } = {}
  ): Promise<ToolExecutionResult> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input,
        version: options.version,
        autoInstall: options.autoInstall
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute tool');
    }

    return response.json();
  }

  async validateOutput(toolName: string, output: any): Promise<ToolValidationResult> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/validate-output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to validate output: ${error}`);
    }
    
    return response.json();
  }

  async getCategories(): Promise<ToolCategory[]> {
    const response = await fetch(`${this.baseUrl}/api/tools/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  }

  async getCategoryHierarchy(): Promise<ToolCategory[]> {
    const response = await fetch(`${this.baseUrl}/api/tools/categories/hierarchy`);
    if (!response.ok) throw new Error('Failed to fetch category hierarchy');
    return response.json();
  }

  async addCategory(category: Omit<ToolCategory, 'id'>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (!response.ok) throw new Error('Failed to add category');
  }

  async updateCategory(id: string, updates: Partial<ToolCategory>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update category');
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/categories/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete category');
  }

  async getToolMetrics(name: string): Promise<ToolMetrics> {
    const response = await fetch(`${this.baseUrl}/api/tools/${name}/metrics`);
    if (!response.ok) throw new Error('Failed to fetch tool metrics');
    return response.json();
  }

  async getLogs(toolName: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/logs`);
    if (!response.ok) {
      throw new Error('Failed to fetch tool logs');
    }
    return response.json();
  }

  async listVersions(toolName: string): Promise<{ version: string; createdAt: number }[]> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/versions`);
    if (!response.ok) throw new Error('Failed to fetch versions');
    return response.json();
  }

  async getVersion(toolName: string, version: string): Promise<ToolVersion> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/versions/${version}`);
    if (!response.ok) throw new Error('Failed to fetch version');
    return response.json();
  }

  async createVersion(toolName: string, version: ToolVersion): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(version)
    });
    if (!response.ok) throw new Error('Failed to create version');
  }

  async searchTools(options: ToolSearchOptions): Promise<Tool[]> {
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.category) params.set('category', options.category);
    if (options.tags) params.set('tags', options.tags.join(','));
    if (options.author) params.set('author', options.author);
    if (options.dateRange) {
      params.set('startDate', options.dateRange.start.toString());
      params.set('endDate', options.dateRange.end.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/tools/search?${params}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  }

  async resolveDependencies(toolName: string, version?: string): Promise<ToolDependency[]> {
    const response = await fetch(
      `${this.baseUrl}/api/tools/${toolName}/dependencies${version ? `?version=${version}` : ''}`
    );
    if (!response.ok) throw new Error('Failed to resolve dependencies');
    return response.json();
  }

  async installDependencies(toolName: string, dependencies: ToolDependency[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependencies })
    });
    if (!response.ok) throw new Error('Failed to install dependencies');
  }

  async getToolAnalytics(toolName: string, timeRange?: { start: number; end: number }): Promise<{
    executionStats: {
      total: number;
      success: number;
      failed: number;
      averageTime: number;
    };
    usageByVersion: Record<string, number>;
    popularInputPatterns: { pattern: any; count: number }[];
    errorTypes: { type: string; count: number }[];
  }> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.set('startDate', timeRange.start.toString());
      params.set('endDate', timeRange.end.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/tools/${toolName}/analytics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  }

  async validateDependency(dependency: ToolDependency): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tools/validate-dependency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dependency)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate dependency');
    }
  }
}

export const toolService = ToolService.getInstance();
