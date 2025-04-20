# Sophia AI Assistant - Lip Sync Implementation

## Overview
The lip-sync system synchronizes speech audio with facial expressions by mapping phonemes to visemes (visual representations of phonemes) in real-time. The system consists of three main components working together:

1. Text-to-Speech Service (`TTSService`)
2. Phoneme Service (`PhonemeService`)
3. 3D Avatar Component (`SophiaAvatar`)

## Architecture

### TTSService
The `TTSService` is responsible for:
- Converting text to speech using ElevenLabs API
- Managing audio playback using Web Audio API
- Coordinating phoneme processing with audio playback
- Handling sentence queuing and processing

Key features:
```typescript
class TTSService {
  // Singleton instance
  private static instance: TTSService | null = null;
  
  // Audio playback components
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer;
  private audioSource: AudioBufferSourceNode;
  
  // Queue management
  private sentenceQueue: string[];
  private isProcessingQueue: boolean;
}
```

### PhonemeService
The `PhonemeService` manages:
- Blend shape targets for facial expressions
- Phoneme-to-viseme mapping
- Smooth transitions between expressions
- Real-time weight updates

Key features:
```typescript
class PhonemeService {
  // Viseme mapping for facial expressions
  private readonly visemeMapping: VisemeMapping = {
    'viseme_sil': { weight: 1.0, targets: ['viseme_sil'] },
    'viseme_PP': { weight: 1.0, targets: ['viseme_PP'] },
    // ... other viseme mappings
  };
  
  // Blend shape management
  private blendShapeTargets: string[];
  private targetWeights: { [key: string]: number };
  private currentWeights: { [key: string]: number };
}
```

## Implementation Details

### 1. Text Processing
- Text is split into sentences using regex: `/(?<=[.!?])\s+/`
- Sentences are queued for processing
- Each sentence is further split into words for phoneme analysis

### 2. Phoneme Analysis
Words are analyzed using pattern matching to identify phonemes:
```typescript
const phonemePatterns = {
  // Vowels
  'a|aa|ah': 'viseme_aa',
  'e|ee|eh': 'viseme_E',
  // ... other patterns
};
```

### 3. Audio-Visual Synchronization
The synchronization process:
1. Audio is fetched from TTS API
2. Audio playback begins
3. Phonemes are processed in sequence with timing delays
4. Blend shapes are updated in real-time
5. Smooth transitions are handled using linear interpolation

### 4. Blend Shape Management
- Each viseme corresponds to one or more blend shape targets
- Weights are interpolated for smooth transitions
- Default neutral position is maintained using 'viseme_sil'

## Technical Specifications

### Timing Parameters
- Phoneme transition time: 0.1 seconds
- Inter-phoneme delay: 100ms
- Audio buffer preloading for smooth playback

### Voice Settings
```typescript
interface VoiceSettings {
  stability: number;       // Default: 0.75
  similarity_boost: number;// Default: 0.75
  style: number;          // Default: 0.35
  use_speaker_boost: boolean; // Default: true
}
```

## Best Practices

1. **Initialization**
   - Always initialize PhonemeService with the correct head mesh
   - Ensure AudioContext is created after user interaction
   - Verify blend shape targets exist before processing

2. **Performance**
   - Preload next sentence audio while processing current
   - Use efficient regex patterns for text splitting
   - Implement proper cleanup in dispose methods

3. **Error Handling**
   - Handle missing blend shapes gracefully
   - Manage audio playback failures
   - Maintain neutral expression on errors

## Future Improvements

1. **Enhanced Phoneme Detection**
   - Implement more sophisticated phoneme detection
   - Add support for different languages
   - Fine-tune timing parameters

2. **Audio Analysis**
   - Add real-time audio analysis for better sync
   - Implement amplitude-based expression intensity
   - Add support for emotion detection

3. **Performance Optimization**
   - Implement worker threads for phoneme analysis
   - Add caching for frequently used sentences
   - Optimize blend shape transitions

## Troubleshooting

Common issues and solutions:
1. **No Audio Playback**
   - Verify AudioContext is initialized after user interaction
   - Check API endpoint connectivity
   - Verify voice ID is valid

2. **Lip Sync Issues**
   - Check phoneme processing timing
   - Verify blend shape target names
   - Ensure mesh is properly initialized

3. **Performance Issues**
   - Reduce sentence queue size
   - Optimize phoneme processing delays
   - Check for memory leaks in audio handling 