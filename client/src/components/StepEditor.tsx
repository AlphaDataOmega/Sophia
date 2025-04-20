import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Plus, Package, GitBranch, AlertCircle } from 'lucide-react';
import { WorkflowStep } from '../services/WorkflowService/types';
import { Tool } from '../services/ToolService/types';

interface StepEditorProps {
  step: WorkflowStep;
  availableTools: Tool[];
  onStepChange: (updates: Partial<WorkflowStep>) => void;
  onClose: () => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({
  step,
  availableTools,
  onStepChange,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputJson, setInputJson] = useState(JSON.stringify(step.input, null, 2));
  const [conditionJson, setConditionJson] = useState(step.condition ? JSON.stringify(step.condition, null, 2) : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (value: string | undefined) => {
    setInputJson(value || '');
    try {
      const parsed = JSON.parse(value || '{}');
      onStepChange({ input: parsed });
      setValidationError(null);
    } catch (error) {
      setValidationError('Invalid JSON input');
    }
  };

  const handleConditionChange = (value: string | undefined) => {
    setConditionJson(value || '');
    try {
      const parsed = value ? JSON.parse(value) : undefined;
      onStepChange({ condition: parsed });
      setValidationError(null);
    } catch (error) {
      setValidationError('Invalid condition JSON');
    }
  };

  const handleToolSelect = (toolName: string) => {
    onStepChange({ toolName });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-gray-900/90 rounded-xl w-[90vw] max-w-4xl overflow-hidden shadow-2xl border border-white/20">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/70" />
            <h2 className="text-lg font-medium text-white/90">Step Editor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Tool
            </label>
            <select
              value={step.toolName}
              onChange={(e) => handleToolSelect(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tool</option>
              {availableTools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Input
            </label>
            <Editor
              height="200px"
              defaultLanguage="json"
              theme="vs-dark"
              value={inputJson}
              onChange={handleInputChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Condition (Optional)
            </label>
            <Editor
              height="150px"
              defaultLanguage="json"
              theme="vs-dark"
              value={conditionJson}
              onChange={handleConditionChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>

          {validationError && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{validationError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepEditor; 