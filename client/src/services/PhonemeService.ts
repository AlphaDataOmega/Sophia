import * as THREE from 'three';

interface VisemeMapping {
  [key: string]: {
    weight: number;
    targets: string[];
  };
}

export class PhonemeService {
  private static instance: PhonemeService | null = null;
  private mesh: THREE.Mesh | null = null;
  private blendShapeTargets: string[] = [];
  public isProcessing: boolean = false;
  private currentPhoneme: string = 'viseme_sil';
  private transitionTime: number = 0.1; // seconds
  private targetWeights: { [key: string]: number } = {};
  private currentWeights: { [key: string]: number } = {};
  private isInitialized: boolean = false;
  private meshUuid: string | null = null;

  // Enhanced viseme mapping with multiple targets per phoneme
  private readonly visemeMapping: VisemeMapping = {
    'viseme_sil': { weight: 1.0, targets: ['viseme_sil'] },
    'viseme_PP': { weight: 1.0, targets: ['viseme_PP'] },
    'viseme_FF': { weight: 1.0, targets: ['viseme_FF'] },
    'viseme_TH': { weight: 1.0, targets: ['viseme_TH'] },
    'viseme_DD': { weight: 1.0, targets: ['viseme_DD'] },
    'viseme_kk': { weight: 1.0, targets: ['viseme_kk'] },
    'viseme_CH': { weight: 1.0, targets: ['viseme_CH'] },
    'viseme_SS': { weight: 1.0, targets: ['viseme_SS'] },
    'viseme_nn': { weight: 1.0, targets: ['viseme_nn'] },
    'viseme_RR': { weight: 1.0, targets: ['viseme_RR'] },
    'viseme_aa': { weight: 1.0, targets: ['viseme_aa'] },
    'viseme_E': { weight: 1.0, targets: ['viseme_E'] },
    'viseme_I': { weight: 1.0, targets: ['viseme_I'] },
    'viseme_O': { weight: 1.0, targets: ['viseme_O'] },
    'viseme_U': { weight: 1.0, targets: ['viseme_U'] }
  };

  private constructor() {
    console.log('PhonemeService initialized');
  }

  public static getInstance(): PhonemeService {
    if (!PhonemeService.instance) {
      PhonemeService.instance = new PhonemeService();
    }
    return PhonemeService.instance;
  }

  public initialize(mesh: THREE.Mesh): void {
    if (this.meshUuid === mesh.uuid) {
      console.log('Mesh already initialized:', mesh.uuid);
      return;
    }

    if (this.meshUuid && this.meshUuid !== mesh.uuid) {
      console.log('Cleaning up previous mesh:', this.meshUuid);
      this.dispose();
    }

    console.log('Initializing PhonemeService with mesh:', mesh.uuid);
    this.mesh = mesh;
    this.meshUuid = mesh.uuid;
    
    if (this.mesh.morphTargetInfluences === undefined) {
      this.mesh.morphTargetInfluences = [];
    }

    if (this.mesh.userData.targetNames) {
      this.blendShapeTargets = this.mesh.userData.targetNames;
      console.log('Found blend shape targets:', this.blendShapeTargets);
      
      // Initialize weights for all targets
      this.blendShapeTargets.forEach(target => {
        this.targetWeights[target] = 0;
        this.currentWeights[target] = 0;
      });
      
      // Set initial neutral position
      this.targetWeights['viseme_sil'] = 1;
      this.currentWeights['viseme_sil'] = 1;
      
      // Ensure morphTargetInfluences array is properly sized and initialized
      if (this.mesh.morphTargetInfluences.length < this.blendShapeTargets.length) {
        this.mesh.morphTargetInfluences = new Array(this.blendShapeTargets.length).fill(0);
      }

      // Initialize all morph target influences
      this.blendShapeTargets.forEach((target, index) => {
        this.mesh!.morphTargetInfluences![index] = this.currentWeights[target];
      });

      this.isInitialized = true;
      console.log('PhonemeService initialization complete');
    } else {
      console.warn('No blend shape targets found in mesh userData');
    }
  }

  public startProcessing(): void {
    if (!this.isInitialized || !this.mesh) {
      console.warn('Cannot start processing:', { isInitialized: this.isInitialized, hasMesh: !!this.mesh });
      return;
    }
    console.log('Starting phoneme processing');
    this.isProcessing = true;
  }

  public stopProcessing(): void {
    console.log('Stopping phoneme processing');
    this.isProcessing = false;
    this.resetMorphTargets();
  }

  public processPhoneme(phoneme: string): void {
    if (!this.isProcessing || !this.mesh || !this.isInitialized) {
      console.warn('Cannot process phoneme:', { 
        isProcessing: this.isProcessing, 
        hasMesh: !!this.mesh,
        isInitialized: this.isInitialized,
        meshUuid: this.meshUuid
      });
      return;
    }

    console.log('Processing phoneme:', phoneme);
    
    // Reset all weights
    Object.keys(this.targetWeights).forEach(key => {
      this.targetWeights[key] = 0;
    });

    // Get the viseme mapping for this phoneme
    const viseme = this.visemeMapping[phoneme];
    if (viseme) {
      // Apply weights to all targets for this viseme
      viseme.targets.forEach(target => {
        if (this.blendShapeTargets.includes(target)) {
          this.targetWeights[target] = viseme.weight;
          console.log(`Applied blend shape ${target} with weight ${viseme.weight}`);
        } else {
          console.warn(`Target ${target} not found in blend shape targets`);
        }
      });
    } else {
      console.warn(`Phoneme ${phoneme} not found in viseme mapping`);
    }
  }

  public update(delta: number): void {
    if (!this.isProcessing || !this.mesh || !this.mesh.morphTargetInfluences || !this.isInitialized) {
      return;
    }

    // Update current weights towards target weights
    this.blendShapeTargets.forEach((target, index) => {
      const currentWeight = this.currentWeights[target];
      const targetWeight = this.targetWeights[target];
      
      // Smoothly interpolate between current and target weights
      const lerpFactor = Math.min(1, delta / this.transitionTime);
      this.currentWeights[target] = THREE.MathUtils.lerp(
        currentWeight,
        targetWeight,
        lerpFactor
      );
      
      // Apply the weight to the morph target
      this.mesh!.morphTargetInfluences![index] = this.currentWeights[target];
    });
  }

  private resetMorphTargets(): void {
    console.log('Resetting blend shapes');
    if (this.mesh && this.mesh.morphTargetInfluences) {
      // Reset all weights to 0
      this.blendShapeTargets.forEach((target, index) => {
        this.mesh!.morphTargetInfluences![index] = 0;
        this.targetWeights[target] = 0;
        this.currentWeights[target] = 0;
      });
      
      // Set neutral position
      const silIndex = this.blendShapeTargets.indexOf('viseme_sil');
      if (silIndex !== -1) {
        this.mesh.morphTargetInfluences[silIndex] = 1;
        this.targetWeights['viseme_sil'] = 1;
        this.currentWeights['viseme_sil'] = 1;
      }
    }
  }

  public dispose(): void {
    console.log('Disposing PhonemeService');
    this.stopProcessing();
    this.mesh = null;
    this.meshUuid = null;
    this.blendShapeTargets = [];
    this.targetWeights = {};
    this.currentWeights = {};
    this.isInitialized = false;
  }
} 