import * as THREE from 'three';

interface EyeMovementConfig {
  blinkInterval: number; // Average time between blinks in seconds
  blinkDuration: number; // Duration of a blink in seconds
  saccadeInterval: number; // Average time between saccades in seconds
  saccadeSpeed: number; // Speed of saccadic movements
  maxEyeRotation: number; // Maximum eye rotation in radians
  smoothPursuitSpeed: number; // Speed of smooth pursuit movements
}

export class EyeMovementService {
  private static instance: EyeMovementService | null = null;
  private leftEye: THREE.Object3D | null = null;
  private rightEye: THREE.Object3D | null = null;
  private config: EyeMovementConfig;
  private lastBlinkTime: number = 0;
  private lastSaccadeTime: number = 0;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;
  private targetRotation: THREE.Euler = new THREE.Euler();
  private currentRotation: THREE.Euler = new THREE.Euler();
  private isInitialized: boolean = false;

  private readonly defaultConfig: EyeMovementConfig = {
    blinkInterval: 4.0, // Average time between blinks
    blinkDuration: 0.2, // Blink duration
    saccadeInterval: 2.0, // Average time between saccades
    saccadeSpeed: 0.1, // Speed of saccadic movements
    maxEyeRotation: 0.3, // Maximum eye rotation in radians
    smoothPursuitSpeed: 0.05 // Speed of smooth pursuit movements
  };

  private constructor(config?: Partial<EyeMovementConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  public static getInstance(config?: Partial<EyeMovementConfig>): EyeMovementService {
    if (!EyeMovementService.instance) {
      EyeMovementService.instance = new EyeMovementService(config);
    }
    return EyeMovementService.instance;
  }

  public initialize(scene: THREE.Object3D): void {
    if (this.isInitialized) return;

    // Find eye meshes in the scene
    scene.traverse((node) => {
      if (node.name.toLowerCase().includes('eye') && node instanceof THREE.Mesh) {
        if (node.name.toLowerCase().includes('left')) {
          this.leftEye = node;
        } else if (node.name.toLowerCase().includes('right')) {
          this.rightEye = node;
        }
      }
    });

    if (!this.leftEye || !this.rightEye) {
      console.warn('Eye meshes not found in the scene');
      return;
    }

    this.isInitialized = true;
    console.log('EyeMovementService initialized');
  }

  public update(delta: number): void {
    if (!this.isInitialized || !this.leftEye || !this.rightEye) return;

    const currentTime = performance.now() / 1000;

    // Handle blinking
    this.updateBlinking(currentTime, delta);

    // Handle eye movements
    this.updateEyeMovements(currentTime, delta);

    // Apply rotations to both eyes
    this.applyEyeRotations();
  }

  private updateBlinking(currentTime: number, delta: number): void {
    // Check if it's time for a new blink
    if (!this.isBlinking && currentTime - this.lastBlinkTime > this.config.blinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    // Update blink animation
    if (this.isBlinking) {
      this.blinkProgress += delta / this.config.blinkDuration;
      
      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.lastBlinkTime = currentTime;
        this.blinkProgress = 0;
      }
    }
  }

  private updateEyeMovements(currentTime: number, delta: number): void {
    // Check if it's time for a new saccade
    if (currentTime - this.lastSaccadeTime > this.config.saccadeInterval) {
      this.generateNewSaccade();
      this.lastSaccadeTime = currentTime;
    }

    // Smoothly interpolate current rotation to target rotation
    this.currentRotation.x = THREE.MathUtils.lerp(
      this.currentRotation.x,
      this.targetRotation.x,
      this.config.smoothPursuitSpeed * delta
    );
    this.currentRotation.y = THREE.MathUtils.lerp(
      this.currentRotation.y,
      this.targetRotation.y,
      this.config.smoothPursuitSpeed * delta
    );
  }

  private generateNewSaccade(): void {
    // Generate random target rotation within limits
    this.targetRotation.x = THREE.MathUtils.randFloat(
      -this.config.maxEyeRotation,
      this.config.maxEyeRotation
    );
    this.targetRotation.y = THREE.MathUtils.randFloat(
      -this.config.maxEyeRotation,
      this.config.maxEyeRotation
    );
  }

  private applyEyeRotations(): void {
    if (!this.leftEye || !this.rightEye) return;

    // Apply current rotation to both eyes
    this.leftEye.rotation.copy(this.currentRotation);
    this.rightEye.rotation.copy(this.currentRotation);

    // Apply blink if in progress
    if (this.isBlinking) {
      const blinkAmount = Math.sin(this.blinkProgress * Math.PI);
      this.leftEye.rotation.x += blinkAmount * 0.5;
      this.rightEye.rotation.x += blinkAmount * 0.5;
    }
  }

  public dispose(): void {
    this.leftEye = null;
    this.rightEye = null;
    this.isInitialized = false;
  }
} 