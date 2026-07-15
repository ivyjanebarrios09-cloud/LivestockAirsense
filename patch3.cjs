const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
`          await addDoc(diagRef, {
            ...latestReading,
            userId: ownerId,
            alerts: {
              activeAlert: isWarning,
              lastAlertTime: isWarning ? timestamp : 0,
              lastAlertType: alertType,
              lastAlertValue: alertValue
            },
            timestamp: timestamp,
            deviceId: docId,
            source: 'server_telemetry'
          });`,
`          await addDoc(diagRef, {
            ...latestReading,
            userId: ownerId,
            alertType: isWarning ? alertType : null, // Add alertType at root for UI
            severity: isWarning ? 'warning' : 'info',
            message: isWarning ? \`Threshold exceeded for \${alertType}\` : '',
            alerts: {
              activeAlert: isWarning,
              lastAlertTime: isWarning ? timestamp : 0,
              lastAlertType: alertType,
              lastAlertValue: alertValue
            },
            timestamp: timestamp,
            deviceId: docId,
            source: 'server_telemetry'
          });`
);
fs.writeFileSync('server.ts', code);
