import { EventEmitter } from 'events';
import { EnvironmentState, BackgroundGenerationPrompt, AmbientEffect } from './types';

export class EnvironmentService extends EventEmitter {
  private state: EnvironmentState;
  private stableDiffusionUrl: string;
  private transitionInterval: NodeJS.Timeout | null = null;

  constructor(config: { stableDiffusionUrl: string }) {
    super();
    this.stableDiffusionUrl = config.stableDiffusionUrl;
    this.state = {
      currentMood: 'neutral',
      intensity: 0.5,
      backgroundColor: '#1a1a1a',
      ambientEffects: [],
      lastUpdate: Date.now()
    };
  }

  async initialize(): Promise<void> {
    // Test connection to Stable Diffusion
    try {
      const response = await fetch(`${this.stableDiffusionUrl}/sdapi/v1/sd-models`);
      if (!response.ok) {
        throw new Error('Failed to connect to Stable Diffusion');
      }
    } catch (error) {
      console.error('Stable Diffusion initialization failed:', error);
      throw error;
    }

    // Start ambient effect loop
    this.startAmbientLoop();
  }

  private startAmbientLoop(): void {
    setInterval(() => {
      this.updateAmbientEffects();
    }, 1000 / 30); // 30 FPS
  }

  async updateEnvironment(mood: string, intensity: number): Promise<void> {
    const previousState = { ...this.state };
    this.state.currentMood = mood;
    this.state.intensity = intensity;

    // Generate background prompt based on mood
    const prompt = this.generatePromptForMood(mood, intensity);

    try {
      // Generate new background
      const backgroundImage = await this.generateBackground(prompt);
      
      // Update state with new background
      this.state.backgroundImage = backgroundImage;
      
      // Update ambient effects
      this.updateAmbientEffectsForMood(mood, intensity);
      
      // Start transition
      this.startTransition(previousState, this.state);
      
      // Emit state update
      this.emit('environmentUpdate', this.state);
    } catch (error) {
      console.error('Failed to update environment:', error);
      throw error;
    }
  }

  private generatePromptForMood(mood: string, intensity: number): BackgroundGenerationPrompt {
    const moodPrompts: Record<string, string> = {
      happy: 'bright, warm sunlight, gentle clouds, vibrant colors',
      sad: 'rain, moody atmosphere, blue tones, soft lighting',
      angry: 'stormy, dark clouds, dramatic lighting, intense colors',
      calm: 'peaceful nature scene, soft pastels, serene atmosphere',
      excited: 'dynamic, energetic, bright colors, motion blur',
      neutral: 'balanced composition, mild contrast, natural lighting'
    };

    return {
      mood,
      description: moodPrompts[mood] || moodPrompts.neutral,
      style: 'digital art, atmospheric, subtle, background',
      intensity
    };
  }

  private async generateBackground(prompt: BackgroundGenerationPrompt): Promise<string> {
    try {
      const response = await fetch(`${this.stableDiffusionUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt.description}, ${prompt.style}, intensity: ${prompt.intensity}`,
          negative_prompt: 'text, watermark, signature, blur, noise, characters, people',
          steps: 20,
          width: 1024,
          height: 576,
          cfg_scale: 7.5,
          sampler_name: 'Euler a'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate background image');
      }

      const data = await response.json();
      return `data:image/png;base64,${data.images[0]}`;
    } catch (error) {
      console.error('Background generation failed:', error);
      throw error;
    }
  }

  private updateAmbientEffectsForMood(mood: string, intensity: number): void {
    const effects: AmbientEffect[] = [];

    switch (mood) {
      case 'happy':
        effects.push(
          { type: 'particles', intensity: intensity * 0.7, color: '#FFD700', speed: 1 },
          { type: 'stars', intensity: intensity * 0.3, color: '#FFFFFF' }
        );
        break;
      case 'sad':
        effects.push(
          { type: 'rain', intensity: intensity * 0.8, color: '#4A90E2' },
          { type: 'fog', intensity: intensity * 0.4, color: '#B8B8B8' }
        );
        break;
      case 'angry':
        effects.push(
          { type: 'particles', intensity: intensity, color: '#FF4500', speed: 2 },
          { type: 'fog', intensity: intensity * 0.6, color: '#4A4A4A' }
        );
        break;
      case 'calm':
        effects.push(
          { type: 'particles', intensity: intensity * 0.3, color: '#90EE90', speed: 0.5 },
          { type: 'stars', intensity: intensity * 0.2, color: '#FFFFFF' }
        );
        break;
      default:
        effects.push(
          { type: 'particles', intensity: intensity * 0.2, color: '#FFFFFF', speed: 0.7 }
        );
    }

    this.state.ambientEffects = effects;
  }

  private startTransition(fromState: EnvironmentState, toState: EnvironmentState): void {
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval);
    }

    let progress = 0;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    this.transitionInterval = setInterval(() => {
      progress = (Date.now() - startTime) / duration;

      if (progress >= 1) {
        clearInterval(this.transitionInterval!);
        this.transitionInterval = null;
        this.emit('transitionComplete', toState);
        return;
      }

      // Emit transition progress
      this.emit('transitionProgress', {
        progress,
        currentState: this.interpolateStates(fromState, toState, progress)
      });
    }, 1000 / 60); // 60 FPS
  }

  private interpolateStates(from: EnvironmentState, to: EnvironmentState, progress: number): EnvironmentState {
    return {
      ...to,
      intensity: this.lerp(from.intensity, to.intensity, progress),
      ambientEffects: to.ambientEffects.map(effect => ({
        ...effect,
        intensity: this.lerp(
          from.ambientEffects.find(e => e.type === effect.type)?.intensity || 0,
          effect.intensity,
          progress
        )
      }))
    };
  }

  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  private updateAmbientEffects(): void {
    // Update particle positions, rain drops, etc.
    this.state.ambientEffects.forEach(effect => {
      // Update effect properties based on type
      switch (effect.type) {
        case 'particles':
          this.updateParticles(effect);
          break;
        case 'rain':
          this.updateRain(effect);
          break;
        case 'snow':
          this.updateSnow(effect);
          break;
        // Add other effect updates
      }
    });

    this.emit('ambientUpdate', this.state.ambientEffects);
  }

  private updateParticles(effect: AmbientEffect): void {
    // Update particle positions and properties
    const particles = effect.particles || [];
    const speed = effect.speed || 1;
    const maxParticles = Math.floor(effect.intensity * 100);

    // Add new particles if needed
    while (particles.length < maxParticles) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * 2 + 1
      });
    }

    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around screen
      if (p.x < 0) p.x = 1;
      if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1;
      if (p.y > 1) p.y = 0;
    }

    effect.particles = particles;
  }

  private updateRain(effect: AmbientEffect): void {
    // Update rain drop positions and properties
    const drops = effect.drops || [];
    const speed = effect.speed || 2;
    const maxDrops = Math.floor(effect.intensity * 200);

    // Add new drops if needed
    while (drops.length < maxDrops) {
      drops.push({
        x: Math.random(),
        y: Math.random(),
        length: Math.random() * 0.1 + 0.05,
        speed: speed * (Math.random() * 0.5 + 0.5)
      });
    }

    // Update existing drops
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      drop.y += drop.speed;

      // Reset drop when it reaches bottom
      if (drop.y > 1) {
        drop.y = 0;
        drop.x = Math.random();
      }
    }

    effect.drops = drops;
  }

  private updateSnow(effect: AmbientEffect): void {
    // Update snowflake positions and properties
    const flakes = effect.flakes || [];
    const speed = effect.speed || 0.5;
    const maxFlakes = Math.floor(effect.intensity * 150);

    // Add new flakes if needed
    while (flakes.length < maxFlakes) {
      flakes.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        speed: speed * (Math.random() * 0.5 + 0.5),
        sway: Math.random() * 0.1 - 0.05
      });
    }

    // Update existing flakes
    for (let i = flakes.length - 1; i >= 0; i--) {
      const flake = flakes[i];
      flake.y += flake.speed;
      flake.x += flake.sway;

      // Wrap around screen
      if (flake.x < 0) flake.x = 1;
      if (flake.x > 1) flake.x = 0;
      if (flake.y > 1) {
        flake.y = 0;
        flake.x = Math.random();
      }
    }

    effect.flakes = flakes;
  }

  getCurrentState(): EnvironmentState {
    return { ...this.state };
  }

  dispose(): void {
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval);
    }
    this.removeAllListeners();
  }
}
