import { io, Socket } from 'socket.io-client';
import mitt from 'mitt';
import { TTSService } from './TTSService';
import { AnimationService } from './AnimationService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    emotion?: {
      type: string;
      intensity: number;
    };
    suggestedTool?: {
      name: string;
      description: string;
    };
    audioUrl?: string;
    animation?: {
      expression: string;
      intensity: number;
      visemes?: Array<{ type: string; start: number; end: number; }>;
    };
    reflection?: {
      insights: any[];
      suggestedActions: any[];
    };
  };
}

export interface ChatState {
  isConnected: boolean;
  isTyping: boolean;
  currentEmotion?: string;
  lastActivity: number;
}

export class ChatService {
  private emitter = mitt();
  private socket: Socket;
  private messageQueue: ChatMessage[] = [];
  private isProcessing = false;
  private ttsService: TTSService;
  private animationService: AnimationService;
  private state: ChatState;

  constructor() {
    this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3001', {
      transports: ['websocket'],
      autoConnect: true
    });

    this.ttsService = TTSService.getInstance();
    this.animationService = AnimationService.getInstance();
    
    this.state = {
      isConnected: false,
      isTyping: false,
      lastActivity: Date.now()
    };

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.state.isConnected = true;
      this.emitter.emit('connectionStatus', 'connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.state.isConnected = false;
      this.emitter.emit('connectionStatus', 'disconnected');
    });

    // Handle streaming response with animation and voice
    this.socket.on('response_stream', async (chunk: any) => {
      if (chunk.type === 'text') {
        this.emitter.emit('messageChunk', chunk.content);
      } else if (chunk.type === 'animation') {
        await this.animationService.playAnimation(chunk.expression, chunk.intensity);
      } else if (chunk.type === 'voice') {
        await this.ttsService.queueText(chunk.content);
      }
    });

    // Handle complete message with all metadata
    this.socket.on('response_complete', (response: ChatMessage) => {
      // Update animation state
      if (response.metadata?.animation) {
        this.animationService.playAnimation(
          response.metadata.animation.expression,
          response.metadata.animation.intensity
        );
      }

      // Queue audio if available
      if (response.metadata?.audioUrl) {
        this.ttsService.queueText(response.content);
      }

      // Handle reflection insights
      if (response.metadata?.reflection) {
        this.emitter.emit('reflection', response.metadata.reflection);
      }

      // Emit the complete message
      this.emitter.emit('messageReceived', response);
    });

    // Handle emotional state updates
    this.socket.on('emotional_state', (state: any) => {
      this.state.currentEmotion = state.emotion;
      this.emitter.emit('emotionalState', state);
    });

    // Handle suggested tools
    this.socket.on('tool_suggestion', (tool: any) => {
      this.emitter.emit('toolSuggested', tool);
    });

    // Handle errors
    this.socket.on('error', (error: any) => {
      console.error('Chat error:', error);
      this.emitter.emit('error', error);
    });
  }

  async sendMessage(content: string): Promise<void> {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    this.messageQueue.push(message);
    this.emitter.emit('messageSent', message);
    this.state.lastActivity = Date.now();

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue[0];
        
        // Prepare thinking animation
        this.animationService.playAnimation('thinking', 0.5);
        
        // Send message with current state context
        await new Promise<void>((resolve, reject) => {
          this.socket.emit('message', {
            content: message.content,
            timestamp: Date.now(),
            context: {
              lastActivity: this.state.lastActivity,
              currentEmotion: this.state.currentEmotion
            }
          }, (error: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        this.messageQueue.shift();
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
      this.emitter.emit('error', error);
      
      // Reset to idle animation on error
      this.animationService.playAnimation('idle', 0.3);
    } finally {
      this.isProcessing = false;
    }
  }

  getState(): ChatState {
    return { ...this.state };
  }

  disconnect() {
    this.socket.disconnect();
    this.ttsService.stop();
    this.animationService.playAnimation('idle', 0.3);
  }

  // Add event emitter methods
  on(event: string, handler: (data?: any) => void) {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (data?: any) => void) {
    this.emitter.off(event, handler);
  }

  emit(event: string, data?: any) {
    this.emitter.emit(event, data);
  }
}

// Create a singleton instance
export const chatService = new ChatService();
