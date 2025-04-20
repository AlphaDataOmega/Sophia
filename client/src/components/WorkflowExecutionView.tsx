import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowExecutionResult, WorkflowProgress } from '../services/WorkflowService/types';
import { workflowService } from '../services/WorkflowService';
import { WorkflowVisualizer } from './WorkflowVisualizer';
import { Play, Stop, Loader, Check, X } from 'lucide-react';

interface WorkflowExecutionViewProps {
  workflow: Workflow;
}

export const WorkflowExecutionView: React.FC<WorkflowExecutionViewProps> = ({ workflow }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResult | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExecuting && progress?.executionId) {
      interval = setInterval(async () => {
        try {
          const updatedProgress = await workflowService.getWorkflowProgress(progress.executionId);
          setProgress(updatedProgress);
          setCurrentStepId(updatedProgress.currentStep);
          
          if (updatedProgress.status === 'completed' || updatedProgress.status === 'failed') {
            setIsExecuting(false);
            clearInterval(interval);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch progress');
          setIsExecuting(false);
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExecuting, progress?.executionId]);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      setError(null);
      setExecutionResult(null);
      setCurrentStepId(null);

      const result = await workflowService.executeWorkflow(workflow.id);
      setExecutionResult(result);
      setProgress({
        executionId: result.executionId,
        workflowId: workflow.id,
        startTime: Date.now(),
        status: 'running',
        completedSteps: 0,
        totalSteps: workflow.steps.length,
        currentStep: workflow.steps[0]?.id || null,
        stepStatuses: new Map(),
        dataFlow: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute workflow');
      setIsExecuting(false);
    }
  };

  const handleStop = () => {
    setIsExecuting(false);
    // TODO: Implement workflow cancellation
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Execution</h2>
          <div className="flex items-center gap-2">
            {isExecuting ? (
              <button
                onClick={handleStop}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                <Stop className="w-4 h-4 inline-block mr-2" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleExecute}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                <Play className="w-4 h-4 inline-block mr-2" />
                Execute
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {isExecuting && progress && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin text-blue-400" />
            <span>Executing step {progress.completedSteps + 1} of {progress.totalSteps}</span>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <WorkflowVisualizer
          workflow={workflow}
          executionResult={executionResult}
          currentStepId={currentStepId}
        />
      </div>

      {executionResult && !isExecuting && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {executionResult.success ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <X className="w-4 h-4 text-red-400" />
              )}
              <span>
                {executionResult.success ? 'Execution completed' : 'Execution failed'}
              </span>
            </div>
            <span className="text-sm text-gray-400">
              Total time: {executionResult.totalExecutionTime}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionView; 