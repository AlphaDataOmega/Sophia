# Animation System Documentation

## Overview
The animation system manages character animations using Three.js's animation system with custom enhancements for state management, bone retargeting, and transition handling.

## Core Components

### AnimationService
The central service managing all animation-related functionality:

```typescript
class AnimationService {
  // Core properties
  private mixer: THREE.AnimationMixer;
  private animations: Map<string, THREE.AnimationAction>;
  private currentAction: THREE.AnimationAction | null;
  private currentState: AnimationState;
  private transitionQueue: TransitionQueueItem[];
  
  // Methods
  public async loadAnimation(name: string, url: string): Promise<void>;
  public playAnimation(state: AnimationState): void;
  public update(delta: number): void;
}
```

### Animation States
Each animation state represents a specific character behavior:

1. **Idle** (`idle.fbx`)
   - Default resting state
   - Subtle breathing and micro-movements
   - Automatically starts when model loads
   - Returns to this state after speech

2. **Thinking** (`thinking.fbx`)
   - Contemplative pose with head tilt
   - Hand-to-chin gesture
   - Triggered during input processing
   - 4.25-second loop duration

3. **Talking** (`talking.fbx`)
   - Natural speaking posture
   - Gentle upper body movement
   - Active during speech playback
   - Synchronized with phoneme processing
   - 5.92-second loop duration

4. **Thankful** (`thankful.fbx`)
   - Gratitude expression
   - Used for positive responses
   - 3-second duration

5. **Pose** (`pose.fbx`)
   - Static pose
   - Used for specific interactions
   - 0.041-second duration

## Technical Implementation

### Bone Retargeting
The system automatically maps bones between FBX animations and the GLB model:

1. **Matching Process**
   - Exact name matching
   - Pattern-based matching
   - Fallback to original names

2. **Track Filtering**
   - Removes unused animation tracks
   - Skips container nodes (e.g., "Armature")
   - Preserves essential bone animations

### State Management

1. **Transition Handling**
   - Direct state transitions
   - Prevents unnecessary restarts
   - Ensures smooth transitions

2. **Transition Parameters**
   - Crossfade duration: 0.3s
   - Prevents animation conflicts
   - Maintains current state during typing

### Performance Optimization

1. **Resource Management**
   - Single AnimationMixer instance
   - Proper action cleanup
   - Memory-efficient track handling

2. **Delta Time**
   - Capped at 1/30 second
   - Prevents unstable animations
   - Smooth playback across frames

## Usage Examples

### Basic Animation Control
```typescript
// Initialize service
const animationService = AnimationService.getInstance();

// Load animations
await animationService.loadAnimation('idle', 'animations/idle.fbx');
await animationService.loadAnimation('talking', 'animations/talking.fbx');

// Play animations
animationService.playAnimation('talking');

// Update in animation loop
function animate() {
  const delta = clock.getDelta();
  animationService.update(delta);
}
```

### State Flow
```typescript
// When processing input
animationService.playAnimation('thinking');

// During speech
animationService.playAnimation('talking');

// After speech
animationService.playAnimation('idle');

// During typing
// No animation change - maintains current state
```

## Troubleshooting

### Common Issues

1. **Missing Animations**
   - Ensure all FBX files are loaded
   - Check file paths and names
   - Verify animation clips exist

2. **Bone Mismatches**
   - Review bone naming in model
   - Check animation file compatibility
   - Enable debug logging if needed

3. **Transition Issues**
   - Verify proper state cleanup
   - Check animation loading status
   - Ensure proper mixer updates

### Debug Logging
Important debug messages to monitor:

```
[Animation] Loading animation: {name}
[Animation] Playing animation: {state}
[Animation] Current state: {state}
```

## Best Practices

1. **Animation Creation**
   - Use consistent bone naming
   - Maintain similar durations
   - Test transitions between states

2. **Implementation**
   - Preload all animations
   - Handle loading errors
   - Clean up resources properly

3. **Performance**
   - Monitor animation count
   - Track memory usage
   - Profile transition timing

## Future Improvements

1. **Planned Features**
   - Blending weight customization
   - Multiple simultaneous animations
   - Dynamic transition timing

2. **Optimization Goals**
   - Reduced memory footprint
   - Faster bone matching
   - Smoother transitions 