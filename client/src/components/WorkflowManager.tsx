import React, { useState, useEffect } from 'react';
import { Workflow } from '../services/WorkflowService/types';
import { Tool } from '../services/ToolService/types';
import { workflowService } from '../services/WorkflowService';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowExecutionView } from './WorkflowExecutionView';
import { WorkflowSuggestions } from './WorkflowSuggestions';
import { Plus, Trash, Save, Loader, Play, Sparkles } from 'lucide-react';

interface WorkflowManagerProps {
  availableTools: Tool[];
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ availableTools }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'execute'>('edit');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const loadedWorkflows = await workflowService.listWorkflows();
      setWorkflows(loadedWorkflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: 'New Workflow',
      description: '',
      steps: [],
    };
    setSelectedWorkflow(newWorkflow);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      setIsLoading(true);
      const savedWorkflow = await workflowService.saveWorkflow(selectedWorkflow);
      setWorkflows(prev => {
        const existingIndex = prev.findIndex(w => w.id === savedWorkflow.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = savedWorkflow;
          return updated;
        }
        return [...prev, savedWorkflow];
      });
      setSelectedWorkflow(savedWorkflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      await workflowService.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowChange = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  return (
    <div className="flex h-full">
      <div className="w-1/4 p-4 border-r border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Workflows</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateWorkflow}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSuggestions(true)}
              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <div className="space-y-2">
            {workflows.map(workflow => (
              <div
                key={workflow.id}
                className={`p-4 rounded-lg bg-gray-800 cursor-pointer ${
                  selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-gray-400">{workflow.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(workflow.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-red-400"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {showSuggestions ? (
          <div className="h-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Workflow Suggestions</h2>
              <button
                onClick={() => setShowSuggestions(false)}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Back to Editor
              </button>
            </div>
            <WorkflowSuggestions
              availableTools={availableTools.map(tool => tool.name)}
              onSuggestionSelect={(suggestion) => {
                const newWorkflow: Workflow = {
                  id: `workflow-${Date.now()}`,
                  name: suggestion.name,
                  description: suggestion.description,
                  steps: suggestion.steps.map(step => ({
                    id: `step-${Date.now()}-${Math.random()}`,
                    toolName: step.toolName,
                    input: {
                      static: step.input,
                      mappings: {},
                    },
                  })),
                };
                setSelectedWorkflow(newWorkflow);
                setShowSuggestions(false);
              }}
            />
          </div>
        ) : selectedWorkflow ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={selectedWorkflow.name}
                  onChange={(e) => handleWorkflowChange({
                    ...selectedWorkflow,
                    name: e.target.value
                  })}
                  className="text-xl font-medium bg-transparent border-none focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'edit' ? 'execute' : 'edit')}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  >
                    {viewMode === 'edit' ? (
                      <>
                        <Play className="w-4 h-4 inline-block mr-2" />
                        Execute
                      </>
                    ) : (
                      'Edit'
                    )}
                  </button>
                  <button
                    onClick={handleSaveWorkflow}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <Save className="w-4 h-4 inline-block mr-2" />
                    Save
                  </button>
                </div>
              </div>
              <textarea
                value={selectedWorkflow.description}
                onChange={(e) => handleWorkflowChange({
                  ...selectedWorkflow,
                  description: e.target.value
                })}
                placeholder="Workflow description"
                className="w-full mt-2 bg-transparent border-none focus:outline-none resize-none"
                rows={2}
              />
            </div>
            <div className="flex-1 overflow-auto">
              {viewMode === 'edit' ? (
                <WorkflowEditor
                  workflow={selectedWorkflow}
                  onWorkflowChange={handleWorkflowChange}
                  availableTools={availableTools}
                />
              ) : (
                <WorkflowExecutionView workflow={selectedWorkflow} />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select or create a workflow to get started
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowManager; 