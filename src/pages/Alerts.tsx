import { useEffect, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, Wind, Bell, BellRing, X, CheckSquare, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthState } from '../hooks/useAuthState';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../hooks/useAppContext';
import { subscribeToAlerts } from '../lib/firebase';

export function AlertsPage() {
  const { user } = useAuthState();
  const { resolveAlert, clearAllAlerts, selectedDeviceId } = useAppContext();
  
  const [alerts, setAlerts] = useState<any[]>([]);

  const uid = user?.uid || 'guest';

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(uid, (data) => {
        setAlerts(data);
    }, selectedDeviceId);
    return () => unsubscribe();
  }, [uid, selectedDeviceId]);

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [popupAlert, setPopupAlert] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved'>('active');

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
      alert('This browser does not support desktop notifications.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const severityStyles: Record<string, string> = {
    'critical': 'bg-red-500/10 text-red-600 border-red-500/20 ring-1 ring-red-500/10',
    'warning': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 ring-1 ring-yellow-500/10',
    'normal': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-1 ring-emerald-500/10'
  };

  const getSeverityLabel = (sev: string) => {
    if (sev === 'critical') return 'Critical';
    if (sev === 'warning') return 'Warning';
    return 'Normal';
  };

  const getIcon = (sev: string) => {
    switch (sev) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />;
      default: return <Info className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    if (activeTab === 'active') return !item.resolved;
    if (activeTab === 'resolved') return item.resolved;
    return true; // 'all'
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 relative pb-28">
      
      <AnimatePresence>
        {popupAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-4 z-50 max-w-sm w-full"
          >
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-white/10 flex items-start gap-3 relative">
              <button 
                onClick={() => setPopupAlert(null)}
                className="absolute top-2.5 right-2.5 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="shrink-0 mt-0.5 p-1 bg-red-500/20 rounded-lg">
                <BellRing className="w-4 h-4 text-red-400" />
              </div>
              <div className="mr-4">
                <h4 className="font-bold text-sm tracking-tight">{popupAlert.alertType}</h4>
                <p className="text-xs text-slate-300 mt-1">{popupAlert.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">System Alerts</h1>
          <p className="text-sm text-system-muted mt-1">Monitor and respond to critical air hazards in real time.</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-2">
            {permission !== 'granted' && (
              <button 
                onClick={requestPermission}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-system-border bg-system-panel rounded-xl hover:bg-system-bg transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                Enable Push
              </button>
            )}
          </div>
        )}
      </div>

      {!user ? (
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-12 text-center text-system-muted max-w-lg mx-auto">
          <Wind className="w-12 h-12 mx-auto mb-4 opacity-35 animate-pulse" />
          <h3 className="font-bold text-system-text uppercase font-mono text-sm">Security Block</h3>
          <p className="text-sm text-system-muted mt-2">Please sign in to view and manage live critical air quality alerts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-system-panel border border-system-border p-3 rounded-2xl">
            <div className="flex bg-system-bg p-1 rounded-xl border border-system-border select-none self-start sm:self-auto">
              {[
                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved History' },
                { id: 'all', label: 'All Logs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-lg cursor-pointer",
                    activeTab === tab.id 
                      ? "bg-system-panel text-system-text shadow-sm" 
                      : "text-system-muted hover:text-system-text"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'resolved' && (
              <button
                onClick={clearAllAlerts}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-red-600 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge History
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="bg-system-panel border border-system-border text-center py-10 rounded-2xl text-system-muted select-none">
                <Wind className="w-8 h-8 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-mono uppercase tracking-wider leading-none">No {activeTab} anomalies logged</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((log) => (
                  <div 
                    key={log.id}
                    className={cn(
                      "p-4 rounded-2xl border bg-system-panel flex flex-col md:flex-row items-start justify-between gap-4 transition-all duration-300 shadow-sm relative overflow-hidden",
                      log.resolved ? "opacity-60 border-system-border" : "border-system-text/10 ring-1 ring-system-text/5"
                    )}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {getIcon(log.severity)}
                      </div>
                      
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm tracking-tight text-system-text leading-none">{log.alertType}</span>
                          <span className={cn(
                            "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border shrink-0",
                            severityStyles[log.severity] || severityStyles['normal']
                          )}>
                            {getSeverityLabel(log.severity)}
                          </span>
                          <span className="text-[10px] bg-system-bg border border-system-border px-2 py-0.5 rounded-md font-semibold text-system-muted shrink-0">
                            {log.location}
                          </span>
                        </div>
                        <p className="text-xs text-system-muted leading-relaxed select-text">{log.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-system-bg">
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-mono text-system-muted font-bold leading-none">{log.time}</span>
                        <span className="text-[9px] font-mono text-system-muted mt-1 leading-none">Facility Log</span>
                      </div>

                      {!log.resolved && (
                        <button
                          onClick={() => resolveAlert(log.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer select-none"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
