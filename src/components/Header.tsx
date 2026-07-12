import React, { useState, useEffect } from 'react';
import { UserCircle, Star, MonitorDown, Wifi, WifiOff } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';
import { useAppContext } from '../hooks/useAppContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseSafeDate, getStatusBgColor } from '../lib/utils';
import { formatPHDate } from '../utils/date';

export function Header() {
  const { user, loading } = useAuthState();
  const { isOnline, connectionStatus } = useAppContext();
  const navigate = useNavigate();
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  // Real-time staleness check (30s threshold)
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  // A node is only considered online if its status is 'Online' AND it has a fresh heartbeat
  const isEffectiveOnline = connectionStatus.status === 'Online' && lastSeenMs > 0 && !isStale;
  const effectiveStatus = isEffectiveOnline ? 'Online' : 'Offline';

  return (
    <header className="h-16 bg-system-panel border-b border-system-border flex items-center justify-between px-3 md:px-6 shrink-0 z-10 sticky top-0 select-none">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="font-semibold text-system-text uppercase tracking-wider text-sm flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="LAS Logo" className="h-7 w-auto object-contain shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center text-sm font-black uppercase tracking-tight leading-none">
              <motion.span
                className="text-system-accent mr-[1px]"
                animate={{
                  color: ["#3b82f6", "#10b981", "#3b82f6"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Air
              </motion.span>
              <motion.span
                className="text-system-text"
                animate={{
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Sense
              </motion.span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono mt-0.5 whitespace-nowrap leading-none font-bold">
              <motion.span
                className="text-system-muted"
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                LIVESTOCK
              </motion.span>
              <motion.span
                className="text-amber-500 dark:text-amber-400 font-extrabold"
                animate={{
                  scale: [1, 1.08, 1],
                  color: ["#f59e0b", "#10b981", "#3b82f6", "#f59e0b"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                IoT
              </motion.span>
            </div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 ml-2 pl-3 sm:pl-4 border-l border-system-border h-6">
          <AnimatePresence mode="wait">
            {!isOnline ? (
              <motion.div 
                key="system-offline"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold font-mono uppercase tracking-widest">System Offline</span>
              </motion.div>
            ) : (
              <motion.div 
                key="node-status"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-500",
                  isEffectiveOnline ? getStatusBgColor('GOOD') : getStatusBgColor('DANGER')
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isEffectiveOnline ? "bg-emerald-400 animate-ping" : "bg-red-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    isEffectiveOnline ? "bg-emerald-500" : "bg-red-500"
                  )}></span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest font-mono whitespace-nowrap">
                  Node {effectiveStatus}
                </span>
                {connectionStatus.lastSeen > 0 && (
                  <span className={cn(
                    "text-[8px] sm:text-[9px] font-mono uppercase tracking-tighter border-l border-system-border/50 ml-1.5 pl-1.5",
                    isStale ? "text-rose-500/80 font-black" : "text-system-muted/60"
                  )}>
                    <span className="hidden sm:inline">Heartbeat: </span>
                    {formatPHDate(connectionStatus.lastSeen, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    {isStale && <span className="ml-1 animate-pulse">(STALE)</span>}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {isInstallable && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-system-bg border border-system-border rounded-xl shadow-inner scale-90 sm:scale-100">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
            <div className="w-[1px] h-3 bg-system-border mx-1" />
            <button
              onClick={install}
              className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <MonitorDown className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Install App</span>
              <span className="md:hidden">PWA</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="w-7 h-7 rounded-full border-2 border-system-border border-t-system-accent animate-spin shrink-0" />
        ) : user ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-system-text font-mono hidden sm:block bg-system-bg border border-system-border px-2 py-1 rounded-lg max-w-[120px] truncate leading-none md:max-w-[180px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-system-border shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle className="w-7 h-7 text-system-muted shrink-0" />
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 bg-system-accent text-white text-xs font-semibold rounded-xl hover:bg-opacity-90 transition-all shadow-sm shrink-0"
          >
            Sign In
          </button>
        )}
      </div>

      <InstallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onNativeInstall={triggerNativeInstall} 
        hasNativePrompt={hasNativePrompt} 
      />
    </header>
  );
}
