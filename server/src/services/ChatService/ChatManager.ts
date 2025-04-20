import { Server, Socket } from 'socket.io';
import { LLMRouter } from '../LLMService';
import { ChromaMemoryProvider } from '../MemoryService/index.ts';
import { VoiceService } from '../VoiceService';
import { AnimationService } from '../AnimationService';
import { ToolRegistry } from '../ToolService/ToolRegistry';
import { ChatMessage, ChatResponse, ChatContext } from './types';
import { LLMTaskType } from '../LLMService/types';
import { MemoryType } from '../MemoryService/types';

export class ChatManager {
  private io: Server;
  private llmRouter: LLMRouter;
  private memoryProvider: ChromaMemoryProvider;
  private voiceService: VoiceService;
  private animationService: AnimationService;
  private toolRegistry: ToolRegistry;
  private activeSessions: Map<string, ChatContext>;

  constructor(
    io: Server,
    llmRouter: LLMRouter,
    memoryProvider: ChromaMemoryProvider,
    voiceService: VoiceService,
    animationService: AnimationService,
    toolRegistry: ToolRegistry
  ) {
    this.io = io;
    this.llmRouter = llmRouter;
    this.memoryProvider = memoryProvider;
    this.voiceService = voiceService;
    this.animationService = animationService;
    this.toolRegistry = toolRegistry;
    this.activeSessions = new Map();

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // Initialize session
      const sessionContext: ChatContext = {
        userId: socket.id,
        sessionId: `session_${Date.now()}`,
        emotionalState: 'neutral',
        recentMemories: []
      };
      this.activeSessions.set(socket.id, sessionContext);

      // Handle messages
      socket.on('message', async (message: { content: string }) => {
        try {
          await this.handleMessage(socket, message.content);
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', { message: 'Failed to process message' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.activeSessions.delete(socket.id);
      });
    });
  }

  private async handleMessage(socket: Socket, content: string) {
    const context = this.activeSessions.get(socket.id)!;

    try {
      // 1. Store user message in memory
      await this.memoryProvider.store(content, MemoryType.CONVERSATION, {
        userId: context.userId,
        sessionId: context.sessionId
      });

      // 2. Get relevant memories for context
      const relevantMemories = await this.memoryProvider.search(content, {
        limit: 5,
        type: MemoryType.CONVERSATION
      });
      context.recentMemories = relevantMemories.map(m => m.memory.content);

      // 3. Analyze emotion (using LLM)
      const emotionResponse = await this.llmRouter.route({
        content,
        taskType: LLMTaskType.EMOTION,
        context: { emotion: context.emotionalState }
      });
      context.emotionalState = emotionResponse.metadata?.emotion || 'neutral';

      // 4. Generate main response
      const response = await this.llmRouter.route({
        content,
        taskType: LLMTaskType.HIGH_CONTEXT,
        context: {
          memories: context.recentMemories,
          emotion: context.emotionalState
        }
      });

      // Check if message requires tool execution
      const toolMatch = await this.llmRouter.route({
        content,
        taskType: LLMTaskType.STRUCTURED,
        context: { complexity: 0.8 }
      });

      if (toolMatch.metadata?.suggestedTool) {
        const tool = await this.toolRegistry.findTool(toolMatch.metadata.suggestedTool);
        
        if (tool.length > 0) {
          // Execute existing tool
          const result = await this.toolRegistry.executeTool(tool[0].name, {
            // Extract input from message
          });
          
          // Include tool result in response
          response.content += `\n\nTool execution result: ${JSON.stringify(result.output)}`;
        } else {
          // Propose new tool
          const newTool = await this.toolRegistry.proposeNewTool(content);
          socket.emit('tool_proposal', newTool);
        }
      }

      // 6. Generate speech and animation in parallel
      const [audioBuffer, animation] = await Promise.all([
        this.voiceService.synthesize(response.content),
        this.animationService.generateExpression(response.content, context.emotionalState)
      ]);

      // 7. Store assistant's response in memory
      await this.memoryProvider.store(response.content, MemoryType.CONVERSATION, {
        userId: context.userId,
        sessionId: context.sessionId,
        emotion: context.emotionalState,
        role: 'assistant'
      });

      // 8. Send complete response to client
      const chatResponse: ChatResponse = {
        text: response.content,
        audio: audioBuffer,
        animation
      };

      socket.emit('response', chatResponse);

    } catch (error) {
      console.error('Error in message pipeline:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  }

  // Helper method to stream responses
  private async streamResponse(socket: Socket, response: AsyncIterable<string>) {
    try {
      for await (const chunk of response) {
        socket.emit('response_stream', { content: chunk });
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      socket.emit('error', { message: 'Streaming error occurred' });
    }
  }
}
