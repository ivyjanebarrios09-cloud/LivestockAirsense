import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { getStatusHistory } from '../lib/firebase';

export function HistoryPage() {
  const { activeLocation } = useAppContext();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [exportSuccessText, setExportSuccessText] = useState<string | null>(null);
  
  // Pagination & Display limit states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);

  // Reset page position back to page 1 whenever filters shift
  useEffect(() => {
    setCurrentPage(1);
    fetchData();
  }, [timeRange, activeLocation]);

  const fetchData = async () => {
    const logs = await getStatusHistory();
    const formattedLogs = logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toLocaleString(),
      chartLabel: new Date(log.timestamp).toLocaleDateString()
    }));
    setHistoricalLogs(formattedLogs);
  };

  // Calculate items displaying inside current page view
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

  const downloadCSV = () => {
    // CSV Header row
    const headers = ['Timestamp', 'Facility Name', 'Breed', 'Temp (°C)', 'Humidity (%)', 'CO2 (ppm)', 'Ammonia (ppm)', 'AQI'];
    
    // Row mappings
    const rows = historicalLogs.map(row => [
      row.timestamp,
      activeLocation.name,
      activeLocation.type,
      row.temp,
      row.humidity,
      row.co2,
      row.ammonia,
      row.aqi
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airsense_${activeLocation.id}_historical_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback(`Exported CSV for ${activeLocation.name}`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text(`Livestock AirSense: ${activeLocation.name} Report`, 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Livestock Breed: ${activeLocation.type} | Animal Census: ${activeLocation.animalCount}`, 14, 21);
    doc.text(`Timeline Scope: ${timeRange.toUpperCase()} LOGS`, 14, 26);
    doc.setLineWidth(0.5);
    doc.line(14, 30, 196, 30);

    autoTable(doc, {
      head: [['Timestamp', 'Temp (°C)', 'Humidity (%)', 'CO2 (ppm)', 'NH3 (ppm)', 'AQI']],
      body: historicalLogs.map(row => [
        row.timestamp, 
        `${row.temp} °C`, 
        `${row.humidity} %`, 
        `${row.co2} ppm`, 
        `${row.ammonia} ppm`, 
        row.aqi
      ]),
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, font: 'courier' },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`airsense_${activeLocation.id}_historical_${timeRange}.pdf`);
    triggerFeedback(`Generated PDF for ${activeLocation.name}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      
      {/* Title segment */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">Historical Logs</h1>
          <p className="text-sm text-system-muted mt-1 leading-relaxed">
            Analyze historical calibrated telemetry curves for <span className="font-bold text-system-text">{activeLocation.name}</span>.
          </p>
        </div>

        {/* Dynamic Segment Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
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

      {/* Dynamic Action Status Toast Alert inside flow */}
      {exportSuccessText && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2.5 rounded-xl font-bold uppercase font-mono text-[10px] animate-pulse">
          <CheckCircle className="w-4 h-4" />
          {exportSuccessText}
        </div>
      )}

      {/* Main Bar Chart Panel - Removed for data structure compatibility */}
      <div className="hidden">
        <div className="h-[320px]">
        </div>
      </div>

      {/* Structured Telemetry Data List Table */}
      <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-system-border bg-system-bg flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Live Datastore Ledger Details</h3>
            <p className="text-[11px] text-system-muted font-mono mt-0.5">Secure ledgers synchronized with local PWA cache buffers.</p>
          </div>
          <span className="text-[10px] bg-system-accent/15 text-system-accent font-bold px-2.5 py-0.5 rounded-full font-mono">
            {historicalLogs.length} SECURE RECORDS
          </span>
        </div>
        
        <div className="overflow-x-auto">
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
              {paginatedLogs.map((row, i) => (
                <tr key={i} className="hover:bg-system-bg/40 transition-colors">
                  <td className="px-6 py-3.5 text-system-text font-bold whitespace-nowrap">{row.timestamp}</td>
                  <td className="px-6 py-3.5 text-system-muted font-semibold whitespace-nowrap">{row.sensorName}</td>
                  <td className="px-6 py-3.5 text-system-text font-bold whitespace-nowrap">{row.status}</td>
                  <td className="px-6 py-3.5 text-system-text font-bold whitespace-nowrap">{row.reading}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer Control Hub */}
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
