import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Calendar, 
  Thermometer, 
  Droplets, 
  Wind, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Clock,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { useAuthState } from '../hooks/useAuthState';
import { getAnalyticsData, subscribeToSensorReadings } from '../lib/firebase';
import { cn, parseSafeDate, getSensorStatus, getStatusBgColor, getStatusColor } from '../lib/utils';

// Helper component for individual sensor charts
interface SensorChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
  icon: React.ReactNode;
  threshold?: number;
}

function SensorChart({ title, data, dataKey, color, unit, icon, threshold }: SensorChartProps) {
  const status = useMemo(() => {
    if (data.length === 0) return 'GOOD';
    const latest = data[data.length - 1][dataKey];
    return getSensorStatus(dataKey, latest);
  }, [data, dataKey]);

  return (
    <div className="bg-system-panel border border-system-border rounded-2xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-system-bg border border-system-border flex items-center justify-center text-system-accent">
            {icon}
          </div>
          <div>
            <h3 className="text-[10px] font-black font-mono uppercase tracking-tight text-system-muted">{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-mono tracking-tighter transition-colors duration-300 text-system-text">
                {data.length > 0 ? (data[data.length - 1][dataKey] || 0).toFixed(1) : '--'}
              </span>
              <span className="text-[10px] font-bold text-system-muted/60 uppercase">{unit}</span>
            </div>
          </div>
        </div>
        <div className={cn("text-[9px] font-black font-mono px-2 py-0.5 rounded border uppercase tracking-wider", 
          getStatusBgColor(status)
        )}>
          {status}
        </div>
      </div>

      <div className="h-32 w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: '8px'
              }}
              itemStyle={{ color: color }}
              labelStyle={{ display: 'none' }}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color-${dataKey})`} 
              strokeWidth={2}
              connectNulls={true}
              isAnimationActive={false}
            />
            {threshold && (
              <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const { devices, selectedDeviceId } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Subscribe to real-time data when in Live Mode or looking at Today
  useEffect(() => {
    if (!activeDevice?.id || !user?.uid) return;
    
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    
    if (isLive || isToday) {
      setLoading(true);
      const unsubscribe = subscribeToSensorReadings(
        user.uid,
        activeDevice.id,
        100,
        selectedDate,
        (data) => {
          if (data && data.length > 0) {
            const chartData = data.map(d => ({
              ...d,
              timeLabel: d.timestamp ? parseSafeDate(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setAnalyticsData(chartData);
          } else {
            setAnalyticsData([]);
          }
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      // Historical fetch (already handled by other useEffect or we can merge them)
      fetchAnalytics(selectedDate);
    }
  }, [activeDevice?.id, selectedDate, isLive, user?.uid]);

  const fetchAnalytics = async (dateStr: string) => {
    if (!activeDevice?.id) return;
    
    setLoading(true);
    setHasError(false);

    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    try {
      const data = await getAnalyticsData(activeDevice.id, start, end);
      if (data && data.length > 0) {
        const chartData = data.map(d => ({
          ...d,
          timeLabel: d.timestamp ? parseSafeDate(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setAnalyticsData(chartData);
      } else {
        setAnalyticsData([]);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (analyticsData.length === 0) return null;
    
    const count = analyticsData.length;
    const avg = (key: string) => analyticsData.reduce((acc, d) => acc + (d[key] || 0), 0) / count;
    const max = (key: string) => Math.max(...analyticsData.map(d => d[key] || 0));
    
    return {
      aqi: { avg: avg('aqi'), max: max('aqi') },
      temp: { avg: avg('temperature'), max: max('temperature') },
      hum: { avg: avg('humidity'), max: max('humidity') },
      co2: { avg: avg('co2'), max: max('co2') },
      nh3: { avg: avg('nh3'), max: max('nh3') },
      ch4: { avg: avg('ch4'), max: max('ch4') }
    };
  }, [analyticsData]);

  const downloadPDF = () => {
    if (!summary || !activeDevice) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('AirSense Telemetry Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Node ID: ${activeDevice.id}`, 14, 30);
    doc.text(`Report Date: ${selectedDate}`, 14, 35);
    doc.text(`Generated: ${timestamp}`, 14, 40);

    // Summary Table
    const tableData = [
      ['Metric', 'Average Value', 'Peak Value', 'Unit'],
      ['Air Quality (AQI)', summary.aqi.avg.toFixed(2), summary.aqi.max.toFixed(2), 'AQI'],
      ['Temperature', summary.temp.avg.toFixed(2), summary.temp.max.toFixed(2), '°C'],
      ['Humidity', summary.hum.avg.toFixed(2), summary.hum.max.toFixed(2), '%'],
      ['CO2', summary.co2.avg.toFixed(2), summary.co2.max.toFixed(2), 'PPM'],
      ['Ammonia (NH3)', summary.nh3.avg.toFixed(2), summary.nh3.max.toFixed(2), 'PPM'],
      ['Methane (CH4)', summary.ch4.avg.toFixed(2), summary.ch4.max.toFixed(2), 'PPM'],
    ];

    autoTable(doc, {
      startY: 50,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, // blue-500
      styles: { fontSize: 10, font: 'helvetica' }
    });

    // Evaluation
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('System Evaluation', 14, finalY);
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    const evaluation = `The microclimate telemetry indicates a ${summary.aqi.avg < 100 ? 'Stable' : 'Volatile'} atmosphere. ${summary.temp.avg > 30 ? 'High thermal stress detected across aggregation windows.' : 'Thermal regulation remains within optimal veterinary thresholds.'}`;
    const splitEvaluation = doc.splitTextToSize(evaluation, 180);
    doc.text(splitEvaluation, 14, finalY + 7);

    // Raw Data Table (if data exists)
    if (analyticsData.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Detailed Sensor Readings', 14, 20);
      
      const rawData = analyticsData.slice(0, 50).map(d => [
        d.timeLabel || '',
        (d.aqi || 0).toFixed(1),
        (d.temperature || 0).toFixed(1),
        (d.humidity || 0).toFixed(1),
        (d.co2 || 0).toFixed(0),
        (d.nh3 || 0).toFixed(1)
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Time', 'AQI', 'Temp (°C)', 'Hum (%)', 'CO2 (PPM)', 'NH3 (PPM)']],
        body: rawData,
        styles: { fontSize: 8 }
      });
      
      if (analyticsData.length > 50) {
        doc.setFontSize(8);
        doc.text(`* Showing first 50 of ${analyticsData.length} records retrieved.`, 14, (doc as any).lastAutoTable.finalY + 10);
      }
    }

    doc.save(`AirSense-Report-${activeDevice.id}-${selectedDate}.pdf`);
  };

  if (!activeDevice) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Activity className="w-12 h-12 text-system-muted opacity-20" />
        <h2 className="text-xl font-black font-mono uppercase tracking-tight">No Active Device</h2>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black font-mono text-system-accent uppercase tracking-[0.2em]">
            <TrendingUp className="w-3 h-3" />
            Live Telemetry Insights
          </div>
          <h1 className="text-3xl font-black font-mono uppercase tracking-tighter">Performance Analytics</h1>
          <p className="text-[10px] text-system-muted font-mono uppercase tracking-widest opacity-60">
            Node: <span className="text-system-text font-bold">{activeDevice.id}</span> • {analyticsData.length} records retrieved
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => {
              setIsLive(false);
              fetchAnalytics(selectedDate);
            }}
            className="p-2.5 rounded-xl bg-system-panel border border-system-border hover:border-system-accent/30 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 text-system-muted", loading && "animate-spin")} />
          </button>

          <button 
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center gap-2 border rounded-xl px-4 py-2.5 shadow-sm transition-all active:scale-95 group",
              isLive 
                ? "bg-system-accent/10 border-system-accent/30 text-system-accent" 
                : "bg-system-panel border-system-border text-system-text hover:border-system-accent/30"
            )}
          >
            <Clock className={cn("w-4 h-4", isLive ? "text-system-accent animate-pulse" : "text-system-muted")} />
            <span className="text-[10px] font-bold font-mono uppercase tracking-widest">
              {isLive ? 'Live Streaming' : 'Live Data'}
            </span>
          </button>

          <div className="flex items-center gap-3 bg-system-panel border border-system-border rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-system-accent" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setIsLive(false);
                setSelectedDate(e.target.value);
              }}
              className="bg-transparent border-none focus:ring-0 text-xs font-black font-mono uppercase text-system-text"
            />
          </div>
        </div>
      </header>

      {/* Sensor Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.length === 0 && !loading ? (
          <div className="col-span-full h-64 bg-system-panel border border-dashed border-system-border rounded-3xl flex flex-col items-center justify-center space-y-4">
            <Activity className="w-12 h-12 text-system-muted opacity-10" />
            <p className="text-xs font-black font-mono uppercase text-system-muted tracking-tight">No telemetric stream detected</p>
            {hasError && <p className="text-[10px] text-rose-500 font-black font-mono uppercase">Fetch Fault</p>}
          </div>
        ) : (
          <>
            <SensorChart 
              title="Air Quality Index" 
              data={analyticsData} 
              dataKey="aqi" 
              color="#3b82f6" 
              unit="AQI" 
              icon={<Wind className="w-5 h-5" />} 
              threshold={100}
            />
            <SensorChart 
              title="Ambient Temp" 
              data={analyticsData} 
              dataKey="temperature" 
              color="#f97316" 
              unit="°C" 
              icon={<Thermometer className="w-5 h-5" />} 
              threshold={30}
            />
            <SensorChart 
              title="Rel. Humidity" 
              data={analyticsData} 
              dataKey="humidity" 
              color="#06b6d4" 
              unit="%" 
              icon={<Droplets className="w-5 h-5" />} 
              threshold={70}
            />
            <SensorChart 
              title="Carbon Dioxide" 
              data={analyticsData} 
              dataKey="co2" 
              color="#ef4444" 
              unit="PPM" 
              icon={<AlertTriangle className="w-5 h-5" />} 
              threshold={800}
            />
            <SensorChart 
              title="Ammonia (NH3)" 
              data={analyticsData} 
              dataKey="nh3" 
              color="#a855f7" 
              unit="PPM" 
              icon={<Activity className="w-5 h-5" />} 
              threshold={25}
            />
            <SensorChart 
              title="Methane (CH4)" 
              data={analyticsData} 
              dataKey="ch4" 
              color="#10b981" 
              unit="PPM" 
              icon={<TrendingUp className="w-5 h-5" />} 
              threshold={50}
            />
            <SensorChart 
              title="Particulate 2.5" 
              data={analyticsData} 
              dataKey="pm2_5" 
              color="#6366f1" 
              unit="µg/m³" 
              icon={<Search className="w-5 h-5" />} 
              threshold={12}
            />
            <SensorChart 
              title="Particulate 10" 
              data={analyticsData} 
              dataKey="pm10" 
              color="#ec4899" 
              unit="µg/m³" 
              icon={<BarChart3 className="w-5 h-5" />} 
              threshold={54}
            />
          </>
        )}
      </div>

      {/* Summary Section */}
      {summary && (
        <section className="bg-system-panel border border-system-border rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-system-bg/50 px-6 py-4 border-b border-system-border flex items-center justify-between">
            <h2 className="text-sm font-black font-mono uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-system-accent" />
              Daily Summary Report
            </h2>
            <div className="text-[10px] font-mono text-system-muted uppercase font-bold">
              Aggregation based on {analyticsData.length} data points
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-system-border">
            {[
              { label: 'AQI', data: summary.aqi, unit: 'avg' },
              { label: 'TEMP', data: summary.temp, unit: '°C' },
              { label: 'HUM', data: summary.hum, unit: '%' },
              { label: 'CO2', data: summary.co2, unit: 'ppm' },
              { label: 'NH3', data: summary.nh3, unit: 'ppm' },
              { label: 'CH4', data: summary.ch4, unit: 'ppm' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 space-y-3 hover:bg-system-bg/30 transition-colors">
                <p className="text-[10px] font-black font-mono text-system-muted uppercase tracking-wider">{item.label}</p>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono tracking-tighter">{item.data.avg.toFixed(1)}</span>
                    <span className="text-[8px] font-bold text-system-muted uppercase">Avg</span>
                  </div>
                  <div className="flex items-baseline gap-1 opacity-60">
                    <span className="text-xs font-black font-mono tracking-tighter">{item.data.max.toFixed(1)}</span>
                    <span className="text-[8px] font-bold text-system-muted uppercase">Peak</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-system-bg/20 border-t border-system-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black font-mono text-system-accent uppercase tracking-widest">Aesthetic Evaluation</p>
                <p className="text-xs font-mono text-system-muted max-w-2xl uppercase tracking-tight leading-relaxed">
                  The microclimate telemetry indicates a <span className="text-system-text font-bold">
                    {summary.aqi.avg < 100 ? 'Stable' : 'Volatile'}
                  </span> atmosphere. {summary.temp.avg > 30 ? 'High thermal stress detected across aggregation windows.' : 'Thermal regulation remains within optimal veterinary thresholds.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button 
                  onClick={downloadPDF}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-system-panel border border-system-border rounded-xl px-5 py-2.5 text-[10px] font-black font-mono uppercase tracking-widest hover:border-system-accent/40 active:scale-95 transition-all"
                >
                  <BarChart3 className="w-4 h-4 text-system-accent" />
                  Download PDF
                </button>
                <button 
                  onClick={() => navigate('/reports')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-system-accent text-white rounded-xl px-5 py-2.5 text-[10px] font-black font-mono uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Full Analysis Report
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
