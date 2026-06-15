import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export function BottomNav() {
  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/app/history', icon: History },
    { name: 'Analytics', path: '/app/analytics', icon: LineChart },
    { name: 'Alerts', path: '/app/alerts', icon: BellRing },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-system-panel/90 backdrop-blur-md border border-system-border flex items-center justify-around h-16 px-3 rounded-2xl z-50 shadow-lg shadow-black/5">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl text-system-muted transition-all duration-300 hover:scale-110 active:scale-95 group",
            isActive 
              ? "text-system-accent bg-system-accent/10 font-semibold" 
              : "hover:text-system-text hover:bg-system-bg/80"
          )}
          title={item.name}
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-5 h-5 transition-transform group-hover:rotate-3" />
              {isActive && (
                <span className="absolute bottom-1.5 w-1 h-[3px] rounded-full bg-system-accent" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
