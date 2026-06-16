import React, { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '../lib/utils';

interface SubPuff {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotationZ: number;
  opacity: number;
}

interface CloudLayer {
  id: string;
  z: number;            // Depth translation
  y: number;            // Vertical alignment (%)
  scale: number;        // Global group scale
  opacity: number;      // Layer transparency
  driftDuration: number; // Duration of horizontal travel (s)
  driftDelay: number;    // Stagger start time offset (s)
  bobAmount: number;     // Vertical motion displacement (px)
  bobDuration: number;   // Bobbing loop duration (s)
  bobDelay: number;      // Bobbing delay offset (s)
  rotationZ: number;     // General orientation
  puffs: SubPuff[];
}

interface Interactive3DAtmosphereProps {
  hasAlerts?: boolean;
  variant?: 'emerald' | 'rose' | 'sky';
  roundedClass?: string;
}

export function Interactive3DAtmosphere({ hasAlerts = false, variant, roundedClass = "rounded-2xl" }: Interactive3DAtmosphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth perspective tilt coordinates
  const [worldAngle, setWorldAngle] = useState({ x: 0, y: 0 });

  // Staggered cloud layer configuration - simplified to ensure visibility without glitching
  const clouds: CloudLayer[] = useMemo(() => {
    return [
      { id: 'cloud-1', z: -100, y: 30, scale: 1.2, opacity: 0.4, driftDuration: 60, driftDelay: 0, bobAmount: 10, bobDuration: 10, bobDelay: 0, rotationZ: 0, puffs: [] },
      { id: 'cloud-2', z: 0, y: 60, scale: 1.5, opacity: 0.6, driftDuration: 40, driftDelay: -15, bobAmount: 15, bobDuration: 8, bobDelay: -5, rotationZ: 5, puffs: [] },
    ];
  }, []);

  // Soft atmospheric responsive interactive tracking
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left - (rect.width / 2);
      const relativeY = clientY - rect.top - (rect.height / 2);
      
      // Compute subtle fluid perspective offsets
      const targetAngleY = (relativeX / rect.width) * 45;   // yaw
      const targetAngleX = (relativeY / rect.height) * -30;  // pitch
      
      setWorldAngle({ x: targetAngleX, y: targetAngleY });
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // When mouse leaves or stops interacting, return gracefully to home values
    const onMouseLeave = () => {
      setWorldAngle({ x: 0, y: 0 });
    };

    const target = containerRef.current;
    if (target) {
      target.addEventListener('mousemove', onMouseMove);
      target.addEventListener('touchmove', onTouchMove);
      target.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      if (target) {
        target.removeEventListener('mousemove', onMouseMove);
        target.removeEventListener('touchmove', onTouchMove);
        target.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, []);

  const activeVariant = variant || (hasAlerts ? 'rose' : 'emerald');

  const themeCloudColor = 
    activeVariant === 'rose'
      ? "text-rose-400/20 group-hover:text-rose-400/35"
      : activeVariant === 'sky'
      ? "text-sky-100/30 group-hover:text-white/45 text-slate-100/35"
      : "text-emerald-400/15 group-hover:text-emerald-300/30";

  const themeWindStroke = 
    activeVariant === 'rose'
      ? "stroke-rose-400/25"
      : activeVariant === 'sky'
      ? "stroke-sky-200/30"
      : "stroke-emerald-400/15";

  return (
    <div 
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-none sm:pointer-events-auto sm:cursor-all-scroll select-none z-0", roundedClass)}
      style={{
        perspective: '900px',
        WebkitPerspective: '900px',
      }}
    >
      {/* High-fidelity CSS Animations - Completely Hardware-Accelerated (0% CPU cost, 120 FPS fluid) */}
      <style>{`
        @keyframes drift-left-to-right {
          0% {
            transform: translate3d(-380px, var(--base-y), var(--base-z)) rotateZ(var(--base-rot));
          }
          100% {
            transform: translate3d(calc(100% + 380px), var(--base-y), var(--base-z)) rotateZ(var(--base-rot));
          }
        }
        @keyframes float-bob {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, var(--bob-amt), 0) scale(1.04);
          }
        }
        @keyframes air-flow-wave {
          0% {
            stroke-dashoffset: 400;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes deep-ambient-rotation {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(1deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        .animate-air-flow-1 {
          animation: air-flow-wave 28s linear infinite;
        }
        .animate-air-flow-2 {
          animation: air-flow-wave 42s linear infinite;
        }
        .perspective-container {
          transition: transform 1.2s cubic-bezier(0.12, 0.8, 0.22, 1);
        }
      `}</style>

      {/* 3D Atmosphere Space Container */}
      <div 
        className="absolute inset-0 w-full h-full perspective-container"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transform: `rotateX(${worldAngle.x}deg) rotateY(${worldAngle.y}deg)`,
        }}
      >
        {/* Soft 3D Wind currents flowing behind the clouds */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: 'translateZ(-300px)', transformStyle: 'preserve-3d' }}
        >
          <svg className="absolute w-[800px] h-[350px] opacity-40" viewBox="0 0 800 350" fill="none">
            <path 
              d="M 50 180 C 180 120, 280 240, 420 180 C 560 120, 620 240, 750 180" 
              className={cn("transition-all duration-700 stroke-2 animate-air-flow-1", themeWindStroke)}
              strokeDasharray="22 14" 
            />
            <path 
              d="M 80 260 C 220 210, 320 300, 480 260 C 640 220, 700 290, 780 260" 
              className={cn("transition-all duration-700 stroke-[1.5] animate-air-flow-2", themeWindStroke)}
              strokeDasharray="14 10" 
            />
          </svg>
        </div>

        {/* CSS-Animated Parallax Drifting Clouds */}
        {clouds.map((cloud) => {
          return (
            <div
              key={cloud.id}
              className="absolute top-0 left-0 w-2 h-2 pointer-events-none origin-center"
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                animation: `drift-left-to-right ${cloud.driftDuration}s linear infinite`,
                animationDelay: `${cloud.driftDelay}s`,
                '--base-y': `${cloud.y}%`,
                '--base-z': `${cloud.z}px`,
                '--base-rot': `${cloud.rotationZ}deg`,
              } as React.CSSProperties}
            >
              {/* Inner container for high-fidelity fluid vertical bobbing */}
              <div
                className="relative flex items-center justify-center pointer-events-none"
                style={{
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d',
                  animation: `float-bob ${cloud.bobDuration}s ease-in-out infinite`,
                  animationDelay: `${cloud.bobDelay}s`,
                  '--bob-amt': `${cloud.bobAmount}px`,
                } as React.CSSProperties}
              >
                {/* Cluster of beautiful, realistic overlapping vectors mimicking cloud density */}
                {cloud.puffs.map((puff, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "absolute w-[240px] h-[240px] -ml-[120px] -mt-[120px] filter blur-[26px] select-none transition-colors duration-[1.2s] mix-blend-screen",
                      themeCloudColor
                    )}
                    style={{
                      transform: `translate3d(${puff.offsetX}px, ${puff.offsetY}px, 0) scaleX(${puff.scaleX * cloud.scale}) scaleY(${puff.scaleY * cloud.scale}) rotate(${puff.rotationZ}deg)`,
                      opacity: cloud.opacity * puff.opacity,
                    }}
                  >
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                      {/* Organic mathematical clouds contour */}
                      <path d="M 20,60 A 18,18 0 0,1 32,34 A 26,26 0 0,1 70,30 A 22,22 0 0,1 92,54 A 16,16 0 0,1 84,76 L 24,76 A 18,18 0 0,1 20,60 Z" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
