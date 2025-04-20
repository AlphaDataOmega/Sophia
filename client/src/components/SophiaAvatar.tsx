import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useAnimation } from '../contexts/AnimationContext';
import { PhonemeService } from '../services/PhonemeService';
import { AnimationService, AnimationState } from '../services/AnimationService';
import { ExpressionService } from '../services/ExpressionService';
import { EyeMovementService } from '../services/EyeMovementService';

// Add type for node in scene traversal
type SceneNode = THREE.Object3D & {
  morphTargetDictionary?: { [key: string]: number };
  morphTargetInfluences?: number[];
};

// Preload the model
useGLTF.preload('/avatars/RPM_Sophia_Elegant.glb');

function SophiaModel() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/avatars/RPM_Sophia_Elegant.glb');
  const { currentAnimation } = useAnimation();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const animationService = useMemo(() => AnimationService.getInstance(), []);
  const expressionService = useMemo(() => ExpressionService.getInstance(), []);
  const eyeMovementService = useMemo(() => EyeMovementService.getInstance(), []);
  const lastAnimation = useRef<string>('idle');
  
  // Initialize services
  useEffect(() => {
    if (!scene || !group.current || modelLoaded) return;

    const mixer = new THREE.AnimationMixer(scene);
    const phonemeService = PhonemeService.getInstance();

    scene.traverse((node: SceneNode) => {
      if (node instanceof THREE.Mesh && node.name === 'Wolf3D_Head') {
        phonemeService.initialize(node);
        phonemeService.startProcessing();
        expressionService.initialize(node);
      }
    });

    animationService.initialize(mixer);
    eyeMovementService.initialize(scene);
    setModelLoaded(true);
    setServicesInitialized(true);

    return () => {
      if (modelLoaded) {
        animationService.dispose();
        phonemeService.stopProcessing();
        phonemeService.dispose();
        expressionService.dispose();
        eyeMovementService.dispose();
      }
    };
  }, [scene, group, modelLoaded, animationService, expressionService, eyeMovementService]);

  // Handle animation state changes
  useEffect(() => {
    if (!servicesInitialized || !modelLoaded) return;

    let targetState: AnimationState = 'idle';
    if (currentAnimation === 'thinking') targetState = 'thinking';
    else if (currentAnimation === 'talking') targetState = 'talking';
    else if (currentAnimation === 'idle') targetState = 'idle';

    if (targetState !== lastAnimation.current) {
      lastAnimation.current = targetState;
      animationService.playAnimation(targetState);
    }
  }, [currentAnimation, servicesInitialized, modelLoaded, animationService]);

  // Update animation frame
  useFrame((state, delta) => {
    if (servicesInitialized && modelLoaded) {
      animationService.update(delta);
      PhonemeService.getInstance().update(delta);
      expressionService.update(delta);
      eyeMovementService.update(delta);
    }
  });

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={1.5} 
        position={[-2.0, -1.4, 0]}
        dispose={null}
      />
    </group>
  );
}

export function SophiaAvatar() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 1,
      opacity: 1,
      transition: 'opacity 1s ease-in'
    }}>
      <Canvas shadows camera={{ position: [-2, 0, 4], fov: 45 }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.3} />
        <spotLight
          position={[5, 5, 5]}
          angle={0.35}
          penumbra={1}
          intensity={0.9}
          color={"#ffb3ff"}
          castShadow
        />
        <ContactShadows
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.6, 0]}
          opacity={0.5}
          width={10}
          height={10}
          blur={2}
          far={4}
          resolution={512}
          color="#000000"
        />
        <pointLight position={[-3, 2, 1]} intensity={0.5} color={"#99ccff"} />
        <pointLight position={[0, -2, 3]} intensity={0.3} color={"#ff99aa"} />
        <Suspense fallback={<Html center>Loading Sophia...</Html>}>
          <SophiaModel />
          <Environment files="/hdr/studio_small_03_1k.hdr" background={false} />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}
