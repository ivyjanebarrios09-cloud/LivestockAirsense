const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace(
`      if (deviceId) {
        filteredAlerts = alerts.filter(a => a.deviceId === deviceId);
      }
      
      callback(filteredAlerts);`,
`      if (deviceId) {
        filteredAlerts = alerts.filter(a => a.deviceId === deviceId);
      }
      
      filteredAlerts.sort((a, b) => b.timestamp - a.timestamp);
      
      callback(filteredAlerts);`
);
fs.writeFileSync('src/lib/firebase.ts', code);
