export interface EnvironmentState {
  currentMood: string;
  intensity: number;
  backgroundColor: string;
  backgroundImage?: string;
  ambientEffects: AmbientEffect[];
  lastUpdate: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
}

interface SnowFlake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
}

export interface AmbientEffect {
  type: 'particles' | 'rain' | 'snow' | 'fog' | 'stars';
  intensity: number;
  color?: string;
  speed?: number;
  particles?: Particle[];
  drops?: RainDrop[];
  flakes?: SnowFlake[];
}

export interface BackgroundGenerationPrompt {
  mood: string;
  description: string;
  style?: string;
  intensity?: number;
}

export interface BackgroundTransition {
  from: string;
  to: string;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
