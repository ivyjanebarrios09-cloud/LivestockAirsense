const fs = require('fs');
let code = fs.readFileSync('src/pages/Alerts.tsx', 'utf8');

// Replace activeTab with selectedDate
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');",
  "const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);"
);

// Replace filteredAlerts
code = code.replace(
  /const filteredAlerts = alertsList\.filter\(\(item\) => \{[\s\S]*?return true;\s*\}\);/,
  `const filteredAlerts = alertsList.filter((item) => {
    if (!item.timestamp) return false;
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

// Replace the UI block
const startUi = '<div className="bg-system-panel border border-system-border p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">';
const endUi = '</div>\n          </div>\n          <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">';
const startIdx = code.indexOf(startUi);
const endIdx = code.indexOf(endUi, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newUi = \`<div className="bg-system-panel border border-system-border p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-system-bg p-1 rounded-xl border border-system-border select-none self-start md:self-auto">
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
                  if (window.confirm(\\\`Are you sure you want to permanently delete all alerts for \${selectedDate}?\\\`)) {
                    try {
                      setIsPurging(true);
                      const count = await deleteAlertsByDate(uid, selectedDate);
                      toast.success(\\\`Deleted \${count} alerts\\\`);
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
            </div>
          </div>
          <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">\`;
  code = code.substring(0, startIdx) + newUi + code.substring(endIdx + endUi.length);
} else {
  console.log("Could not find UI block");
}

code = code.replace(
  /<p className="text-xs font-mono uppercase tracking-wider leading-none">No \{activeTab\} anomalies logged<\/p>/,
  '<p className="text-xs font-mono uppercase tracking-wider leading-none">No anomalies logged for {selectedDate}</p>'
);

const resolveButtonRegex = /\{!log\.resolved && \([\s\S]*?<\/button>\s*\)\}/;
code = code.replace(resolveButtonRegex, "");

fs.writeFileSync('src/pages/Alerts.tsx', code);
