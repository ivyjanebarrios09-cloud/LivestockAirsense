const fs = require('fs');
let code = fs.readFileSync('src/pages/Alerts.tsx', 'utf8');

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

if (code.includes(uiToReplace)) {
  code = code.replace(uiToReplace, newUi);
} else {
  // Wait, maybe the text inside the file differs due to how sed/cat prints it?
  console.log("Could not find exact ui string, trying regex or string finding.");
  const startStr = '<div className="flex bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">';
  const endStr = 'Purge Resolved\n                </button>\n              )}\n            </div>';
  const startIdx = code.indexOf(startStr);
  const endIdx = code.indexOf(endStr);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const matched = code.substring(startIdx, endIdx + endStr.length);
    code = code.replace(matched, newUi);
  }
}

// Remove log.resolved styles
code = code.replace(
  'log.resolved ? "opacity-60 border-system-border" : "border-system-text/10 ring-1 ring-system-text/5"',
  '"border-system-text/10 ring-1 ring-system-text/5"'
);

// Remove the resolve button UI chunk
const startResolve = `{!log.resolved && (`;
const endResolve = `</button>\n                        )}`;

const resolveStartIdx = code.indexOf(startResolve);
const resolveEndIdx = code.indexOf(endResolve);
if (resolveStartIdx !== -1 && resolveEndIdx !== -1) {
  const matchedResolve = code.substring(resolveStartIdx, resolveEndIdx + endResolve.length);
  code = code.replace(matchedResolve, "");
} else {
  // if not found, use regex
  const regex = /\{!log\.resolved && \([\s\S]*?<\/button>\s*\)\}/;
  code = code.replace(regex, "");
}

fs.writeFileSync('src/pages/Alerts.tsx', code);
