export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  settings: VoiceSettings;
}

export interface VoiceResponse {
  voices: Voice[];
} 