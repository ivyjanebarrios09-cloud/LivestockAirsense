import { Cloud, Wind } from 'lucide-react';
import { motion } from 'motion/react';

export function AirLoading() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center h-24 w-24">
        {/* Background pulsing glow */}
        <div className="absolute inset-0 bg-system-accent/20 rounded-full blur-xl animate-pulse" />
        
        {/* Main cloud */}
        <motion.div
          animate={{ 
            y: [-4, 4, -4],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="relative z-10 text-system-accent drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Cloud className="w-14 h-14" />
        </motion.div>

        {/* Floating wind particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute z-0 text-system-accent/60"
            initial={{ opacity: 0, x: -30, y: i * 10 - 10 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              x: [-30, 30],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "linear"
            }}
          >
            <Wind className="w-6 h-6" />
          </motion.div>
        ))}
      </div>
      
      {/* Loading text typography */}
      <motion.p 
        className="mt-6 font-mono text-sm uppercase tracking-[0.2em] font-bold text-system-accent/80"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading Features
      </motion.p>
    </div>
  );
}
