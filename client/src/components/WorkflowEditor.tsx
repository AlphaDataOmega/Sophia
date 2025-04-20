import React, { useState } from 'react';
import { Workflow, WorkflowStep } from '../services/WorkflowService/types';
import { Tool } from '../services/ToolService/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ArrowRight, Plus, Settings, Trash } from 'lucide-react';
import { StepEditor } from './StepEditor';

interface WorkflowEditorProps {
  workflow: Workflow;
  onWorkflowChange: (workflow: Workflow) => void;
  availableTools: Tool[];
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  onWorkflowChange,
  availableTools
}) => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isStepEditorOpen, setIsStepEditorOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const steps = Array.from(workflow.steps);
    const [reorderedStep] = steps.splice(result.source.index, 1);
    steps.splice(result.destination.index, 0, reorderedStep);

    onWorkflowChange({
      ...workflow,
      steps
    });
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      toolName: '',
      input: {
        static: {},
        mappings: {}
      }
    };

    onWorkflowChange({
      ...workflow,
      steps: [...workflow.steps, newStep]
    });
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onWorkflowChange({
      ...workflow,
      steps: workflow.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    });
  };

  const deleteStep = (stepId: string) => {
    onWorkflowChange({
      ...workflow,
      steps: workflow.steps.filter(step => step.id !== stepId)
    });
  };

  const handleStepClick = (stepId: string) => {
    setSelectedStep(stepId);
    setIsStepEditorOpen(true);
  };

  const handleStepEditorClose = () => {
    setIsStepEditorOpen(false);
    setSelectedStep(null);
  };

  const selectedStepData = selectedStep ? workflow.steps.find(s => s.id === selectedStep) : null;

  return (
    <div className="flex h-full">
      <div className="w-2/3 p-4 border-r border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Workflow Steps</h2>
          <button
            onClick={addStep}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {workflow.steps.map((step: WorkflowStep, index: number) => (
                  <Draggable key={step.id} draggableId={step.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-4 rounded-lg bg-gray-800 ${
                          selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleStepClick(step.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">#{index + 1}</span>
                            <span className="font-medium">{step.toolName || 'Unnamed Step'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStepClick(step.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-700"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStep(step.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-700 text-red-400"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {isStepEditorOpen && selectedStepData && (
        <StepEditor
          step={selectedStepData}
          availableTools={availableTools}
          onStepChange={(updates) => updateStep(selectedStep, updates)}
          onClose={handleStepEditorClose}
        />
      )}
    </div>
  );
};

export default WorkflowEditor;
