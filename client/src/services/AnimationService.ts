import * as THREE from 'three';
import { AnimationMixer, AnimationAction, AnimationClip } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export type AnimationState = 'idle' | 'thinking' | 'focus' | 'thankful' | 'talking' | 'pose';

interface AnimationConfig {
  name: string;
  path: string;
  loop: boolean;
}

export class AnimationService {
  private static instance: AnimationService | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private currentState: AnimationState = 'idle';
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private isInitialized = false;
  private isLoading = false;
  private animationLoader: FBXLoader;
  private debugMode = false;
  private transitionDuration = 0.3; // Reduced from 0.5 to 0.3 seconds

  private readonly ANIMATIONS: AnimationConfig[] = [
    { name: 'idle', path: '/animations/Standing Idle.fbx', loop: true },
    { name: 'thinking', path: '/animations/Thinking.fbx', loop: true },
    { name: 'focus', path: '/animations/Focus.fbx', loop: true },
    { name: 'thankful', path: '/animations/Thankful.fbx', loop: true },
    { name: 'talking', path: '/animations/Talking.fbx', loop: true },
    { name: 'pose', path: '/animations/Female Standing Pose.fbx', loop: false }
  ];

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  private constructor() {
    this.animationLoader = new FBXLoader();
  }

  public static getInstance(): AnimationService {
    if (!AnimationService.instance) {
      AnimationService.instance = new AnimationService();
    }
    return AnimationService.instance;
  }

  public initialize(mixer: THREE.AnimationMixer): void {
    if (this.isInitialized) return;

    this.mixer = mixer;
    this.isInitialized = true;
    this.isLoading = true;

    this.loadAnimations().then(() => {
      this.isLoading = false;
      // Don't automatically play idle - let the component handle initial state
    });
  }

  private async loadAnimations(): Promise<void> {
    try {
      await Promise.all(
        this.ANIMATIONS.map(config => this.loadAnimation(config))
      );
    } catch (error) {
      console.error('Failed to load animations:', error);
    }
  }

  private async loadAnimation(config: AnimationConfig): Promise<void> {
    try {
      const fbx = await this.animationLoader.loadAsync(config.path);
      if (!fbx.animations.length) {
        console.error(`No animations found in ${config.path}`);
        return;
      }

      const clip = fbx.animations[0];
      const action = this.mixer!.clipAction(clip);
      action.setLoop(config.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = !config.loop;
      this.animations.set(config.name, action);

    } catch (error) {
      console.error(`Failed to load ${config.name}:`, error);
    }
  }

  public playAnimation(state: AnimationState): void {
    if (!this.isInitialized || this.isLoading) return;
    if (state === this.currentState && this.currentAction?.isRunning()) return;

    const action = this.animations.get(state);
    if (!action) {
      console.error(`Animation not found: ${state}`);
      return;
    }

    // If we have a current action, crossfade to the new one
    if (this.currentAction && this.currentAction !== action) {
      // Reset and prepare the new action
      action.reset();
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(0);
      action.play();

      // Crossfade between actions
      this.currentAction.crossFadeTo(action, this.transitionDuration, true);
    } else {
      // Just play the new animation
      action.reset().play();
    }

    this.currentAction = action;
    this.currentState = state;
  }

  public update(delta: number): void {
    if (!this.isInitialized || !this.mixer) return;
    
    // Cap delta time to prevent large jumps
    const cappedDelta = Math.min(delta, 1/30);
    
    // Update the mixer
    this.mixer.update(cappedDelta);
    
    // Update weights for smooth transitions
    if (this.currentAction) {
      const weight = this.currentAction.getEffectiveWeight();
      if (weight < 1) {
        this.currentAction.setEffectiveWeight(Math.min(weight + cappedDelta / this.transitionDuration, 1));
      }
    }
  }

  public getCurrentAnimation(): string {
    return this.currentState;
  }

  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
    }
    this.animations.clear();
    this.isInitialized = false;
    this.currentAction = null;
  }
} 