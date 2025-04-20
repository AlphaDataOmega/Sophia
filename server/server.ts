import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
// @ts-ignore - Ollama types are not available yet
import ollama from 'ollama';
import { ToolRegistry } from './src/services/ToolService/ToolRegistry';
import { llmService } from './src/services/LLMService/LLMService';
import { AnimationService } from './src/services/AnimationService';
import path from 'path';
import ttsRouter from './src/routes/tts.routes';
import memoryRouter from './src/routes/memory.routes';
import config from './src/config';
import { Config } from './src/config/types';

// Load environment variables first
dotenv.config();

// Initialize express app and middleware first
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Initialize services
const toolRegistry = new ToolRegistry(llmService, path.join(__dirname, 'tools'));
const animationService = new AnimationService(path.join(__dirname, 'animations'));

// Initialize the server
async function initializeServer() {
  try {
    await toolRegistry.initialize();
    await animationService.initialize();
    
    // Configure CORS with dynamic origin validation
    app.use(cors({
      origin: function(origin, callback) {
        if (!origin || config.corsOrigin === '*' || origin === config.corsOrigin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }));

    // Add middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Add routes
    app.use('/api/tts', ttsRouter);
    app.use('/api/memory', memoryRouter);
    app.use('/api/animations', animationService.getRouter());

    // WebSocket connection handling
    io.on('connection', (socket: Socket) => {
      console.log('Client connected');
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initializeServer();