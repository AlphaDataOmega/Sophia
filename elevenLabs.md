# ElevenLabs Integration Documentation

[Previous content remains unchanged...]

## Animation Integration

### Animation States
The system manages the following animation states that sync with TTS:

1. **Idle State**
   - Default state when no speech is occurring
   - Smooth looping animation
   - Duration: 6s
   - Automatically transitions to other states

2. **Thinking State**
   - Used during speech processing
   - Duration: 4.25s
   - Triggered before speech begins
   - Loops until speech is ready

3. **Talking State**
   - Active during speech playback
   - Duration: 5.92s
   - Synchronized with phoneme processing
   - Loops smoothly during long sentences

4. **Focus State**
   - Used during complex interactions
   - Duration: 5.5s
   - Can be triggered during typing/processing

### State Transitions

1. **Transition Flow**
   ```
   Idle -> Thinking -> Talking -> Idle
   ```
   or
   ```
   Idle -> Focus -> Talking -> Idle
   ```

2. **Transition Rules**
   - Minimum 500ms between transitions
   - Fade out duration: 0.3s
   - Fade in duration: 0.3s
   - Queued transitions for rapid state changes

3. **Queue Management**
   - Transitions are queued if requested too quickly
   - Queue is processed every 100ms
   - Duplicate states are updated rather than queued
   - Ensures smooth animation flow during streaming responses

### Animation-TTS Synchronization

1. **Pre-Speech Phase**
   ```typescript
   // Before TTS processing
   animationService.transitionTo('thinking');
   
   // When TTS is ready
   animationService.transitionTo('talking');
   ```

2. **During Speech**
   - Talking animation loops continuously
   - Phoneme service updates blend shapes
   - Lip sync takes priority over base animation

3. **Post-Speech Phase**
   ```typescript
   // After speech completes
   animationService.transitionTo('idle');
   ```

### Performance Considerations

1. **Animation Loading**
   - All animations are preloaded
   - FBX animations are retargeted to GLB bones
   - Bone mapping is cached for performance
   - Unused tracks are filtered out

2. **Resource Management**
   - Single animation mixer instance
   - Proper cleanup between transitions
   - Memory-efficient track management
   - Delta time capping for stability

3. **Error Prevention**
   - State validation before transitions
   - Proper animation disposal
   - Fallback to idle state
   - Queue management for rapid changes

[Rest of previous content remains unchanged...] 