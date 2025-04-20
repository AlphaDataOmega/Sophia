import React, { useEffect, useRef, useState } from 'react';
import { EnvironmentService } from '../services/EnvironmentService';
import { EnvironmentState, AmbientEffect } from '../../server/src/services/EnvrinonmentService/types';

export function Environment() {
  const [state, setState] = useState<EnvironmentState | null>(null);
  const [effects, setEffects] = useState<AmbientEffect[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const environmentService = EnvironmentService.getInstance();

  useEffect(() => {
    const handleStateUpdate = (newState: EnvironmentState) => {
      setState(newState);
    };

    const handleAmbientUpdate = (newEffects: AmbientEffect[]) => {
      setEffects(newEffects);
    };

    environmentService.on('stateUpdate', handleStateUpdate);
    environmentService.on('ambientUpdate', handleAmbientUpdate);

    return () => {
      environmentService.off('stateUpdate', handleStateUpdate);
      environmentService.off('ambientUpdate', handleAmbientUpdate);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      if (state?.backgroundColor) {
        ctx.fillStyle = state.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw background image if available
      if (state?.backgroundImage) {
        const img = new Image();
        img.src = state.backgroundImage;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Draw ambient effects
      effects.forEach(effect => {
        switch (effect.type) {
          case 'particles':
            drawParticles(ctx, effect);
            break;
          case 'rain':
            drawRain(ctx, effect);
            break;
          case 'snow':
            drawSnow(ctx, effect);
            break;
          case 'fog':
            drawFog(ctx, effect);
            break;
          case 'stars':
            drawStars(ctx, effect);
            break;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, effects]);

  const drawParticles = (ctx: CanvasRenderingContext2D, effect: AmbientEffect) => {
    if (!effect.particles) return;

    ctx.fillStyle = effect.color || '#FFFFFF';
    effect.particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(
        particle.x * ctx.canvas.width,
        particle.y * ctx.canvas.height,
        particle.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  };

  const drawRain = (ctx: CanvasRenderingContext2D, effect: AmbientEffect) => {
    if (!effect.drops) return;

    ctx.strokeStyle = effect.color || '#4A90E2';
    ctx.lineWidth = 1;
    effect.drops.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(
        drop.x * ctx.canvas.width,
        drop.y * ctx.canvas.height
      );
      ctx.lineTo(
        drop.x * ctx.canvas.width,
        (drop.y + drop.length) * ctx.canvas.height
      );
      ctx.stroke();
    });
  };

  const drawSnow = (ctx: CanvasRenderingContext2D, effect: AmbientEffect) => {
    if (!effect.flakes) return;

    ctx.fillStyle = effect.color || '#FFFFFF';
    effect.flakes.forEach(flake => {
      ctx.beginPath();
      ctx.arc(
        flake.x * ctx.canvas.width,
        flake.y * ctx.canvas.height,
        flake.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  };

  const drawFog = (ctx: CanvasRenderingContext2D, effect: AmbientEffect) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, effect.color || 'rgba(255, 255, 255, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const drawStars = (ctx: CanvasRenderingContext2D, effect: AmbientEffect) => {
    const starCount = Math.floor(effect.intensity * 100);
    ctx.fillStyle = effect.color || '#FFFFFF';

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * ctx.canvas.width;
      const y = Math.random() * ctx.canvas.height;
      const size = Math.random() * 2 + 1;
      const opacity = Math.random() * 0.5 + 0.5;

      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
}
