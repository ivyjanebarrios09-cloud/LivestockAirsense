import { UserCircle, Star, MonitorDown, Wifi, WifiOff } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';
import { useAppContext } from '../hooks/useAppContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function Header() {
  const { user, loading } = useAuthState();
  const { isOnline } = useAppContext();
  const navigate = useNavigate();
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  return (
    <header className="h-16 bg-system-panel border-b border-system-border flex items-center justify-between px-3 md:px-6 shrink-0 z-10 sticky top-0 select-none">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="font-semibold text-system-text uppercase tracking-wider text-sm flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="LAS Logo" className="h-7 w-auto object-contain shrink-0" />
          <div className="flex flex-col">
            <span className="font-black text-system-text text-sm uppercase tracking-tight leading-none">AirSense</span>
            <span className="text-[8px] text-system-muted font-mono mt-0.5 whitespace-nowrap leading-none">LIVESTOCK IoT</span>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 ml-2 pl-4 border-l border-system-border h-6">
          <AnimatePresence mode="wait">
            {isOnline ? (
              <motion.div 
                key="online"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1.5"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </div>
                <span className="text-[10px] font-black font-mono text-emerald-500/80 uppercase tracking-widest">Live</span>
              </motion.div>
            ) : (
              <motion.div 
                key="offline"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1.5"
              >
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] font-black font-mono text-rose-500 uppercase tracking-widest">Offline</span>
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
