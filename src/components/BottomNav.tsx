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
    <nav className="fixed bottom-0 w-full bg-system-panel border-t border-system-border flex md:hidden items-center justify-around h-16 px-2 z-50 max-w-full">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center w-full h-full text-system-muted transition-colors rounded-lg",
            isActive 
              ? "text-system-accent bg-system-accent/10" 
              : "hover:text-system-text hover:bg-system-bg"
          )}
          title={item.name}
        >
          <item.icon className="w-6 h-6" />
        </NavLink>
      ))}
    </nav>
  );
}
