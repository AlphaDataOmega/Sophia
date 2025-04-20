export interface WorkflowStep {
  id: string;
  toolName: string;
  input: {
    static: Record<string, any>;
    mappings: Record<string, {
      stepId: string;
      outputPath: string;
    }>;
  };
  condition?: {
    type: 'if' | 'switch';
    expression: string;
    branches: {
      case: string;
      nextStepId: string;
    }[];
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  metadata?: {
    author?: string;
    tags?: string[];
    lastRun?: number;
    runCount?: number;
  };
}

export interface WorkflowExecutionResult {
  success: boolean;
  stepResults: {
    [stepId: string]: {
      success: boolean;
      output: any;
      error?: string;
      executionTime: number;
    };
  };
  totalExecutionTime: number;
  error?: string;
}

export interface WorkflowProgress {
  executionId: string;
  workflowId: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed';
  completedSteps: number;
  totalSteps: number;
  currentStep: string | null;
  stepStatuses: Map<string, {
    status: 'pending' | 'running' | 'completed' | 'failed';
    retries?: number;
    error?: string;
  }>;
  dataFlow: {
    from: string;
    to: string;
    path: string;
    targetParam: string;
  }[];
  error?: string;
}

export interface WorkflowSuggestion {
  name: string;
  description: string;
  steps: {
    toolName: string;
    description: string;
    input: Record<string, any>;
  }[];
  confidence: number;
  reasoning: string;
}

export interface WorkflowSuggestionRequest {
  description: string;
  availableTools: string[];
  context?: {
    previousWorkflows?: string[];
    currentWorkflow?: string;
  };
}

export interface WorkflowSuggestionResponse {
  suggestions: WorkflowSuggestion[];
  reasoning: string;
} 