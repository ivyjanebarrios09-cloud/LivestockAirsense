import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Thermometer, Activity, HelpCircle, Flame, Wind, Layers } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { cn } from '../lib/utils';
import { getSensorReadings } from '../lib/firebase';

export function AnalyticsPage() {
  const { activeLocation } = useAppContext();
  const [chartMetric, setChartMetric] = useState<'aqi' | 'temp' | 'co2' | 'ammonia'>('aqi');

  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const logs = await getSensorReadings(12);
      setTelemetryLogs(logs.reverse());
    };
    fetchData();
  }, []);

  // Use telemetryLogs instead of dynamicTimelineData
  const dynamicTimelineData = useMemo(() => {
    return telemetryLogs.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aqi: log.aqi,
      temp: log.temperature,
      co2: log.co2,
      ammonia: log.ammonia,
      humidity: log.humidity
    }));
  }, [telemetryLogs]);

  // Compute stats on the fly
  const averageAqi = useMemo(() => {
    const sum = dynamicTimelineData.reduce((acc, curr) => acc + curr.aqi, 0);
    return Math.round(sum / dynamicTimelineData.length);
  }, [dynamicTimelineData]);

  const maxTemp = useMemo(() => {
    return Math.max(...dynamicTimelineData.map(item => item.temp));
  }, [dynamicTimelineData]);

  const breedInsights = useMemo(() => {
    const breed = activeLocation.type ? activeLocation.type.toLowerCase() : '';
    
    if (breed.includes('swine') || breed.includes('pig') || breed.includes('pork')) {
      return {
        optimalTemp: '18 - 24 °C',
        airFlowNeed: 'Moderate-High',
        tip: `Swine at ${activeLocation.name} require high ventilation rates to clear moisture and heavy ammonia. Keep relative humidity around 60% with continuous fan cycles to prevent skin hazards.`
      };
    } else if (breed.includes('cattle') || breed.includes('cow') || breed.includes('dairy')) {
      return {
        optimalTemp: '5 - 18 °C',
        airFlowNeed: 'Critical',
        tip: `Dairy cattle suffer early signs of heat stress above 20°C. Maintaining strong wind speeds at stall heights is critical. Prioritize fan activation when temperature exceeds average and CO2 goes beyond 750 ppm.`
      };
    } else if (breed.includes('poultry') || breed.includes('chicken') || breed.includes('hen')) {
      return {
        optimalTemp: '20 - 26 °C',
        airFlowNeed: 'Maximum',
        tip: `Poultry laying hens are extremely sensitive to elevated carbon dioxide and dust particulates. Maintain dust filtering and maximize fresh air intake when birds are highly active during peak afternoon cycles.`
      };
    }
    
    // Default fallback
    return {
      optimalTemp: '15 - 22 °C',
      airFlowNeed: 'Standard',
      tip: `Keep microclimate stable. Continuous fresh air changes help regulate core ambient air and clear organic particulate loads safely.`
    };
  }, [activeLocation]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      
      {/* Header section with active facility context badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">Performance Analytics</h1>
          <p className="text-sm text-system-muted mt-1 leading-relaxed">
            Detailed correlation metrics and automated veterinary microclimate predictions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-system-panel border border-system-border px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          <Layers className="w-4 h-4 text-system-accent" />
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-system-muted font-bold font-mono">Current Focus</div>
            <div className="text-xs font-black text-system-text uppercase font-mono leading-none">{activeLocation.name}</div>
          </div>
        </div>
      </div>

      {/* Advanced Statistical Cards */}
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
            title: 'Animal Population', 
            value: activeLocation.animalCount, 
            sub: `${activeLocation.type}`, 
            icon: HelpCircle, 
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
          <div key={i} className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[10px] font-bold font-mono text-system-muted uppercase tracking-wider mb-2">{stat.title}</h4>
                <div className="text-2xl font-black text-system-text tracking-tight uppercase font-mono">{stat.value}</div>
              </div>
              <div className={cn("p-2 rounded-xl border", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[10px] text-system-muted font-mono font-bold uppercase tracking-wider mt-2">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Interactive Correlation Plot and AI Advice Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plot Section */}
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-tight font-mono text-system-text">Live 12-Hour Telemetry Correlation</h3>
              <p className="text-xs text-system-muted">Select microclimate sensors to evaluate historical trends.</p>
            </div>
            
            {/* Interactive chart selector keys */}
            <div className="flex bg-system-bg border border-system-border rounded-xl p-1 shrink-0 select-none">
              {[
                { id: 'aqi', val: 'AQI' },
                { id: 'temp', val: 'Temp' },
                { id: 'co2', val: 'CO2' },
                { id: 'ammonia', val: 'NH₃' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setChartMetric(opt.id as any)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                    chartMetric === opt.id 
                      ? "bg-system-accent text-white shadow-sm" 
                      : "text-system-muted hover:text-system-text"
                  )}
                >
                  {opt.val}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamicTimelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8b949e', fontWeight: 'bold', fontFamily: 'monospace' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8b949e', fontWeight: 'bold', fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(15, 23, 42)', 
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    color: '#ffffff', 
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
                {chartMetric === 'aqi' && (
                  <Line 
                    name="Air Quality Index" 
                    type="monotone" 
                    dataKey="aqi" 
                    stroke="var(--color-system-accent, #3b82f6)" 
                    strokeWidth={3} 
                    dot={{ r: 5, strokeWidth: 2 }} 
                  />
                )}
                {chartMetric === 'temp' && (
                  <Line 
                    name="Temperature (°C)" 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 5, strokeWidth: 2 }} 
                  />
                )}
                {chartMetric === 'co2' && (
                  <Line 
                    name="Carbon Dioxide (ppm)" 
                    type="monotone" 
                    dataKey="co2" 
                    stroke="#0284c7" 
                    strokeWidth={3} 
                    dot={{ r: 5, strokeWidth: 2 }} 
                  />
                )}
                {chartMetric === 'ammonia' && (
                  <Line 
                    name="Ammonia NH3 (ppm)" 
                    type="monotone" 
                    dataKey="ammonia" 
                    stroke="#a855f7" 
                    strokeWidth={3} 
                    dot={{ r: 5, strokeWidth: 2 }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Veterinary Veterinary-Husbandry advice */}
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-system-accent/10 border border-system-accent/20 flex items-center justify-center text-system-accent">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-system-accent uppercase tracking-wider">Predictive Hub</span>
              <h3 className="font-bold text-base text-system-text uppercase font-mono tracking-tight">AI Breed Advice</h3>
            </div>

            <p className="text-xs text-system-muted leading-relaxed select-text">
              {breedInsights.tip}
            </p>
          </div>

          <div className="bg-system-bg border border-system-border rounded-xl p-3.5 space-y-2 font-mono">
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

      </div>
    </div>
  );
}
