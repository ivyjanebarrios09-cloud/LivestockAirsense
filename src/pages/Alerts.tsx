import { useState, useEffect } from 'react';
import { AlertTriangle, Info, ShieldAlert, Wind, Bell, BellRing, X, CheckSquare, Trash2, Calendar, Loader2, Bug, Activity } from 'lucide-react';
import { cn, parseSafeDate } from '../lib/utils';
import { useAuthState } from '../hooks/useAuthState';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../hooks/useAppContext';
import { toast } from 'sonner';

export function AlertsPage() {
  const { user } = useAuthState();
  const { resolveAlert, deleteAlert, selectedDeviceId, connectionStatus, alertsList, purgeResolvedAlerts, alertDiagnostics, thresholds, deviceData } = useAppContext();
  
  const [isPurging, setIsPurging] = useState(false);

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  const isEffectiveOnline = connectionStatus.status === 'Online';

  const uid = user?.uid || 'guest';

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [popupAlert, setPopupAlert] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'diagnostics'>('active');

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

  const filteredAlerts = alertsList.filter((item) => {
    if (activeTab === 'active') {
      if (item.resolved) return false;
    } else if (activeTab === 'resolved') {
      if (!item.resolved) return false;
    }

    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 relative pb-6">
      
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
          
          <div className="bg-system-panel border border-system-border p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">
              {[
                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved History' },
                { id: 'diagnostics', label: 'Diagnostic Logs' }
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

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {activeTab === 'resolved' && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to permanently delete all resolved alerts?')) {
                      try {
                        setIsPurging(true);
                        const count = purgeResolvedAlerts();
                        toast.success(`Purged ${count} resolved alerts`);
                      } catch (err) {
                        toast.error('Failed to purge resolved alerts');
                      } finally {
                        setIsPurging(false);
                      }
                    }
                  }}
                  disabled={isPurging}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-orange-500 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Purge Resolved Alerts"
                >
                  {isPurging ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Purge Resolved
                </button>
              )}
            </div>
          </div>

          <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            {activeTab === 'diagnostics' ? (
              <div className="p-4 md:p-5 max-h-[600px] overflow-y-auto space-y-4">
                <div className="flex items-center gap-2 mb-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <Bug className="w-4 h-4 text-blue-500" />
                  <p className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Raw Hardware Data & Threshold Logic Inspection</p>
                </div>

                {deviceData?.alerts && (
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <p className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Live Database State (Push Notification Trigger)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-blue-500/60 text-[9px] uppercase font-bold">activeAlert</span>
                        <span className={cn(
                          "font-bold",
                          deviceData.alerts.activeAlert ? "text-red-500" : "text-emerald-600"
                        )}>
                          {String(deviceData.alerts.activeAlert).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-blue-500/60 text-[9px] uppercase font-bold">Last Alert</span>
                        <span className="text-blue-700">
                          {deviceData.alerts.lastAlertType || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {alertDiagnostics.length === 0 ? (
                  <div className="text-center py-12 text-system-muted">
                    <Activity className="w-8 h-8 mx-auto opacity-35 mb-2 animate-pulse" />
                    <p className="text-xs font-mono uppercase tracking-wider leading-none">No diagnostic readings streamed yet today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertDiagnostics.map((log, idx) => {
                      const activeAlert = log.alerts?.activeAlert ?? log.activeAlert;
                      return (
                        <div key={log.id || idx} className="p-4 rounded-xl border border-system-border bg-system-bg space-y-3 font-mono">
                          <div className="flex items-center justify-between border-b border-system-border/50 pb-2">
                            <span className="text-[10px] font-bold text-system-text">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                activeAlert ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                              )}>
                                activeAlert: {String(activeAlert)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                            <div className="space-y-1">
                              <p className="text-system-muted">Temperature</p>
                              <p className={cn("font-bold", log.temperature > thresholds.tempMax ? "text-red-500" : "text-system-text")}>
                                {log.temperature?.toFixed(1)}°C <span className="opacity-40 font-normal">/ {thresholds.tempMax}</span>
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-system-muted">NH3 (Ammonia)</p>
                              <p className={cn("font-bold", log.nh3 > thresholds.ammoniaMax ? "text-red-500" : "text-system-text")}>
                                {log.nh3?.toFixed(1)} ppm <span className="opacity-40 font-normal">/ {thresholds.ammoniaMax}</span>
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-system-muted">Humidity</p>
                              <p className="text-system-text">{log.humidity?.toFixed(1)}%</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-system-muted">Source</p>
                              <p className="text-system-text truncate uppercase text-[9px]">{log.source || 'CLIENT'}</p>
                            </div>
                          </div>

                          {activeAlert === false && (log.temperature > thresholds.tempMax || log.nh3 > thresholds.ammoniaMax) && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              <p className="text-[9px] font-bold text-red-600 uppercase">Threshold Violation Detected but activeAlert is FALSE - Verification Required</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-system-muted select-none">
                <Wind className="w-8 h-8 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-mono uppercase tracking-wider leading-none">No {activeTab} anomalies logged</p>
              </div>
            ) : (
              <div className="p-4 md:p-5 max-h-[500px] overflow-y-auto space-y-3">
                {filteredAlerts.map((log) => (
                  <div 
                    key={log.id}
                    className={cn(
                      "p-4 rounded-xl border bg-system-bg flex flex-col md:flex-row items-start justify-between gap-4 transition-all duration-300 shadow-sm relative overflow-hidden",
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
                          <span className="text-[10px] bg-system-panel border border-system-border px-2 py-0.5 rounded-md font-semibold text-system-muted shrink-0">
                            {log.location}
                          </span>
                        </div>
                        <p className="text-xs text-system-muted leading-relaxed select-text">{log.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-system-bg">
                      <div className="flex flex-col text-right">
                        <span className="text-[12px] font-bold text-system-text leading-none">{log.time}</span>
                        <span className="text-[9px] font-mono text-system-muted mt-1 leading-none">Facility Log</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!log.resolved && (
                          <button
                            onClick={() => {
                              resolveAlert(log.id);
                              toast.success('Alert resolved successfully');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer select-none"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Resolve
                          </button>
                        )}
                      </div>
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
