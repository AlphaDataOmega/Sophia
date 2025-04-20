import { Server } from 'http';
import { ChatHandler } from './ChatHandler';
import { ChatOrchestrator } from '../services/ChatOrchestrator';

export function initializeWebSocket(
  server: Server,
  orchestrator: ChatOrchestrator
): ChatHandler {
  const chatHandler = new ChatHandler(server, orchestrator);

  // Log active connections every minute
  setInterval(() => {
    const activeCount = chatHandler.getActiveSessionsCount();
    console.log(`Active WebSocket connections: ${activeCount}`);
  }, 60000);

  return chatHandler;
}
