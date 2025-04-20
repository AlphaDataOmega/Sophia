import { VoiceSettings } from '../../types/voice';

interface QueuedRequest {
  text: string;
  voiceId: string;
  settings?: VoiceSettings;
  resolve: (value: ReadableStream) => void;
  reject: (reason?: any) => void;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000; // 1 second delay between requests
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private activeRequests = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * List all available voices
   */
  async listVoices() {
    try {
      console.log('Fetching voices from ElevenLabs...');
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch voices:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch voices: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.voices?.length || 0} voices`);
      return data;
    } catch (error) {
      console.error('Error in listVoices:', error);
      throw error;
    }
  }

  /**
   * Process the request queue
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check if we've hit the concurrent request limit
      if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
        console.log('Hit concurrent request limit, waiting...');
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
        continue;
      }

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.REQUEST_DELAY) {
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift()!;
      this.activeRequests++;
      
      try {
        const stream = await this.makeRequest(request.text, request.voiceId, request.settings);
        this.lastRequestTime = Date.now();
        request.resolve(stream);
      } catch (error) {
        request.reject(error);
      } finally {
        this.activeRequests--;
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Make the actual API request
   */
  private async makeRequest(
    text: string,
    voiceId: string,
    settings?: VoiceSettings
  ): Promise<ReadableStream> {
    console.log('Making ElevenLabs API request...', {
      voiceId,
      textLength: text.length,
      settings,
      activeRequests: this.activeRequests
    });

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: settings || {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate speech:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to generate speech: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    console.log('Successfully started speech generation stream');
    return response.body;
  }

  /**
   * Generate speech from text
   * Returns a ReadableStream for streaming audio
   */
  async generateSpeech(
    text: string,
    voiceId: string,
    settings?: VoiceSettings
  ): Promise<ReadableStream> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        text,
        voiceId,
        settings,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  /**
   * Get voice settings
   */
  async getVoiceSettings(voiceId: string) {
    try {
      console.log(`Fetching settings for voice ${voiceId}...`);
      const response = await fetch(
        `${this.baseUrl}/voices/${voiceId}/settings`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch voice settings:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch voice settings: ${errorText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched voice settings:', data);
      return data;
    } catch (error) {
      console.error('Error in getVoiceSettings:', error);
      throw error;
    }
  }

  /**
   * Update voice settings
   */
  async updateVoiceSettings(
    voiceId: string,
    settings: VoiceSettings
  ) {
    try {
      console.log(`Updating settings for voice ${voiceId}...`, settings);
      const response = await fetch(
        `${this.baseUrl}/voices/${voiceId}/settings/edit`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update voice settings:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to update voice settings: ${errorText}`);
      }

      const data = await response.json();
      console.log('Successfully updated voice settings:', data);
      return data;
    } catch (error) {
      console.error('Error in updateVoiceSettings:', error);
      throw error;
    }
  }
} 