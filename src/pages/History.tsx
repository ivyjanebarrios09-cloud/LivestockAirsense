import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText, CheckCircle, Trash2, Activity, Thermometer, Droplets, Wind } from 'lucide-react';
import { cn, parseSafeDate, getStatusColor, getSensorStatus } from '../lib/utils';
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
  deleteAlertsByDate,
  deleteAllStatusHistory
} from '../lib/firebase';
import { motion } from 'motion/react';
import { DeviceName } from '../components/DeviceName';
import { toast } from 'sonner';

export function HistoryPage() {
  const { uid, devices, selectedDeviceId, connectionStatus, theme } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week'>('all');

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

  const [selectedChartSensor, setSelectedChartSensor] = useState<string>('aqi');

  const chartSensors = useMemo(() => [
    { key: 'aqi', label: 'AQI', color: '#2563eb', unit: '' },
    { key: 'temp', label: 'Temperature', color: '#dc2626', unit: '°C' },
    { key: 'hum', label: 'Humidity', color: '#0ea5e9', unit: '%' },
    { key: 'co2', label: 'CO2', color: '#8b5cf6', unit: 'ppm' },
    { key: 'nh3', label: 'Ammonia (NH3)', color: '#ca8a04', unit: 'ppm' },
    { key: 'ch4', label: 'Methane (CH4)', color: '#ec4899', unit: 'ppm' },
    { key: 'pm2.5', label: 'PM2.5', color: '#16a34a', unit: 'µg/m³' },
    { key: 'pm10', label: 'PM10', color: '#ea580c', unit: 'µg/m³' },
  ], []);

  const getSensorValue = (row: any, key: string) => {
    switch (key) {
      case 'temp':
      case 'temperature':
        return row.temperature !== undefined ? row.temperature : row.temp;
      case 'hum':
      case 'humidity':
        return row.humidity !== undefined ? row.humidity : row.hum;
      case 'co2':
        return row.co2;
      case 'nh3':
      case 'ammonia':
        return row.nh3 !== undefined ? row.nh3 : row.ammonia;
      case 'ch4':
      case 'methane':
        return row.ch4 !== undefined ? row.ch4 : row.methane;
      case 'pm2.5':
      case 'pm2_5':
      case 'pm25':
        return row.pm2_5 !== undefined ? row.pm2_5 : (row.pm25 !== undefined ? row.pm25 : row['pm2.5']);
      case 'pm10':
        return row.pm10;
      case 'aqi':
        return row.aqi;
      default:
        return undefined;
    }
  };

  const chartData = useMemo(() => {
    const sorted = [...historicalLogs].sort((a, b) => {
      const tsA = a.rawTimestamp || 0;
      const tsB = b.rawTimestamp || 0;
      return tsA - tsB;
    });
    
    return sorted.map(row => {
      const item: any = {
        name: row.chartLabel || '',
        timestamp: row.timestamp || '',
      };
      
      chartSensors.forEach(s => {
        const val = getSensorValue(row, s.key);
        if (val !== undefined && val !== null) {
          item[s.key] = Number(val);
        }
      });
      
      return item;
    });
  }, [historicalLogs, chartSensors]);

  const renderValueWithStatus = (value: number | undefined, type: string) => {
    if (value === undefined || value === null) {
      return <span className="text-system-muted font-mono">-</span>;
    }
    const status = getSensorStatus(type, value);
    let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (status === 'WARNING') statusColor = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    if (status === 'POOR') statusColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (status === 'DANGER') statusColor = "text-red-500 bg-red-500/10 border-red-500/20";
    
    const formattedVal = (type === 'co2' || type === 'aqi' || type === 'pm2.5' || type === 'pm10') 
      ? Math.round(value) 
      : value.toFixed(1);
      
    return (
      <span className={cn("px-1.5 py-0.5 rounded border text-[11px] font-bold font-mono transition-colors", statusColor)}>
        {formattedVal}
      </span>
    );
  };

  const dateRange = useMemo(() => {
    if (timeRange === 'all') {
      return { start: new Date(0), end: new Date(32503680000000) }; // wide range covering all timestamps
    }
    
    // Safely parse selectedDate as local date elements
    const parts = selectedDate.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1; // 0-indexed
    const dayVal = Number(parts[2]);

    const baseDate = new Date(year, month, dayVal);
    if (isNaN(baseDate.getTime())) return { start: new Date(), end: new Date() };

    let startMs = 0;
    let endMs = 0;

    if (timeRange === 'today') {
      startMs = Date.UTC(year, month, dayVal, 0, 0, 0, 0) - 8 * 60 * 60 * 1000;
      endMs = Date.UTC(year, month, dayVal, 23, 59, 59, 999) - 8 * 60 * 60 * 1000;
    } else if (timeRange === 'week') {
      // 7 days ending on the selected date (e.g., July 12 to July 18)
      startMs = Date.UTC(year, month, dayVal - 6, 0, 0, 0, 0) - 8 * 60 * 60 * 1000;
      endMs = Date.UTC(year, month, dayVal, 23, 59, 59, 999) - 8 * 60 * 60 * 1000;
    }

    return { start: new Date(startMs), end: new Date(endMs) };
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
          rawTimestamp: log.timestamp,
          timestamp: log.timestamp ? formatPHDate(log.timestamp) : '',
          chartLabel: log.timestamp ? formatPHDate(log.timestamp, { month: '2-digit', day: '2-digit' }) : ''
        }));
        setHistoricalLogs(formattedLogs);
        setIsLoading(false);
      },
      uid
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
    const dateStr = timeRange === 'all'
      ? 'All-Time Logs'
      : timeRange === 'today' 
      ? formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' }) 
      : `${formatPHDate(start, { year: 'numeric', month: 'numeric', day: 'numeric' })} - ${formatPHDate(end, { year: 'numeric', month: 'numeric', day: 'numeric' })}`;

    const headers = [
      'Timestamp', 
      'Temperature (°C)',
      'Humidity (%)',
      'CO2 (ppm)',
      'Ammonia NH3 (ppm)',
      'Methane CH4 (ppm)',
      'PM2.5 (ug/m3)',
      'PM10 (ug/m3)',
      'AQI',
      'Device Name', 
      'Device ID'
    ];
    
    // Filter logs strictly to the computed local dateRange to prevent any data leakage
    const filteredLogs = historicalLogs.filter(row => {
      if (timeRange === 'all') return true;
      const ts = row.rawTimestamp || row.timestamp;
      const tsNum = typeof ts === 'number' ? ts : (ts ? parseSafeDate(ts).getTime() : 0);
      return tsNum >= start.getTime() && tsNum <= end.getTime();
    });

    const rows = filteredLogs.map(row => {
      const tempVal = row.temperature !== undefined ? row.temperature : row.temp;
      const humVal = row.humidity !== undefined ? row.humidity : row.hum;
      const co2Val = row.co2;
      const nh3Val = row.nh3 !== undefined ? row.nh3 : row.ammonia;
      const ch4Val = row.ch4 !== undefined ? row.ch4 : row.methane;
      const pm25Val = row.pm2_5 !== undefined ? row.pm2_5 : row.pm25;
      const pm10Val = row.pm10;
      const aqiVal = row.aqi;

      return [
        row.timestamp,
        tempVal !== undefined ? tempVal.toFixed(1) : '-',
        humVal !== undefined ? humVal.toFixed(1) : '-',
        co2Val !== undefined ? Math.round(co2Val).toString() : '-',
        nh3Val !== undefined ? nh3Val.toFixed(1) : '-',
        ch4Val !== undefined ? ch4Val.toFixed(1) : '-',
        pm25Val !== undefined ? Math.round(pm25Val).toString() : '-',
        pm10Val !== undefined ? Math.round(pm10Val).toString() : '-',
        aqiVal !== undefined ? Math.round(aqiVal).toString() : '-',
        activeDevice.name,
        activeDevice.id
      ];
    });
    
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
    const dateStr = timeRange === 'all'
      ? 'All-Time Logs'
      : timeRange === 'today' 
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

    // Filter logs strictly to the computed local dateRange to prevent any data leakage
    const filteredLogs = historicalLogs.filter(row => {
      if (timeRange === 'all') return true;
      const ts = row.rawTimestamp || row.timestamp;
      const tsNum = typeof ts === 'number' ? ts : (ts ? parseSafeDate(ts).getTime() : 0);
      return tsNum >= start.getTime() && tsNum <= end.getTime();
    });

    autoTable(doc, {
      head: [['Timestamp', 'Temp', 'Hum', 'CO2', 'NH3', 'CH4', 'PM2.5', 'PM10', 'AQI']],
      body: filteredLogs.map(row => {
        const tempVal = row.temperature !== undefined ? row.temperature : row.temp;
        const humVal = row.humidity !== undefined ? row.humidity : row.hum;
        const co2Val = row.co2;
        const nh3Val = row.nh3 !== undefined ? row.nh3 : row.ammonia;
        const ch4Val = row.ch4 !== undefined ? row.ch4 : row.methane;
        const pm25Val = row.pm2_5 !== undefined ? row.pm2_5 : row.pm25;
        const pm10Val = row.pm10;
        const aqiVal = row.aqi;

        return [
          row.timestamp, 
          tempVal !== undefined ? tempVal.toFixed(1) : '-',
          humVal !== undefined ? humVal.toFixed(1) : '-',
          co2Val !== undefined ? Math.round(co2Val).toString() : '-',
          nh3Val !== undefined ? nh3Val.toFixed(1) : '-',
          ch4Val !== undefined ? ch4Val.toFixed(1) : '-',
          pm25Val !== undefined ? Math.round(pm25Val).toString() : '-',
          pm10Val !== undefined ? Math.round(pm10Val).toString() : '-',
          aqiVal !== undefined ? Math.round(aqiVal).toString() : '-'
        ];
      }),
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
      await deleteStatusHistoryLog(activeDevice.id, log.id, log.dateStr, uid);
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
    if (!activeDevice) return;
    setIsDeleting(true);
    try {
      if (timeRange === 'all') {
        const statusCount = await deleteAllStatusHistory(activeDevice.id, uid);
        toast.success(`Successfully deleted all historical status logs (${statusCount} logs)`);
      } else {
        if (!selectedDate) return;
        // 1. Delete status history logs for that date
        const statusCount = await deleteStatusHistoryByDate(activeDevice.id, selectedDate, uid);
        
        // 2. Delete sensor readings for that date
        const readingsCount = await deleteSensorReadingsByDate(uid, activeDevice.id, selectedDate);

        // 3. Delete alerts for that date
        const alertsCount = await deleteAlertsByDate(uid, selectedDate);

        toast.success(`Successfully deleted historical data for ${selectedDate} (${statusCount} status logs, ${readingsCount} readings, ${alertsCount} alerts)`);
      }
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Calendar Picker */}
          <div className="flex items-center gap-2 bg-system-panel border border-system-border rounded-xl px-3 py-2 sm:py-1.5 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-system-accent shrink-0" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (timeRange === 'all') {
                  setTimeRange('today');
                }
              }}
              className="bg-transparent border-none text-xs font-bold text-system-text focus:outline-none font-mono cursor-pointer uppercase w-full sm:w-auto"
            />
          </div>

          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 hover:text-red-400 rounded-xl transition-all cursor-pointer shrink-0 hidden md:flex"
            title={`Delete all historical data for ${selectedDate}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Time Range Selector */}
          <div className="flex bg-system-panel border border-system-border rounded-xl p-1 select-none w-full sm:w-auto justify-between sm:justify-start">
            {(['all', 'today', 'week'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center",
                  timeRange === t ? "bg-system-bg text-system-text shadow-sm" : "text-system-muted hover:text-system-text"
                )}
              >
                {t === 'all' ? 'Latest' : t}
              </button>
            ))}
          </div>
          
          {/* Export CSV Button */}
          <button 
            onClick={downloadCSV}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 border border-system-border bg-system-panel hover:bg-system-bg text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer w-full sm:w-auto"
          >
            <Download className="w-3.5 h-3.5 text-system-accent" />
            <span>Export CSV</span>
          </button>

          {/* Export PDF Button */}
          <button 
            onClick={downloadPDF}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 border border-system-border bg-system-panel hover:bg-system-bg text-system-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer w-full sm:w-auto"
          >
            <FileText className="w-3.5 h-3.5 text-orange-500" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {exportSuccessText && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2.5 rounded-xl font-bold uppercase font-mono text-[10px] animate-pulse">
          <CheckCircle className="w-4 h-4" />
          {exportSuccessText}
        </div>
      )}

      {historicalLogs.length > 0 ? (
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-system-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-system-accent/15 text-system-accent">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">
                  Historical Telemetry Trends
                </h3>
              </div>
              <p className="text-[11px] text-system-muted font-mono mt-0.5">
                Analyze continuous chronological trends for selected calibration parameters.
              </p>
            </div>
            
            {/* Legend or status indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6' }} />
              <span className="text-[10px] font-mono font-bold text-system-muted uppercase">
                Visualizing {chartSensors.find(s => s.key === selectedChartSensor)?.label}
              </span>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin select-none">
            {chartSensors.map(sensor => {
              const isActive = selectedChartSensor === sensor.key;
              return (
                <button
                  key={sensor.key}
                  onClick={() => setSelectedChartSensor(sensor.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-system-bg border-system-accent/30 shadow-sm"
                      : "bg-system-panel border-system-border text-system-muted hover:text-system-text hover:border-system-border/80"
                  )}
                  style={isActive ? { borderLeft: `3px solid ${sensor.color}` } : {}}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: sensor.color }} 
                  />
                  <span>{sensor.label}</span>
                </button>
              );
            })}
          </div>

          {/* Recharts Area Chart */}
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`historyColor-${selectedChartSensor}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' || theme === 'forest' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--color-system-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'var(--color-system-border)' }}
                  tickLine={{ stroke: 'var(--color-system-border)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--color-system-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'var(--color-system-border)' }}
                  tickLine={{ stroke: 'var(--color-system-border)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' || theme === 'forest' ? '#1e293b' : '#ffffff',
                    borderColor: 'var(--color-system-border)',
                    borderRadius: '0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--color-system-text)'
                  }}
                  itemStyle={{ color: chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6' }}
                  formatter={(value: any) => [
                    `${Number(value).toFixed(1)} ${chartSensors.find(s => s.key === selectedChartSensor)?.unit || ''}`, 
                    chartSensors.find(s => s.key === selectedChartSensor)?.label || ''
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedChartSensor} 
                  stroke={chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6'} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill={`url(#historyColor-${selectedChartSensor})`}
                  dot={{ r: 3, stroke: chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6', strokeWidth: 1, fill: theme === 'dark' || theme === 'forest' ? '#0f172a' : '#ffffff' }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartSensors.find(s => s.key === selectedChartSensor)?.color || '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-system-border bg-system-bg flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Historical Sensor Readings</h3>
            <p className="text-[11px] text-system-muted font-mono mt-0.5">Logs of continuous sensor readings uploaded from the device.</p>
          </div>
          <div className="flex items-center gap-3">
            {historicalLogs.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-500 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All For {timeRange === 'today' ? 'Set Date' : (timeRange === 'all' ? 'All-Time' : 'This Range')}</span>
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
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">Temp (°C)</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">Hum (%)</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">CO2 (ppm)</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">NH3 (ppm)</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">CH4 (ppm)</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">PM2.5</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">PM10</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-center">AQI</th>
                  <th className="px-4 py-3.5 bg-system-bg whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-system-border font-mono text-xs">
                {paginatedLogs.map((row, i) => {
                  const tempVal = row.temperature !== undefined ? row.temperature : row.temp;
                  const humVal = row.humidity !== undefined ? row.humidity : row.hum;
                  const co2Val = row.co2;
                  const nh3Val = row.nh3 !== undefined ? row.nh3 : row.ammonia;
                  const ch4Val = row.ch4 !== undefined ? row.ch4 : row.methane;
                  const pm25Val = row.pm2_5 !== undefined ? row.pm2_5 : row.pm25;
                  const pm10Val = row.pm10;
                  const aqiVal = row.aqi;

                  return (
                    <motion.tr 
                      key={row.id || i} 
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                      className="hover:bg-system-bg/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-system-text font-bold whitespace-nowrap">{row.timestamp}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(tempVal, 'temp')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(humVal, 'hum')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(co2Val, 'co2')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(nh3Val, 'nh3')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(ch4Val, 'ch4')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(pm25Val, 'pm2.5')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(pm10Val, 'pm10')}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderValueWithStatus(aqiVal, 'aqi')}</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setLogToDelete(row)}
                          className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete log entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Stacked cards */}
          <div className="md:hidden divide-y divide-system-border">
            {paginatedLogs.map((row, i) => {
              const tempVal = row.temperature !== undefined ? row.temperature : row.temp;
              const humVal = row.humidity !== undefined ? row.humidity : row.hum;
              const co2Val = row.co2;
              const nh3Val = row.nh3 !== undefined ? row.nh3 : row.ammonia;
              const ch4Val = row.ch4 !== undefined ? row.ch4 : row.methane;
              const pm25Val = row.pm2_5 !== undefined ? row.pm2_5 : row.pm25;
              const pm10Val = row.pm10;
              const aqiVal = row.aqi;

              return (
                <motion.div 
                  key={row.id || i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  className="p-4 space-y-3.5 hover:bg-system-bg/20 transition-colors"
                >
                  <div className="flex justify-between items-center bg-system-bg/15 p-2 rounded-xl border border-system-border/30">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-system-accent animate-pulse" />
                      <p className="text-[10px] font-bold text-system-text font-mono">{row.timestamp}</p>
                    </div>
                    <button
                      onClick={() => setLogToDelete(row)}
                      className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete log entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-red-500/10 text-red-500">
                        <Thermometer className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">Temp</span>
                        {renderValueWithStatus(tempVal, 'temp')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-sky-500/10 text-sky-500">
                        <Droplets className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">Hum</span>
                        {renderValueWithStatus(humVal, 'hum')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-violet-500/10 text-violet-500">
                        <Wind className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">CO2</span>
                        {renderValueWithStatus(co2Val, 'co2')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-yellow-500/10 text-yellow-500">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">NH3</span>
                        {renderValueWithStatus(nh3Val, 'nh3')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-pink-500/10 text-pink-500">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">CH4</span>
                        {renderValueWithStatus(ch4Val, 'ch4')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">PM2.5</span>
                        {renderValueWithStatus(pm25Val, 'pm2.5')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-orange-500/10 text-orange-500">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">PM10</span>
                        {renderValueWithStatus(pm10Val, 'pm10')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-system-bg/30 border border-system-border/40 rounded-xl">
                      <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-mono font-bold text-system-muted leading-none mb-0.5">AQI</span>
                        {renderValueWithStatus(aqiVal, 'aqi')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
                Are you sure you want to permanently delete the sensor readings from <span className="font-bold text-system-accent">{logToDelete.timestamp}</span>? This action cannot be undone.
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
                {timeRange === 'all' ? (
                  <span>Are you sure you want to permanently delete <span className="font-bold text-red-500">ALL historical status logs</span> for this device? This action is completely irreversible.</span>
                ) : (
                  <span>Are you sure you want to permanently delete all historical data (including status changes, sensor readings, and alerts) for the set date <span className="font-bold text-system-accent">{selectedDate}</span>? This action is completely irreversible.</span>
                )}
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
