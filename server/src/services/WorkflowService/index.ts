import { Injectable } from '@nestjs/common';
import { 
  Workflow, 
  WorkflowStep, 
  WorkflowExecutionResult,
  WorkflowProgress,
  StepExecutionStatus,
  DataFlowEdge
} from './types';
import { ToolRegistry } from '../ToolService/ToolRegistry';
import { EventEmitter } from 'events';

@Injectable()
export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowProgress> = new Map();
  private executionCache: Map<string, WorkflowProgress> = new Map();
  private readonly maxRetries = 3;

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly workspacePath: string
  ) {
    super();
  }

  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    if (!workflow.id) {
      workflow.id = `workflow-${Date.now()}`;
    }
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, update: Partial<Workflow>): Promise<Workflow> {
    const existing = await this.getWorkflow(id);
    if (!existing) {
      throw new Error('Workflow not found');
    }

    const updated = {
      ...existing,
      ...update,
      id, // Ensure ID doesn't change
    };

    this.workflows.set(id, updated);
    return updated;
  }

  async deleteWorkflow(id: string): Promise<void> {
    this.workflows.delete(id);
  }

  async executeWorkflow(id: string, input?: any): Promise<WorkflowExecutionResult> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const executionId = `exec-${Date.now()}`;
    const progress: WorkflowProgress = {
      executionId,
      workflowId: id,
      startTime: Date.now(),
      status: 'running',
      completedSteps: 0,
      totalSteps: workflow.steps.length,
      currentStep: workflow.steps[0]?.id || null,
      stepStatuses: new Map(),
      dataFlow: [],
    };

    this.executions.set(executionId, progress);

    // TODO: Implement actual workflow execution logic
    // For now, just simulate execution
    const result: WorkflowExecutionResult = {
      success: true,
      stepResults: {},
      totalExecutionTime: 0,
    };

    for (const step of workflow.steps) {
      const startTime = Date.now();
      
      try {
        // TODO: Replace with actual tool execution
        result.stepResults[step.id] = {
          success: true,
          output: { message: `Simulated execution of ${step.toolName}` },
          executionTime: Date.now() - startTime,
        };

        progress.completedSteps++;
        progress.stepStatuses.set(step.id, { status: 'completed' });
      } catch (error) {
        result.stepResults[step.id] = {
          success: false,
          output: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime,
        };
        
        progress.status = 'failed';
        progress.error = error instanceof Error ? error.message : 'Unknown error';
        progress.stepStatuses.set(step.id, { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        break;
      }
    }

    if (progress.status !== 'failed') {
      progress.status = 'completed';
    }

    result.totalExecutionTime = Date.now() - progress.startTime;
    this.executions.set(executionId, progress);

    return result;
  }

  async getWorkflowProgress(executionId: string): Promise<WorkflowProgress> {
    const progress = this.executions.get(executionId);
    if (!progress) {
      throw new Error('Execution not found');
    }
    return progress;
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    input: any,
    maxRetries: number
  ): Promise<WorkflowExecutionResult['stepResults'][string]> {
    let lastError: Error | null = null;
    const stepStartTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.toolRegistry.executeTool(step.toolName, input);
        return {
          success: true,
          output: result.output,
          executionTime: Date.now() - stepStartTime,
          attempt: attempt + 1
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }
      }
    }

    throw lastError;
  }

  private async shouldExecuteStep(
    step: WorkflowStep,
    context: Map<string, any>
  ): Promise<boolean> {
    if (!step.condition) return true;

    const { type, expression, branches } = step.condition;
    
    try {
      // Create a safe evaluation context
      const evalContext = {
        ...Object.fromEntries(context),
        // Add helper functions
        isNull: (v: any) => v === null,
        isUndefined: (v: any) => v === undefined,
        isError: (v: any) => v instanceof Error,
        get: (obj: any, path: string) => path.split('.').reduce((o, p) => o?.[p], obj),
        // Add more helpers as needed
      };

      const result = new Function(...Object.keys(evalContext), `return ${expression}`)
        (...Object.values(evalContext));

      if (type === 'if') {
        return Boolean(result);
      } else if (type === 'switch') {
        return branches.some(b => b.case === result);
      }
    } catch (error) {
      this.emit('conditionError', {
        step: step.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        expression
      });
      return false;
    }

    return true;
  }

  private async resolveStepInput(
    step: WorkflowStep,
    context: Map<string, any>
  ): Promise<any> {
    const input = { ...step.input.static };

    if (step.input.mappings) {
      for (const [key, mapping] of Object.entries(step.input.mappings)) {
        const sourceOutput = context.get(mapping.stepId);
        if (sourceOutput === undefined) {
          throw new Error(
            `Cannot resolve mapping: Step '${mapping.stepId}' output not found`
          );
        }

        try {
          // Resolve nested path with error handling
          const value = mapping.outputPath.split('.').reduce((obj, path) => {
            if (obj === undefined) {
              throw new Error(
                `Invalid path '${mapping.outputPath}' at '${path}'`
              );
            }
            return obj[path];
          }, sourceOutput);

          input[key] = value;
        } catch (error) {
          throw new Error(
            `Failed to resolve mapping '${key}' from step '${mapping.stepId}': ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }

    return input;
  }

  private emitProgress(progress: WorkflowProgress): void {
    this.emit('progress', progress);
    this.executionCache.set(progress.executionId, { ...progress });
  }

  getProgress(executionId: string): WorkflowProgress | null {
    return this.executionCache.get(executionId) || null;
  }

  clearProgress(executionId: string): void {
    this.executionCache.delete(executionId);
  }
}
