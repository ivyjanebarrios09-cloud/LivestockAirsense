const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
`        if (alertData.severity === 'critical' || alertData.severity === 'warning') {
          const userId = alertData.userId;
          if (!userId || userId === 'guest') continue;

          try {
            const subsRef = collection(db, 'users', userId, 'push_subscriptions');
            const subsSnap = await getDocs(subsRef);

            if (subsSnap.empty) {
              console.log(\`[Server Push] No active push subscriptions for user: \${userId}\`);
              continue;
            }

            console.log(\`[Server Push] Dispatching notifications to \${subsSnap.size} endpoints for user: \${userId}\`);

            const payload = JSON.stringify({
              title: alertData.severity === 'critical' ? '🚨 Critical Air Quality Alert' : '⚠️ Air Quality Warning',
              body: \`\${alertData.location}: \${alertData.message}\`,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: alertId,
              data: {
                alertId,
                url: '/app/alerts'
              }
            });`,
`        if (alertData.severity === 'critical' || alertData.severity === 'warning' || alertData.alerts?.activeAlert || alertData.activeAlert) {
          const userId = alertData.userId;
          if (!userId || userId === 'guest') continue;

          try {
            const subsRef = collection(db, 'users', userId, 'push_subscriptions');
            const subsSnap = await getDocs(subsRef);

            if (subsSnap.empty) {
              console.log(\`[Server Push] No active push subscriptions for user: \${userId}\`);
              continue;
            }

            console.log(\`[Server Push] Dispatching notifications to \${subsSnap.size} endpoints for user: \${userId}\`);
            
            const isCritical = alertData.severity === 'critical' || (alertData.alerts?.activeAlert && alertData.alerts?.lastAlertType === 'Ammonia NH3');
            const title = isCritical ? '🚨 Critical Air Quality Alert' : '⚠️ Air Quality Warning';
            const body = alertData.message ? \`\${alertData.location}: \${alertData.message}\` : \`Device \${alertData.deviceId} triggered \${alertData.alerts?.lastAlertType || 'an alert'}.\`;

            const payload = JSON.stringify({
              title,
              body,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: alertId,
              data: {
                alertId,
                url: '/app/alerts'
              }
            });`
);
fs.writeFileSync('server.ts', code);
