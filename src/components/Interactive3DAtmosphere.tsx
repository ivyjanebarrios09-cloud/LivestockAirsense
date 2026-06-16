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
}

export function Interactive3DAtmosphere({ hasAlerts = false, variant }: Interactive3DAtmosphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth perspective tilt coordinates
  const [worldAngle, setWorldAngle] = useState({ x: 0, y: 0 });

  // Staggered cloud layer configuration - crafted to distribute clouds organically
  const clouds: CloudLayer[] = useMemo(() => {
    const rawLayers = [
      { z: -700, y: 15, scale: 0.9, opacity: 0.5, driftDur: 140, driftDel: -45, bobAmt: 12, bobDur: 26, bobDel: -5, rot: -5 },
      { z: -450, y: 40, scale: 1.15, opacity: 0.7, driftDur: 110, driftDel: -18, bobAmt: 18, bobDur: 21, bobDel: -9, rot: 8 },
      { z: -250, y: 20, scale: 1.35, opacity: 0.85, driftDur: 85, driftDel: -65, bobAmt: 24, bobDur: 17, bobDel: -14, rot: -12 },
      { z: -50,  y: 65, scale: 1.6, opacity: 0.9, driftDur: 68, driftDel: -32, bobAmt: 30, bobDur: 14, bobDel: -4, rot: 15 },
      { z: 120,  y: 10, scale: 2.1, opacity: 0.8, driftDur: 48, driftDel: -8, bobAmt: 42, bobDur: 11, bobDel: -17, rot: -6 },
      { z: -550, y: 75, scale: 1.0, opacity: 0.55, driftDur: 125, driftDel: -88, bobAmt: 15, bobDur: 23, bobDel: -2, rot: 20 },
      { z: -350, y: -10, scale: 1.25, opacity: 0.72, driftDur: 98, driftDel: -52, bobAmt: 21, bobDur: 19, bobDel: -11, rot: -18 },
      { z: 50,   y: 85, scale: 1.8, opacity: 0.75, driftDur: 55, driftDel: -25, bobAmt: 35, bobDur: 15, bobDel: -10, rot: 10 }
    ];

    return rawLayers.map((layer, index) => {
      // Deterministic offsets to build soft organic puff outlines without randomization flashes
      const puffCount = 4 + (index % 3);
      const puffs: SubPuff[] = Array.from({ length: puffCount }, (_, i) => {
        const theta = (i / puffCount) * Math.PI * 2;
        return {
          offsetX: Math.round(Math.cos(theta) * 35 + (i * 8 % 15) - 7),
          offsetY: Math.round(Math.sin(theta) * 20 + (i * 12 % 15) - 7),
          scaleX: 1.1 + (i * 3 % 5) * 0.15,
          scaleY: 0.8 + (i * 2 % 4) * 0.12,
          rotationZ: (i * 45) % 360,
          opacity: 0.85 - (i * 0.05)
        };
      });

      return {
        id: `stable-cloud-${index}`,
        z: layer.z,
        y: layer.y,
        scale: layer.scale,
        opacity: layer.opacity,
        driftDuration: layer.driftDur,
        driftDelay: layer.driftDel,
        bobAmount: layer.bobAmt,
        bobDuration: layer.bobDur,
        bobDelay: layer.bobDel,
        rotationZ: layer.rot,
        puffs
      };
    });
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
      className="absolute inset-0 overflow-hidden pointer-events-auto cursor-all-scroll select-none z-0 rounded-2xl"
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
