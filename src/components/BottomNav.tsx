import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, BellRing, FileText, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../hooks/useAppContext';
import { motion } from 'motion/react';

export function BottomNav() {
  const { unreadAlertsCount } = useAppContext();

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/app/dashboard', 
      icon: LayoutDashboard,
      animation: {
        hover: { scale: 1.18, rotate: [0, -6, 6, -6, 0] },
        active: { scale: [1, 1.2, 0.95, 1], y: [0, -3, 1, 0] }
      }
    },
    { 
      name: 'History', 
      path: '/app/history', 
      icon: History,
      animation: {
        hover: { scale: 1.18, rotate: 360, transition: { duration: 0.6, ease: "easeInOut" } },
        active: { scale: [1, 1.25, 0.95, 1], rotate: [0, -10, 10, 0] }
      }
    },
    { 
      name: 'Analytics', 
      path: '/app/analytics', 
      icon: LineChart,
      animation: {
        hover: { scale: 1.18, y: [0, -4, 2, 0], transition: { duration: 0.4 } },
        active: { scale: [1, 1.2, 0.95, 1], y: [0, -4, 1, 0] }
      }
    },
    { 
      name: 'Alerts', 
      path: '/app/alerts', 
      icon: BellRing, 
      badge: unreadAlertsCount,
      animation: {
        hover: { 
          scale: 1.2,
          rotate: [0, -15, 12, -10, 8, -4, 0],
          transition: { duration: 0.5, ease: "easeInOut" }
        },
        active: { 
          scale: [1, 1.25, 0.9, 1.05, 1],
          rotate: [0, -20, 18, -12, 10, -5, 0],
          transition: { duration: 0.6 }
        }
      }
    },
    { 
      name: 'Reports', 
      path: '/app/reports', 
      icon: FileText,
      animation: {
        hover: { scale: 1.18, y: -3, transition: { type: 'spring', stiffness: 400, damping: 10 } },
        active: { scale: [1, 1.2, 0.95, 1], rotate: [0, -5, 5, 0] }
      }
    },
    { 
      name: 'Settings', 
      path: '/app/settings', 
      icon: Settings,
      animation: {
        hover: { scale: 1.18, rotate: 90, transition: { type: 'spring', stiffness: 200 } },
        active: { rotate: 360, transition: { duration: 0.8, ease: "linear" } }
      }
    },
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
              <motion.div
                variants={{
                  initial: { scale: 1, rotate: 0, y: 0 },
                  hover: item.animation.hover,
                  active: item.animation.active
                }}
                initial="initial"
                animate={isActive ? "active" : "initial"}
                whileHover="hover"
                whileTap={{ scale: 0.9 }}
                className="relative flex items-center justify-center"
              >
                <item.icon className="w-5 h-5" />
              </motion.div>
              
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-severity-critical text-[8px] font-bold text-white leading-none scale-90 border border-system-panel animate-bounce z-10">
                  {item.badge}
                </span>
              ) : null}
              
              {isActive && (
                <motion.span 
                  layoutId="bottomNavDot"
                  className="absolute bottom-1.5 w-1.5 h-[3px] rounded-full bg-system-accent" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
