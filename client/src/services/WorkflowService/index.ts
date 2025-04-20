import { Workflow, WorkflowExecutionResult, WorkflowSuggestionRequest, WorkflowSuggestionResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class WorkflowService {
  async listWorkflows(): Promise<Workflow[]> {
    const response = await fetch(`${API_URL}/api/workflows`);
    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }
    return response.json();
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await fetch(`${API_URL}/api/workflows/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch workflow');
    }
    return response.json();
  }

  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    const response = await fetch(`${API_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
    if (!response.ok) {
      throw new Error('Failed to save workflow');
    }
    return response.json();
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await fetch(`${API_URL}/api/workflows/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
    if (!response.ok) {
      throw new Error('Failed to update workflow');
    }
    return response.json();
  }

  async deleteWorkflow(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/workflows/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
  }

  async executeWorkflow(id: string, input?: any): Promise<WorkflowExecutionResult> {
    const response = await fetch(`${API_URL}/api/workflows/${id}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });
    if (!response.ok) {
      throw new Error('Failed to execute workflow');
    }
    return response.json();
  }

  async getWorkflowProgress(executionId: string): Promise<WorkflowExecutionResult> {
    const response = await fetch(`${API_URL}/api/workflows/executions/${executionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch workflow progress');
    }
    return response.json();
  }

  async getWorkflowSuggestions(request: WorkflowSuggestionRequest): Promise<WorkflowSuggestionResponse> {
    const response = await fetch(`${API_URL}/api/workflows/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error('Failed to get workflow suggestions');
    }
    return response.json();
  }
}

export const workflowService = new WorkflowService();