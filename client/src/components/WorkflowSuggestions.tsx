import React, { useState } from 'react';
import { WorkflowSuggestion, WorkflowSuggestionRequest, WorkflowSuggestionResponse } from '../services/WorkflowService/types';
import { workflowService } from '../services/WorkflowService';
import { Loader, Sparkles, Check, X } from 'lucide-react';

interface WorkflowSuggestionsProps {
  availableTools: string[];
  onSuggestionSelect?: (suggestion: WorkflowSuggestion) => void;
}

export const WorkflowSuggestions: React.FC<WorkflowSuggestionsProps> = ({
  availableTools,
  onSuggestionSelect,
}) => {
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<WorkflowSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    if (!description.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const request: WorkflowSuggestionRequest = {
        description: description.trim(),
        availableTools,
      };

      const response = await workflowService.getWorkflowSuggestions(request);
      setSuggestions(response.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: WorkflowSuggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you want to accomplish..."
          className="flex-1 p-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          onClick={handleGetSuggestions}
          disabled={isLoading || !description.trim()}
          className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 flex items-center gap-2">
          <X className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Suggested Workflows</h3>
          <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{suggestion.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {suggestion.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                    <button
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-2">Steps:</h5>
                  <div className="space-y-2">
                    {suggestion.steps.map((step, stepIndex) => (
                      <div
                        key={stepIndex}
                        className="p-2 rounded-lg bg-gray-700/50"
                      >
                        <div className="font-medium">{step.toolName}</div>
                        <div className="text-sm text-gray-400">
                          {step.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <h5 className="font-medium mb-1">Reasoning:</h5>
                  <p>{suggestion.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowSuggestions; 