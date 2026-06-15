import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/app/history', icon: History },
    { name: 'Analytics', path: '/app/analytics', icon: LineChart },
    { name: 'Alerts', path: '/app/alerts', icon: BellRing },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-system-panel border-r border-system-border hidden md:flex flex-col h-full z-10 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-system-border bg-system-panel text-system-text font-semibold uppercase tracking-wider text-sm gap-2">
        <Activity className="w-5 h-5 text-system-accent" />
        LAS Core
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-system-accent/10 text-system-accent" 
                : "text-system-muted hover:text-system-text hover:bg-system-bg"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-system-border text-xs text-system-muted font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-severity-normal animate-pulse"></div>
          SYSTEM ONLINE
        </div>
        <div className="mt-1 opacity-50">v1.0.0-rc</div>
      </div>
    </aside>
  );
}
