import { EventEmitter } from 'events';
import { ElevenLabsService } from './ElevenLabsService';
import { VoiceSettings } from './types';

export interface VoiceState {
  isSpeaking: boolean;
  currentEmotion: string;
  currentVoice: string;
}

export interface VisemeData {
  type: string;
  start: number;
  end: number;
  value: number;
}

export interface VoiceResponse {
  audioStream: ReadableStream;
  visemes: VisemeData[];
  duration: number;
}

export class VoiceService extends EventEmitter {
  private settings: VoiceSettings;
  private state: VoiceState;
  private elevenLabs: ElevenLabsService;
  private emotionToSettingsMap: Map<string, VoiceSettings>;

  constructor(apiKey: string) {
    super();
    this.settings = {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.5,
      use_speaker_boost: true
    };
    this.state = {
      isSpeaking: false,
      currentEmotion: 'neutral',
      currentVoice: 'default'
    };
    this.elevenLabs = new ElevenLabsService(apiKey);
    
    // Initialize emotion settings with complete VoiceSettings objects
    const emotionSettings: Array<[string, VoiceSettings]> = [
      ['happy', { stability: 0.7, similarity_boost: 0.6, style: 0.8, use_speaker_boost: true }],
      ['sad', { stability: 0.4, similarity_boost: 0.4, style: 0.3, use_speaker_boost: true }],
      ['neutral', { stability: 0.5, similarity_boost: 0.5, style: 0.5, use_speaker_boost: true }]
    ];
    this.emotionToSettingsMap = new Map(emotionSettings);
  }

  private setupEmotionMappings() {
    // Map emotions to voice settings for more expressive speech
    this.emotionToSettingsMap = new Map([
      ['happy', { stability: 0.65, style: 0.45, similarity_boost: 0.75 }],
      ['sad', { stability: 0.85, style: 0.25, similarity_boost: 0.85 }],
      ['angry', { stability: 0.55, style: 0.65, similarity_boost: 0.65 }],
      ['neutral', { stability: 0.75, style: 0.35, similarity_boost: 0.75 }],
      ['excited', { stability: 0.60, style: 0.55, similarity_boost: 0.70 }],
      ['calm', { stability: 0.80, style: 0.30, similarity_boost: 0.80 }]
    ]);
  }

  async initialize(): Promise<void> {
    try {
      // Verify API key and voice availability
      const voices = await this.elevenLabs.listVoices();
      if (!voices.voices?.some(voice => voice.voice_id === this.state.currentVoice)) {
        throw new Error(`Default voice ID ${this.state.currentVoice} not found`);
      }
    } catch (error) {
      console.error('Failed to initialize VoiceService:', error);
      throw error;
    }
  }

  async speak(text: string, options: {
    emotion?: string;
    voiceId?: string;
    customSettings?: Partial<VoiceSettings>;
  } = {}): Promise<VoiceResponse> {
    const {
      emotion = 'neutral',
      voiceId = this.state.currentVoice,
      customSettings = {}
    } = options;

    // Update state
    this.state = {
      isSpeaking: true,
      currentEmotion: emotion,
      currentVoice: voiceId
    };

    try {
      // Get base settings for emotion
      const emotionSettings = this.emotionToSettingsMap.get(emotion) || {};
      
      // Merge with custom settings
      const finalSettings: VoiceSettings = {
        ...{
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true
        },
        ...emotionSettings,
        ...customSettings
      };

      // Generate speech
      const audioStream = await this.elevenLabs.generateSpeech(
        text,
        voiceId,
        finalSettings
      );

      // Generate mock visemes for now - in a real implementation, 
      // these would come from the TTS service or a separate viseme generator
      const visemes = this.generateVisemes(text);
      const duration = this.estimateDuration(text);

      // Emit events for real-time updates
      this.emit('speakStart', {
        text,
        emotion,
        voiceId,
        settings: finalSettings
      });

      return {
        audioStream,
        visemes,
        duration
      };
    } catch (error) {
      console.error('Error in speak:', error);
      this.state.isSpeaking = false;
      throw error;
    } finally {
      // Update state when done
      this.state = {
        ...this.state,
        isSpeaking: false,
        currentEmotion: 'neutral',
        currentVoice: 'default'
      };
      this.emit('speakEnd');
    }
  }

  // Temporary method to generate mock visemes - would be replaced with actual viseme generation
  private generateVisemes(text: string): VisemeData[] {
    const words = text.split(' ');
    const visemes: VisemeData[] = [];
    let currentTime = 0;

    words.forEach(word => {
      // Simplified viseme generation - one viseme per word
      visemes.push({
        type: 'sil', // silence
        start: currentTime,
        end: currentTime + 0.1,
        value: 1.0
      });

      currentTime += 0.3; // Approximate word duration
    });

    return visemes;
  }

  private estimateDuration(text: string): number {
    // Rough estimation: ~0.3 seconds per word
    return text.split(' ').length * 0.3;
  }

  getCurrentState(): VoiceState {
    return { ...this.state };
  }

  async getAvailableVoices() {
    return this.elevenLabs.listVoices();
  }

  async updateVoiceSettings(voiceId: string, settings: VoiceSettings) {
    return this.elevenLabs.updateVoiceSettings(voiceId, settings);
  }

  public setVoice(voice: string): void {
    this.state.currentVoice = voice;
    this.emit('voiceChanged', voice);
  }
}
