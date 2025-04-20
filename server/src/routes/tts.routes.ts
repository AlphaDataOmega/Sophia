import { Router } from 'express';
import {
  listVoices,
  synthesizeSpeech,
  getVoiceSettings,
  updateVoiceSettings,
} from '../controllers/tts.controller';

const router = Router();

// Voice management routes
router.get('/voices', listVoices);
router.get('/voices/:voiceId/settings', getVoiceSettings);
router.post('/voices/:voiceId/settings', updateVoiceSettings);

// Speech synthesis route
router.post('/synthesize', synthesizeSpeech);

export default router; 