export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  versions: {
    [version: string]: {
      code: string;
      changelog: string;
      dependencies: Dependency[];
      createdAt: number;
    };
  };
  currentVersion: string;
  metadata?: {
    author?: string;
    tags?: string[];
    lastRun?: number;
    runCount?: number;
  };
}

export interface Dependency {
  name: string;
  version: string;
  type: 'npm' | 'pip' | 'system';
  optional: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
} 