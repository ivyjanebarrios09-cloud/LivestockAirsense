import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const mockDailyData = [
  { day: 'Mon', aqi: 45, pm25: 12, co2: 410 },
  { day: 'Tue', aqi: 52, pm25: 18, co2: 440 },
  { day: 'Wed', aqi: 110, pm25: 45, co2: 520 },
  { day: 'Thu', aqi: 85, pm25: 32, co2: 480 },
  { day: 'Fri', aqi: 40, pm25: 10, co2: 405 },
  { day: 'Sat', aqi: 35, pm25: 8, co2: 390 },
  { day: 'Sun', aqi: 38, pm25: 9, co2: 400 },
];

const logData = [
  { timestamp: '2026-06-11 14:00:00', temp: 24.0, humidity: 50.0, co2: 480, pm25: 10, pm10: 20, aqi: 50 },
  { timestamp: '2026-06-11 13:00:00', temp: 24.1, humidity: 50.1, co2: 481, pm25: 11, pm10: 21, aqi: 51 },
  { timestamp: '2026-06-11 12:00:00', temp: 24.2, humidity: 50.2, co2: 482, pm25: 12, pm10: 22, aqi: 52 },
  { timestamp: '2026-06-11 11:00:00', temp: 24.3, humidity: 50.3, co2: 483, pm25: 13, pm10: 23, aqi: 53 },
  { timestamp: '2026-06-11 10:00:00', temp: 24.4, humidity: 50.4, co2: 484, pm25: 14, pm10: 24, aqi: 54 },
];

export function HistoryPage() {
  const [timeRange, setTimeRange] = useState('week');

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Historical Sensor Data', 14, 15);
    autoTable(doc, {
      head: [['Timestamp', 'Temp (°C)', 'Humidity (%)', 'CO2 (ppm)', 'PM2.5', 'PM10', 'AQI']],
      body: logData.map(row => [row.timestamp, row.temp, row.humidity, row.co2, row.pm25, row.pm10, row.aqi]),
      startY: 20,
    });
    doc.save('historical-data.pdf');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Historical Data</h1>
          <p className="text-sm text-system-muted mt-1">Review past sensor logs and trends.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-system-panel border border-system-border rounded-md p-1">
            {['today', 'week', 'month'].map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors",
                  timeRange === t ? "bg-system-border text-system-text" : "text-system-muted hover:text-system-text"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 border border-system-border bg-system-panel hover:bg-system-border/50 text-system-text text-sm rounded-md transition-colors">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          
          <button className="flex items-center gap-2 px-3 py-1.5 border border-system-border bg-system-panel hover:bg-system-border/50 text-system-text text-sm rounded-md transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3 py-1.5 border border-system-border bg-system-panel hover:bg-system-border/50 text-system-text text-sm rounded-md transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-system-panel border border-system-border shadow-sm rounded-xl p-6 h-[400px]">
        <div className="mb-6">
          <h3 className="font-medium">Pollutant Averages ({timeRange})</h3>
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={mockDailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'var(--font-mono)' }} />
            <Tooltip 
              cursor={{ fill: '#e2e8f0', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="aqi" name="Overall AQI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pm25" name="PM 2.5 (µg/m³)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="co2" name="CO2 (ppm)" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-system-panel border border-system-border shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b border-system-border flex justify-between items-center bg-system-panel/50">
          <h3 className="font-medium text-sm">Data Log Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-system-muted uppercase font-mono bg-system-panel/30 border-b border-system-border">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Temp (°C)</th>
                <th className="px-6 py-3">Humidity (%)</th>
                <th className="px-6 py-3">CO2 (ppm)</th>
                <th className="px-6 py-3">PM2.5</th>
                <th className="px-6 py-3">PM10</th>
                <th className="px-6 py-3">AQI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-system-border font-mono text-xs">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="hover:bg-system-border/20 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap">2026-06-11 {14-i}:00:00</td>
                  <td className="px-6 py-3.5">24.{i}</td>
                  <td className="px-6 py-3.5">50.{i}</td>
                  <td className="px-6 py-3.5 text-severity-warning">48{i}</td>
                  <td className="px-6 py-3.5">1{i}</td>
                  <td className="px-6 py-3.5">2{i}</td>
                  <td className="px-6 py-3.5 font-sans font-medium text-system-accent">5{i}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
