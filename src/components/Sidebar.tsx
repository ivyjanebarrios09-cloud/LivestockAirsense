import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings, Star, MonitorDown, LogOut, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuthState } from '../hooks/useAuthState';
import { logout } from '../lib/firebase';
import { InstallModal } from './InstallModal';

export function Sidebar() {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/app/history', icon: History },
    { name: 'Analytics', path: '/app/analytics', icon: LineChart },
    { name: 'Alerts', path: '/app/alerts', icon: BellRing },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-system-panel border-r border-system-border h-screen sticky top-0 shrink-0 z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-system-border flex items-center gap-3">
        <img 
          src="https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview%20(1).png" 
          alt="LAS Logo" 
          className="h-8 w-auto object-contain" 
        />
        <div className="flex flex-col">
          <span className="font-semibold text-system-text text-sm uppercase tracking-wider leading-none">AirSense</span>
          <span className="text-[10px] text-system-muted font-mono mt-0.5">LIVESTOCK MONITOR</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-system-muted uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
              isActive 
                ? "text-system-accent bg-system-accent/10 border-l-2 border-system-accent pl-2.5 font-bold" 
                : "text-system-muted hover:text-system-text hover:bg-system-bg"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* PWA Promo in Sidebar */}
      {isInstallable && (
        <div className="px-4 py-4 border-t border-system-border">
          <div className="p-3 bg-system-bg border border-system-border rounded-xl space-y-2.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-system-text">Run Natively</span>
            </div>
            <p className="text-[11px] text-system-muted leading-relaxed">
              Install the application in standalone format for instant native access.
            </p>
            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95"
              title="Install Native App"
            >
              <MonitorDown className="w-4 h-4 shrink-0" />
              <span>Install App</span>
            </button>
          </div>
        </div>
      )}

      {/* User profile footer */}
      {user && (
        <div className="p-4 border-t border-system-border bg-system-bg/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full border border-system-border shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <UserCircle className="w-9 h-9 text-system-muted shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-system-text truncate">
                {user.displayName || 'Authorized User'}
              </span>
              <span className="text-[10px] text-system-muted truncate font-mono">
                {user.email}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-system-muted hover:text-system-text hover:bg-system-border/40 rounded-lg transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      <InstallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onNativeInstall={triggerNativeInstall} 
        hasNativePrompt={hasNativePrompt} 
      />
    </aside>
  );
}
