import { FileText, DownloadCloud, Printer, Plus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mock report data values
const sampleReportData = [
  { parameter: 'Temp Average', value: '24.2 °C', status: 'Optimal' },
  { parameter: 'Humidity Average', value: '50.2%', status: 'Optimal' },
  { parameter: 'CO2 Average', value: '482 ppm', status: 'Moderate' },
  { parameter: 'PM2.5 Average', value: '12 µg/m³', status: 'Excellent' },
  { parameter: 'PM10 Average', value: '22 µg/m³', status: 'Excellent' },
  { parameter: 'AQI Average', value: '52', status: 'Excellent' },
];

export function ReportsPage() {
  const downloadCSVReport = (title: string) => {
    const headers = ['Parameter', 'Average Value', 'Status'];
    const rows = sampleReportData.map(row => [row.parameter, row.value, row.status]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDFReport = (title: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`AirSense Report: ${title}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated on: 2026-06-15`, 14, 28);
    doc.text(`Organization: AirSense Monitoring Systems`, 14, 34);
    
    autoTable(doc, {
      head: [['Metric / Parameter', 'Reported Average', 'Health Status']],
      body: sampleReportData.map(row => [row.parameter, row.value, row.status]),
      startY: 40,
    });
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const handleDownload = (title: string, type: string) => {
    if (type.includes('CSV')) {
      downloadCSVReport(title);
    } else {
      downloadPDFReport(title);
    }
  };

  const handlePrint = (title: string) => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Reports</h1>
          <p className="text-sm text-system-muted mt-1">Generate and export official air quality documentation.</p>
        </div>
        
        <button 
          onClick={() => downloadPDFReport('Custom AirSense Report')}
          className="flex items-center gap-2 px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Custom Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Daily Summary', desc: 'Auto-generated aggregate from the last 24 hours.', type: 'CSV / PDF' },
          { title: 'Weekly Assessment', desc: 'Comprehensive breakdown of weekly trends.', type: 'PDF' },
          { title: 'Monthly Audit', desc: 'Compliance-ready documentation for standard procedures.', type: 'PDF' },
        ].map((report, i) => (
          <div 
            key={i} 
            onClick={() => handleDownload(report.title, report.type)}
            className="bg-system-panel border border-system-border shadow-sm rounded-xl p-5 hover:border-system-accent/50 transition-colors group cursor-pointer flex flex-col h-full"
          >
            <div className="w-10 h-10 rounded-lg bg-system-border/50 flex items-center justify-center text-system-text mb-4 group-hover:text-system-accent transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-lg mb-2">{report.title}</h3>
            <p className="text-sm text-system-muted mb-6 flex-1">{report.desc}</p>
            
            <div className="border-t border-system-border pt-4 mt-auto flex items-center justify-between text-xs font-mono">
              <span className="text-system-muted">{report.type}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-system-accent">
                <button 
                  title="Download File"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(report.title, report.type);
                  }}
                  className="p-1 hover:bg-system-bg rounded transition-colors"
                >
                  <DownloadCloud className="w-4 h-4 hover:scale-110" />
                </button>
                <button 
                  title="Print Report"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(report.title);
                  }}
                  className="p-1 hover:bg-system-bg rounded transition-colors"
                >
                  <Printer className="w-4 h-4 hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-system-panel border border-system-border shadow-sm rounded-xl p-6">
        <h3 className="font-medium text-sm mb-4 border-b border-system-border pb-4">Recent Archives</h3>
        <ul className="space-y-3">
          {[1, 2, 3].map(i => (
            <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-system-border/30 transition-colors gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-system-muted" />
                <span className="text-sm font-medium">Weekly Assessment - June Week {i}</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-system-muted font-mono">
                <span>Created: 2026-06-0{i}</span>
                <span className="w-12 text-right">2.4 MB</span>
                <button 
                  onClick={() => downloadPDFReport(`Weekly Assessment - June Week ${i}`)}
                  className="text-system-accent hover:underline lowercase font-medium"
                >
                  Download
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

