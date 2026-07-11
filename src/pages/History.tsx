import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { cn, parseSafeDate, getStatusColor } from '../lib/utils';
import { formatPHDate } from '../utils/date';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { 
  getStatusHistory, 
  subscribeToStatusHistory, 
  deleteStatusHistoryLog,
  deleteStatusHistoryByDate,
  deleteSensorReadingsByDate,
  deleteAlertsByDate
} from '../lib/firebase';
import { motion } from 'motion/react';
import { DeviceName } from '../components/DeviceName';
import { toast } from 'sonner';

export function HistoryPage() {
  const { uid, devices, selectedDeviceId, connectionStatus } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  const isEffectiveOnline = connectionStatus.status === 'Online' && lastSeenMs > 0 && !isStale;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportSuccessText, setExportSuccessText] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dateRange = useMemo(() => {
    const baseDate = new Date(selectedDate);
    if (isNaN(baseDate.getTime())) return { start: new Date(), end: new Date() };

    let start = new Date(baseDate);
    let end = new Date(baseDate);

    if (timeRange === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'week') {
      // User likely wants the week containing the selected date
      // Let's do Monday to Sunday or just 7 days? 
      // Let's do 7 days ending on selectedDate (or starting? User said "pick what date it is... reflects to pdf")
      // Actually, standard is usually the week containing the date.
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start = new Date(baseDate.setDate(diff));
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'month') {
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [selectedDate, timeRange]);

  useEffect(() => {
    setCurrentPage(1);
    if (!activeDevice) return;
    
    setIsLoading(true);
    const { start, end } = dateRange;
    
    const unsubscribe = subscribeToStatusHistory(
      activeDevice.id,
      start.getTime(),
      end.getTime(),
      (logs) => {
        const formattedLogs = logs.map(log => ({
          ...log,
          timestamp: log.timestamp ? formatPHDate(log.timestamp) : '',
          chartLabel: log.timestamp ? formatPHDate(log.timestamp, { month: '2-digit', day: '2-digit' }) : ''
        }));
        setHistoricalLogs(formattedLogs);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dateRange, activeDevice]);

  const paginatedLogs = useMemo(() => {
    if (rowsPerPage === 'all') {
      return historicalLogs;
    }
    const start = (currentPage - 1) * rowsPerPage;
    return historicalLogs.slice(start, start + rowsPerPage);
  }, [historicalLogs, currentPage, rowsPerPage]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') return 1;
    return Math.ceil(historicalLogs.length / rowsPerPage);
  }, [historicalLogs, rowsPerPage]);

  const triggerFeedback = (msg: string) => {
    setExportSuccessText(msg);
    setTimeout(() => setExportSuccessText(null), 2500);
  };

  const getStatusStyles = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('good') || s.includes('normal') || s.includes('healthy') || s.includes('online') || s.includes('active')) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (s.includes('warning') || s.includes('moderate') || s.includes('fair')) {
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
    if (s.includes('poor')) {
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    }
    if (s.includes('danger') || s.includes('critical') || s.includes('unhealthy') || s.includes('offline') || s.includes('inactive')) {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    return "bg-system-muted/10 text-system-muted border-system-muted/20";
  };

  const downloadCSV = () => {
    if (!activeDevice) return;
    const { start, end } = dateRange;
    const dateStr = timeRange === 'today' 
      ? formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' }) 
      : `${formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' })} - ${formatPHDate(end, { year: 'numeric', month: 'numeric', day: 'numeric' })}`;

    const headers = [
      'Timestamp', 
      'Sensor Name',
      'Status',
      'Reading',
      'Device Name', 
      'Device ID'
    ];
    
    const rows = historicalLogs.map(row => [
      row.timestamp,
      row.sensorName ?? '-',
      row.status ?? '-',
      row.reading ?? '-',
      activeDevice.name,
      activeDevice.id
    ]);
    
    const csvContent = [
      `Report for ${activeDevice.name}, Range: ${dateStr}`,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airsense_${activeDevice.id}_${timeRange}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback(`Exported CSV for ${activeDevice.deviceName || activeDevice.name || activeDevice.id}`);
  };

  const downloadPDF = () => {
    if (!activeDevice) return;
    const { start, end } = dateRange;
    const dateStr = timeRange === 'today' 
      ? formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' }) 
      : `${formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' })} to ${formatPHDate(end, { year: 'numeric', month: 'numeric', day: 'numeric' })}`;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text(`Livestock AirSense: ${activeDevice.deviceName || activeDevice.name || activeDevice.id} Report`, 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Device ID: ${activeDevice.id}`, 14, 21);
    doc.text(`Time Range: ${timeRange.toUpperCase()} (${dateStr})`, 14, 26);
    doc.setLineWidth(0.5);
    doc.line(14, 30, 196, 30);

    autoTable(doc, {
      head: [['Timestamp', 'Sensor', 'Status', 'Reading']],
      body: historicalLogs.map(row => [
        row.timestamp, 
        row.sensorName ?? '-',
        row.status ?? '-',
        row.reading ?? '-'
      ]),
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 7, font: 'courier' },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`airsense_${activeDevice.id}_${timeRange}_${selectedDate}.pdf`);
    triggerFeedback(`Generated PDF for ${activeDevice.name}`);
  };

  const handleDeleteLog = async (log: any) => {
    if (!activeDevice || !log.id) return;
    setIsDeleting(true);
    try {
      await deleteStatusHistoryLog(activeDevice.id, log.id);
      toast.success(`Deleted log from ${log.timestamp}`);
      setLogToDelete(null);
    } catch (error) {
      toast.error('Failed to delete log');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllForDate = async () => {
    if (!activeDevice || !selectedDate) return;
    setIsDeleting(true);
    try {
      // 1. Delete status history logs for that date
      const statusCount = await deleteStatusHistoryByDate(activeDevice.id, selectedDate);
      
      // 2. Delete sensor readings for that date
      const readingsCount = await deleteSensorReadingsByDate(uid, activeDevice.id, selectedDate);

      // 3. Delete alerts for that date
      const alertsCount = await deleteAlertsByDate(uid, selectedDate);

      toast.success(`Successfully deleted historical data for ${selectedDate} (${statusCount} status logs, ${readingsCount} readings, ${alertsCount} alerts)`);
      setShowDeleteAllConfirm(false);
    } catch (error) {
      toast.error('Failed to delete historical logs');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeDevice) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No device selected</h2>
        <p className="text-system-muted mt-2">Please register an AirSense device in the settings page to generate history logs.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-6">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">Historical Logs</h1>
          <div className="text-sm text-system-muted mt-1 leading-relaxed flex items-center gap-2 flex-wrap">
            <span>Analyze historical calibrated telemetry curves for <DeviceName name={activeDevice.deviceName || activeDevice.name || activeDevice.id} /></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-system-panel border border-system-border rounded-xl px-3 py-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-system-accent" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-system-text focus:outline-none font-mono cursor-pointer uppercase"
            />
          </div>

          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 hover:text-red-400 rounded-xl transition-all cursor-pointer shrink-0"
            title={`Delete all historical data for ${selectedDate}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex bg-system-panel border border-system-border rounded-xl p-1 shrink-0 select-none">
            {(['today', 'week', 'month'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer",
                  timeRange === t ? "bg-system-bg text-system-text shadow-sm" : "text-system-muted hover:text-system-text"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-system-border bg-system-panel hover:bg-system-bg text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-system-accent" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3.5 py-2 border border-system-border bg-system-panel hover:bg-system-bg text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {exportSuccessText && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2.5 rounded-xl font-bold uppercase font-mono text-[10px] animate-pulse">
          <CheckCircle className="w-4 h-4" />
          {exportSuccessText}
        </div>
      )}

      <div className="hidden">
        <div className="h-[320px]">
        </div>
      </div>

      <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-system-border bg-system-bg flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Historical Status Changes</h3>
            <p className="text-[11px] text-system-muted font-mono mt-0.5">Logs of sensor status changes filtered by time range.</p>
          </div>
          <div className="flex items-center gap-3">
            {historicalLogs.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-500 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All For {timeRange === 'today' ? 'Set Date' : 'This Range'}</span>
              </button>
            )}
            <span className="text-[10px] bg-system-accent/15 text-system-accent font-bold px-2.5 py-0.5 rounded-full font-mono">
              {historicalLogs.length} RECORDS
            </span>
          </div>
        </div>
        
        {/* Scrollable Container */}
        <div className="max-h-[440px] overflow-y-auto">
          {/* Responsive view: Table for desktop, cards for mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left relative border-collapse">
              <thead className="text-[10px] text-system-muted uppercase font-bold font-mono bg-system-bg border-b border-system-border sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5 bg-system-bg whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-3.5 bg-system-bg whitespace-nowrap">Sensor Name</th>
                  <th className="px-6 py-3.5 bg-system-bg whitespace-nowrap">Status</th>
                  <th className="px-6 py-3.5 bg-system-bg whitespace-nowrap">Reading</th>
                  <th className="px-6 py-3.5 bg-system-bg whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-system-border font-mono text-xs">
                {paginatedLogs.map((row, i) => (
                  <motion.tr 
                    key={row.id || i} 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                    className="hover:bg-system-bg/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-system-text font-bold whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-6 py-3.5 text-system-muted font-semibold whitespace-nowrap">{row.sensorName}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase tracking-tight border",
                        getStatusStyles(row.status)
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold whitespace-nowrap transition-colors duration-300 text-system-text">{row.reading}</td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setLogToDelete(row)}
                        className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Stacked cards */}
          <div className="md:hidden divide-y divide-system-border">
            {paginatedLogs.map((row, i) => (
              <motion.div 
                key={row.id || i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                className="p-4 space-y-3 hover:bg-system-bg/20 transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-mono font-bold text-system-muted leading-none">Timestamp</p>
                    <p className="text-[10px] font-bold text-system-text font-mono">{row.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase tracking-tight border",
                      getStatusStyles(row.status)
                    )}>
                      {row.status}
                    </span>
                    <button
                      onClick={() => setLogToDelete(row)}
                      className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete log entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-system-border/50">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-mono font-bold text-system-muted leading-none">Sensor Node</p>
                    <p className="text-[11px] font-semibold text-system-text font-mono truncate">{row.sensorName}</p>
                  </div>
                  <div className="space-y-0.5 sm:text-right">
                    <p className="text-[9px] uppercase font-mono font-bold text-system-muted leading-none">Environment Reading</p>
                    <p className="text-xs font-black font-mono transition-colors duration-300 text-system-text">{row.reading}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-system-border bg-system-bg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-system-muted font-mono">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                const val = e.target.value;
                setRowsPerPage(val === 'all' ? 'all' : Number(val));
                setCurrentPage(1);
              }}
              className="bg-system-panel border border-system-border rounded-lg px-2 py-1 text-xs font-bold text-system-text focus:outline-none focus:border-system-accent font-mono cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value="all">All Records</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-system-muted font-mono">
              Page <strong className="text-system-text font-bold">{currentPage}</strong> of <strong className="text-system-text font-bold">{totalPages}</strong>
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1.5 rounded-lg border border-system-border bg-system-panel text-system-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-system-bg transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                PREV
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1.5 rounded-lg border border-system-border bg-system-panel text-system-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-system-bg transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                NEXT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modals */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-system-panel border border-system-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-500 font-mono font-bold uppercase text-sm">
                <Trash2 className="w-5 h-5 animate-pulse" />
                <span>Confirm Delete Log</span>
              </div>
              <p className="text-xs text-system-text font-mono leading-relaxed">
                Are you sure you want to permanently delete the log for <span className="font-bold text-system-accent">{logToDelete.sensorName}</span> from <span className="font-bold text-system-accent">{logToDelete.timestamp}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={isDeleting}
                  onClick={() => setLogToDelete(null)}
                  className="px-4 py-2 border border-system-border bg-system-bg hover:bg-system-panel text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeleteLog(logToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-system-panel border border-system-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-500 font-mono font-bold uppercase text-sm">
                <Trash2 className="w-5 h-5 animate-pulse" />
                <span>Confirm Delete Historical Data</span>
              </div>
              <p className="text-xs text-system-text font-mono leading-relaxed">
                Are you sure you want to permanently delete all historical data (including status changes, sensor readings, and alerts) for the set date <span className="font-bold text-system-accent">{selectedDate}</span>? This action is completely irreversible.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={isDeleting}
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-2 border border-system-border bg-system-bg hover:bg-system-panel text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeleteAllForDate()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
