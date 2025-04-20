import { Router } from 'express';
import { WebSocketServer } from 'ws';
import { EnvironmentService } from '../services/EnvironmentService';

const router = Router();
const wss = new WebSocketServer({ noServer: true });
const environmentService = new EnvironmentService({
  stableDiffusionUrl: process.env.STABLE_DIFFUSION_URL || 'http://localhost:7860'
});

// Initialize environment service
environmentService.initialize().catch(console.error);

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New environment client connected');

  // Send initial state
  const state = environmentService.getCurrentState();
  if (state) {
    ws.send(JSON.stringify({
      type: 'state',
      state
    }));
  }

  // Listen for environment updates
  environmentService.on('stateUpdate', (state) => {
    ws.send(JSON.stringify({
      type: 'state',
      state
    }));
  });

  environmentService.on('transitionProgress', (progress) => {
    ws.send(JSON.stringify({
      type: 'transitionProgress',
      progress
    }));
  });

  environmentService.on('transitionComplete', (state) => {
    ws.send(JSON.stringify({
      type: 'transitionComplete',
      state
    }));
  });

  environmentService.on('ambientUpdate', (effects) => {
    ws.send(JSON.stringify({
      type: 'ambientUpdate',
      effects
    }));
  });

  // Handle client messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'updateEnvironment':
          await environmentService.updateEnvironment(data.mood, data.intensity);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Clean up on disconnect
  ws.on('close', () => {
    console.log('Environment client disconnected');
  });
});

// Upgrade HTTP to WebSocket
router.ws('/environment', (ws, req) => {
  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss.emit('connection', ws, req);
  });
});

export default router; 