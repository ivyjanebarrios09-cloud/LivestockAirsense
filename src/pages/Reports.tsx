import { FileText, DownloadCloud, Printer, Plus } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Reports</h1>
          <p className="text-sm text-system-muted mt-1">Generate and export official air quality documentation.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
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
          <div key={i} className="bg-system-panel border border-system-border shadow-sm rounded-xl p-5 hover:border-system-accent/50 transition-colors group cursor-pointer flex flex-col h-full">
            <div className="w-10 h-10 rounded-lg bg-system-border/50 flex items-center justify-center text-system-text mb-4 group-hover:text-system-accent transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-lg mb-2">{report.title}</h3>
            <p className="text-sm text-system-muted mb-6 flex-1">{report.desc}</p>
            
            <div className="border-t border-system-border pt-4 mt-auto flex items-center justify-between text-xs font-mono">
              <span className="text-system-muted">{report.type}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-system-accent">
                <DownloadCloud className="w-4 h-4 hover:scale-110" />
                <Printer className="w-4 h-4 hover:scale-110" />
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
                <button className="text-system-accent hover:underline lowercase">Download</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
