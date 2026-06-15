import { UserCircle, LogOut, Star, MonitorDown } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { logout } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';

export function Header() {
  const { user, loading } = useAuthState();
  const navigate = useNavigate();
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-system-panel border-b border-system-border flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <div className="font-semibold text-system-text uppercase tracking-wider text-sm flex items-center gap-2">
          <img src="https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview%20(1).png" alt="LAS Logo" className="h-8 w-auto object-contain" />
          <span className="hidden sm:inline">Livestock AirSense</span>
          <span className="sm:hidden">LAS</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-system-muted font-mono">
          <span>/</span>
          <span>dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isInstallable && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-system-bg border border-system-border rounded-lg shadow-inner">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" title="Bookmark style indicator" />
            <div className="w-[1px] h-4 bg-system-border" />
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-sm active:scale-95"
              title="Install Native App (PWA)"
            >
              <MonitorDown className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Install PWA</span>
              <span className="sm:hidden">Install</span>
            </button>
          </div>
        )}
        {loading ? (
          <div className="w-8 h-8 rounded-full border-2 border-system-border border-t-system-accent animate-spin" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-system-text hidden sm:block">
              {user.displayName || user.email}
            </span>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-system-border" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle className="w-8 h-8 text-system-muted" />
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-system-muted hover:text-system-text hover:bg-system-border/50 rounded-md ml-2 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-system-accent text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors focus:ring-2 focus:ring-system-accent focus:ring-offset-2 focus:ring-offset-system-bg"
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
