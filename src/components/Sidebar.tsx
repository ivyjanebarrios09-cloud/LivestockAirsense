import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings, LogOut, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthState } from '../hooks/useAuthState';
import { logout } from '../lib/firebase';

export function Sidebar() {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

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
    <aside className={cn(
      "hidden md:flex flex-col bg-system-panel border-r border-system-border h-screen sticky top-0 shrink-0 z-20 transition-all duration-300 font-sans",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Brand Header */}
      <div className={cn(
        "h-16 border-b border-system-border flex items-center shrink-0 relative",
        isCollapsed ? "justify-center px-2" : "justify-between px-6"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src="/logo.png" 
            alt="LAS Logo" 
            className="h-8 w-auto object-contain shrink-0" 
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-system-text text-sm uppercase tracking-wider leading-none">AirSense</span>
              <span className="text-[10px] text-system-muted font-mono mt-0.5 whitespace-nowrap">LIVESTOCK MONITOR</span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Arrow Button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "p-1 rounded-md border border-system-border bg-system-bg text-system-muted hover:text-system-text transition-all shadow-sm shrink-0",
            isCollapsed ? "absolute -right-3 top-5 z-50 rounded-full" : ""
          )}
          title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-system-muted uppercase tracking-wider">
            Menu
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-2.5 text-sm font-medium rounded-lg transition-all",
              isCollapsed ? "justify-center px-1" : "px-3",
              isActive 
                ? "text-system-accent bg-system-accent/10 border-l-2 border-system-accent pl-2.5 font-bold animate-pulse" 
                : "text-system-muted hover:text-system-text hover:bg-system-bg"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile footer */}
      {user && (
        <div className={cn(
          "border-t border-system-border bg-system-bg/30 flex shrink-0 items-center",
          isCollapsed ? "p-2 flex-col gap-2 justify-center" : "p-4 justify-between gap-3"
        )}>
          <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
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
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-system-text truncate">
                  {user.displayName || 'Authorized User'}
                </span>
                <span className="text-[10px] text-system-muted truncate font-mono">
                  {user.email}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "p-1.5 text-system-muted hover:text-system-text hover:bg-system-border/40 rounded-lg transition-colors shrink-0",
              isCollapsed ? "mt-1" : ""
            )}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
