export interface ToolDependency {
  name: string;
  version: string;
  type: 'npm' | 'tool' | 'system';
  optional?: boolean;
}

export interface ToolVersion {
  version: string;
  code: string;
  inputSchema: object;
  outputSchema: object;
  dependencies: ToolDependency[];
  changelog?: string;
  createdAt: number;
  author?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  metadata?: {
    icon?: string;
    color?: string;
    sortOrder?: number;
  };
}

export interface ToolMetrics {
  executionCount: number;
  averageExecutionTime: number;
  errorRate: number;
  lastExecuted: number;
  successfulExecutions: number;
  failedExecutions: number;
  popularInputPatterns: Array<{
    pattern: any;
    count: number;
  }>;
  lastErrors: Array<{
    error: string;
    timestamp: number;
  }>;
}

export interface ToolMetadata {
  name: string;
  description: string;
  author?: string;
  tags?: string[];
  lastUsed?: number;
  useCount?: number;
  category?: string;
  metrics?: ToolMetrics;
  schema: string;
}

export interface Tool {
  name: string;
  description: string;
  currentVersion: string;
  versions: Record<string, ToolVersion>;
  categoryId?: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  code: string;
  metadata?: {
    author?: string;
    tags?: string[];
    lastUsed?: number;
    useCount?: number;
    category?: string;
    metrics?: ToolMetrics;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  executionTime: number;
  error?: string;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface InstallationResult {
  success: boolean;
  installed: string[];
  failed: Array<{ name: string; error: string }>;
}
