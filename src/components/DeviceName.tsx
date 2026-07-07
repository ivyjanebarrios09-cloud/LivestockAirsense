import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AlertOctagon } from 'lucide-react';

interface DeviceNameProps {
  name: string;
  className?: string;
  hasDanger?: boolean;
}

export const DeviceName: React.FC<DeviceNameProps> = ({ name, className, hasDanger }) => {
  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-black whitespace-nowrap shadow-sm border transition-colors duration-300",
        hasDanger
          ? "bg-rose-500/20 border-rose-500 text-rose-500 shadow-rose-500/10"
          : "bg-slate-100/90 border-slate-300 text-slate-900",
        className
      )}
      animate={
        hasDanger
          ? {
              scale: [1, 1.06, 1],
              boxShadow: [
                "0 0 0 rgba(239, 68, 68, 0)",
                "0 0 12px rgba(239, 68, 68, 0.5)",
                "0 0 0 rgba(239, 68, 68, 0)",
              ],
              borderColor: [
                "rgba(239, 68, 68, 0.8)",
                "rgba(248, 113, 113, 1)",
                "rgba(239, 68, 68, 0.8)",
              ],
            }
          : {
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
            }
      }
      transition={{
        duration: hasDanger ? 1.5 : 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {hasDanger && (
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        </motion.span>
      )}
      <motion.span
        animate={
          hasDanger
            ? {
                color: ["#ef4444", "#f87171", "#ef4444"],
              }
            : {
                color: ["#0f172a", "#1e3a8a", "#0f172a"],
              }
        }
        transition={{
          duration: hasDanger ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {name}
      </motion.span>
    </motion.span>
  );
};
