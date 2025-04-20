import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Plus, Package, GitBranch, AlertCircle } from 'lucide-react';
import { ToolBottomPanel } from './ToolBottomPanel';
import { ToolBrowser } from './ToolBrowser';
import { toolService, Tool, ToolExecutionResult, ToolValidationResult } from '../services/ToolService';
import { ToolVersionHistory } from './ToolVersionHistory';

// Configure backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: () => void;
  onChatSend: (message: string) => void;
  isSaving?: boolean;
  editedCode: string;
  setEditedCode: (code: string) => void;
  editingLanguage: string;
  showToolForm: boolean;
  setShowToolForm: (show: boolean) => void;
  toolName: string;
  setToolName: (name: string) => void;
  toolDescription: string;
  setToolDescription: (description: string) => void;
  toolInputSchema: string;
  setToolInputSchema: (schema: string) => void;
  toolOutputSchema: string;
  setToolOutputSchema: (schema: string) => void;
  validationError: string | null;
  runOutput: string | null;
  setRunOutput: (output: string | null) => void;
  currentVersion?: string;
  onVersionChange: (version: string) => void;
  onVersionCreate?: (version: string) => void;
  onOpenWorkflowEditor?: () => void;
  availableTools: Tool[];
}

interface DependencyFormData {
  name: string;
  version: string;
  type: 'npm' | 'pip' | 'system';
  optional: boolean;
}

export const ToolModal: React.FC<ToolModalProps> = ({
  isOpen,
  onClose,
  onRun,
  onChatSend,
  isSaving,
  editedCode,
  setEditedCode,
  editingLanguage,
  showToolForm,
  setShowToolForm,
  toolName,
  setToolName,
  toolDescription,
  setToolDescription,
  toolInputSchema,
  setToolInputSchema,
  toolOutputSchema,
  setToolOutputSchema,
  validationError,
  runOutput,
  setRunOutput,
  currentVersion,
  onVersionChange,
  onVersionCreate,
  onOpenWorkflowEditor,
  availableTools,
}) => {
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [toolInput, setToolInput] = useState('{}');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors?: string[] } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [outputValidation, setOutputValidation] = useState<ToolValidationResult | null>(null);
  const [showDependencyForm, setShowDependencyForm] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyFormData[]>([]);
  const [newVersionData, setNewVersionData] = useState({
    version: '',
    changelog: '',
    dependencies: [] as DependencyFormData[]
  });
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [dependencyValidation, setDependencyValidation] = useState<{
    loading: boolean;
    errors: string[];
  }>({ loading: false, errors: [] });

  const handleEditorChange = (value: string | undefined) => {
    setEditedCode(value || '');
  };

  const handleInputSchemaChange = (value: string | undefined) => {
    setToolInputSchema(value || '');
  };

  const handleOutputSchemaChange = (value: string | undefined) => {
    setToolOutputSchema(value || '');
  };

  const handleChatSend = async (message: string) => {
    if (!message.trim() || isProcessingChat) return;

    setIsProcessingChat(true);
    const newMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, newMessage]);

    try {
      const response = await fetch(`${API_URL}/api/code/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editedCode,
          message,
          language: editingLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process chat message');
      }

      const data = await response.json();
      setEditedCode(data.code);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.code }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.' 
      }]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  const handleAISuggest = async () => {
    if (isProcessingChat) return;
    setIsProcessingChat(true);

    try {
      const suggestedTool = await toolService.suggestTool(editedCode);
      setToolName(suggestedTool.name);
      setToolDescription(suggestedTool.description);
      setToolInputSchema(JSON.stringify(suggestedTool.inputSchema, null, 2));
      setToolOutputSchema(JSON.stringify(suggestedTool.outputSchema, null, 2));
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setIsProcessingChat(false);
    }
  };

  const handleRun = async () => {
    if (isCodeRunning) return;
    setIsCodeRunning(true);
    setRunOutput(null);
    setOutputValidation(null);

    try {
      // Validate input first
      const validation = await toolService.validateInput(toolName, JSON.parse(toolInput));
      if (!validation.isValid) {
        setValidationResult(validation);
        return;
      }

      const result = await toolService.executeTool(toolName, JSON.parse(toolInput));
      setRunOutput(JSON.stringify(result, null, 2));

      // Validate output
      const outputValidation = await toolService.validateOutput(toolName, result.output);
      setOutputValidation(outputValidation);

    } catch (error) {
      setRunOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const handleTestRun = async () => {
    try {
      setIsCodeRunning(true);
      setRunOutput(null);

      // Parse the input JSON
      let parsedInput;
      try {
        parsedInput = JSON.parse(toolInput);
      } catch (e) {
        throw new Error('Invalid JSON in tool input');
      }
      
      // Send the code and input to the test endpoint
      const response = await fetch(`${API_URL}/api/tools/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editedCode,
          input: parsedInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run test');
      }

      // Format the output nicely
      setRunOutput(JSON.stringify(data.result, null, 2));
    } catch (error: unknown) {
      console.error('Test run error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRunOutput(`Error: ${errorMessage}`);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const handleSave = async () => {
    try {
      const tool: Omit<Tool, 'metadata'> = {
        name: toolName,
        description: toolDescription,
        code: editedCode,
        inputSchema: JSON.parse(toolInputSchema),
        outputSchema: JSON.parse(toolOutputSchema)
      };

      await toolService.createTool(tool);
      onClose();
    } catch (error) {
      setRunOutput(`Error saving tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateVersion = async () => {
    try {
      await toolService.createVersion(toolName, {
        version: newVersionData.version,
        code: editedCode,
        changelog: newVersionData.changelog,
        dependencies: newVersionData.dependencies,
        createdAt: Date.now()
      });
      
      onVersionCreate?.(newVersionData.version);
      setShowNewVersionForm(false);
      setNewVersionData({ version: '', changelog: '', dependencies: [] });
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const handleAddDependency = async (dependency: DependencyFormData) => {
    setDependencyValidation({ loading: true, errors: [] });
    
    try {
      // Validate dependency
      await toolService.validateDependency(dependency);
      setDependencies([...dependencies, dependency]);
      setShowDependencyForm(false);
    } catch (error) {
      setDependencyValidation({
        loading: false,
        errors: [(error as Error).message]
      });
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setToolName(tool.name);
    setToolDescription(tool.description);
    setToolInputSchema(JSON.stringify(tool.inputSchema, null, 2));
    setToolOutputSchema(JSON.stringify(tool.outputSchema, null, 2));
    setEditedCode(tool.versions[tool.currentVersion].code);
    setShowToolForm(false);
  };

  const handleToolEdit = (tool: Tool) => {
    setToolName(tool.name);
    setToolDescription(tool.description);
    setToolInputSchema(JSON.stringify(tool.inputSchema, null, 2));
    setToolOutputSchema(JSON.stringify(tool.outputSchema, null, 2));
    setEditedCode(tool.versions[tool.currentVersion].code);
    setShowToolForm(true);
  };

  const handleToolDelete = async (tool: Tool) => {
    try {
      await toolService.deleteTool(tool.name);
      // Refresh tool list if needed
    } catch (error) {
      console.error('Failed to delete tool:', error);
    }
  };

  const handleToolRun = async (tool: Tool) => {
    try {
      const result = await toolService.executeTool(tool.name, JSON.parse(toolInput));
      setRunOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setRunOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-gray-900/90 rounded-xl w-[90vw] max-w-4xl overflow-hidden shadow-2xl border border-white/20">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/70" />
            <h2 className="text-lg font-medium text-white/90">Tool Editor</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowToolForm(!showToolForm)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
            >
              {showToolForm ? 'Browse Tools' : 'Create Tool'}
            </button>
            {onOpenWorkflowEditor && (
              <button
                onClick={onOpenWorkflowEditor}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              >
                Open Workflow Editor
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {showToolForm ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage={editingLanguage}
                  theme="vs-dark"
                  value={editedCode}
                  onChange={handleEditorChange}
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
              <ToolBottomPanel
                onChatSend={handleChatSend}
                onInputChange={setToolInput}
                isProcessing={isProcessingChat}
                isDisabled={isCodeRunning || isSaving || isProcessingChat}
                runOutput={runOutput}
                toolInput={toolInput}
                onClearOutput={() => setRunOutput(null)}
              />
            </div>
          ) : (
            <div className="flex-1">
              <ToolBrowser
                onSelectTool={handleToolSelect}
                onEditTool={handleToolEdit}
                onDeleteTool={handleToolDelete}
                onRunTool={handleToolRun}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolModal; 