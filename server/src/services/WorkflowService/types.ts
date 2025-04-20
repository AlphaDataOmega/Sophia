export interface WorkflowStep {
  id: string;
  toolName: string;
  input: {
    static?: any;
    mappings?: {
      [key: string]: {
        stepId: string;
        outputPath: string;
      };
    };
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
    version?: string;
    tags?: string[];
    lastRun?: number;
    runCount?: number;
  };
}

export type StepExecutionStatus = {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  retries?: number;
  error?: string;
};

export interface WorkflowProgress {
  executionId: string;
  workflowId: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed';
  completedSteps: number;
  totalSteps: number;
  currentStep: string | null;
  stepStatuses: Map<string, StepExecutionStatus>;
  dataFlow: DataFlowEdge[];
  error?: string;
}

export interface DataFlowEdge {
  from: string;
  to: string;
  path: string;
  targetParam: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  stepResults: {
    [stepId: string]: {
      success: boolean;
      output: any;
      error?: string;
      executionTime: number;
      attempt?: number;
    };
  };
  totalExecutionTime: number;
  error?: string;
  dataFlow: DataFlowEdge[];
  executionId: string;
}
