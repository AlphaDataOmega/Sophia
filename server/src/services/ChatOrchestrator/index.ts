import { EventEmitter } from 'events';
import { LLMService } from '../LLMService';
import { MemoryService } from '../MemoryService';
import { AnimationService } from '../AnimationService';
import { VoiceService } from '../VoiceService';
import { PersonalityService } from '../PersonalityService';
import { ReflectionService } from '../ReflectionService';
import { CommunicationService } from '../CommunicationService';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    emotion?: string;
    animation?: string;
    voice?: any;
    timestamp?: number;
  };
}

interface ChatResponse {
  text: string;
  animation?: {
    type: string;
    intensity: number;
    duration: number;
  };
  voice?: {
    audioStream: ReadableStream;
    settings: any;
  };
  emotion?: {
    type: string;
    intensity: number;
  };
}

export class ChatOrchestrator extends EventEmitter {
  private llmService: LLMService;
  private memoryService: MemoryService;
  private animationService: AnimationService;
  private voiceService: VoiceService;
  private personalityService: PersonalityService;
  private reflectionService: ReflectionService;
  private communicationService: CommunicationService;

  constructor(services: {
    llm: LLMService;
    memory: MemoryService;
    animation: AnimationService;
    voice: VoiceService;
    personality: PersonalityService;
    reflection: ReflectionService;
    communication: CommunicationService;
  }) {
    super();
    this.llmService = services.llm;
    this.memoryService = services.memory;
    this.animationService = services.animation;
    this.voiceService = services.voice;
    this.personalityService = services.personality;
    this.reflectionService = services.reflection;
    this.communicationService = services.communication;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for personality state changes
    this.personalityService.on('emotionalStateUpdate', (state) => {
      this.animationService.transition(state.primary, state.intensity);
    });

    // Listen for reflection triggers
    this.reflectionService.on('reflectionComplete', (result) => {
      this.handleReflectionResult(result);
    });

    // Listen for external messages
    this.communicationService.on('messageReceived', (message) => {
      this.handleMessage(message.content, {
        channel: message.channel,
        userId: message.userId
      });
    });
  }

  async handleMessage(
    text: string,
    context: {
      channel?: string;
      userId: string;
      sessionId?: string;
    }
  ): Promise<ChatResponse> {
    try {
      // 1. Store message in memory
      await this.memoryService.storeMemory({
        type: 'message',
        content: text,
        metadata: {
          userId: context.userId,
          timestamp: Date.now(),
          channel: context.channel
        }
      });

      // 2. Get relevant memories for context
      const relevantMemories = await this.memoryService.searchMemories({
        query: text,
        limit: 5
      });

      // 3. Update emotional state based on message
      const emotionalTrigger = await this.llmService.analyzeEmotion(text);
      const personalityResponse = this.personalityService.processEmotionalTrigger(emotionalTrigger);

      // 4. Generate response with context
      const llmResponse = await this.llmService.generateResponse(text, {
        memories: relevantMemories,
        personality: personalityResponse,
        userId: context.userId
      });

      // 5. Generate voice and animation
      const [voiceResponse, animationResponse] = await Promise.all([
        this.voiceService.speak(llmResponse.text, {
          emotion: personalityResponse.emotion.primary,
          intensity: personalityResponse.emotion.intensity
        }),
        this.animationService.generateSequence(personalityResponse)
      ]);

      // 6. Store assistant's response in memory
      await this.memoryService.storeMemory({
        type: 'response',
        content: llmResponse.text,
        metadata: {
          emotion: personalityResponse.emotion,
          timestamp: Date.now()
        }
      });

      // 7. Prepare and emit response
      const response: ChatResponse = {
        text: llmResponse.text,
        animation: animationResponse,
        voice: voiceResponse,
        emotion: {
          type: personalityResponse.emotion.primary,
          intensity: personalityResponse.emotion.intensity
        }
      };

      this.emit('response', response);

      // 8. If external channel, send response
      if (context.channel) {
        await this.communicationService.sendMessage({
          content: llmResponse.text,
          channel: context.channel as any,
          userId: context.userId
        });
      }

      return response;

    } catch (error) {
      console.error('Error in chat orchestration:', error);
      throw error;
    }
  }

  private async handleReflectionResult(result: any): Promise<void> {
    // Generate a reflection message
    const reflectionMessage = await this.llmService.generateReflection(result);

    // Update personality based on insights
    if (result.suggestedActions.some((a: any) => a.type === 'personality_adjustment')) {
      this.personalityService.processEmotionalTrigger({
        type: 'reflection',
        intensity: 0.5,
        duration: 1000,
        decay: 0.1
      });
    }

    // Store reflection in memory
    await this.memoryService.storeMemory({
      type: 'reflection',
      content: reflectionMessage,
      metadata: {
        insights: result.insights,
        timestamp: Date.now()
      }
    });

    // Emit reflection for UI
    this.emit('reflection', {
      message: reflectionMessage,
      insights: result.insights
    });
  }

  async dispose(): Promise<void> {
    this.removeAllListeners();
    // Cleanup any active processes
  }
}
