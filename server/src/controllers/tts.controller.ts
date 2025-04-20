import { Request, Response } from 'express';
import { ElevenLabsService } from '../services/VoiceService/ElevenLabsService';
import { VoiceSettings } from '../types/voice';
import config from '../config';

const elevenLabsService = new ElevenLabsService(config.elevenLabsApiKey);

export const listVoices = async (req: Request, res: Response) => {
  try {
    const voices = await elevenLabsService.listVoices();
    res.json(voices);
  } catch (error) {
    console.error('Error listing voices:', error);
    res.status(500).json({ error: 'Failed to list voices' });
  }
};

export const synthesizeSpeech = async (req: Request, res: Response) => {
  try {
    const { text, voiceId, settings } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    console.log('Synthesizing speech with voice:', voiceId, 'and settings:', settings);

    // Set response headers for streaming audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Stream the audio response
    const stream = await elevenLabsService.generateSpeech(text, voiceId, settings);
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();

  } catch (error: unknown) {
    console.error('Error synthesizing speech:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  }
};

export const getVoiceSettings = async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const settings = await elevenLabsService.getVoiceSettings(voiceId);
    res.json(settings);
  } catch (error) {
    console.error('Error getting voice settings:', error);
    res.status(500).json({ error: 'Failed to get voice settings' });
  }
};

export const updateVoiceSettings = async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const settings: VoiceSettings = req.body;
    await elevenLabsService.updateVoiceSettings(voiceId, settings);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating voice settings:', error);
    res.status(500).json({ error: 'Failed to update voice settings' });
  }
}; 