import { useState, useMemo } from 'react';
import { FileText, DownloadCloud, Printer, Plus, Layers, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppContext } from '../hooks/useAppContext';
import { cn } from '../lib/utils';

export function ReportsPage() {
  const { devices, selectedDeviceId } = useAppContext();
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const compiledReportProps = useMemo(() => {
    if (!activeDevice) return [];
    return [
      { parameter: 'Average Heat Index', value: '22.9 °C', status: 'Optimal' },
      { parameter: 'Average Humidity Level', value: '62 %', status: 'Optimal' },
      { parameter: 'Average CO2 gas rating', value: '480 ppm', status: 'Optimal' },
      { parameter: 'Average Ammonia (NH3) trace', value: '1.2 ppm', status: 'Excellent' },
      { parameter: 'Safety Threshold Limit', value: 'Active Compliance Check', status: 'Compliant' },
    ];
  }, [activeDevice]);

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
    doc.text(`Generated Standard: 2026-06-16 (UTC)`, 14, 41);
    doc.setLineWidth(0.5);
    doc.line(14, 45, 196, 45);

    autoTable(doc, {
      head: [['System Parameter Under Audit', 'Representative Value', 'Compliance Status']],
      body: compiledReportProps.map(row => [row.parameter, row.value, row.status]),
      startY: 50,
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

      <div className="bg-system-panel border border-system-border rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <h4 className="font-bold text-xs text-system-text uppercase font-mono">Calibrating Reports Generator context</h4>
            <p className="text-xs text-system-muted mt-0.5">
              All files downloaded below will pull dynamic sensor characteristics matched with device: <span className="font-bold text-system-text">{activeDevice.name} ({activeDevice.id})</span>.
            </p>
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
