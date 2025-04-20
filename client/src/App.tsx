import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { GradientBackground } from './components/GradientBackground';
import { Tool } from './types/Tool';
import { motion } from 'framer-motion';
import { SophiaAvatar } from './components/SophiaAvatar';
import { AnimationProvider, useAnimation } from './contexts/AnimationContext';
import { TTSService } from './services/TTSService';
import { VoiceSettings } from './types/voice';
import { LLMService } from './services/LLMService.ts';
import { ChromaMemoryProvider } from './services/MemoryService';
import { chatService, ChatMessage as IChatMessage } from './services/ChatService';
import { ToolBrowser } from './components/ToolBrowser';
import { ToolModal } from './components/ToolModal';
import { Wrench as ToolIcon, X } from 'lucide-react';
import { toolService } from './services/ToolService';
import type { Tool as ToolService } from './services/ToolService';
import { Environment } from './components/Environment';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedTool?: Tool;
}

// Configure backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function streamCompletion(
  messages: Message[],
  onToken: (token: string, suggestedTool?: Tool) => void
) {
  try {
    // Check if backend server is running
    const healthCheck = await fetch(`${API_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Backend server is not responding. Please make sure the server is running.');
    }

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Connected to backend, streaming response...');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            // Extract the data part from the SSE format
            const dataMatch = line.match(/^data: (.+)$/);
            if (dataMatch) {
              const data = JSON.parse(dataMatch[1]);
              if (data.message?.content) {
                // Check if the message contains a tool suggestion
                const toolMatch = data.message.content.match(/```tool\n([\s\S]*?)```/);
                if (toolMatch) {
                  try {
                    const suggestedTool = JSON.parse(toolMatch[1]);
                    onToken(data.message.content, suggestedTool);
                  } catch (e) {
                    console.warn('Invalid tool JSON:', e);
                    onToken(data.message.content);
                  }
                } else {
                  onToken(data.message.content);
                }
              }
            }
          } catch (e) {
            console.warn('Invalid JSON chunk:', line);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in streamCompletion:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Could not connect to backend server at ${API_URL}. Please make sure the server is running on port 3001`);
      }
    }
    throw error;
  }
}

function AppContent() {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(true);
  const streamingMessageRef = useRef('');
  
  const { setAnimation } = useAnimation();

  const ttsService = useRef<TTSService | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.35,
    use_speaker_boost: true,
  });

  const llmService = new LLMService();
  const memoryProvider = ChromaMemoryProvider.getInstance(llmService);

  const [showToolBrowser, setShowToolBrowser] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [editingLanguage, setEditingLanguage] = useState('typescript');
  const [showToolForm, setShowToolForm] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolInputSchema, setToolInputSchema] = useState('{\n  "type": "object",\n  "properties": {}\n}');
  const [toolOutputSchema, setToolOutputSchema] = useState('{\n  "type": "object",\n  "properties": {}\n}');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');

  // Initialize TTS service
  useEffect(() => {
    ttsService.current = TTSService.getInstance();
    return () => {
      if (ttsService.current) {
        ttsService.current.dispose();
      }
    };
  }, []);

  // Load available voices
  useEffect(() => {
    async function loadVoices() {
      try {
        const response = await fetch('http://localhost:3001/api/tts/voices');
        if (response.ok) {
          const data = await response.json();
          if (data.voices.length > 0) {
            setSelectedVoice(data.voices[0].voice_id);
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    }
    loadVoices();
  }, []);

  // Initialize memory system
  useEffect(() => {
    async function initializeMemory() {
      try {
        await memoryProvider.initialize();
      } catch (error) {
        console.error('Failed to initialize memory system:', error);
      }
    }
    initializeMemory();
  }, [memoryProvider]);

  // Function to trigger animations based on chat state
  const triggerAnimation = (state: 'typing' | 'idle' | 'thinking' | 'talking') => {
    console.log('Triggering animation:', state);
    switch (state) {
      case 'typing':
        setAnimation('typing');
        break;
      case 'thinking':
        setAnimation('thinking');
        break;
      case 'talking':
        setAnimation('talking');
        break;
      case 'idle':
      default:
        setAnimation('idle');
        break;
    }
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    // Set up chat service listeners
    chatService.on('connectionStatus', (status) => {
      setIsConnected(status === 'connected');
    });

    chatService.on('messageSent', (message) => {
      setMessages(prev => [...prev, message]);
    });

    chatService.on('messageReceived', (message) => {
      setMessages(prev => [...prev, message]);
      setIsStreaming(false);
    });

    chatService.on('messageChunk', (chunk) => {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + chunk }
          ];
        }
        return prev;
      });
    });

    chatService.on('error', (error) => {
      console.error('Chat error:', error);
      // Handle error (show toast, etc.)
    });

    return () => {
      chatService.disconnect();
    };
  }, []);

  const handleSend = async (content: string) => {
    setIsStreaming(true);
    await chatService.sendMessage(content);
  };

  const handleToolClick = (tool: Tool) => {
    setEditingTool(tool);
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setToolName(tool.name);
    setToolDescription(tool.description);
    setEditedCode(tool.code);
    setToolInputSchema(JSON.stringify(tool.inputSchema, null, 2));
    setToolOutputSchema(JSON.stringify(tool.outputSchema, null, 2));
    setIsToolModalOpen(true);
  };

  const handleToolDelete = async (tool: Tool) => {
    if (window.confirm(`Are you sure you want to delete the tool "${tool.name}"?`)) {
      try {
        await toolService.deleteTool(tool.name);
        // Refresh tool browser if open
        if (showToolBrowser) {
          const tools = await toolService.listTools();
          // Update tool list in ToolBrowser
          // (You'll need to add state management for the tool list)
        }
      } catch (error) {
        console.error('Failed to delete tool:', error);
      }
    }
  };

  const handleToolRun = async (tool: Tool) => {
    setSelectedTool(tool);
    setIsToolModalOpen(true);
  };

  const handleVersionChange = async (version: string) => {
    try {
      setCurrentVersion(version);
      const toolVersion = await toolService.getVersion(selectedTool!.name, version);
      if (toolVersion) {
        setEditedCode(toolVersion.code);
        setToolInputSchema(JSON.stringify(toolVersion.inputSchema, null, 2));
        setToolOutputSchema(JSON.stringify(toolVersion.outputSchema, null, 2));
      }
    } catch (error) {
      console.error('Failed to load tool version:', error);
    }
  };

  return (
    <div className="flex h-screen relative">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>
      {/* Sophia Avatar Layer */}
      {isAvatarEnabled && (
        <div className="absolute inset-0 z-10">
          <SophiaAvatar />
        </div>
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-20">
        <div className="relative min-h-screen bg-transparent transition-colors duration-300">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-screen flex-col"
            >
              {/* Feature Toggle Buttons */}
              <div className="flex justify-end gap-2 p-4">
                <button
                  onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isTTSEnabled 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {isTTSEnabled ? 'TTS: On' : 'TTS: Off'}
                </button>
                <button
                  onClick={() => setIsAvatarEnabled(!isAvatarEnabled)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isAvatarEnabled 
                      ? 'bg-purple-500 text-white hover:bg-purple-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {isAvatarEnabled ? 'Avatar: On' : 'Avatar: Off'}
                </button>
              </div>
              <main className="flex-1 pb-32 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex h-[80vh] items-center justify-center">
                    <p className="text-center text-2xl font-light text-gray-500 dark:text-gray-400">
                      How can I assist you today?
                    </p>
                  </div>
                ) : (
                  messages.map((message, i) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isLast={i === messages.length - 1}
                      isStreaming={isStreaming && i === messages.length - 1}
                      onToolClick={handleToolClick}
                    />
                  ))
                )}
              </main>
              <ChatInput 
                onSend={handleSend} 
                disabled={!isConnected || isStreaming} 
                onTyping={() => triggerAnimation('typing')}
                onStopTyping={() => triggerAnimation('idle')}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tool Browser Button */}
      <div className="fixed bottom-4 right-4 flex gap-2 z-30">
        <button
          onClick={() => setShowToolBrowser(true)}
          className="p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-white/80 hover:text-white/90 transition-colors backdrop-blur-sm"
          title="Browse Tools"
        >
          <ToolIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Tool Browser Modal */}
      {showToolBrowser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-gray-900/90 rounded-xl w-[80vw] h-[80vh] overflow-hidden shadow-2xl border border-white/20">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-medium text-white/90">Tool Browser</h2>
              <button
                onClick={() => setShowToolBrowser(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            <ToolBrowser
              onSelectTool={handleToolSelect}
              onEditTool={handleToolSelect}
              onDeleteTool={handleToolDelete}
              onRunTool={handleToolRun}
            />
          </div>
        </div>
      )}

      {/* Tool Modal */}
      {isToolModalOpen && (
        <ToolModal
          isOpen={isToolModalOpen}
          onClose={() => {
            setIsToolModalOpen(false);
            setSelectedTool(null);
            setShowToolForm(false);
            setToolName('');
            setToolDescription('');
            setEditedCode('');
            setToolInputSchema('{\n  "type": "object",\n  "properties": {}\n}');
            setToolOutputSchema('{\n  "type": "object",\n  "properties": {}\n}');
            setValidationError(null);
            setRunOutput(null);
          }}
          onRun={() => {/* Handle run */}}
          onChatSend={handleSend}
          isSaving={false}
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
          currentVersion={currentVersion}
          onVersionChange={handleVersionChange}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <Environment />
      <AnimationProvider>
        <AppContent />
      </AnimationProvider>
    </div>
  );
}

export default App;