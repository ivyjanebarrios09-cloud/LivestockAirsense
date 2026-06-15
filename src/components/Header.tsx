import { Menu, UserCircle, LogOut } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { logout } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, loading } = useAuthState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-system-panel border-b border-system-border flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-system-muted hover:text-system-text hover:bg-system-border/50 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="md:hidden font-semibold text-system-text uppercase tracking-wider text-sm flex items-center gap-2">
          LAS
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-system-muted font-mono">
          <span>/</span>
          <span>dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
