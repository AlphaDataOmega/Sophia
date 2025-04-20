import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ChatOrchestrator } from '../services/ChatOrchestrator';
import { EventEmitter } from 'events';

interface ClientSession {
  userId: string;
  socket: Socket;
  lastActivity: number;
  isTyping: boolean;
}

export class ChatHandler extends EventEmitter {
  private io: SocketServer;
  private orchestrator: ChatOrchestrator;
  private sessions: Map<string, ClientSession> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: HttpServer, orchestrator: ChatOrchestrator) {
    super();
    this.orchestrator = orchestrator;
    
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket']
    });

    this.setupOrchestrationListeners();
    this.setupSocketHandlers();
  }

  private setupOrchestrationListeners(): void {
    // Listen for response streaming events
    this.orchestrator.on('responseChunk', (chunk: any) => {
      const session = this.sessions.get(chunk.userId);
      if (session) {
        session.socket.emit('response_stream', {
          type: 'text',
          content: chunk.text
        });
      }
    });

    // Listen for animation updates
    this.orchestrator.on('animationUpdate', (data: any) => {
      const session = this.sessions.get(data.userId);
      if (session) {
        session.socket.emit('response_stream', {
          type: 'animation',
          expression: data.expression,
          intensity: data.intensity
        });
      }
    });

    // Listen for voice synthesis events
    this.orchestrator.on('voiceUpdate', (data: any) => {
      const session = this.sessions.get(data.userId);
      if (session) {
        session.socket.emit('response_stream', {
          type: 'voice',
          content: data.text
        });
      }
    });

    // Listen for emotional state changes
    this.orchestrator.on('emotionalStateUpdate', (data: any) => {
      const session = this.sessions.get(data.userId);
      if (session) {
        session.socket.emit('emotional_state', {
          emotion: data.emotion,
          intensity: data.intensity
        });
      }
    });

    // Listen for tool suggestions
    this.orchestrator.on('toolSuggestion', (data: any) => {
      const session = this.sessions.get(data.userId);
      if (session) {
        session.socket.emit('tool_suggestion', {
          name: data.tool.name,
          description: data.tool.description
        });
      }
    });

    // Listen for reflection insights
    this.orchestrator.on('reflection', (data: any) => {
      const session = this.sessions.get(data.userId);
      if (session) {
        session.socket.emit('reflection', {
          insights: data.insights,
          suggestedActions: data.suggestedActions
        });
      }
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New client connected:', socket.id);

      // Create new session
      const session: ClientSession = {
        userId: socket.id,
        socket,
        lastActivity: Date.now(),
        isTyping: false
      };
      this.sessions.set(socket.id, session);

      // Handle incoming messages
      socket.on('message', async (data: any, callback: Function) => {
        try {
          session.lastActivity = Date.now();

          const response = await this.orchestrator.handleMessage(data.content, {
            userId: socket.id,
            sessionId: socket.id,
            context: data.context
          });

          // Send complete response
          socket.emit('response_complete', {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.text,
            metadata: {
              emotion: response.emotion,
              animation: response.animation,
              audioUrl: response.voice?.audioStream ? true : undefined
            }
          });

          callback(); // Acknowledge message receipt
        } catch (error) {
          console.error('Error handling message:', error);
          callback(error);
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { isTyping: boolean }) => {
        session.isTyping = data.isTyping;
        
        // Clear existing timeout if any
        const existingTimeout = this.typingTimeouts.get(socket.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Broadcast typing status
        socket.broadcast.emit('userTyping', {
          userId: socket.id,
          isTyping: data.isTyping
        });

        // Set timeout to clear typing status
        if (data.isTyping) {
          const timeout = setTimeout(() => {
            session.isTyping = false;
            socket.broadcast.emit('userTyping', {
              userId: socket.id,
              isTyping: false
            });
          }, 3000);
          this.typingTimeouts.set(socket.id, timeout);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Clear typing timeout
        const timeout = this.typingTimeouts.get(socket.id);
        if (timeout) {
          clearTimeout(timeout);
          this.typingTimeouts.delete(socket.id);
        }

        // Remove session
        this.sessions.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
        socket.emit('error', {
          message: 'An error occurred',
          timestamp: Date.now()
        });
      });
    });
  }

  // Method to broadcast system messages to all clients
  broadcastSystemMessage(message: string): void {
    this.io.emit('response_complete', {
      id: Date.now().toString(),
      role: 'system',
      content: message,
      metadata: {
        emotion: {
          type: 'neutral',
          intensity: 0.5
        }
      }
    });
  }

  // Method to send message to specific client
  sendToClient(userId: string, message: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.socket.emit('response_complete', {
        id: Date.now().toString(),
        role: 'system',
        content: message,
        metadata: {
          emotion: {
            type: 'neutral',
            intensity: 0.5
          }
        }
      });
    }
  }

  // Method to get active sessions count
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  // Method to check if a user is connected
  isUserConnected(userId: string): boolean {
    return this.sessions.has(userId);
  }

  // Method to get user's last activity
  getUserLastActivity(userId: string): number | null {
    const session = this.sessions.get(userId);
    return session ? session.lastActivity : null;
  }

  // Cleanup method
  dispose(): void {
    // Clear all typing timeouts
    for (const [_, timeout] of this.typingTimeouts) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    // Close all connections
    for (const [_, session] of this.sessions) {
      session.socket.disconnect(true);
    }
    this.sessions.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}
