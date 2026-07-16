const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const startIdx = code.indexOf('export const subscribeToAlerts =');
const endMarker = '};\n\nexport const addDevice =';
const endIdx = code.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `export const subscribeToAlerts = (uid: string, callback: (alerts: any[]) => void, deviceId?: string) => {
  if (!uid || uid === 'guest') {
    callback([]);
    return () => {};
  }

  let isUnsubscribed = false;
  const activeUnsubs = new Map<string, () => void>();
  const alertsBySource = new Map<string, any[]>();

  const triggerCallback = () => {
    if (isUnsubscribed) return;
    const allAlerts: any[] = [];
    alertsBySource.forEach(list => allAlerts.push(...list));
    
    // Sort descending by timestamp
    allAlerts.sort((a, b) => b.timestamp - a.timestamp);
    
    let filteredAlerts = allAlerts;
    if (deviceId) {
      filteredAlerts = filteredAlerts.filter(a => a.deviceId === deviceId);
    }
    callback(filteredAlerts);
  };

  const getRecentDates = () => {
    const dates = [];
    const now = new Date();
    // Get dates for the last 14 days to be safe
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // First fetch the user's devices
  const devicesRef = collection(db, 'users', uid, 'devices');
  const unsubDevices = onSnapshot(devicesRef, (devicesSnap) => {
    if (isUnsubscribed) return;
    
    const deviceIds = devicesSnap.docs.map(d => d.id);
    const dates = getRecentDates();
    const requiredKeys = new Set<string>();

    deviceIds.forEach(devId => {
      dates.forEach(dateStr => {
        requiredKeys.add(\`\${devId}_\${dateStr}\`);
      });
    });

    // Remove old listeners
    activeUnsubs.forEach((unsub, key) => {
      if (!requiredKeys.has(key)) {
        unsub();
        activeUnsubs.delete(key);
        alertsBySource.delete(key);
      }
    });

    // Add new listeners
    requiredKeys.forEach(key => {
      if (activeUnsubs.has(key)) return;
      const [devId, dateStr] = key.split('_');
      
      const alertReadingsRef = collection(db, 'users', uid, 'devices', devId, 'alerts', dateStr, 'alertReadings');
      const unsub = onSnapshot(alertReadingsRef, (snap) => {
        const list = snap.docs.map(doc => {
          const data = doc.data();
          
          // Accept anything that looks like an alert or has an alertType
          const hasAlertData = data.alertType || data.alerts?.lastAlertType || data.activeAlert !== undefined || data.alerts?.activeAlert !== undefined || data.severity;
          if (!hasAlertData && !data.message) return null;
          
          const rawTime = data.createdAt || data.timestamp || data.time;
          const ts = rawTime ? adjustTimestamp(parseSafeDate(rawTime).getTime()) : 0;
          
          return {
            id: doc.id,
            ...data,
            deviceId: data.deviceId || devId,
            alertType: data.alertType || data.alerts?.lastAlertType || 'System Alert',
            severity: data.severity || (data.alerts?.activeAlert ? 'critical' : 'warning'),
            message: data.message || \`Sensor threshold violation detected on device \${data.deviceId || devId}\`,
            location: data.location || \`Device \${devId}\`,
            timestamp: ts,
            resolved: data.resolved === true || data.status === 'resolved' || false
          } as any;
        }).filter(Boolean) as any[];
        
        alertsBySource.set(key, list);
        triggerCallback();
      }, (err) => {
        console.warn(\`[Firestore] Failed to listen to alertReadings for path \${key}:\`, err);
      });
      activeUnsubs.set(key, unsub);
    });
    
    triggerCallback();
  }, (err) => {
    console.error('[Firestore] Error fetching devices for alerts:', err);
  });

  return () => {
    isUnsubscribed = true;
    unsubDevices();
    activeUnsubs.forEach(unsub => unsub());
    activeUnsubs.clear();
  };
`;
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/lib/firebase.ts', code);
  console.log('Patched correctly');
} else {
  console.log('Could not find markers', startIdx, endIdx);
}
