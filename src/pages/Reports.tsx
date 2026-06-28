import { useState, useMemo } from 'react';
import { FileText, DownloadCloud, Printer, Plus, Layers, CheckCircle, Activity, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { cn, getSensorStatus } from '../lib/utils';

export function ReportsPage() {
  const { devices, selectedDeviceId } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const latestReading = activeDevice?.latestReading || {};
  const { thresholds } = useAppContext();

  const compiledReportProps = useMemo(() => {
    if (!activeDevice) return [];
    
    return [
      { 
        parameter: 'Air Quality Index (AQI)', 
        value: `${latestReading.aqi ?? '0'}`, 
        status: getSensorStatus('aqi', latestReading.aqi ?? 0) 
      },
      { 
        parameter: 'Ambient Temperature', 
        value: `${latestReading.temperature ?? '0'} °C`, 
        status: getSensorStatus('temp', latestReading.temperature ?? 0) 
      },
      { 
        parameter: 'Relative Humidity', 
        value: `${latestReading.humidity ?? '0'} %`, 
        status: getSensorStatus('hum', latestReading.humidity ?? 0) 
      },
      { 
        parameter: 'Carbon Dioxide (CO2)', 
        value: `${latestReading.co2 ?? '0'} ppm`, 
        status: getSensorStatus('co2', latestReading.co2 ?? 0) 
      },
      { 
        parameter: 'Ammonia (NH3) Level', 
        value: `${latestReading.nh3 ?? latestReading.ammonia ?? '0'} ppm`, 
        status: getSensorStatus('nh3', latestReading.nh3 ?? latestReading.ammonia ?? 0) 
      },
      { 
        parameter: 'Methane (CH4) Level', 
        value: `${latestReading.ch4 ?? latestReading.methane ?? '0'} ppm`, 
        status: getSensorStatus('ch4', latestReading.ch4 ?? latestReading.methane ?? 0) 
      },
    ];
  }, [activeDevice, latestReading]);

  const airQualitySummary = useMemo(() => {
    if (!activeDevice) return '';
    const issues = [];
    if (getSensorStatus('aqi', latestReading.aqi ?? 0) !== 'GOOD') issues.push('elevated air particulate loads');
    if (getSensorStatus('temp', latestReading.temperature ?? 0) !== 'GOOD') issues.push('high thermal stress');
    if (getSensorStatus('nh3', latestReading.nh3 ?? latestReading.ammonia ?? 0) !== 'GOOD') issues.push('ammonia concentration above safety limits');
    
    if (issues.length === 0) {
      return "The air quality is currently OPTIMAL. All monitored parameters are within safe veterinary thresholds, ensuring a healthy microclimate for livestock. Ventilation systems appear to be operating efficiently.";
    } else {
      const isCritical = compiledReportProps.some(p => p.status === 'DANGER' || p.status === 'POOR');
      if (isCritical) {
        return `CRITICAL: The system has detected dangerous hazards: ${issues.join(', ')}. Immediate intervention is required to prevent livestock morbidity. Microclimate is COMPROMISED.`;
      }
      return `The system has detected potential hazards: ${issues.join(', ')}. This indicates compromised air quality which may impact animal health and productivity. Immediate review of ventilation and waste management is recommended.`;
    }
  }, [activeDevice, latestReading, compiledReportProps]);

  if (!activeDevice) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No device registered</h2>
        <p className="text-system-muted mt-2">Please register an AirSense device in the settings page to generate reports.</p>
      </div>
    );
  }

  const triggerNotify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2200);
  };

  const downloadCSVReport = (title: string) => {
    const headers = ['Parameter / Characteristic', 'Average Value', 'Compliance Status'];
    const rows = compiledReportProps.map(row => [row.parameter, row.value, row.status]);
    const csvContent = [
      [`Active Device Report: ${activeDevice.name} (${activeDevice.id})`],
      headers.join(','), 
      ...rows.map(e => e.map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDevice.id}_compliance_${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotify(`Saved CSV Report: ${title}`);
  };

  const downloadPDFReport = (title: string) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Livestock AirSense: Compliance Audit`, 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Level: ${title}`, 14, 26);
    doc.text(`Monitored Device: ${activeDevice.name} (${activeDevice.id})`, 14, 31);
    
    doc.setFont("helvetica", "bold");
    doc.text("System Health Summary:", 14, 38);
    doc.setFont("helvetica", "normal");
    const splitSummary = doc.splitTextToSize(airQualitySummary, 180);
    doc.text(splitSummary, 14, 43);

    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, 55);
    doc.setLineWidth(0.5);
    doc.line(14, 58, 196, 58);

    autoTable(doc, {
      head: [['System Parameter Under Audit', 'Representative Value', 'Compliance Status']],
      body: compiledReportProps.map(row => [row.parameter, row.value, row.status]),
      startY: 65,
      theme: 'grid',
      styles: { fontSize: 9, font: 'courier' },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`${activeDevice.id}_assessment_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    triggerNotify(`Saved PDF Compliance: ${title}`);
  };

  const handleDownload = (title: string, type: string) => {
    if (type.includes('CSV')) {
      downloadCSVReport(title);
    } else {
      downloadPDFReport(title);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-mono">System Reports</h1>
          <p className="text-sm text-system-muted mt-1 leading-relaxed">
            Configure, generate, and sign certified compliance documentation for <span className="font-bold text-system-text">{activeDevice.name}</span>.
          </p>
        </div>
        
        <button 
          onClick={() => downloadPDFReport('Custom Microclimate Report')}
          className="flex items-center gap-2 px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Custom Report
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2.5 rounded-xl font-bold uppercase font-mono text-[10px] animate-pulse">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="bg-system-panel border border-system-border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-system-border pb-4">
          <div className={cn(
            "p-2 rounded-xl",
            airQualitySummary.includes('OPTIMAL') ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight font-mono text-system-text">Live Air Analysis</h3>
            <p className="text-[10px] text-system-muted font-mono uppercase tracking-widest">Instant microclimate interpretation</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black font-mono text-system-muted uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-system-accent" />
              Automated Summary
            </h4>
            <p className="text-xs text-system-text leading-relaxed font-medium bg-system-bg p-3 rounded-xl border border-system-border/50 italic">
              "{airQualitySummary}"
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black font-mono text-system-muted uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-indigo-500" />
              Key Parameter Audit
            </h4>
            <div className="space-y-2">
              {compiledReportProps.slice(0, 4).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] font-mono uppercase border-b border-system-border/30 pb-1 last:border-0">
                  <span className="text-system-muted">{p.parameter}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-system-text font-bold">{p.value}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black border",
                      p.status === 'Optimal' || p.status === 'Good' 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Daily Summary', desc: 'Automatic 24h aggregate report including hazard safety thresholds analysis.', type: 'CSV / PDF' },
          { title: 'Weekly Assessment', desc: 'Veterinary assessment trends detailing microclimate stability scores.', type: 'PDF' },
          { title: 'Monthly Compliance Audit', desc: 'Regulatory compliance documentation formatted for farming standards checklists.', type: 'PDF' },
        ].map((report, i) => (
          <div 
            key={i} 
            onClick={() => handleDownload(report.title, report.type)}
            className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 hover:border-system-accent/50 transition-colors group cursor-pointer flex flex-col h-full"
          >
            <div className="w-10 h-10 rounded-xl bg-system-bg border border-system-border flex items-center justify-center text-system-text mb-4 group-hover:text-system-accent transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base tracking-tight mb-2 uppercase font-mono text-system-text">{report.title}</h3>
            <p className="text-xs text-system-muted mb-6 flex-1 leading-relaxed">{report.desc}</p>
            
            <div className="border-t border-system-border pt-4 mt-auto flex items-center justify-between text-[10px] font-mono leading-none">
              <span className="text-system-muted font-bold uppercase">{report.type}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-system-accent">
                <button 
                  title="Download File"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(report.title, report.type);
                  }}
                  className="p-1 hover:bg-system-bg rounded-lg transition-colors cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4 hover:scale-110" />
                </button>
                <button 
                  title="Print Report"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint();
                  }}
                  className="p-1 hover:bg-system-bg rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
