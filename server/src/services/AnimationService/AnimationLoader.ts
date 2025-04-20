import path from 'path';
import fs from 'fs/promises';

export interface AnimationFile {
  name: string;
  url: string;
  type: 'fbx' | 'glb' | 'gltf';
  metadata?: {
    duration?: number;
    category?: 'expression' | 'gesture' | 'idle' | 'talking';
    emotion?: string;
  };
}

export interface AnimationMapping {
  [key: string]: {
    file: AnimationFile;
    blendDuration: number;
    weight: number;
    loop?: boolean;
    transitions?: string[];
  };
}

export class AnimationLoader {
  private animationsDir: string;
  private animations: Map<string, AnimationFile> = new Map();
  private mappings: AnimationMapping = {};

  constructor(baseDir: string) {
    this.animationsDir = path.join(baseDir, '../../public/animations');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.access(this.animationsDir).catch(async () => {
        await fs.mkdir(this.animationsDir, { recursive: true });
      });

      // Load animations and their metadata
      await this.loadAnimations();
      
      // Set up default mappings
      this.setupDefaultMappings();
      
      console.log('Animation system initialized with', this.animations.size, 'animations');
    } catch (error) {
      console.error('Failed to initialize animation loader:', error);
      throw error;
    }
  }

  private async loadAnimations(): Promise<void> {
    const files = await fs.readdir(this.animationsDir);
    
    for (const file of files) {
      if (file.endsWith('.fbx') || file.endsWith('.glb') || file.endsWith('.gltf')) {
        const name = path.basename(file, path.extname(file));
        
        // Try to load metadata if exists
        let metadata = {};
        try {
          const metaFile = path.join(this.animationsDir, `${name}.meta.json`);
          const metaContent = await fs.readFile(metaFile, 'utf-8');
          metadata = JSON.parse(metaContent);
        } catch (e) {
          // No metadata file, use defaults
        }

        this.animations.set(name, {
          name,
          url: `/animations/${file}`,
          type: path.extname(file).slice(1) as 'fbx' | 'glb' | 'gltf',
          metadata
        });
      }
    }
  }

  private setupDefaultMappings(): void {
    this.mappings = {
      idle: {
        file: this.getAnimationByName('idle_default') || this.getFirstOfCategory('idle'),
        blendDuration: 0.5,
        weight: 1,
        loop: true
      },
      talking: {
        file: this.getAnimationByName('talk_default') || this.getFirstOfCategory('talking'),
        blendDuration: 0.3,
        weight: 1,
        transitions: ['idle']
      },
      thinking: {
        file: this.getAnimationByName('think_default') || this.getFirstOfCategory('thinking'),
        blendDuration: 0.4,
        weight: 1,
        transitions: ['idle', 'talking']
      }
    };
  }

  getAnimationByName(name: string): AnimationFile | undefined {
    return this.animations.get(name);
  }

  private getFirstOfCategory(category: string): AnimationFile {
    for (const anim of this.animations.values()) {
      if (anim.metadata?.category === category) {
        return anim;
      }
    }
    throw new Error(`No animation found for category: ${category}`);
  }

  getMapping(state: string): AnimationMapping[string] | undefined {
    return this.mappings[state];
  }

  getAllAnimations(): AnimationFile[] {
    return Array.from(this.animations.values());
  }
}
