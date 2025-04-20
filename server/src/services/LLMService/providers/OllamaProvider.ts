import { LLMRequest, LLMResponse } from '../types';
import ollama from 'ollama';

export class OllamaProvider {
  constructor(private model: string) {}

  async generate(prompt: string): Promise<string> {
    try {
      const response = await ollama.generate({
        model: this.model,
        prompt,
        stream: false
      });
      return response.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const response = await ollama.chat({
        model: this.model,
        messages,
        stream: false
      });
      return response.message.content;
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }
} 