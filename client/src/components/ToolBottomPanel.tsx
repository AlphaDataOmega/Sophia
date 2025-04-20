import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { EditorInput } from './EditorInput';

interface ToolBottomPanelProps {
  onChatSend: (message: string) => void;
  onInputChange: (input: string) => void;
  isProcessing: boolean;
  isDisabled: boolean;
  runOutput: string | null;
  toolInput: string;
  onClearOutput: () => void;
}

type TabType = 'chat' | 'input' | 'output';

export const ToolBottomPanel: React.FC<ToolBottomPanelProps> = ({
  onChatSend,
  onInputChange,
  isProcessing,
  isDisabled,
  runOutput,
  toolInput,
  onClearOutput,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const TabButton: React.FC<{ tab: TabType; label: string }> = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        activeTab === tab
          ? 'text-white'
          : 'text-white/50 hover:text-white/70'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="border-t border-white/10">
      <div className="flex items-center px-2 bg-gray-900/50">
        <TabButton tab="chat" label="Chat" />
        <TabButton tab="input" label="Tool Input" />
        {runOutput && <TabButton tab="output" label="Output" />}
      </div>
      
      <div className="h-[160px] bg-gray-900/90">
        {activeTab === 'chat' && (
          <div className="p-4 h-full">
            <EditorInput
              onSend={onChatSend}
              disabled={isDisabled}
              isProcessing={isProcessing}
            />
          </div>
        )}
        
        {activeTab === 'input' && (
          <div className="h-full">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              value={toolInput}
              onChange={(value) => onInputChange(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'off',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        )}
        
        {activeTab === 'output' && runOutput && (
          <div className="p-4 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-white/70">Run Output</h4>
              <button
                onClick={onClearOutput}
                className="text-white/50 hover:text-white/70"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="text-sm text-white/90 font-mono whitespace-pre-wrap">{runOutput}</pre>
          </div>
        )}
      </div>
    </div>
  );
}; 