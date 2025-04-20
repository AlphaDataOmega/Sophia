import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { WorkflowService } from '../services/WorkflowService';
import { LLMWorkflowService } from '../services/WorkflowService/LLMWorkflowService';

const router = Router();
const workflowService = new WorkflowService();
const llmWorkflowService = new LLMWorkflowService();
const workflowController = new WorkflowController(workflowService, llmWorkflowService);

// List all workflows
router.get('/', workflowController.listWorkflows.bind(workflowController));

// Get a specific workflow
router.get('/:id', workflowController.getWorkflow.bind(workflowController));

// Create a new workflow
router.post('/', workflowController.createWorkflow.bind(workflowController));

// Update a workflow
router.patch('/:id', workflowController.updateWorkflow.bind(workflowController));

// Delete a workflow
router.delete('/:id', workflowController.deleteWorkflow.bind(workflowController));

// Execute a workflow
router.post('/:id/execute', workflowController.executeWorkflow.bind(workflowController));

// Get workflow execution progress
router.get('/executions/:executionId', workflowController.getWorkflowProgress.bind(workflowController));

// Get workflow suggestions
router.post('/suggestions', workflowController.getSuggestions.bind(workflowController));

export default router; 