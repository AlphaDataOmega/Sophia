import { Request, Response } from 'express';
import { WorkflowService } from '../services/WorkflowService';
import { LLMWorkflowService } from '../services/WorkflowService/LLMWorkflowService';
import { WorkflowSuggestionRequest } from '../services/WorkflowService/types';

export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly llmWorkflowService: LLMWorkflowService,
  ) {}

  async listWorkflows(req: Request, res: Response) {
    try {
      const workflows = await this.workflowService.listWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error('Error listing workflows:', error);
      res.status(500).json({ error: 'Failed to list workflows' });
    }
  }

  async getWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      res.json(workflow);
    } catch (error) {
      console.error('Error getting workflow:', error);
      res.status(500).json({ error: 'Failed to get workflow' });
    }
  }

  async createWorkflow(req: Request, res: Response) {
    try {
      const workflow = await this.workflowService.saveWorkflow(req.body);
      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }

  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.updateWorkflow(id, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }

  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.workflowService.deleteWorkflow(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  async executeWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { input } = req.body;
      const result = await this.workflowService.executeWorkflow(id, input);
      res.json(result);
    } catch (error) {
      console.error('Error executing workflow:', error);
      res.status(500).json({ error: 'Failed to execute workflow' });
    }
  }

  async getWorkflowProgress(req: Request, res: Response) {
    try {
      const { executionId } = req.params;
      const progress = await this.workflowService.getWorkflowProgress(executionId);
      res.json(progress);
    } catch (error) {
      console.error('Error getting workflow progress:', error);
      res.status(500).json({ error: 'Failed to get workflow progress' });
    }
  }

  async getSuggestions(req: Request, res: Response) {
    try {
      const request: WorkflowSuggestionRequest = req.body;
      
      // Validate request
      if (!request.description || !request.availableTools?.length) {
        return res.status(400).json({
          error: 'Description and available tools are required'
        });
      }

      const suggestions = await this.llmWorkflowService.getSuggestions(request);
      
      res.json({
        suggestions,
        reasoning: 'Generated workflow suggestions based on available tools and description'
      });
    } catch (error) {
      console.error('Error getting workflow suggestions:', error);
      res.status(500).json({ error: 'Failed to get workflow suggestions' });
    }
  }
} 