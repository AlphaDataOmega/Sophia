import { EventEmitter } from 'events';
import {
  Channel,
  MessagePayload,
  ChannelConfig,
  DeliveryStatus,
  ChannelProvider
} from './types';
import { TelegramProvider } from './providers/TelegramProvider';
import { SMSProvider } from './providers/SMSProvider';
import { WebhookProvider } from './providers/WebhookProvider';

export class CommunicationService extends EventEmitter {
  private providers: Map<Channel, ChannelProvider>;
  private config: Record<Channel, ChannelConfig>;
  private messageQueue: Map<string, MessagePayload>;
  private retryIntervals: number[] = [1000, 5000, 15000]; // Retry delays in ms

  constructor(config: Record<Channel, ChannelConfig>) {
    super();
    this.config = config;
    this.providers = new Map();
    this.messageQueue = new Map();
  }

  async initialize(): Promise<void> {
    // Initialize enabled providers
    if (this.config.telegram.enabled) {
      this.providers.set('telegram', new TelegramProvider(this.config.telegram));
    }
    if (this.config.sms.enabled) {
      this.providers.set('sms', new SMSProvider(this.config.sms));
    }
    if (this.config.webhook.enabled) {
      this.providers.set('webhook', new WebhookProvider(this.config.webhook));
    }

    // Initialize all providers
    await Promise.all(
      Array.from(this.providers.values()).map(provider => provider.initialize())
    );

    // Start queue processor
    this.processQueue();
  }

  async sendMessage(payload: MessagePayload): Promise<DeliveryStatus> {
    const messageId = this.generateMessageId();
    
    // Validate channel is enabled and configured
    if (!this.isChannelAvailable(payload.channel)) {
      throw new Error(`Channel ${payload.channel} is not available`);
    }

    // Add to queue
    this.messageQueue.set(messageId, {
      ...payload,
      metadata: {
        ...payload.metadata,
        attempts: 0,
        queuedAt: Date.now()
      }
    });

    // Emit queued event
    this.emit('messageQueued', { messageId, payload });

    // Return promise that resolves when message is delivered
    return new Promise((resolve, reject) => {
      this.once(`delivery:${messageId}`, (status: DeliveryStatus) => {
        if (status.status === 'delivered') {
          resolve(status);
        } else {
          reject(new Error(status.error));
        }
      });
    });
  }

  async handleIncoming(channel: Channel, data: any): Promise<void> {
    try {
      const provider = this.providers.get(channel);
      if (!provider) {
        throw new Error(`No provider found for channel ${channel}`);
      }

      // Convert incoming data to standard message payload
      const payload = await provider.handleIncoming(data);

      // Emit incoming message event
      this.emit('messageReceived', payload);

      // Acknowledge receipt
      this.emit('messageAcknowledged', {
        channel,
        timestamp: Date.now(),
        messageId: payload.metadata?.replyTo
      });
    } catch (error) {
      console.error(`Error handling incoming message from ${channel}:`, error);
      this.emit('error', {
        type: 'incomingMessageError',
        channel,
        error,
        timestamp: Date.now()
      });
    }
  }

  private async processQueue(): Promise<void> {
    while (true) {
      for (const [messageId, payload] of this.messageQueue) {
        try {
          const provider = this.providers.get(payload.channel);
          if (!provider) {
            throw new Error(`No provider found for channel ${payload.channel}`);
          }

          // Check rate limits
          if (this.isRateLimited(payload.channel)) {
            continue;
          }

          // Attempt to send message
          const status = await provider.sendMessage(payload);

          // Handle success
          if (status.status === 'delivered') {
            this.messageQueue.delete(messageId);
            this.emit(`delivery:${messageId}`, status);
            this.emit('messageDelivered', { messageId, status });
          } else if (status.status === 'failed') {
            // Handle retry logic
            const attempts = payload.metadata?.attempts || 0;
            if (attempts < this.retryIntervals.length) {
              // Schedule retry
              setTimeout(() => {
                this.messageQueue.set(messageId, {
                  ...payload,
                  metadata: {
                    ...payload.metadata,
                    attempts: attempts + 1
                  }
                });
              }, this.retryIntervals[attempts]);
            } else {
              // Max retries reached
              this.messageQueue.delete(messageId);
              this.emit(`delivery:${messageId}`, {
                ...status,
                error: 'Max retry attempts reached'
              });
              this.emit('messageFailed', { messageId, status });
            }
          }
        } catch (error) {
          console.error(`Error processing message ${messageId}:`, error);
          this.emit('error', {
            type: 'processingError',
            messageId,
            error,
            timestamp: Date.now()
          });
        }
      }

      // Wait before next queue processing cycle
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private isChannelAvailable(channel: Channel): boolean {
    return (
      this.config[channel]?.enabled &&
      this.providers.has(channel)
    );
  }

  private isRateLimited(channel: Channel): boolean {
    const limits = this.config[channel]?.options?.rateLimits;
    if (!limits) return false;

    // Implement rate limiting logic here
    return false; // Placeholder
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getChannelStatus(channel: Channel): {
    available: boolean;
    rateLimited: boolean;
    queueSize: number;
  } {
    return {
      available: this.isChannelAvailable(channel),
      rateLimited: this.isRateLimited(channel),
      queueSize: Array.from(this.messageQueue.values())
        .filter(msg => msg.channel === channel).length
    };
  }

  dispose(): void {
    this.removeAllListeners();
  }
}
