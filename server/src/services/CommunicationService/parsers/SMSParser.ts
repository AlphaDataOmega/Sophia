import { MessagePayload } from '../types';

export interface ParsedSMS {
  type: 'command' | 'message';
  content: string;
  command?: {
    name: string;
    args: string[];
  };
}

export class SMSParser {
  private static readonly COMMAND_PREFIX = '/';
  private static readonly COMMAND_REGEX = /^\/(\w+)(?:\s+(.+))?$/;

  static parse(content: string): ParsedSMS {
    // Trim whitespace and normalize content
    const normalizedContent = content.trim();

    // Check if it's a command
    if (normalizedContent.startsWith(this.COMMAND_PREFIX)) {
      const match = normalizedContent.match(this.COMMAND_REGEX);
      if (match) {
        const [, commandName, argsString] = match;
        return {
          type: 'command',
          content: normalizedContent,
          command: {
            name: commandName.toLowerCase(),
            args: argsString ? argsString.split(/\s+/) : []
          }
        };
      }
    }

    // Default to regular message
    return {
      type: 'message',
      content: normalizedContent
    };
  }

  static isCommand(content: string): boolean {
    return content.trim().startsWith(this.COMMAND_PREFIX);
  }

  static getCommandName(content: string): string | null {
    const match = content.trim().match(this.COMMAND_REGEX);
    return match ? match[1].toLowerCase() : null;
  }
} 