import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../hooks/useAppContext';

export function BottomNav() {
  const { unreadAlertsCount } = useAppContext();

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/app/history', icon: History },
    { name: 'Analytics', path: '/app/analytics', icon: LineChart },
    { name: 'Alerts', path: '/app/alerts', icon: BellRing, badge: unreadAlertsCount },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-system-panel/90 backdrop-blur-md border border-system-border flex items-center justify-around h-16 px-2 rounded-2xl z-50 shadow-lg shadow-black/5 select-none animate-in slide-in-from-bottom duration-500">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl text-system-muted transition-all duration-300 hover:scale-105 active:scale-95 group",
            isActive 
              ? "text-system-accent bg-system-accent/10 font-semibold" 
              : "hover:text-system-text hover:bg-system-bg/80"
          )}
          title={item.name}
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-5 h-5 transition-transform group-hover:rotate-3" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-severity-critical text-[9px] font-bold text-white leading-none scale-90 border border-system-panel animate-bounce">
                  {item.badge}
                </span>
              ) : null}
              {isActive && (
                <span className="absolute bottom-1.5 w-1.5 h-[3px] rounded-full bg-system-accent" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
