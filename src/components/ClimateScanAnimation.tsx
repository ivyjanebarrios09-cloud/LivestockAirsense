import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ClimateScanAnimationProps {
  theme?: string;
}

export const ClimateScanAnimation: React.FC<ClimateScanAnimationProps> = ({ theme }) => {
  // Determine gradient color and accent colors based on theme
  const colors = {
    forest: {
      ring: 'rgba(16, 185, 129, 0.25)', // emerald-500
      glow: 'rgba(52, 211, 153, 0.4)', // emerald-400
      particle: 'bg-emerald-500/60'
    },
    wind: {
      ring: 'rgba(14, 165, 233, 0.25)', // sky-500
      glow: 'rgba(56, 189, 248, 0.4)', // sky-400
      particle: 'bg-sky-500/60'
    },
    farm: {
      ring: 'rgba(245, 158, 11, 0.25)', // amber-500
      glow: 'rgba(251, 191, 36, 0.4)', // amber-400
      particle: 'bg-amber-500/60'
    },
    default: {
      ring: 'rgba(99, 102, 241, 0.25)', // indigo-500
      glow: 'rgba(129, 140, 248, 0.4)', // indigo-400
      particle: 'bg-indigo-500/60'
    }
  };

  const selectedColor = colors[theme as keyof typeof colors] || colors.default;

  // Generate coordinates/speeds for a few dynamic particles
  const particles = [
    { id: 1, left: '15%', size: 4, duration: 4.5, delay: 0 },
    { id: 2, left: '45%', size: 6, duration: 5.5, delay: 1.2 },
    { id: 3, left: '75%', size: 3, duration: 3.8, delay: 0.5 },
    { id: 4, left: '28%', size: 5, duration: 5.0, delay: 2.0 },
    { id: 5, left: '88%', size: 5, duration: 4.2, delay: 1.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Dynamic Radar/Scan Wave 1 */}
      <motion.div
        className="absolute bottom-[-40px] right-[-40px] rounded-full border"
        style={{
          borderColor: selectedColor.ring,
          boxShadow: `0 0 15px ${selectedColor.ring}`,
          width: 140,
          height: 140,
        }}
        animate={{
          scale: [0.8, 2.2],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      {/* Dynamic Radar/Scan Wave 2 */}
      <motion.div
        className="absolute bottom-[-40px] right-[-40px] rounded-full border"
        style={{
          borderColor: selectedColor.ring,
          boxShadow: `0 0 20px ${selectedColor.ring}`,
          width: 140,
          height: 140,
        }}
        animate={{
          scale: [0.8, 2.2],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 4,
          delay: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      {/* Floating Air Micro-particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={cn("absolute rounded-full shadow-sm blur-[0.5px]", selectedColor.particle)}
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            bottom: '-10px',
          }}
          animate={{
            y: [-10, -180],
            x: [0, Math.sin(p.id) * 15, 0],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Ambient glowing atmosphere in the corner */}
      <div 
        className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${selectedColor.glow} 0%, transparent 70%)`
        }}
      />
    </div>
  );
};
