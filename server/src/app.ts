import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { ChatManager } from './services/ChatService/ChatManager';
import { LLMRouter } from './services/LLMService';
import { ChromaMemoryProvider } from './services/MemoryService';
import { VoiceService } from './services/VoiceService';
import { AnimationService } from './services/AnimationService';
import { ToolRegistry } from './services/ToolService/ToolRegistry';
import { initializeWebSocket } from './websocket';
import { ChatOrchestrator } from './services/ChatOrchestrator';
import { EnvironmentService } from './services/EnvironmentService';

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize Socket.IO server with proper CORS and transport configuration
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins in development
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
  });

  // Initialize services
  const llmRouter = new LLMRouter();
  const memoryProvider = new ChromaMemoryProvider(llmRouter);
  const voiceService = new VoiceService();
  const animationService = new AnimationService();
  const toolRegistry = new ToolRegistry();
  const environmentService = new EnvironmentService({
    stableDiffusionUrl: process.env.STABLE_DIFFUSION_URL || 'http://localhost:7860'
  });

  // Initialize all services
  await Promise.all([
    memoryProvider.initialize(),
    voiceService.initialize(),
    animationService.initialize(),
    toolRegistry.initialize(),
    environmentService.initialize()
  ]);

  // Create chat manager
  const chatManager = new ChatManager(
    io,
    llmRouter,
    memoryProvider,
    voiceService,
    animationService,
    toolRegistry
  );

  // Create orchestrator
  const orchestrator = new ChatOrchestrator({
    llm: llmRouter,
    memory: memoryProvider,
    animation: animationService,
    voice: voiceService,
    personality: null,
    reflection: null,
    communication: null
  });

  // Initialize WebSocket
  const chatHandler = initializeWebSocket(httpServer, orchestrator);

  // Set up environment service WebSocket handling
  const environmentNamespace = io.of('/environment');
  
  environmentNamespace.on('connection', (socket: any) => {
    console.log('Environment client connected:', socket.id);

    // Send initial state
    socket.emit('state', {
      state: environmentService.getCurrentState()
    });

    // Handle environment updates
    socket.on('updateEnvironment', async (data: { mood: string; intensity: number }) => {
      try {
        await environmentService.updateEnvironment(data.mood, data.intensity);
        socket.emit('state', {
          state: environmentService.getCurrentState()
        });
      } catch (error) {
        console.error('Failed to update environment:', error);
        socket.emit('error', { message: 'Failed to update environment' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Environment client disconnected:', socket.id);
    });
  });

  return { app, httpServer, chatHandler };
}
