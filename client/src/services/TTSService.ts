import { PhonemeService } from './PhonemeService';
import { AnimationService } from './AnimationService';

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export class TTSService {
  private static instance: TTSService | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentPromise: Promise<void> | null = null;
  private sentenceQueue: string[] = [];
  private nextAudioBuffer: AudioBuffer | null = null;
  private phonemeService: PhonemeService;
  private currentPhoneme: string = 'viseme_sil';
  private animationService: AnimationService;
  private API_URL: string;
  private isProcessingQueue: boolean = false;
  private wordTimings: WordTiming[] = [];
  private currentWordIndex: number = 0;
  private wordUpdateInterval: number | null = null;
  private voiceSettings: VoiceSettings = {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.35,
    use_speaker_boost: true
  };

  private constructor() {
    this.phonemeService = PhonemeService.getInstance();
    this.animationService = AnimationService.getInstance();
    this.API_URL = import.meta.env.REACT_APP_API_URL?.replace('/api/chat', '') || 'http://localhost:3001';
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  public setVoiceSettings(settings: Partial<VoiceSettings>): void {
    // Implementation of setVoiceSettings method
  }

  public queueText(text: string): void {
    // Split text into sentences using regex
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    console.log('Queueing sentences:', sentences);
    
    // Transition to thinking state when queueing text
    this.animationService.playAnimation('thinking');
    
    this.sentenceQueue.push(...sentences);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.sentenceQueue.length === 0) return;

    this.isProcessingQueue = true;
    try {
      while (this.sentenceQueue.length > 0) {
        const sentence = this.sentenceQueue[0];
        console.log('Processing sentence:', sentence);
        
        // Preload the next sentence if available
        if (this.sentenceQueue.length > 1) {
          this.preloadNextSentence(this.sentenceQueue[1]);
        }

        // Start phoneme processing before speaking
        this.phonemeService.startProcessing();
        
        // Transition to talking state
        this.animationService.playAnimation('talking');
        
        // Process the sentence and wait for completion
        await this.processSentence(sentence);
        
        // Remove the processed sentence
        this.sentenceQueue.shift();
      }
    } catch (error) {
      console.error('Error processing TTS queue:', error);
      this.animationService.playAnimation('idle');
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async preloadNextSentence(sentence: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_URL}/api/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sentence,
          voiceId: '21m00Tcm4TlvDq8ikWAM',
          ...this.voiceSettings
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      this.nextAudioBuffer = await this.audioContext!.decodeAudioData(audioData);
    } catch (error) {
      console.error('Error preloading next sentence:', error);
      this.nextAudioBuffer = null;
    }
  }

  private async processSentence(sentence: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      console.log('Processing sentence:', sentence);
      
      // Start phoneme processing before speaking
      if (!this.phonemeService.isProcessing) {
        this.phonemeService.startProcessing();
      }

      // Get audio data from API
      const response = await fetch(`${this.API_URL}/api/tts/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sentence,
          voiceId: '21m00Tcm4TlvDq8ikWAM',
          ...this.voiceSettings
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }

      // Get the audio data as ArrayBuffer
      const audioData = await response.arrayBuffer();

      // Decode audio data
      this.audioBuffer = await this.audioContext.decodeAudioData(audioData);

      // Create and configure audio nodes
      this.audioSource = this.audioContext.createBufferSource();
      this.gainNode = this.audioContext.createGain();
      this.audioSource.buffer = this.audioBuffer;
      this.audioSource.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Split sentence into words and estimate timing
      const words = sentence.split(/\s+/);
      const wordDuration = this.audioBuffer.duration / words.length;
      
      // Create estimated word timings
      this.wordTimings = words.map((word, index) => ({
        word,
        start: index * wordDuration,
        end: (index + 1) * wordDuration
      }));
      this.currentWordIndex = 0;

      // Start word timing updates
      this.startWordTimingUpdates();

      // Play the audio
      this.audioSource.start();
      this.isPlaying = true;

      // Wait for audio to finish playing
      await new Promise<void>((resolve) => {
        if (this.audioSource) {
          this.audioSource.onended = () => {
            this.stopWordTimingUpdates();
            this.isPlaying = false;
            resolve();
          };
        } else {
          resolve();
        }
      });
      
    } catch (error) {
      console.error('Error processing sentence:', error);
      this.isPlaying = false;
      this.stopWordTimingUpdates();
    }
  }

  private startWordTimingUpdates(): void {
    if (this.wordUpdateInterval) {
      clearInterval(this.wordUpdateInterval);
    }

    const startTime = this.audioContext!.currentTime;
    this.wordUpdateInterval = window.setInterval(() => {
      const currentTime = this.audioContext!.currentTime - startTime;
      
      // Find the current word based on timing
      while (
        this.currentWordIndex < this.wordTimings.length &&
        currentTime >= this.wordTimings[this.currentWordIndex].end
      ) {
        this.currentWordIndex++;
      }

      if (this.currentWordIndex < this.wordTimings.length) {
        const currentWord = this.wordTimings[this.currentWordIndex];
        if (currentTime >= currentWord.start && currentTime < currentWord.end) {
          // Process phonemes for the current word
          const phonemes = this.analyzeWordForPhonemes(currentWord.word);
          for (const phoneme of phonemes) {
            this.phonemeService.processPhoneme(phoneme);
          }
        } else if (currentTime >= currentWord.end) {
          // Ensure we return to neutral position between words
          this.phonemeService.processPhoneme('viseme_sil');
        }
      }
    }, 16); // Update at ~60fps
  }

  private stopWordTimingUpdates(): void {
    if (this.wordUpdateInterval) {
      clearInterval(this.wordUpdateInterval);
      this.wordUpdateInterval = null;
    }
    this.wordTimings = [];
    this.currentWordIndex = 0;
    this.phonemeService.processPhoneme('viseme_sil');
  }

  private analyzeWordForPhonemes(word: string): string[] {
    // Convert to lowercase for matching
    const lowerWord = word.toLowerCase();
    
    // Map of phoneme patterns to visemes
    const phonemePatterns: { [key: string]: string } = {
      // Vowels
      'a|aa|ah': 'viseme_aa',
      'e|ee|eh': 'viseme_E',
      'i|ii|ih': 'viseme_I',
      'o|oo|oh': 'viseme_O',
      'u|uu|uh': 'viseme_U',
      
      // Consonants
      'p|b': 'viseme_PP',
      'f|v': 'viseme_FF',
      'th': 'viseme_TH',
      't|d': 'viseme_DD',
      'k|g': 'viseme_kk',
      'ch|j': 'viseme_CH',
      's|z': 'viseme_SS',
      'n|m': 'viseme_nn',
      'r|l': 'viseme_RR',
      
      // Default to silence
      'default': 'viseme_sil'
    };

    const phonemes: string[] = [];
    
    // Check each pattern
    for (const [pattern, viseme] of Object.entries(phonemePatterns)) {
      if (pattern === 'default') continue;
      
      const regex = new RegExp(pattern, 'g');
      const matches = lowerWord.match(regex);
      
      if (matches) {
        phonemes.push(viseme);
      }
    }
    
    // If no phonemes found, use default
    if (phonemes.length === 0) {
      phonemes.push(phonemePatterns['default']);
    }
    
    return phonemes;
  }

  public async speak(text: string): Promise<void> {
    if (!text) return;

    try {
      // Split text into sentences
      const sentences = text.split(/(?<=[.!?])\s+/);
      
      // Process each sentence
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        
        // Queue the sentence
        this.sentenceQueue.push(sentence);
        console.log('Queueing sentences:', this.sentenceQueue);
        
        // Process the sentence
        await this.processSentence(sentence);
        
        // Remove the processed sentence
        this.sentenceQueue.shift();
      }
      
    } catch (error) {
      console.error('Error in speak:', error);
    } finally {
      // Only stop processing if we're done with all sentences
      if (this.sentenceQueue.length === 0) {
        this.phonemeService.stopProcessing();
      }
    }
  }

  public stop(): void {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource = null;
    }
    this.phonemeService.stopProcessing();
    this.phonemeService.processPhoneme('viseme_sil');
    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    this.nextAudioBuffer = null;
  }

  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Only stop processing if we're done with all sentences
    if (this.sentenceQueue.length === 0) {
      this.phonemeService.stopProcessing();
    }
  }
} 