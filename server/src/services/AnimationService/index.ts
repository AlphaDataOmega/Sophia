import { EventEmitter } from 'events';
import { AnimationLoader, AnimationFile } from './AnimationLoader';
import { ExpressionEngine } from './ExpressionEngine';
import { LipSyncController } from './LipSync';
import express, { Request, Response } from 'express';

export class AnimationService extends EventEmitter {
  private loader: AnimationLoader;
  private expressionEngine: ExpressionEngine;
  private lipSync: LipSyncController;
  private currentState: string = 'idle';
  private router: express.Router;

  constructor(baseDir: string) {
    super();
    this.loader = new AnimationLoader(baseDir);
    this.expressionEngine = new ExpressionEngine();
    this.lipSync = new LipSyncController();
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Keep existing routes
    this.router.get('/list', async (_req: Request, res: Response) => {
      try {
        const animations = this.loader.getAllAnimations();
        res.json({ animations });
      } catch (error) {
        console.error('Error listing animations:', error);
        res.status(500).json({ error: 'Failed to list animations' });
      }
    });

    // Add new routes
    this.router.get('/state', (_req: Request, res: Response) => {
      res.json({
        currentState: this.currentState,
        expression: this.expressionEngine.getCurrentExpression(),
        visemes: this.lipSync.getCurrentVisemes()
      });
    });

    this.router.post('/transition', (req: Request, res: Response) => {
      const { state, emotion, intensity } = req.body;
      try {
        this.transition(state, emotion, intensity);
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ error: 'Invalid transition' });
      }
    });
  }

  async initialize(): Promise<void> {
    await this.loader.initialize();
    this.startAnimationLoop();
  }

  getRouter(): express.Router {
    return this.router;
  }

  transition(state: string, emotion?: string, intensity: number = 1.0): void {
    const mapping = this.loader.getMapping(state);
    if (!mapping) {
      throw new Error(`Invalid state: ${state}`);
    }

    // Update state and animation
    this.currentState = state;
    
    // Update expression if emotion provided
    if (emotion) {
      this.expressionEngine.setExpression(emotion, intensity);
    }

    // Emit state change
    this.emit('stateChange', {
      state,
      animation: mapping.file,
      emotion,
      intensity,
      blendDuration: mapping.blendDuration
    });
  }

  updateVisemes(visemes: Viseme[]): void {
    this.lipSync.updateVisemes(visemes);
  }

  getCurrentState(): {
    state: string;
    expression: Expression;
    visemes: Viseme[];
    weights: { [key: string]: number };
  } {
    return {
      state: this.currentState,
      expression: this.expressionEngine.getCurrentExpression(),
      visemes: this.lipSync.getCurrentVisemes(),
      weights: this.getCurrentWeights()
    };
  }

  private getCurrentWeights(): { [key: string]: number } {
    const expressionWeights = this.expressionEngine.getCurrentWeights();
    const lipSyncWeights = this.lipSync.getCurrentWeights();

    return {
      ...expressionWeights,
      ...lipSyncWeights // Lip sync weights take precedence
    };
  }

  private startAnimationLoop(): void {
    let lastTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update expression and lip sync weights
      const expressionWeights = this.expressionEngine.update(deltaTime);
      const lipSyncWeights = this.lipSync.update(deltaTime);

      // Combine and emit weights
      const combinedWeights = {
        ...expressionWeights,
        ...lipSyncWeights // Lip sync takes precedence for mouth shapes
      };

      this.emit('update', {
        weights: combinedWeights,
        state: this.currentState,
        timestamp: currentTime
      });

      // Schedule next frame using setImmediate for next tick
      setImmediate(animate);
    };

    // Start the animation loop
    setImmediate(animate);
  }

  // Method to handle cleanup
  dispose(): void {
    this.removeAllListeners();
    this.expressionEngine.dispose();
    this.lipSync.dispose();
  }
}

// Types needed for the service
export interface Viseme {
  type: string;
  start: number;
  end: number;
  weight: number;
}

export interface Expression {
  name: string;
  weights: { [key: string]: number };
  duration: number;
  easing: string;
}

export interface AnimationUpdate {
  weights: { [key: string]: number };
  state: string;
  timestamp: number;
}
