import { EventEmitter } from 'events';
import { MemoryManager } from '../MemoryService/MemoryManager';
import { LLMRouter } from '../LLMService';
import { PersonalityService } from '../PersonalityService';
import { MemoryType } from '../MemoryService/types';
import {
  ReflectionTrigger,
  ReflectionResult,
  ReflectionConfig,
  ReflectionInsight,
  SuggestedAction,
  EmotionalSummary
} from './types';
import { LLMTaskType } from '../LLMService/types';

export class ReflectionService extends EventEmitter {
  private memoryManager: MemoryManager;
  private llmRouter: LLMRouter;
  private personalityService: PersonalityService;
  private config: ReflectionConfig;
  private lastActivityTimestamp: number;
  private lastReflectionTimestamp: number;
  private isReflecting: boolean = false;
  private reflectionTimer: NodeJS.Timeout | null = null;

  constructor(
    memoryManager: MemoryManager,
    llmRouter: LLMRouter,
    personalityService: PersonalityService,
    config: ReflectionConfig
  ) {
    super();
    this.memoryManager = memoryManager;
    this.llmRouter = llmRouter;
    this.personalityService = personalityService;
    this.config = config;
    this.lastActivityTimestamp = Date.now();
    this.lastReflectionTimestamp = Date.now();
  }

  initialize(): void {
    // Start monitoring for idle periods
    this.startIdleMonitoring();
    
    // Start scheduled reflection timer
    this.startScheduledReflections();

    // Listen for relevant events from other services
    this.setupEventListeners();
  }

  private startIdleMonitoring(): void {
    setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTimestamp;
      if (idleTime >= this.config.idleThreshold && !this.isReflecting) {
        this.triggerReflection({
          type: 'idle',
          duration: idleTime
        });
      }
    }, 1000); // Check every second
  }

  private startScheduledReflections(): void {
    this.reflectionTimer = setInterval(() => {
      this.triggerReflection({
        type: 'scheduled'
      });
    }, this.config.reflectionInterval);
  }

  private setupEventListeners(): void {
    // Listen for activity from other services
    this.memoryManager.on('memoryStored', () => this.updateActivityTimestamp());
    this.personalityService.on('emotionalStateUpdate', () => this.updateActivityTimestamp());
  }

  private updateActivityTimestamp(): void {
    this.lastActivityTimestamp = Date.now();
  }

  async triggerReflection(trigger: ReflectionTrigger): Promise<ReflectionResult> {
    if (this.isReflecting) {
      throw new Error('Reflection already in progress');
    }

    this.isReflecting = true;
    this.emit('reflectionStart', trigger);

    try {
      // Gather context
      const recentMemories = await this.gatherRecentMemories();
      const emotionalContext = await this.gatherEmotionalContext();
      const toolUsagePatterns = await this.analyzeToolUsage();

      // Generate insights
      const insights = await this.generateInsights(recentMemories, emotionalContext);
      
      // Generate action suggestions
      const suggestedActions = await this.generateSuggestedActions(
        insights,
        toolUsagePatterns
      );

      // Create emotional summary
      const emotionalSummary = await this.createEmotionalSummary(
        emotionalContext,
        recentMemories
      );

      const result: ReflectionResult = {
        timestamp: Date.now(),
        insights,
        suggestedActions,
        emotionalSummary
      };

      // Store reflection result as a memory
      await this.storeReflectionResult(result);

      // Notify through configured channels
      await this.sendNotifications(result);

      this.lastReflectionTimestamp = Date.now();
      this.emit('reflectionComplete', result);

      return result;
    } finally {
      this.isReflecting = false;
    }
  }

  private async gatherRecentMemories() {
    const timeframe = Date.now() - this.lastReflectionTimestamp;
    return this.memoryManager.getRelevantMemories('', {
      types: [MemoryType.CONVERSATION, MemoryType.TOOL_USAGE],
      limit: this.config.maxMemoriesToAnalyze
    });
  }

  private async gatherEmotionalContext() {
    return {
      currentState: this.personalityService.getCurrentEmotionalState(),
      history: this.personalityService.getEmotionalHistory(),
      personality: this.personalityService.getPersonalityProfile()
    };
  }

  private async analyzeToolUsage() {
    // Analyze patterns in tool usage from recent memories
    const memories = await this.memoryManager.getRelevantMemories('', {
      types: [MemoryType.TOOL_USAGE],
      limit: 100
    });

    return this.analyzeToolPatterns(memories);
  }

  private async generateInsights(
    memories: any[],
    emotionalContext: any
  ): Promise<ReflectionInsight[]> {
    // Use LLM to generate insights from memories and emotional context
    const prompt = this.constructInsightPrompt(memories, emotionalContext);
    const response = await this.llmRouter.route({
      content: prompt,
      taskType: LLMTaskType.HIGH_CONTEXT,
      context: { complexity: 0.8 }
    });
    
    return this.parseInsightsFromLLMResponse(response.content);
  }

  private async generateSuggestedActions(
    insights: ReflectionInsight[],
    toolPatterns: any
  ): Promise<SuggestedAction[]> {
    // Use LLM to generate action suggestions based on insights
    const prompt = this.constructActionPrompt(insights, toolPatterns);
    const response = await this.llmRouter.route({
      content: prompt,
      taskType: LLMTaskType.HIGH_CONTEXT,
      context: { complexity: 0.8 }
    });
    
    return this.parseActionsFromLLMResponse(response.content);
  }

  private async createEmotionalSummary(
    emotionalContext: any,
    memories: any[]
  ): Promise<EmotionalSummary> {
    const emotionalTrajectory = this.analyzeEmotionalTrajectory(
      emotionalContext.history
    );

    return {
      dominantEmotion: this.calculateDominantEmotion(emotionalTrajectory),
      emotionalTrajectory,
      userInteractionQuality: this.calculateInteractionQuality(memories)
    };
  }

  private async storeReflectionResult(result: ReflectionResult): Promise<void> {
    const content = JSON.stringify(result);
    await this.memoryManager.storeConversationMemory({
      role: 'system',
      content
    });
  }

  private async sendNotifications(result: ReflectionResult): Promise<void> {
    const summary = this.createNotificationSummary(result);
    
    for (const channel of this.config.notificationChannels) {
      try {
        await this.sendNotification(channel, summary);
      } catch (error) {
        console.error(`Failed to send notification to ${channel}:`, error);
      }
    }
  }

  private analyzeToolPatterns(memories: any[]): any {
    // Analyze tool usage patterns
    const toolUsage = new Map<string, number>();
    const toolSuccess = new Map<string, number>();
    const toolFailure = new Map<string, number>();

    memories.forEach(memory => {
      const { tool, success } = memory.memory.content;
      toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
      if (success) {
        toolSuccess.set(tool, (toolSuccess.get(tool) || 0) + 1);
      } else {
        toolFailure.set(tool, (toolFailure.get(tool) || 0) + 1);
      }
    });

    return {
      usage: Object.fromEntries(toolUsage),
      success: Object.fromEntries(toolSuccess),
      failure: Object.fromEntries(toolFailure)
    };
  }

  private analyzeEmotionalTrajectory(history: any[]): any[] {
    return history.map(state => ({
      emotion: state.primary,
      intensity: state.intensity,
      timestamp: state.timestamp
    }));
  }

  private calculateDominantEmotion(trajectory: any[]): string {
    const emotionCounts: Record<string, number> = trajectory.reduce((acc, curr) => {
      acc[curr.emotion] = (acc[curr.emotion] || 0) + curr.intensity;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(emotionCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private calculateInteractionQuality(memories: any[]): number {
    // Implement interaction quality calculation based on:
    // - Response times
    // - Emotional positivity
    // - Task completion success
    // - User engagement patterns
    return 0.75; // Placeholder implementation
  }

  private createNotificationSummary(result: ReflectionResult): string {
    return `
Reflection Summary:
- Key Insights: ${result.insights.length}
- Suggested Actions: ${result.suggestedActions.length}
- Dominant Emotion: ${result.emotionalSummary.dominantEmotion}
- Interaction Quality: ${(result.emotionalSummary.userInteractionQuality * 100).toFixed(1)}%
    `.trim();
  }

  private async sendNotification(
    channel: 'console' | 'sms' | 'telegram',
    summary: string
  ): Promise<void> {
    switch (channel) {
      case 'console':
        console.log('[Reflection Notification]:', summary);
        break;
      // Implement other notification channels as needed
    }
  }

  private constructInsightPrompt(memories: any[], emotionalContext: any): string {
    return `
Analyze the following interaction context and generate insights:

Recent Memories:
${JSON.stringify(memories, null, 2)}

Emotional Context:
${JSON.stringify(emotionalContext, null, 2)}

Generate insights about:
1. User interaction patterns
2. Emotional trends
3. Tool usage effectiveness
4. Potential improvements
`.trim();
  }

  private parseInsightsFromLLMResponse(response: string): ReflectionInsight[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse insights:', error);
      return [];
    }
  }

  private constructActionPrompt(insights: ReflectionInsight[], toolPatterns: any): string {
    return `
Based on these insights and tool usage patterns, suggest actions:

Insights:
${JSON.stringify(insights, null, 2)}

Tool Usage Patterns:
${JSON.stringify(toolPatterns, null, 2)}

Suggest specific actions to:
1. Improve user experience
2. Optimize tool usage
3. Enhance emotional engagement
4. Address identified issues
`.trim();
  }

  private parseActionsFromLLMResponse(response: string): SuggestedAction[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse actions:', error);
      return [];
    }
  }

  private async searchMemories(query: string, options: { limit?: number } = {}): Promise<any[]> {
    const results = await this.memoryManager.getRelevantMemories(query, { limit: options.limit || 5 });
    return results.map(result => result.memory);
  }

  private async storeMemory(content: string, type: MemoryType, metadata: any = {}): Promise<string> {
    return this.memoryManager.storeConversationMemory({
      role: 'system',
      content
    });
  }

  private async generateStructuredResponse(prompt: string, taskType: string): Promise<any> {
    const response = await this.llmRouter.route({
      content: prompt,
      taskType: taskType as any
    });
    return response.content;
  }

  dispose(): void {
    if (this.reflectionTimer) {
      clearInterval(this.reflectionTimer);
    }
    this.removeAllListeners();
  }
}
