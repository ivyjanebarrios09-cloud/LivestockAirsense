import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const trendData = [
  { time: '00:00', aqi: 42, temp: 21 },
  { time: '04:00', aqi: 38, temp: 20 },
  { time: '08:00', aqi: 55, temp: 23 },
  { time: '12:00', aqi: 85, temp: 27 },
  { time: '16:00', aqi: 75, temp: 26 },
  { time: '20:00', aqi: 48, temp: 23 },
];

export function AnalyticsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Performance Analytics</h1>
        <p className="text-sm text-system-muted">Analyze correlations and long-term environmental patterns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Highest AQI (Week)', value: '110', sub: 'Wednesday 14:00' },
          { title: 'Lowest AQI (Week)', value: '35', sub: 'Saturday 04:00' },
          { title: 'Average Temp', value: '23.4 °C', sub: 'Last 7 days' },
          { title: 'Data Coverage', value: '99.8%', sub: 'Sensor uptime' },
        ].map((stat, i) => (
          <div key={i} className="bg-system-panel border border-system-border shadow-sm rounded-xl p-5 border-l-4 border-l-system-accent">
            <h4 className="text-xs font-mono text-system-muted uppercase tracking-wider mb-2">{stat.title}</h4>
            <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
            <div className="text-xs text-system-muted mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-system-panel border border-system-border shadow-sm rounded-xl p-6 h-[350px]">
          <div className="mb-4">
            <h3 className="font-medium text-sm">AQI vs Temperature Correlation</h3>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}/>
              <Line yAxisId="left" type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={2} dot={{r: 4}} />
              <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-system-panel border border-system-border shadow-sm rounded-xl p-6 flex flex-col justify-center items-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-system-border mx-auto flex items-center justify-center text-system-muted">
              AI
            </div>
            <h3 className="font-semibold">Predictive Insights</h3>
            <p className="text-sm text-system-muted leading-relaxed">
              Based on the last 30 days of data, AQI tends to peak around 14:00. Ventilation systems should be pre-emptively activated at 13:30 to maintain optimal air quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
