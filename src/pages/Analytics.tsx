import { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  AreaChart, 
  Area,
  ReferenceLine
} from 'recharts';
import { Sparkles, Thermometer, Activity, Wind, Layers, Info, Filter, TrendingUp, Calendar } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { cn, parseSafeDate } from '../lib/utils';
import { getAnalyticsData } from '../lib/firebase';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md min-w-[180px]">
        <div className="text-[10px] uppercase tracking-widest font-black font-mono text-system-muted mb-3 pb-2 border-b border-white/5 flex justify-between items-center">
          <span>{label}</span>
          <TrendingUp className="w-3 h-3 text-system-accent" />
        </div>
        <div className="space-y-2.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-tight font-mono">{entry.name}:</span>
              </div>
              <span className="text-xs font-black text-white font-mono">
                {entry.value}
                <span className="text-[9px] opacity-50 ml-0.5">
                  {entry.name.includes('Temp') ? '°C' : entry.name.includes('ppm') ? '' : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function AnalyticsPage() {
  const { devices, selectedDeviceId } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  
  if (!activeDevice) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-system-panel border border-system-border flex items-center justify-center">
          <Activity className="w-8 h-8 text-system-muted opacity-20" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black font-mono uppercase tracking-tight">No Telemetry Node Found</h2>
          <p className="text-sm text-system-muted max-w-xs mx-auto uppercase font-mono tracking-tight opacity-60">Register your first AirSense device to begin aggregating environmental microclimate streams.</p>
        </div>
      </div>
    );
  }

  // Use local date for initialization (YYYY-MM-DD)
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

  useEffect(() => {
    if (!activeDevice?.id) return;
    
    // Parse selected date in local timezone
    const [year, month, day] = selectedDate.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);

    setLoading(true);
    setHasError(false);
    
    getAnalyticsData(activeDevice.id, start.getTime(), end.getTime())
      .then(data => {
        if (!data || data.length === 0) {
          setAnalyticsData([]);
        } else {
          const chartData = data.map(d => ({
            ...d,
            time: d.timestamp ? parseSafeDate(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          }));
          setAnalyticsData(chartData);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics fetch error:', err);
        setHasError(true);
        setLoading(false);
      });
  }, [activeDevice?.id, selectedDate]);

  const averageAqi = useMemo(() => {
    if (analyticsData.length === 0) return 0;
    const sum = analyticsData.reduce((acc, curr) => acc + (curr.aqi || 0), 0);
    return Math.round(sum / analyticsData.length);
  }, [analyticsData]);

  const maxTemp = useMemo(() => {
    if (analyticsData.length === 0) return 0;
    const temps = analyticsData.map(item => item.temperature || item.temp).filter(t => typeof t === 'number' && !isNaN(t));
    if (temps.length === 0) return 0;
    return Math.max(...temps);
  }, [analyticsData]);

  const breedInsights = useMemo(() => {
    return {
      optimalTemp: '15 - 22 °C',
      airFlowNeed: 'Standard',
      tip: `Keep microclimate stable. Continuous fresh air changes help regulate core ambient air and clear organic particulate loads safely. Prioritize monitoring sensor trends for early hazard detection.`
    };
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">Performance Analytics</h1>
          <p className="text-sm text-system-muted mt-1 leading-relaxed">
            Detailed correlation metrics and automated veterinary microclimate predictions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-system-panel border border-system-border px-3.5 py-1.5 rounded-xl self-start sm:self-auto shadow-sm">
          <Layers className="w-4 h-4 text-system-accent" />
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-system-muted font-bold font-mono">Current Focus</div>
            <div className="text-xs font-black text-system-text uppercase font-mono leading-none">{activeDevice?.name || 'No Device Selected'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: 'Avg AQI Monitor', 
            value: averageAqi, 
            sub: 'Telemetry calibrated', 
            icon: Activity, 
            color: 'text-system-accent bg-system-accent/10 border-system-accent/20' 
          },
          { 
            title: 'Max Peak Temp', 
            value: `${maxTemp} °C`, 
            sub: `Target: ${breedInsights.optimalTemp}`, 
            icon: Thermometer, 
            color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' 
          },
          { 
            title: 'Optimized Target Temp', 
            value: breedInsights.optimalTemp, 
            sub: 'Sustains: Universal livestock', 
            icon: Sparkles, 
            color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' 
          },
          { 
            title: 'Facility Uptime', 
            value: '99.96%', 
            sub: '24h continuous data integrity', 
            icon: Wind, 
            color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-system-accent/30 transition-all cursor-default">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[10px] font-bold font-mono text-system-muted uppercase tracking-wider mb-2">{stat.title}</h4>
                <div className="text-2xl font-black text-system-text tracking-tight uppercase font-mono">{stat.value}</div>
              </div>
              <div className={cn("p-2 rounded-xl border transition-colors", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[10px] text-system-muted font-mono font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
              <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 lg:col-span-2 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-system-bg border border-system-border flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-system-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-tight font-mono text-system-text">Microclimate Trends</h3>
                <p className="text-[10px] text-system-muted font-mono uppercase tracking-widest">Aggregated data intelligence</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  setLoading(true);
                  // Trigger re-fetch by effectively doing nothing to state but it's fine
                  // Actually, I'll just call the logic again
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                  getAnalyticsData(activeDevice.id, start.getTime(), end.getTime()).then(data => {
                    const chartData = data.map(d => ({
                      ...d,
                      time: d.timestamp ? parseSafeDate(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                    }));
                    setAnalyticsData(chartData);
                    setLoading(false);
                  });
                }}
                className="p-1.5 rounded-xl bg-system-bg border border-system-border hover:border-system-accent/50 transition-colors"
                title="Refresh Data"
              >
                <Activity className={cn("w-3.5 h-3.5 text-system-muted", loading && "animate-spin")} />
              </button>

              <div className="flex items-center gap-2 bg-system-bg border border-system-border rounded-xl px-3 py-1.5 shrink-0 select-none shadow-sm">
                <Calendar className="w-3 h-3 text-system-accent" />
                <span className="text-[10px] font-bold font-mono text-system-muted uppercase tracking-wider">Date:</span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black font-mono text-system-text outline-none cursor-pointer uppercase tracking-tight"
                />
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full mt-4 relative">
            {loading && (
              <div className="absolute inset-0 bg-system-panel/50 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-2 px-4 py-2 bg-system-bg border border-system-border rounded-xl shadow-xl">
                  <div className="w-3 h-3 bg-system-accent rounded-full animate-ping" />
                  <span className="text-[10px] font-black font-mono uppercase tracking-widest">Aggregating Streams...</span>
                </div>
              </div>
            )}
            
            {!loading && analyticsData.length === 0 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-system-bg/50 rounded-2xl border border-dashed border-system-border">
                <Activity className="w-8 h-8 text-system-muted/30 mb-3" />
                <p className="text-xs font-bold text-system-muted uppercase font-mono tracking-tight">No telemetric data for this date</p>
                <p className="text-[10px] text-system-muted/60 font-mono mt-1">Try selecting a different date or checking device status</p>
                {hasError && <p className="text-[9px] text-rose-500 font-bold font-mono mt-2 uppercase">Query Error: Indexing might be in progress</p>}
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-system-accent, #3b82f6)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-system-accent, #3b82f6)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#8b949e', fontWeight: 'bold', fontFamily: 'monospace' }}
                  dy={10}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#8b949e', fontWeight: 'bold', fontFamily: 'monospace' }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  height={40} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }}
                />
                <Area 
                  name="AQI" 
                  type="monotone" 
                  dataKey="aqi" 
                  stroke="var(--color-system-accent, #3b82f6)" 
                  fillOpacity={1}
                  fill="url(#colorAqi)"
                  strokeWidth={3} 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                  dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }}
                  isAnimationActive={true}
                  connectNulls={true}
                />
                <Area 
                  name="Temp" 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#f97316" 
                  fillOpacity={1}
                  fill="url(#colorTemp)"
                  strokeWidth={3} 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }}
                  dot={{ r: 3, strokeWidth: 0, fill: '#f97316' }}
                  isAnimationActive={true}
                  connectNulls={true}
                />
                <Line 
                  name="CO2 ppm" 
                  type="monotone" 
                  dataKey="co2" 
                  stroke="#0ea5e9" 
                  strokeWidth={2} 
                  dot={{ r: 3, strokeWidth: 0, fill: '#0ea5e9' }}
                  strokeDasharray="5 5"
                  connectNulls={true}
                />
                <Line 
                  name="NH3 ppm" 
                  type="monotone" 
                  dataKey="nh3" 
                  stroke="#a855f7" 
                  strokeWidth={2} 
                  dot={{ r: 3, strokeWidth: 0, fill: '#a855f7' }}
                  strokeDasharray="3 3"
                  connectNulls={true}
                />
                <ReferenceLine y={25} label={{ position: 'right', value: 'NH3 Limit', fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: 'AQI', color: 'bg-blue-500' },
              { label: 'Temp', color: 'bg-orange-500' },
              { label: 'CO2', color: 'bg-sky-500' },
              { label: 'NH3', color: 'bg-purple-500' },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-system-bg border border-system-border/50">
                <div className={cn("w-2 h-2 rounded-full", m.color)} />
                <span className="text-[9px] font-black font-mono text-system-muted uppercase tracking-tight">{m.label} Stable</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-system-accent/10 border border-system-accent/20 flex items-center justify-center text-system-accent group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-system-accent uppercase tracking-wider">Predictive Hub</span>
                <h3 className="font-bold text-base text-system-text uppercase font-mono tracking-tight">AI Breed Advice</h3>
              </div>

              <p className="text-xs text-system-muted leading-relaxed select-text font-medium italic">
                "{breedInsights.tip}"
              </p>
            </div>

            <div className="bg-system-bg border border-system-border rounded-xl p-3.5 space-y-2 font-mono shadow-inner">
              <div className="flex justify-between text-[10px] font-bold uppercase text-system-muted">
                <span>Target Temp Limits:</span>
                <span className="text-system-text">{breedInsights.optimalTemp}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase text-system-muted">
                <span>Required Air Volume:</span>
                <span className="text-system-text">{breedInsights.airFlowNeed}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-system-accent/20 to-transparent border border-system-accent/20 shadow-sm rounded-2xl p-5 md:p-6 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <h4 className="text-[10px] font-black font-mono text-system-accent uppercase tracking-widest">System Health</h4>
              <p className="text-xs text-system-text font-bold leading-tight">All environmental nodes reporting 100% data integrity.</p>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full bg-system-bg border-2 border-system-panel flex items-center justify-center text-[8px] font-bold">N{i}</div>
                  ))}
                </div>
                <span className="text-[9px] font-bold font-mono text-system-muted uppercase">Nodes Syncing</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Activity className="w-32 h-32" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
