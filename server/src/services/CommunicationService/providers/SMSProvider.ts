import { BaseProvider } from '../BaseProvider';
import { SMSConfig, MessagePayload, DeliveryStatus } from '../types';
import { SMSParser, ParsedSMS } from '../parsers/SMSParser';
import { ChatOrchestrator } from '../../ChatOrchestrator';
import { MemoryManager } from '../../MemoryService/MemoryManager';
import twilio from 'twilio';

export class SMSProvider extends BaseProvider {
  private config: SMSConfig;
  private client: twilio.Twilio;
  private chatOrchestrator: ChatOrchestrator;
  private memoryManager: MemoryManager;
  private verifiedNumbers: Set<string> = new Set();

  constructor(
    config: SMSConfig, 
    chatOrchestrator: ChatOrchestrator,
    memoryManager: MemoryManager
  ) {
    super(config.options.rateLimits);
    this.config = config;
    this.chatOrchestrator = chatOrchestrator;
    this.memoryManager = memoryManager;
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.options.accountSid) {
      throw new Error('Twilio Account SID is required');
    }
    if (!this.config.options.authToken) {
      throw new Error('Twilio Auth Token is required');
    }
    if (!this.config.options.fromNumber) {
      throw new Error('Twilio From Number is required');
    }

    // Initialize Twilio client
    this.client = twilio(this.config.options.accountSid, this.config.options.authToken);
  }

  private async validateMessageSecurity(data: any): Promise<void> {
    const fromNumber = data.From;
    const message = data.Body;

    // Check if number is blocked
    if (this.config.options.security?.blockedNumbers?.includes(fromNumber)) {
      throw new Error('This number is blocked from sending messages');
    }

    // Check message length
    if (this.config.options.security?.maxMessageLength && 
        message.length > this.config.options.security.maxMessageLength) {
      throw new Error(`Message exceeds maximum length of ${this.config.options.security.maxMessageLength} characters`);
    }

    // Check phone verification if required
    if (this.config.options.security?.requirePhoneVerification && 
        !this.verifiedNumbers.has(fromNumber)) {
      // Send verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await this.sendMessage({
        content: `Your verification code is: ${verificationCode}. Please reply with /verify ${verificationCode}`,
        channel: 'sms',
        to: fromNumber
      });
      throw new Error('Phone verification required');
    }

    // Check if it's a command and validate it
    if (SMSParser.isCommand(message)) {
      const commandName = SMSParser.getCommandName(message);
      if (commandName && 
          this.config.options.security?.allowedCommands && 
          !this.config.options.security.allowedCommands.includes(commandName)) {
        throw new Error(`Command '${commandName}' is not allowed`);
      }
    }
  }

  public async sendMessage(payload: MessagePayload): Promise<DeliveryStatus> {
    try {
      // Validate payload
      this.validateMessagePayload(payload);

      // Check rate limits
      await this.checkRateLimits();

      // Send SMS using Twilio
      const message = await this.client.messages.create({
        body: payload.content,
        from: this.config.options.fromNumber,
        to: payload.to
      });

      // Store the sent message in memory
      await this.memoryManager.storeConversationMemory({
        role: 'assistant',
        content: payload.content
      }, 'neutral');

      return {
        messageId: message.sid,
        status: 'delivered',
        timestamp: Date.now(),
        metadata: {
          twilioMessageId: message.sid,
          twilioStatus: message.status
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        messageId: this.generateMessageId(),
        status: 'failed',
        timestamp: Date.now(),
        error: errorMessage
      };
    }
  }

  public async handleIncoming(data: any): Promise<MessagePayload> {
    try {
      // Validate message security
      await this.validateMessageSecurity(data);

      // Parse the incoming message
      const parsedMessage = SMSParser.parse(data.Body);

      // Handle verification command
      if (parsedMessage.type === 'command' && parsedMessage.command?.name === 'verify') {
        const [code] = parsedMessage.command.args;
        if (code) {
          // In a real implementation, you'd verify this against a stored code
          this.verifiedNumbers.add(data.From);
          return {
            content: 'Phone number verified successfully!',
            channel: 'sms',
            to: data.From
          };
        }
      }

      // Store the incoming message in memory
      await this.memoryManager.storeConversationMemory({
        role: 'user',
        content: parsedMessage.content
      }, 'neutral');

      // Convert Twilio webhook data to standard message payload
      const payload: MessagePayload = {
        content: parsedMessage.content,
        channel: 'sms',
        to: data.To,
        metadata: {
          replyTo: data.MessageSid,
          twilioStatus: data.MessageStatus,
          from: data.From,
          parsedMessage: parsedMessage
        }
      };

      // Process the message through the chat orchestrator
      const response = await this.chatOrchestrator.handleMessage(parsedMessage.content, {
        channel: 'sms',
        userId: data.From,
        sessionId: `sms_${data.From}`
      });

      // Send the response back via SMS
      await this.sendMessage({
        content: response.text,
        channel: 'sms',
        to: data.From
      });

      return payload;
    } catch (error) {
      // Send error message to user
      await this.sendMessage({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        channel: 'sms',
        to: data.From
      });
      throw error;
    }
  }

  private generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 