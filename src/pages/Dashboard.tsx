import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Wind, Activity, CloudFog, AlertOctagon } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { cn } from '../lib/utils';

// Mock data generator for real-time visualization
const generateReading = (timeStr: string) => ({
  time: timeStr,
  temp: 22 + Math.random() * 5,
  humidity: 45 + Math.random() * 10,
  aqi: 30 + Math.random() * 50,
  co2: 400 + Math.random() * 100
});

export function Dashboard() {
  const { user } = useAuthState();

  const [data, setData] = useState(Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (15 - i));
    return generateReading(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }));
  const [currentAqi, setCurrentAqi] = useState(54);

  useEffect(() => {
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      const d = new Date();
      const newReading = generateReading(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentAqi(Math.round(newReading.aqi));
      setData(prev => [...prev.slice(1), newReading]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'Temperature', value: data[data.length - 1].temp.toFixed(1) + ' °C', icon: Thermometer, color: 'text-orange-500' },
    { label: 'Humidity', value: data[data.length - 1].humidity.toFixed(1) + ' %', icon: Droplets, color: 'text-blue-500' },
    { label: 'CO2 Level', value: Math.round(data[data.length - 1].co2) + ' ppm', icon: CloudFog, color: 'text-gray-400' },
    { label: 'PM2.5', value: '12 µg/m³', icon: Wind, color: 'text-purple-500' },
    { label: 'Ammonia', value: '0.5 ppm', icon: Activity, color: 'text-yellow-500' },
    { label: 'Methane', value: '0.1 ppm', icon: AlertOctagon, color: 'text-red-500' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Real-Time Monitoring</h1>
          <p className="text-sm text-system-muted mt-1">Live data feed from LAS edge nodes.</p>
        </div>
        
        {/* AQI Gauge Display */}
        <div className="flex items-center gap-4 bg-system-panel border border-system-border shadow-sm rounded-lg px-6 py-3">
          <div className="flex flex-col">
            <span className="text-xs font-mono uppercase tracking-widest text-system-muted">Overall AQI</span>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {currentAqi}
            </span>
          </div>
          <div className="w-[2px] h-10 bg-system-border mx-2" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-system-muted">Status</span>
            <span className={cn(
              "text-sm font-medium",
              currentAqi <= 50 ? "text-severity-normal" : currentAqi <= 100 ? "text-severity-warning" : "text-severity-critical"
            )}>
              {currentAqi <= 50 ? 'Good' : currentAqi <= 100 ? 'Moderate' : 'Unhealthy'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-system-panel border border-system-border shadow-sm rounded-xl p-4 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-system-muted uppercase">{metric.label}</span>
              <metric.icon className={cn("w-4 h-4 opacity-70", metric.color)} />
            </div>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">
              {metric.value}
            </div>
            {/* Soft decorative glow */}
            <div className={cn("absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-opacity flex-shrink-0 bg-current", metric.color)} />
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AQI Trend Chart */}
        <div className="lg:col-span-2 bg-system-panel border border-system-border shadow-sm flex flex-col rounded-xl p-6 h-[400px]">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Air Quality Index Trend</h3>
            <p className="text-xs text-system-muted">5 second polling interval</p>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'var(--font-mono)' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="aqi" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAqi)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Info / Recent Events Panel & Install Campaign Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-system-panel border border-system-border shadow-sm rounded-xl p-6 flex flex-col flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">Live Diagnostics</h3>
              <div className="flex items-center gap-2 text-xs font-mono text-severity-normal">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-normal opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-normal"></span>
                </span>
                Connected
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {[
                { t: '10s ago', msg: 'Syncing MQTT broker...', st: 'info' },
                { t: '4m ago', msg: 'Calibration offset applied', st: 'warn' },
                { t: '12m ago', msg: 'System routine check OK', st: 'info' },
                { t: '2hr ago', msg: 'Node A reconnected', st: 'info' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-system-muted w-16 shrink-0">{log.t}</span>
                  <span className={cn(
                    "truncate",
                    log.st === 'warn' ? 'text-severity-warning' : 'text-system-text' 
                  )}>{log.msg}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-system-border">
              <div className="flex justify-between text-xs font-mono text-system-muted">
                <span>DB Writes:</span>
                <span className="text-system-text">~720/hr</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
