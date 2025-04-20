import React from 'react';
import { Workflow, WorkflowExecutionResult } from '../services/WorkflowService/types';
import { ArrowDown, Check, X, Loader } from 'lucide-react';

interface WorkflowVisualizerProps {
  workflow: Workflow;
  executionResult?: WorkflowExecutionResult;
  currentStepId?: string;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  workflow,
  executionResult,
  currentStepId
}) => {
  return (
    <div className="p-4">
      <div className="space-y-4">
        {workflow.steps.map((step, index) => {
          const result = executionResult?.stepResults[step.id];
          const isCurrentStep = currentStepId === step.id;

          return (
            <div key={step.id}>
              <div
                className={`p-4 rounded-lg ${
                  isCurrentStep
                    ? 'bg-blue-500/20 border-blue-500'
                    : result
                    ? result.success
                      ? 'bg-green-500/20 border-green-500'
                      : 'bg-red-500/20 border-red-500'
                    : 'bg-gray-800 border-gray-700'
                } border`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">#{index + 1}</span>
                    <span className="font-medium">{step.toolName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrentStep && (
                      <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    )}
                    {result && (
                      <>
                        {result.success ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm text-gray-400">
                          {result.executionTime}ms
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {result?.error && (
                  <div className="mt-2 text-sm text-red-400">{result.error}</div>
                )}
              </div>
              {index < workflow.steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowDown className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
