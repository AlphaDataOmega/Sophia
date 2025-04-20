import React, { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor, { OnMount } from '@monaco-editor/react';
import { FiEdit2 } from 'react-icons/fi';
import type { editor as monacoEditor } from 'monaco-editor';

interface CodeBlockProps {
  code: string;
  language: string;
  onSave?: (newCode: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = useCallback((editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
    editor.focus();
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditedCode(value || '');
  }, []);

  const handleSave = () => {
    if (onSave) {
      onSave(editedCode);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative group">
      <div className="relative rounded-lg overflow-hidden backdrop-blur-sm bg-white/10 border border-white/20 shadow-lg">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <FiEdit2 className="w-4 h-4 text-white" />
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg w-[80vw] max-w-4xl overflow-hidden shadow-2xl border border-white/20">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">Edit Code</h3>
            </div>
            <div className="h-[60vh]">
              <Editor
                height="100%"
                defaultLanguage={language}
                theme="vs-dark"
                value={editedCode}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                loading={<div className="text-white p-4">Loading editor...</div>}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  wrappingStrategy: 'advanced',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  contextmenu: true,
                  mouseWheelZoom: true,
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeBlock; 