import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DeviceNameProps {
  name: string;
  className?: string;
}

export const DeviceName: React.FC<DeviceNameProps> = ({ name, className }) => {
  return (
    <motion.span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100/90 border border-slate-300 text-xs font-black text-slate-900 shadow-sm whitespace-nowrap",
        className
      )}
      animate={{
        scale: [1, 1.04, 1],
        boxShadow: [
          "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 rgba(59, 130, 246, 0)",
          "0 2px 4px 0 rgba(0, 0, 0, 0.08), 0 0 10px rgba(59, 130, 246, 0.3)",
          "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 rgba(59, 130, 246, 0)",
        ],
        borderColor: [
          "#cbd5e1", // slate-300
          "#60a5fa", // blue-400
          "#cbd5e1"
        ]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.span
        animate={{
          color: ["#0f172a", "#1e3a8a", "#0f172a"], // slate-900 to deep-blue to slate-900
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {name}
      </motion.span>
    </motion.span>
  );
};
