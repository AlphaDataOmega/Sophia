export interface ToolDependency {
  name: string;
  version: string;
  type: 'npm' | 'pip' | 'system';
  optional?: boolean;
}

export interface ToolVersion {
  version: string;
  code: string;
  createdAt: number;
  author?: string;
  changelog?: string;
  dependencies: ToolDependency[];
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

export interface ToolValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
} 