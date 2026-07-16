import { useState, useEffect } from 'react';
import { AlertTriangle, Info, ShieldAlert, Wind, Bell, BellRing, X, CheckSquare, Trash2, Calendar, Loader2, Download } from 'lucide-react';
import { cn, parseSafeDate } from '../lib/utils';
import { formatPHDate } from '../utils/date';
import { useAuthState } from '../hooks/useAuthState';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../hooks/useAppContext';
import { deleteAlertsByDate } from '../lib/firebase';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function AlertsPage() {
  const { user } = useAuthState();
  const { resolveAlert, deleteAlert, selectedDeviceId, connectionStatus, alertsList, purgeResolvedAlerts, thresholds } = useAppContext();
  
  const [isPurging, setIsPurging] = useState(false);

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  const isEffectiveOnline = connectionStatus.status === 'Online' && lastSeenMs > 0 && !isStale;

  const uid = user?.uid || 'guest';

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [popupAlert, setPopupAlert] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
    'danger': 'bg-red-500/10 text-red-600 border-red-500/20 ring-1 ring-red-500/10',
    'warning': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 ring-1 ring-yellow-500/10',
    'poor': 'bg-orange-500/10 text-orange-600 border-orange-500/20 ring-1 ring-orange-500/10',
    'moderate': 'bg-blue-500/10 text-blue-600 border-blue-500/20 ring-1 ring-blue-500/10',
    'good': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-1 ring-emerald-500/10',
    'normal': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-1 ring-emerald-500/10',
    'unhealthy': 'bg-purple-500/10 text-purple-600 border-purple-500/20 ring-1 ring-purple-500/10',
    'hazardous': 'bg-rose-500/10 text-rose-600 border-rose-500/20 ring-1 ring-rose-500/10',
  };

  const getSeverityLabel = (sev: string) => {
    if (!sev) return 'Normal';
    const s = sev.toLowerCase();
    if (s === 'critical') return 'Critical';
    if (s === 'warning') return 'Warning';
    if (s === 'normal') return 'Normal';
    return sev.charAt(0).toUpperCase() + sev.slice(1);
  };

  const getIcon = (sev: string) => {
    const s = sev?.toLowerCase() || 'normal';
    if (s === 'critical' || s === 'danger' || s === 'hazardous') return <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />;
    if (s === 'warning' || s === 'poor' || s === 'unhealthy') return <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />;
    return <Info className="w-5 h-5 text-emerald-500 shrink-0" />;
  };

  const filteredAlerts = alertsList.filter((item) => {
    if (!item.timestamp) return false;
    // Assuming local date matching
    const alertDate = new Date(item.timestamp).toISOString().split('T')[0];
    return alertDate === selectedDate;
  });

  const exportPDF = () => {
    if (filteredAlerts.length === 0) {
      toast.error('No alerts to export for this view');
      return;
    }
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.text("Livestock AirSense: System Alerts Report", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Date: " + selectedDate, 14, 21);
      doc.text("Exported at: " + new Date().toLocaleString(), 14, 26);
      doc.setLineWidth(0.5);
      doc.line(14, 30, 196, 30);

      autoTable(doc, {
        head: [['Time', 'Type', 'Severity', 'Location', 'Message']],
        body: filteredAlerts.map(row => [
          row.time || (row.timestamp ? formatPHDate(row.timestamp) : 'N/A'),
          row.alertType || 'System Alert',
          row.severity ? getSeverityLabel(row.severity) : 'Normal',
          row.location || 'Unknown',
          row.message || '-'
        ]),
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
        columnStyles: {
          4: { cellWidth: 80 }
        },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save("airsense_alerts_" + selectedDate + "_" + new Date().getTime() + ".pdf");
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error("Export error:", error);
      toast.error('Failed to export PDF');
    }
  };

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
                        <div className="flex items-center gap-2 bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">
              <div className="flex items-center pl-2 pr-1 gap-2 text-system-muted">
                <Calendar className="w-4 h-4" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold uppercase text-system-text outline-none cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={exportPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-system-text bg-system-bg border border-system-border hover:bg-system-panel rounded-xl transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to permanently delete all alerts for ${selectedDate}?`)) {
                    try {
                      setIsPurging(true);
                      const count = await deleteAlertsByDate(uid, selectedDate);
                      toast.success(`Deleted ${count} alerts`);
                    } catch (err) {
                      toast.error('Failed to delete alerts');
                    } finally {
                      setIsPurging(false);
                    }
                  }
                }}
                disabled={isPurging}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete Alerts for Selected Date"
              >
                {isPurging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>

          <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-system-muted select-none">
                <Wind className="w-8 h-8 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-mono uppercase tracking-wider leading-none">No anomalies logged for {selectedDate}</p>
              </div>
            ) : (
              <div className="p-4 md:p-5 max-h-[500px] overflow-y-auto space-y-3">
                {filteredAlerts.map((log) => (
                  <div 
                    key={log.id}
                    className={cn(
                      "p-4 rounded-xl border bg-system-bg flex flex-col md:flex-row items-start justify-between gap-4 transition-all duration-300 shadow-sm relative overflow-hidden",
                      "border-system-text/10 ring-1 ring-system-text/5"
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
