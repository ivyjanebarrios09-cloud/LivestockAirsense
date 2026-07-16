const fs = require('fs');
let code = fs.readFileSync('src/pages/Alerts.tsx', 'utf8');

// Remove diagnostics tab option
code = code.replace(
`                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved History' },
                { id: 'diagnostics', label: 'Diagnostic Logs' }`,
`                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved History' }`
);

// Remove the condition
const startStr = "            {activeTab === 'diagnostics' ? (";
const endStr = "              </div>\n            ) : filteredAlerts.length === 0 ? (";
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + "            {filteredAlerts.length === 0 ? (" + code.substring(endIdx + endStr.length);
} else {
  console.log("Could not find conditional rendering block.");
}

// Remove from useState
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'diagnostics'>('active');",
  "const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');"
);

fs.writeFileSync('src/pages/Alerts.tsx', code);
