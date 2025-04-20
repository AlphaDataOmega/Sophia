import { ChannelProvider, MessagePayload, DeliveryStatus } from './types';

export abstract class BaseProvider implements ChannelProvider {
  protected isInitialized: boolean = false;
  protected rateLimits: {
    perMinute: number;
    perHour: number;
  } | null = null;

  constructor(rateLimits?: { perMinute: number; perHour: number }) {
    if (rateLimits) {
      this.rateLimits = rateLimits;
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.validateConfig();
    this.isInitialized = true;
  }

  protected abstract validateConfig(): Promise<void>;
  public abstract sendMessage(payload: MessagePayload): Promise<DeliveryStatus>;
  public abstract handleIncoming(data: any): Promise<MessagePayload>;

  protected validateMessagePayload(payload: MessagePayload): void {
    if (!payload.to) {
      throw new Error('Recipient address is required');
    }
    if (!payload.content) {
      throw new Error('Message content is required');
    }
  }

  protected async checkRateLimits(): Promise<void> {
    if (!this.rateLimits) {
      return;
    }
    // TODO: Implement rate limiting logic
    // This would track requests in a time window and throw if limits are exceeded
  }
} 