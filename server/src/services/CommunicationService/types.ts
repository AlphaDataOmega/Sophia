export type Channel = 'sms' | 'webhook';

export interface MessagePayload {
  channel: Channel;
  to: string;
  content: string;
  metadata?: {
    replyTo?: string;
    priority?: 'low' | 'normal' | 'high';
    [key: string]: any;
  };
}

export interface DeliveryStatus {
  status: 'queued' | 'delivered' | 'failed';
  messageId: string;
  timestamp: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RateLimits {
  perMinute: number;
  perHour: number;
}

export interface ChannelConfig {
  enabled: boolean;
  options: {
    rateLimits?: RateLimits;
    [key: string]: any;
  };
}

export interface SMSConfig extends ChannelConfig {
  options: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    rateLimits?: RateLimits;
    security?: {
      allowedCommands?: string[];
      blockedNumbers?: string[];
      maxMessageLength?: number;
      requirePhoneVerification?: boolean;
    };
  };
}

export interface WebhookConfig extends ChannelConfig {
  options: {
    url: string;
    headers?: Record<string, string>;
    rateLimits?: RateLimits;
  };
}

export interface ChannelProvider {
  initialize(): Promise<void>;
  sendMessage(payload: MessagePayload): Promise<DeliveryStatus>;
  handleIncoming(data: any): Promise<MessagePayload>;
}
