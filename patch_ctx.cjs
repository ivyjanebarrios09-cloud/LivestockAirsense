const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAppContext.tsx', 'utf8');
code = code.replace(
`        const storedPush = localStorage.getItem(\`las_\${uid}_push_enabled\`) === 'true' || pushEnabled;
        const currentStatus = connectionStatusRef.current;
        const lastSeenMsVal = currentStatus.lastSeen ? parseSafeDate(currentStatus.lastSeen).getTime() : 0;
        const isStaleVal = lastSeenMsVal > 0 && (Date.now() - lastSeenMsVal > 30000);
        const isDeviceOnlineVal = currentStatus.status === 'Online' && lastSeenMsVal > 0 && !isStaleVal;

        if (isDeviceOnlineVal && storedPush && 'Notification' in window && Notification.permission === 'granted') {`,
`        const storedPush = localStorage.getItem(\`las_\${uid}_push_enabled\`) === 'true' || pushEnabled;
        // We don't check if device is online, because ESP32 could have uploaded data while we were closed.
        // We just trigger notifications for any new unresolved alert that we haven't seen yet.
        if (storedPush && 'Notification' in window && Notification.permission === 'granted') {`
);
fs.writeFileSync('src/hooks/useAppContext.tsx', code);
