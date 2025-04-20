import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Bot, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { FiEdit2 } from 'react-icons/fi';
import Editor, { OnChange } from '@monaco-editor/react';
import type { Components } from 'react-markdown';
import { Tool } from '../types/Tool';
import ToolModal from './ToolModal';
import { ChatMessage as IChatMessage } from '../services/ChatService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedTool?: Tool;
}

interface ChatMessageProps {
  message: IChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  onToolClick?: (tool: Tool) => void;
  onDiscussCode?: (message: string) => void;
  isRunning?: boolean;
  isSaving?: boolean;
}

interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
}

interface CodeElement extends React.ReactElement {
  props: {
    className?: string;
    children?: React.ReactNode;
  };
}

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  children?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLast,
  isStreaming,
  onToolClick,
  onDiscussCode,
  isRunning,
  isSaving,
}) => {
  const isAssistant = message.role === 'assistant';
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [editingLanguage, setEditingLanguage] = useState('javascript');
  const [showToolForm, setShowToolForm] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolInputSchema, setToolInputSchema] = useState(JSON.stringify({
    type: 'object',
    properties: {},
    required: []
  }, null, 2));
  const [toolOutputSchema, setToolOutputSchema] = useState(JSON.stringify({
    type: 'object',
    properties: {}
  }, null, 2));
  const [isValidTool, setIsValidTool] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [animation, setAnimation] = useState('');

  useEffect(() => {
    validateTool();
  }, [toolName, toolDescription, toolInputSchema, toolOutputSchema, editedCode]);

  useEffect(() => {
    if (message.metadata?.animation) {
      const { expression, intensity } = message.metadata.animation;
      setAnimation(expression);
    }
  }, [message.metadata?.animation, isAssistant]);

  useEffect(() => {
    if (message.metadata?.audioUrl && isAssistant) {
      const audio = new Audio(message.metadata.audioUrl);
      audio.play().catch(console.error);
      return () => {
        audio.pause();
        URL.revokeObjectURL(message.metadata.audioUrl);
      };
    }
  }, [message.metadata?.audioUrl, isAssistant]);

  const validateTool = () => {
    setValidationError(null);

    if (!toolName) {
      setIsValidTool(false);
      return;
    }

    if (!toolDescription) {
      setIsValidTool(false);
      return;
    }

    try {
      const inputSchema = JSON.parse(toolInputSchema);
      if (typeof inputSchema !== 'object' || !inputSchema.type || !inputSchema.properties) {
        setValidationError('Invalid input schema format');
        setIsValidTool(false);
        return;
      }
    } catch (err) {
      setValidationError('Invalid input schema JSON');
      setIsValidTool(false);
      return;
    }

    try {
      const outputSchema = JSON.parse(toolOutputSchema);
      if (typeof outputSchema !== 'object' || !outputSchema.type) {
        setValidationError('Invalid output schema format');
        setIsValidTool(false);
        return;
      }
    } catch (err) {
      setValidationError('Invalid output schema JSON');
      setIsValidTool(false);
      return;
    }

    if (!editedCode.trim()) {
      setIsValidTool(false);
      return;
    }

    setIsValidTool(true);
  };

  const handleCreateTool = async () => {
    if (!isValidTool) return;

    try {
      const tool: Tool = {
        name: toolName,
        description: toolDescription,
        inputSchema: JSON.parse(toolInputSchema),
        outputSchema: JSON.parse(toolOutputSchema),
        code: editedCode
      };

      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tool)
      });

      if (!response.ok) {
        throw new Error('Failed to create tool');
      }

      setShowToolForm(false);
      setIsEditing(false);
      // TODO: Show success message
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to create tool');
    }
  };

  const handleEditorChange: OnChange = (value: string | undefined) => {
    setEditedCode(value || '');
  };

  const handleInputSchemaChange: OnChange = (value: string | undefined) => {
    setToolInputSchema(value || '');
  };

  const handleOutputSchemaChange: OnChange = (value: string | undefined) => {
    setToolOutputSchema(value || '');
  };

  const handleChatSend = (message: string) => {
    if (!onDiscussCode || !editedCode) return;
    
    // Include the code in the message
    onDiscussCode(`Here's the code I want to discuss:\n\`\`\`${editingLanguage}\n${editedCode}\n\`\`\`\n\n${message}`);
    setIsEditing(false);
  };

  const handleRun = async () => {
    if (!editedCode) return;
    
    setIsCodeRunning(true);
    try {
      // TODO: Implement actual code execution
      const result = await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve("Code execution result will appear here...");
        }, 1000);
      });
      setRunOutput(result);
    } catch (error) {
      setRunOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const components: Components = {
    pre: ({ children, ...props }: PreProps) => {
      // Get the actual code content from the nested structure
      const codeElement = React.Children.toArray(children).find(
        (child): child is CodeElement => 
          React.isValidElement(child) && 
          child.props?.className?.includes('language-')
      );
      
      if (!React.isValidElement(codeElement)) {
        return <pre {...props}>{children}</pre>;
      }

      const language = /language-(\w+)/.exec(codeElement.props.className || '')?.[1] || 'text';
      const rawContent = React.Children.toArray(codeElement.props.children)
        .filter((child): child is string => typeof child === 'string')
        .join('');
      
      return (
        <div className="relative group">
          <div className="absolute top-0 right-0 left-0 h-10 bg-gray-800/80 rounded-t-xl border-b border-white/10 flex items-center justify-between px-4">
            <span className="text-sm text-white/70 font-mono">{language}</span>
            <button
              onClick={() => {
                setEditedCode(rawContent.trim());
                setEditingLanguage(language);
                setIsEditing(true);
                setShowToolForm(true);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <FiEdit2 className="w-4 h-4 text-white/70 hover:text-white/90" />
            </button>
          </div>
          <div className="pt-10">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                fontSize: '0.9rem',
                lineHeight: '1.4',
              }}
              className="rounded-xl !bg-gray-800/50 !backdrop-blur-sm border border-white/20 shadow-lg [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:!bg-gray-800/20 [&::-webkit-scrollbar-thumb]:!bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-2"
            >
              {rawContent}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    },
    code: ({ inline, className, children, ...props }: CodeProps) => {
      if (inline) {
        return (
          <code 
            className="rounded bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 text-sm font-medium" 
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = /language-(\w+)/.exec(className || '')?.[1] || 'text';
      const rawContent = React.Children.toArray(children)
        .filter((child): child is string => typeof child === 'string')
        .join('');

      return (
        <div className="relative group">
          <div className="absolute top-0 right-0 left-0 h-10 bg-gray-800/80 rounded-t-xl border-b border-white/10 flex items-center justify-between px-4">
            <span className="text-sm text-white/70 font-mono">{language}</span>
            <button
              onClick={() => {
                setEditedCode(rawContent.trim());
                setEditingLanguage(language);
                setIsEditing(true);
                setShowToolForm(true);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <FiEdit2 className="w-4 h-4 text-white/70 hover:text-white/90" />
            </button>
          </div>
          <div className="pt-10">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                fontSize: '0.9rem',
                lineHeight: '1.4',
              }}
              className="rounded-xl !bg-gray-800/50 !backdrop-blur-sm border border-white/20 shadow-lg [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:!bg-gray-800/20 [&::-webkit-scrollbar-thumb]:!bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-2"
            >
              {rawContent}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    }
  };

  // Remove the tool JSON from the displayed message
  const displayContent = message.content.replace(/```tool\n[\s\S]*?```/g, '');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 260,
          damping: 20 
        }}
        className={cn(
          'flex gap-6 p-4',
          isAssistant ? 'justify-start' : 'justify-end'
        )}
      >
        <div className="flex-shrink-0 pt-2">
          {isAssistant ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 dark:bg-purple-500 text-white shadow-lg">
              <Bot className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
              <User className="h-6 w-6" />
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'relative max-w-[80%] rounded-3xl px-6 py-4 shadow-lg glass-effect',
            isAssistant ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white/30 dark:bg-gray-800/30'
          )}
        >
          <div className="relative z-10">
            <ReactMarkdown
              className="prose prose-lg dark:prose-invert max-w-none"
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={components}
            >
              {displayContent}
            </ReactMarkdown>

            {message.metadata?.suggestedTool && onToolClick && (
              <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Suggested Tool: {message.metadata.suggestedTool}
                </p>
                <button
                  onClick={() => onToolClick(message.metadata!.suggestedTool!)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Use Tool
                </button>
              </div>
            )}

            {isStreaming && isLast && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-2 h-5 w-2.5 rounded-sm bg-purple-500"
              />
            )}

            {message.metadata?.emotion && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                {message.metadata.emotion}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <ToolModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onRun={handleRun}
        onChatSend={handleChatSend}
        isCodeRunning={isCodeRunning}
        isSaving={isSaving}
        editedCode={editedCode}
        setEditedCode={setEditedCode}
        editingLanguage={editingLanguage}
        showToolForm={showToolForm}
        setShowToolForm={setShowToolForm}
        toolName={toolName}
        setToolName={setToolName}
        toolDescription={toolDescription}
        setToolDescription={setToolDescription}
        toolInputSchema={toolInputSchema}
        setToolInputSchema={setToolInputSchema}
        toolOutputSchema={toolOutputSchema}
        setToolOutputSchema={setToolOutputSchema}
        validationError={validationError}
        runOutput={runOutput}
        setRunOutput={setRunOutput}
      />
    </>
  );
};

export default ChatMessage;