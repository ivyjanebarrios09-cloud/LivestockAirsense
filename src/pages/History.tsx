import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Filter, Download, FileText, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';

export function HistoryPage() {
  const { activeLocation } = useAppContext();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [exportSuccessText, setExportSuccessText] = useState<string | null>(null);

  // Generate dynamic logging logs tailored around the selected location's traits
  const historicalLogs = useMemo(() => {
    const recordsCount = timeRange === 'today' ? 6 : timeRange === 'week' ? 7 : 12;
    const items = [];
    
    for (let i = 0; i < recordsCount; i++) {
      const date = new Date();
      if (timeRange === 'today') {
        date.setHours(date.getHours() - (i * 3));
      } else if (timeRange === 'week') {
        date.setDate(date.getDate() - i);
      } else {
        date.setDate(date.getDate() - (i * 2.5));
      }

      // Add controlled noise
      const tempDelta = Math.sin(i) * 1.5;
      const co2Delta = (i % 2 === 0 ? 35 : -25);
      const tempVal = Number((activeLocation.baseTemp + tempDelta).toFixed(1));
      const humidityVal = Math.round(activeLocation.baseHumidity + (Math.cos(i) * 5));
      const co2Val = Math.round(activeLocation.baseCo2 + co2Delta + (i * 8));
      const ammoniaVal = Number((activeLocation.baseAmmonia + (Math.sin(i * 1.5) * 0.4)).toFixed(2));
      const calculatedAqi = Math.round((co2Val / 11) + (ammoniaVal * 5.5));

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      let label = '';
      if (timeRange === 'today') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`;
      } else if (timeRange === 'week') {
        label = daysOfWeek[date.getDay()];
      } else {
        label = `${monthsOfYear[date.getMonth()]} ${date.getDate()}`;
      }

      items.push({
        timestamp: date.toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false
        }),
        chartLabel: label,
        temp: tempVal,
        humidity: humidityVal,
        co2: co2Val,
        ammonia: ammoniaVal,
        aqi: calculatedAqi
      });
    }

    return items;
  }, [activeLocation, timeRange]);

  // For Recharts display (reverse chronologically so chart draws left-to-right)
  const chartData = useMemo(() => {
    return [...historicalLogs].reverse();
  }, [historicalLogs]);

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

      {/* Main Bar Chart Panel */}
      <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-tight font-mono text-system-text">Environmental Averages ({timeRange})</h3>
          <p className="text-xs text-system-muted">Average gas indices versus particulate loads for {activeLocation.name}.</p>
        </div>
        
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis 
                dataKey="chartLabel" 
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
                cursor={{ fill: 'rgba(59, 130, 246, 0.05)', opacity: 0.8 }}
                contentStyle={{ 
                  backgroundColor: 'rgb(15, 23, 42)', 
                  borderColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '12px', 
                  color: '#ffffff',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', paddingTop: '10px' }} 
              />
              <Bar dataKey="aqi" name="Overall AQI" fill="var(--color-system-accent, #3b82f6)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="humidity" name="Humidity (%)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="co2" name="CO2 (ppm)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Structured Telemetry Data List Table */}
      <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-system-border bg-system-bg flex justify-between items-center">
          <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Live Datastore Ledger Details</h3>
          <span className="text-[10px] bg-system-accent/15 text-system-accent font-bold px-2.5 py-0.5 rounded-full font-mono">
            {historicalLogs.length} SECURE RECORDS
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-system-muted uppercase font-bold font-mono bg-system-bg border-b border-system-border">
              <tr>
                <th className="px-6 py-3.5">Calibrated Timestamp</th>
                <th className="px-6 py-3.5">Temp</th>
                <th className="px-6 py-3.5">Humidity</th>
                <th className="px-6 py-3.5">CO2 (Carbon Dioxide)</th>
                <th className="px-6 py-3.5">NH3 (Ammonia)</th>
                <th className="px-6 py-3.5">Calculated AQI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-system-border font-mono text-xs">
              {historicalLogs.map((row, i) => (
                <tr key={i} className="hover:bg-system-bg/40 transition-colors">
                  <td className="px-6 py-3.5 text-system-text font-bold whitespace-nowrap">{row.timestamp}</td>
                  <td className="px-6 py-3.5 text-orange-500 font-bold">{row.temp.toFixed(1)} °C</td>
                  <td className="px-6 py-3.5 text-purple-500 font-bold">{row.humidity} %</td>
                  <td className="px-6 py-3.5 text-emerald-500 font-bold">{row.co2} ppm</td>
                  <td className="px-6 py-3.5 text-indigo-500 font-bold">{row.ammonia.toFixed(2)} ppm</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-system-accent/10 border border-system-accent/20 text-system-accent font-bold">
                      {row.aqi} AQI
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
