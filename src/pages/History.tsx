import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { cn, parseSafeDate, getStatusColor } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { getStatusHistory } from '../lib/firebase';
import { motion } from 'motion/react';

export function HistoryPage() {
  const { devices, selectedDeviceId, connectionStatus } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

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
    fetchData();
  }, [dateRange, activeDevice]);

  const fetchData = async () => {
    if (!activeDevice) return;
    setHistoricalLogs([]); // Clear old data
    const { start, end } = dateRange;
    const logs = await getStatusHistory(activeDevice.id, start.getTime(), end.getTime());
    
    // Filter out zero readings (common with hardware noise/offline states)
    const filteredLogs = logs.filter(log => {
      if (log.reading === undefined || log.reading === null) return true;
      const val = parseFloat(log.reading.toString());
      return val !== 0;
    });

    const formattedLogs = filteredLogs.map(log => ({
      ...log,
      timestamp: log.timestamp ? parseSafeDate(log.timestamp).toLocaleString() : '',
      chartLabel: log.timestamp ? parseSafeDate(log.timestamp).toLocaleDateString() : ''
    }));
    setHistoricalLogs(formattedLogs);
  };

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
      ? start.toLocaleDateString() 
      : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

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
      ? start.toLocaleDateString() 
      : `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

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

  if (!activeDevice) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No device selected</h2>
        <p className="text-system-muted mt-2">Please register an AirSense device in the settings page to generate history logs.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">Historical Logs</h1>
          <div className="text-sm text-system-muted mt-1 leading-relaxed flex items-center gap-2 flex-wrap">
            <span>Analyze historical calibrated telemetry curves for <span className="font-bold text-system-text">{activeDevice.deviceName || activeDevice.name || activeDevice.id}</span></span>
            <motion.button 
              onClick={() => window.location.reload()}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9, rotate: 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="p-1 hover:bg-system-bg rounded-md border border-transparent hover:border-system-border transition-colors group"
              title="Refresh Feed"
            >
              <RefreshCw className="w-3 h-3 text-system-accent group-hover:text-system-text transition-colors" />
            </motion.button>
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
          <span className="text-[10px] bg-system-accent/15 text-system-accent font-bold px-2.5 py-0.5 rounded-full font-mono">
            {historicalLogs.length} RECORDS
          </span>
        </div>
        
        {/* Responsive view: Table for desktop, cards for mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-system-muted uppercase font-bold font-mono bg-system-bg border-b border-system-border">
              <tr>
                <th className="px-6 py-3.5 whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Sensor Name</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-6 py-3.5 whitespace-nowrap">Reading</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-system-border font-mono text-xs">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-system-muted italic uppercase tracking-widest opacity-60">
                    No historical transitions detected for this timeframe
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((row, i) => (
                  <tr key={i} className="hover:bg-system-bg/40 transition-colors">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked cards */}
        <div className="md:hidden divide-y divide-system-border">
          {paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-system-muted font-mono uppercase">
              No records found
            </div>
          ) : (
            paginatedLogs.map((row, i) => (
              <div key={i} className="p-4 space-y-3 hover:bg-system-bg/20 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-mono font-bold text-system-muted leading-none">Timestamp</p>
                    <p className="text-[10px] font-bold text-system-text font-mono">{row.timestamp}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase tracking-tight border",
                    getStatusStyles(row.status)
                  )}>
                    {row.status}
                  </span>
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
              </div>
            ))
          )}
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

    </div>
  );
}
