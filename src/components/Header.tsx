import { UserCircle, LogOut, Download } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { logout } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function Header() {
  const { user, loading } = useAuthState();
  const navigate = useNavigate();
  const { isInstallable, install } = usePWAInstall();

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
          <button
            onClick={install}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-system-bg border border-system-border text-system-text text-sm font-medium rounded-md hover:bg-system-border/50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
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
    </header>
  );
}
