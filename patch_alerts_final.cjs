const fs = require('fs');
let code = fs.readFileSync('src/pages/Alerts.tsx', 'utf8');

// Imports
code = code.replace(
`import { useAppContext } from '../hooks/useAppContext';`,
`import { useAppContext } from '../hooks/useAppContext';
import { deleteAlertsByDate } from '../lib/firebase';`
);

// Remove activeTab, add selectedDate
code = code.replace(
  `const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');`,
  `const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);`
);

// Filter logic
code = code.replace(
`  const filteredAlerts = alertsList.filter((item) => {
    if (activeTab === 'active') {
      if (item.resolved) return false;
    } else if (activeTab === 'resolved') {
      if (!item.resolved) return false;
    }

    return true;
  });`,
`  const filteredAlerts = alertsList.filter((item) => {
    if (!item.timestamp) return false;
    // Assuming local date matching
    const alertDate = new Date(item.timestamp).toISOString().split('T')[0];
    return alertDate === selectedDate;
  });`
);

// Fix exportPDF activeTab reference
code = code.replace(
  `doc.text("View: " + activeTab.toUpperCase(), 14, 21);`,
  `doc.text("Date: " + selectedDate, 14, 21);`
);
code = code.replace(
  `doc.save("airsense_alerts_" + activeTab + "_" + new Date().getTime() + ".pdf");`,
  `doc.save("airsense_alerts_" + selectedDate + "_" + new Date().getTime() + ".pdf");`
);

// Replace the UI where the tabs and buttons were
const uiToReplace = `            <div className="flex bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">
              {[
                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved History' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-lg cursor-pointer",
                    activeTab === tab.id 
                      ? "bg-system-panel text-system-text shadow-sm" 
                      : "text-system-muted hover:text-system-text"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={exportPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-system-text bg-system-bg border border-system-border hover:bg-system-panel rounded-xl transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              {activeTab === 'resolved' && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to permanently delete all resolved alerts?')) {
                      try {
                        setIsPurging(true);
                        const count = purgeResolvedAlerts();
                        toast.success(\`Purged \${count} resolved alerts\`);
                      } catch (err) {
                        toast.error('Failed to purge resolved alerts');
                      } finally {
                        setIsPurging(false);
                      }
                    }
                  }}
                  disabled={isPurging}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-orange-500 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Purge Resolved Alerts"
                >
                  {isPurging ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Purge Resolved
                </button>
              )}
            </div>`;

const newUi = `            <div className="flex items-center gap-2 bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">
              <div className="flex items-center pl-2 pr-1 gap-2 text-system-muted">
                <Calendar className="w-4 h-4" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold uppercase text-system-text outline-none cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={exportPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-system-text bg-system-bg border border-system-border hover:bg-system-panel rounded-xl transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={async () => {
                  if (window.confirm(\`Are you sure you want to permanently delete all alerts for \${selectedDate}?\`)) {
                    try {
                      setIsPurging(true);
                      const count = await deleteAlertsByDate(uid, selectedDate);
                      // Since we use realtime listeners, the list will update automatically.
                      toast.success(\`Deleted \${count} alerts\`);
                    } catch (err) {
                      toast.error('Failed to delete alerts');
                    } finally {
                      setIsPurging(false);
                    }
                  }
                }}
                disabled={isPurging}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete Alerts for Selected Date"
              >
                {isPurging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>`;

code = code.replace(uiToReplace, newUi);

// Remove the resolve button inside the map
const resolveButtonRegex = /\{!log\.resolved && \([\s\S]*?<\/button>\s*\)\}/;
code = code.replace(resolveButtonRegex, "");

// Replace the No alerts message
code = code.replace(
  `<p className="text-xs font-mono uppercase tracking-wider leading-none">No {activeTab} anomalies logged</p>`,
  `<p className="text-xs font-mono uppercase tracking-wider leading-none">No anomalies logged for {selectedDate}</p>`
);

fs.writeFileSync('src/pages/Alerts.tsx', code);
