import { useEffect, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, Wind, Bell, BellRing, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthState } from '../hooks/useAuthState';
import { motion, AnimatePresence } from 'motion/react';

export function AlertsPage() {
  const { user } = useAuthState();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [popupAlert, setPopupAlert] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any[]>([
    { id: '1', timestamp: Date.now() - 1000 * 60 * 5, alertType: 'High CO2', severity: 'High Risk', message: 'CO2 levels exceeded 1000ppm in zone A.', isRead: false },
    { id: '2', timestamp: Date.now() - 1000 * 60 * 30, alertType: 'Sensor Offline', severity: 'Warning', message: 'PM2.5 sensor lost connection.', isRead: true },
    { id: '3', timestamp: Date.now() - 1000 * 60 * 120, alertType: 'High PM10', severity: 'Critical', message: 'Particulate matter exceeds acceptable safety limits.', isRead: false },
    { id: '4', timestamp: Date.now() - 1000 * 60 * 180, alertType: 'System Restored', severity: 'Normal', message: 'All sensors are operating nominally.', isRead: true }
  ]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (popupAlert) {
      const timer = setTimeout(() => {
        setPopupAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [popupAlert]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const simulateAlert = () => {
    const newAlert = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      alertType: 'Simulated Threat',
      severity: 'Critical',
      message: 'Simulated high risk condition detected by sensors.',
      isRead: false
    };
    
    setAlerts(prev => [newAlert, ...prev]);
    setPopupAlert(newAlert);

    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('Livestock AirSense: ' + newAlert.alertType, {
            body: newAlert.message,
            icon: 'https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview.png',
            vibrate: [200, 100, 200],
            requireInteraction: true
          } as any);
        });
      } else {
        new Notification('Livestock AirSense: ' + newAlert.alertType, {
          body: newAlert.message,
          icon: 'https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview.png'
        });
      }
    }
  };

  const severityStyles: Record<string, string> = {
    'Critical': 'bg-severity-critical/10 text-severity-critical border-severity-critical/20',
    'High Risk': 'bg-severity-high/10 text-severity-high border-severity-high/20',
    'Warning': 'bg-severity-warning/10 text-severity-warning border-severity-warning/20',
    'Normal': 'bg-severity-normal/10 text-severity-normal border-severity-normal/20'
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <ShieldAlert className="w-5 h-5" />;
      case 'High Risk': return <AlertTriangle className="w-5 h-5" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Pop up notification area */}
      <AnimatePresence>
        {popupAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-4 md:right-8 z-50 max-w-sm w-full"
          >
            <div className={cn(
              "p-4 rounded-lg border shadow-lg flex items-start gap-3 relative",
              severityStyles[popupAlert.severity] || severityStyles['Normal']
            )}>
              <button 
                onClick={() => setPopupAlert(null)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="shrink-0 mt-0.5">
                {getIcon(popupAlert.severity)}
              </div>
              <div className="mr-4">
                <h4 className="font-bold text-sm">{popupAlert.alertType}</h4>
                <p className="text-sm opacity-90 mt-1">{popupAlert.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">System Alerts</h1>
          <p className="text-sm text-system-muted">Monitor and respond to dangerous environmental conditions.</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
            {permission !== 'granted' && (
              <button 
                onClick={requestPermission}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-system-border rounded-md hover:bg-system-panel transition-colors"
              >
                <Bell className="w-4 h-4" />
                Enable Notifications
              </button>
            )}
            <button 
              onClick={simulateAlert}
              className="flex items-center gap-2 px-3 py-1.5 bg-system-accent text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors shadow-sm"
            >
              <BellRing className="w-4 h-4" />
              Test Alert
            </button>
          </div>
        )}
      </div>

      {!user ? (
        <div className="bg-system-panel border border-system-border shadow-sm rounded-lg p-12 text-center text-system-muted">
          <Wind className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Please sign in to view and manage active alerts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className={cn(
                "flex flex-col sm:flex-row gap-4 sm:items-start p-4 rounded-lg border transition-all",
                severityStyles[alert.severity] || severityStyles['Normal'],
                !alert.isRead && "ring-1 ring-inset ring-current/20 shadow-sm"
              )}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[150px]">
                {getIcon(alert.severity)}
                <span className="font-semibold">{alert.alertType}</span>
              </div>
              
              <div className="flex-1 text-sm opacity-90">
                {alert.message}
              </div>
              
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 text-xs font-mono opacity-70 whitespace-nowrap">
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
