import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc, addDoc, onSnapshot, deleteDoc, where, collectionGroup } from 'firebase/firestore';
import autoConfig from './firebase-config.json';
import webpush from 'web-push';

const app = express();
const PORT = 3000;

// Use environment variables or fallback to autoConfig
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || autoConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || autoConfig.authDomain,
  projectId: autoConfig.projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: autoConfig.storageBucket || process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: autoConfig.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: autoConfig.appId || process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: autoConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

console.log('[Server] Initializing Firebase with Project ID:', firebaseConfig.projectId);

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '' 
  ? firebaseConfig.firestoreDatabaseId.trim() 
  : undefined;

const db = dbId 
  ? initializeFirestore(fbApp, {}, dbId)
  : getFirestore(fbApp);

// Web Push VAPID keys setup
let vapidKeys: { publicKey: string; privateKey: string };
const keysPath = path.join(process.cwd(), 'vapid-keys.json');

if (fs.existsSync(keysPath)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    console.log('[Server] Loaded existing VAPID keys.');
  } catch (err) {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(keysPath, JSON.stringify(vapidKeys), 'utf8');
    console.log('[Server] Re-generated VAPID keys.');
  }
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(keysPath, JSON.stringify(vapidKeys), 'utf8');
  console.log('[Server] Generated and saved new VAPID keys.');
}

webpush.setVapidDetails(
  'mailto:romerotech0@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

function getSensorStatus(type: string, value: number): 'GOOD' | 'WARNING' | 'POOR' | 'DANGER' {
  switch (type.toLowerCase()) {
    case 'temperature':
    case 'temp':
      if (value <= 30) return 'GOOD';
      if (value <= 35) return 'WARNING';
      if (value <= 40) return 'POOR';
      return 'DANGER';
    case 'humidity':
    case 'hum':
      if (value <= 70) return 'GOOD';
      if (value <= 85) return 'WARNING';
      if (value <= 90) return 'POOR';
      return 'DANGER';
    case 'co2':
      if (value <= 800) return 'GOOD';
      if (value <= 1200) return 'WARNING';
      if (value <= 2000) return 'POOR';
      return 'DANGER';
    case 'nh3':
    case 'ammonia':
      if (value < 25) return 'GOOD';
      if (value <= 50) return 'WARNING';
      if (value <= 100) return 'POOR';
      return 'DANGER';
    case 'ch4':
    case 'methane':
      if (value <= 50) return 'GOOD';
      if (value <= 100) return 'WARNING';
      if (value <= 500) return 'POOR';
      return 'DANGER';
    case 'pm2_5':
    case 'pm2.5':
      if (value <= 12) return 'GOOD';
      if (value <= 35.4) return 'WARNING';
      if (value <= 55.4) return 'POOR';
      return 'DANGER';
    case 'pm10':
      if (value <= 54) return 'GOOD';
      if (value <= 154) return 'WARNING';
      if (value <= 254) return 'POOR';
      return 'DANGER';
    case 'aqi':
      if (value <= 100) return 'GOOD';
      if (value <= 200) return 'WARNING';
      if (value <= 300) return 'POOR';
      return 'DANGER';
    default:
      return 'GOOD';
  }
}

function getStatusLabel(type: string, val: number): string {
  const s = getSensorStatus(type, val);
  switch (s) {
    case 'DANGER': return 'Danger';
    case 'POOR': return 'Poor';
    case 'WARNING': return 'Warning';
    case 'GOOD':
    default:
      return 'Good';
  }
}

async function dispatchServerPush(
  userId: string,
  alertId: string,
  alertData: { severity: string; location: string; message: string }
) {
  if (!userId || userId === 'guest') return;
  try {
    const subsRef = collection(db, 'users', userId, 'push_subscriptions');
    const subsSnap = await getDocs(subsRef);
    
    if (subsSnap.empty) {
      console.log(`[Direct Push] No active push subscriptions found for user: ${userId}`);
      return;
    }

    console.log(`[Direct Push] Dispatching notifications to ${subsSnap.size} endpoints for user: ${userId}`);

    const sevLower = (alertData.severity || '').toLowerCase();
    const isCritical = ['critical', 'danger', 'hazardous'].includes(sevLower);
    const titleLabel = alertData.severity ? alertData.severity.charAt(0).toUpperCase() + alertData.severity.slice(1) : 'Warning';

    const payload = JSON.stringify({
      title: isCritical ? '🚨 Critical Air Quality Alert' : `⚠️ Air Quality Alert: ${titleLabel}`,
      body: `${alertData.location}: ${alertData.message}`,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: alertId,
      data: {
        alertId,
        url: '/app/alerts'
      }
    });

    for (const subDoc of subsSnap.docs) {
      const subscription = subDoc.data() as webpush.PushSubscription;
      webpush.sendNotification(subscription, payload)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Direct Push] Cleaning up expired subscription document: ${subDoc.id}`);
            try {
              const staleSubRef = doc(db, 'users', userId, 'push_subscriptions', subDoc.id);
              await deleteDoc(staleSubRef);
            } catch (e) {
              console.error('[Direct Push] Failed to delete expired subscription document:', e);
            }
          } else {
            console.warn(`[Direct Push] Push dispatch failed:`, err.message || err);
          }
        });
    }
  } catch (err) {
    console.error(`[Direct Push] Error in dispatchServerPush:`, err);
  }
}

async function startServer() {
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', projectId: firebaseConfig.projectId, databaseId: firebaseConfig.firestoreDatabaseId });
  });

  // Web Push Public Key check
  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

// Latest Data API Route - Now dynamic
  app.get('/api/latest-data', async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string || 'LAS-001';
      const uid = req.query.uid as string;
      
      // If uid is provided, try user-specific doc first
      if (uid && uid !== 'guest') {
        const userDocRef = doc(db, 'users', uid, 'devices', deviceId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const today = new Date().toISOString().split('T')[0];
          const readingsRef = collection(db, 'users', uid, 'devices', deviceId, 'history', today, 'readings');
          const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10));
          const snap = await getDocs(q);
          const readings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          return res.json({ found: true, source: 'user', data, readings });
        }
      }

      // Fallback to global airMonitoring (Shared stream)
      const canonicalId = deviceId.includes('LAS-001') ? 'LAS-001' : deviceId;
      const globalDocRef = doc(db, 'airMonitoring', canonicalId);
      const globalSnap = await getDoc(globalDocRef);
      if (globalSnap.exists()) {
        const readingsRef = collection(db, 'airMonitoring', canonicalId, 'readings');
        const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10));
        const snap = await getDocs(q);
        const readings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({ found: true, source: 'global', data: globalSnap.data(), readings });
      } else {
        res.status(404).json({ found: false, message: 'Device not found in registry' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulation endpoint for hardware prototypes
  app.post('/api/simulate-reading', async (req, res) => {
    try {
      const { deviceId, readings } = req.body;
      if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
      
      const timestamp = Date.now();
      const processedData = { 
        ...readings, 
        timestamp,
        deviceId 
      };
      
      // Update global airMonitoring (Shared stream)
      const canonicalId = deviceId.includes('LAS-001') ? 'LAS-001' : deviceId;
      const globalRef = doc(db, 'airMonitoring', canonicalId);
      
      const sensors = [
        { type: 'temp', val: readings.temperature ?? readings.temp ?? 0, name: 'Temperature' },
        { type: 'nh3', val: readings.nh3 ?? readings.ammonia ?? 0, name: 'Ammonia' },
        { type: 'co2', val: readings.co2 ?? 0, name: 'CO2' },
        { type: 'aqi', val: readings.aqi ?? 0, name: 'Air Quality' },
        { type: 'hum', val: readings.humidity ?? readings.hum ?? 0, name: 'Humidity' },
        { type: 'pm2.5', val: readings.pm2_5 ?? 0, name: 'PM2.5' },
        { type: 'pm10', val: readings.pm10 ?? 0, name: 'PM10' },
        { type: 'ch4', val: readings.ch4 ?? readings.methane ?? 0, name: 'Methane' }
      ];

      let isWarning = false;
      let alertType = '';
      let alertValue = 0;

      for (const s of sensors) {
        if (getSensorStatus(s.type, s.val) !== 'GOOD') {
          isWarning = true;
          alertType = s.name;
          alertValue = s.val;
          break;
        }
      }

      const flatReading = {
        ...readings,
        deviceId: canonicalId,
        lastUpdate: timestamp,
        timestamp,
        alerts: {
          activeAlert: isWarning,
          lastAlertTime: isWarning ? timestamp : 0,
          lastAlertType: alertType,
          lastAlertValue: alertValue
        }
      };

      await setDoc(globalRef, { 
        ...flatReading,
        latestReading: flatReading,
        status: 'Online',
        lastSeen: timestamp
      }, { merge: true });
      
      await addDoc(collection(db, 'airMonitoring', canonicalId, 'readings'), flatReading);
      
      // Write to global airMonitoring date-based history structure unconditionally
      const today = new Date(timestamp).toISOString().split('T')[0];
      const dateDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today);
      await setDoc(dateDocRef, { exists: true }, { merge: true });
      
      const globalHistoryRef = collection(db, 'airMonitoring', canonicalId, 'history', today, 'readings');
      await addDoc(globalHistoryRef, {
        ...flatReading,
        deviceId: canonicalId
      });
      
      // Update Registry lookup to find which user owns this prototype
      const registryRef = doc(db, 'deviceRegistry', deviceId);
      const registrySnap = await getDoc(registryRef);
      
      // Keep Registry status Online
      await setDoc(registryRef, {
        status: 'Online',
        lastSeen: timestamp
      }, { merge: true });

      if (registrySnap.exists()) {
        const ownerId = registrySnap.data().ownerId;
        if (ownerId && ownerId !== 'guest') {
          const userDevRef = doc(db, 'users', ownerId, 'devices', deviceId);
          const userDevSnap = await getDoc(userDevRef);
          let prevReading: any = null;
          if (userDevSnap.exists()) {
            const devData = userDevSnap.data();
            prevReading = devData.latestReading || devData;
          }
          if (!prevReading) {
            // Provide baseline/default readings if there are none to ensure state comparisons work
            prevReading = {
              temperature: flatReading.temperature ?? 24,
              humidity: flatReading.humidity ?? 50,
              co2: flatReading.co2 ?? 400,
              nh3: flatReading.nh3 ?? flatReading.ammonia ?? 0,
              ch4: flatReading.ch4 ?? flatReading.methane ?? 0,
              pm1_0: flatReading.pm1_0 ?? 0,
              pm2_5: flatReading.pm2_5 ?? 0,
              pm10: flatReading.pm10 ?? 0,
              aqi: flatReading.aqi ?? 0,
              timestamp: Date.now() - 60000
            };
          }

          await setDoc(userDevRef, { 
            ...flatReading,
            latestReading: flatReading,
            status: 'Online',
            lastSeen: timestamp
          }, { merge: true });
          
          // History tracking for the user
          const today = new Date().toISOString().split('T')[0];
          const historyRef = collection(db, 'users', ownerId, 'devices', deviceId, 'history', today, 'readings');
          await addDoc(historyRef, flatReading);

          // Server-side threshold checks and alert generation (when tab is not active / closed)
          const checkAndRecordServer = async (
            sensorName: string,
            currVal: number,
            prevVal: number,
            currStatus: string,
            prevStatus: string
          ) => {
            if (currStatus !== prevStatus) {
              console.log(`[Server Alert Gen] Sensor ${sensorName} changed from ${prevStatus} to ${currStatus} (Value: ${currVal})`);
              
              // Record status change in status history (deterministic ID to prevent duplicates)
              const today = new Date(flatReading.timestamp).toISOString().split('T')[0];
              const dateDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today);
              await setDoc(dateDocRef, { exists: true }, { merge: true });

              const logId = `history_${canonicalId}_${sensorName.replace(/\s+/g, '')}_${currStatus}_${flatReading.timestamp}`;
              const historyDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today, 'readings', logId);
              await setDoc(historyDocRef, {
                deviceId: canonicalId,
                sensorName,
                status: currStatus,
                value: currVal,
                reading: currVal, // Dual compatibility
                timestamp: flatReading.timestamp,
                prevStatus,
                context: {
                  temp: flatReading.temperature ?? 0,
                  humidity: flatReading.humidity ?? 0,
                  co2: flatReading.co2 ?? 0,
                  ammonia: flatReading.nh3 ?? flatReading.ammonia ?? 0,
                  methane: flatReading.ch4 ?? flatReading.methane ?? 0,
                  pm1_0: flatReading.pm1_0 ?? 0,
                  pm2_5: flatReading.pm2_5 ?? 0,
                  pm10: flatReading.pm10 ?? 0,
                  aqi: flatReading.aqi ?? 0,
                  timestamp: flatReading.timestamp
                }
              });

              // Determine severity
              const severity = currStatus.toLowerCase();

              const deviceName = registrySnap.data()?.name || registrySnap.data()?.deviceName || deviceId;

              // Add Alert document (deterministic ID to prevent duplicates)
              const alertTimestamp = Math.floor(flatReading.timestamp / 1000);
              const cleanAlertType = `${sensorName}StatusChange`;
              const alertId = `alert_${ownerId}_${deviceId}_${cleanAlertType}_${severity}_${alertTimestamp}`;
              const alertDocRef = doc(db, 'alerts', alertId);
              await setDoc(alertDocRef, {
                userId: ownerId,
                deviceId: deviceId,
                timestamp: alertTimestamp,
                alertType: `${sensorName} Status Change`,
                message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`,
                severity,
                location: deviceName,
                resolved: false,
                isRead: false,
                reading: currVal,
                value: currVal // Dual compatibility
              });

              // Dispatch direct Web Push Notification
              const sevLower = severity.toLowerCase();
              if (['critical', 'warning', 'poor', 'danger', 'unhealthy', 'hazardous'].includes(sevLower)) {
                await dispatchServerPush(ownerId, alertId, {
                  severity,
                  location: deviceName,
                  message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`
                });
              }
            }
          };

          const currTempStat = getStatusLabel('temp', flatReading.temperature ?? 0);
          const prevTempStat = getStatusLabel('temp', prevReading.temperature ?? 0);
          await checkAndRecordServer('Temperature', flatReading.temperature ?? 0, prevReading.temperature ?? 0, currTempStat, prevTempStat);

          const currHumStat = getStatusLabel('hum', flatReading.humidity ?? 0);
          const prevHumStat = getStatusLabel('hum', prevReading.humidity ?? 0);
          await checkAndRecordServer('Humidity', flatReading.humidity ?? 0, prevReading.humidity ?? 0, currHumStat, prevHumStat);

          const currCo2Stat = getStatusLabel('co2', flatReading.co2 ?? 0);
          const prevCo2Stat = getStatusLabel('co2', prevReading.co2 ?? 0);
          await checkAndRecordServer('CO2 Level', flatReading.co2 ?? 0, prevReading.co2 ?? 0, currCo2Stat, prevCo2Stat);

          const currNh3Stat = getStatusLabel('nh3', flatReading.nh3 ?? flatReading.ammonia ?? 0);
          const prevNh3Stat = getStatusLabel('nh3', prevReading.nh3 ?? prevReading.ammonia ?? 0);
          await checkAndRecordServer('Ammonia NH3', flatReading.nh3 ?? flatReading.ammonia ?? 0, prevReading.nh3 ?? prevReading.ammonia ?? 0, currNh3Stat, prevNh3Stat);

          const currCh4Stat = getStatusLabel('ch4', flatReading.ch4 ?? flatReading.methane ?? 0);
          const prevCh4Stat = getStatusLabel('ch4', prevReading.ch4 ?? prevReading.methane ?? 0);
          await checkAndRecordServer('Methane CH4', flatReading.ch4 ?? flatReading.methane ?? 0, prevReading.ch4 ?? prevReading.methane ?? 0, currCh4Stat, prevCh4Stat);

          const currAqiStat = getStatusLabel('aqi', flatReading.aqi ?? 0);
          const prevAqiStat = getStatusLabel('aqi', prevReading.aqi ?? 0);
          await checkAndRecordServer('Air Quality', flatReading.aqi ?? 0, prevReading.aqi ?? 0, currAqiStat, prevAqiStat);
        }
      }

      res.json({ success: true, timestamp, routed: registrySnap.exists() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Set up background Firestore 'alertReadings' collectionGroup listener to trigger standard Web Push
  const alertsCollectionRef = collectionGroup(db, 'alertReadings');
  let isInitialLoad = true;

  onSnapshot(alertsCollectionRef, async (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      console.log('[Server Push] Loaded pre-existing alerts. Active live push listener running.');
      return;
    }

    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const alertData = change.doc.data();
        const alertId = change.doc.id;
        
        console.log(`[Server Push] Live alert detected:`, alertId, alertData);

        const sevLower = (alertData.severity || '').toLowerCase();
        if (['critical', 'warning', 'poor', 'danger', 'unhealthy', 'hazardous'].includes(sevLower)) {
          const userId = alertData.userId;
          if (!userId || userId === 'guest') continue;

          try {
            const subsRef = collection(db, 'users', userId, 'push_subscriptions');
            const subsSnap = await getDocs(subsRef);
            
            if (subsSnap.empty) {
              console.log(`[Server Push] No active push subscriptions for user: ${userId}`);
              continue;
            }

            console.log(`[Server Push] Dispatching notifications to ${subsSnap.size} endpoints for user: ${userId}`);

            const isCritical = ['critical', 'danger', 'hazardous'].includes(sevLower);
            const titleLabel = alertData.severity ? alertData.severity.charAt(0).toUpperCase() + alertData.severity.slice(1) : 'Warning';
            const payload = JSON.stringify({
              title: isCritical ? `🚨 Critical Air Quality Alert` : `⚠️ Air Quality Alert: ${titleLabel}`,
              body: `${alertData.location}: ${alertData.message}`,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: alertId,
              data: {
                alertId,
                url: '/app/alerts'
              }
            });

            for (const subDoc of subsSnap.docs) {
              const subscription = subDoc.data() as webpush.PushSubscription;
              webpush.sendNotification(subscription, payload)
                .catch(async (err) => {
                  if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Server Push] Cleaning up expired subscription document: ${subDoc.id}`);
                    try {
                      const staleSubRef = doc(db, 'users', userId, 'push_subscriptions', subDoc.id);
                      await deleteDoc(staleSubRef);
                    } catch (e) {
                      console.error('[Server Push] Failed to delete expired subscription document:', e);
                    }
                  } else {
                    console.warn(`[Server Push] Push dispatch failed to endpoint:`, err.message || err);
                  }
                });
            }
          } catch (err) {
            console.error(`[Server Push] Error querying user push subscriptions:`, err);
          }
        }
      }
    }
  });

  // 1. Central Listener for Sensor Status Transitions & Alerts
  const airMonitoringCol = collection(db, 'airMonitoring');
  const processedTimestamps = new Map<string, number>();
  const lastDeviceStatuses = new Map<string, Record<string, string>>();
  const lastDeviceReadings = new Map<string, any>();

  onSnapshot(airMonitoringCol, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const docId = change.doc.id;
        const data = change.doc.data();
        
        const latestReading = data.latestReading || {};
        const timestamp = latestReading.timestamp || data.timestamp || data.lastUpdate || 0;
        
        if (!timestamp) continue;
        
        // Prevent reprocessing the same reading timestamp
        const lastProcessed = processedTimestamps.get(docId) || 0;
        if (timestamp <= lastProcessed) continue;
        processedTimestamps.set(docId, timestamp);

        // Fetch registered device owner info from deviceRegistry
        const registryRef = doc(db, 'deviceRegistry', docId);
        const registrySnap = await getDoc(registryRef);
        const regData = registrySnap.exists() ? registrySnap.data() : {};
        const ownerId = regData.ownerId;
        const deviceName = regData.deviceName || regData.name || docId;

        // Keep track of any sensor value changes and record to historical logs
        const prevReading = lastDeviceReadings.get(docId);
        const currTemp = latestReading.temperature ?? latestReading.temp ?? 0;
        const prevTemp = prevReading ? (prevReading.temperature ?? prevReading.temp ?? 0) : null;
        
        const currHum = latestReading.humidity ?? latestReading.hum ?? 0;
        const prevHum = prevReading ? (prevReading.humidity ?? prevReading.hum ?? 0) : null;
        
        const currCo2 = latestReading.co2 ?? 0;
        const prevCo2 = prevReading ? (prevReading.co2 ?? 0) : null;
        
        const currNh3 = latestReading.nh3 ?? latestReading.ammonia ?? 0;
        const prevNh3 = prevReading ? (prevReading.nh3 ?? prevReading.ammonia ?? 0) : null;
        
        const currCh4 = latestReading.ch4 ?? latestReading.methane ?? 0;
        const prevCh4 = prevReading ? (prevReading.ch4 ?? prevReading.methane ?? 0) : null;
        
        const currPm25 = latestReading.pm2_5 ?? 0;
        const prevPm25 = prevReading ? (prevReading.pm2_5 ?? 0) : null;
        
        const currPm10 = latestReading.pm10 ?? 0;
        const prevPm10 = prevReading ? (prevReading.pm10 ?? 0) : null;
        
        const currAqi = latestReading.aqi ?? 0;
        const prevAqi = prevReading ? (prevReading.aqi ?? 0) : null;

        const hasSensorValueChange = !prevReading || 
          currTemp !== prevTemp ||
          currHum !== prevHum ||
          currCo2 !== prevCo2 ||
          currNh3 !== prevNh3 ||
          currCh4 !== prevCh4 ||
          currPm25 !== prevPm25 ||
          currPm10 !== prevPm10 ||
          currAqi !== prevAqi;

        if (hasSensorValueChange) {
          const today = new Date(timestamp).toISOString().split('T')[0];
          const dateDocRef = doc(db, 'airMonitoring', docId, 'history', today);
          await setDoc(dateDocRef, { exists: true }, { merge: true });

          const logId = `history_${docId}_SensorReadingChange_${timestamp}`;
          const historyRef = doc(db, 'airMonitoring', docId, 'history', today, 'readings', logId);
          await setDoc(historyRef, {
            deviceId: docId,
            sensorName: 'Sensor Readings',
            status: 'Updated',
            reading: currAqi || currTemp || 0,
            value: currAqi || currTemp || 0,
            prevStatus: prevReading ? 'Good' : 'Initial',
            timestamp,
            temperature: currTemp,
            humidity: currHum,
            co2: currCo2,
            nh3: currNh3,
            ammonia: currNh3,
            ch4: currCh4,
            methane: currCh4,
            pm2_5: currPm25,
            pm10: currPm10,
            aqi: currAqi,
            context: {
              temp: currTemp,
              humidity: currHum,
              co2: currCo2,
              ammonia: currNh3,
              methane: currCh4,
              pm1_0: latestReading.pm1_0 ?? 0,
              pm2_5: currPm25,
              pm10: currPm10,
              aqi: currAqi,
              timestamp
            }
          });
          
          lastDeviceReadings.set(docId, { ...latestReading });
        }

        // Retrieve last known sensor statuses for this device
        let prevStatuses = lastDeviceStatuses.get(docId);
        if (!prevStatuses) {
          prevStatuses = {};
          lastDeviceStatuses.set(docId, prevStatuses);
          // Pre-populate with current statuses from getStatusLabel to prevent spurious initial alerts
          prevStatuses['Temperature'] = getStatusLabel('temp', latestReading.temperature ?? 0);
          prevStatuses['Humidity'] = getStatusLabel('hum', latestReading.humidity ?? 0);
          prevStatuses['CO2 Level'] = getStatusLabel('co2', latestReading.co2 ?? 0);
          prevStatuses['Ammonia NH3'] = getStatusLabel('nh3', latestReading.nh3 ?? latestReading.ammonia ?? 0);
          prevStatuses['Methane CH4'] = getStatusLabel('ch4', latestReading.ch4 ?? latestReading.methane ?? 0);
          prevStatuses['PM2.5 Feed Dust'] = getStatusLabel('pm2.5', latestReading.pm2_5 ?? 0);
          prevStatuses['PM10 Coarse Dust'] = getStatusLabel('pm10', latestReading.pm10 ?? 0);
        }

        const checkAndRecordServer = async (sensorName: string, currVal: number, type: string) => {
          const currStatus = getStatusLabel(type, currVal);
          const prevStatus = prevStatuses![sensorName] || 'Good';
          
          if (currStatus !== prevStatus) {
            console.log(`[Server Central Listener] ${docId} - ${sensorName} transition: ${prevStatus} -> ${currStatus} (${currVal})`);
            prevStatuses![sensorName] = currStatus;

            // 1. Record in status history using deterministic ID to prevent duplicates
            const today = new Date(timestamp).toISOString().split('T')[0];
            const dateDocRef = doc(db, 'airMonitoring', docId, 'history', today);
            await setDoc(dateDocRef, { exists: true }, { merge: true });

            const logId = `history_${docId}_${sensorName.replace(/\s+/g, '')}_${currStatus}_${timestamp}`;
            const historyRef = doc(db, 'airMonitoring', docId, 'history', today, 'readings', logId);
            await setDoc(historyRef, {
              deviceId: docId,
              sensorName,
              status: currStatus,
              reading: currVal,
              prevStatus,
              timestamp,
              context: {
                temp: latestReading.temperature ?? 0,
                humidity: latestReading.humidity ?? 0,
                co2: latestReading.co2 ?? 0,
                ammonia: latestReading.nh3 ?? latestReading.ammonia ?? 0,
                methane: latestReading.ch4 ?? latestReading.methane ?? 0,
                pm1_0: latestReading.pm1_0 ?? 0,
                pm2_5: latestReading.pm2_5 ?? 0,
                pm10: latestReading.pm10 ?? 0,
                aqi: latestReading.aqi ?? 0,
                timestamp
              }
            });

            // 2. Add Alert document using deterministic ID to prevent duplicates (only if device has registered owner)
            if (ownerId && ownerId !== 'guest') {
              const severity = currStatus.toLowerCase();

              const alertTimestamp = Math.floor(timestamp / 1000);
              const cleanAlertType = `${sensorName}StatusChange`;
              const alertId = `alert_${ownerId}_${docId}_${cleanAlertType}_${severity}_${alertTimestamp}`;
              
              // New nested path: /users/{uid}/devices/{deviceId}/alerts/{date}/alertReadings
              const dateStr = new Date(timestamp).toISOString().split('T')[0];
              const alertRef = doc(db, 'users', ownerId, 'devices', docId, 'alerts', dateStr, 'alertReadings', alertId);
              
              await setDoc(alertRef, {
                id: alertId,
                userId: ownerId,
                deviceId: docId,
                timestamp: alertTimestamp * 1000,
                alertType: `${sensorName} Status Change`,
                message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`,
                severity,
                location: deviceName,
                resolved: false,
                isRead: false,
                reading: currVal
              });
            }
          }
        };

        // Run checks for all sensors
        await checkAndRecordServer('Temperature', latestReading.temperature ?? 0, 'temp');
        await checkAndRecordServer('Humidity', latestReading.humidity ?? 0, 'hum');
        await checkAndRecordServer('CO2 Level', latestReading.co2 ?? 0, 'co2');
        await checkAndRecordServer('Ammonia NH3', latestReading.nh3 ?? latestReading.ammonia ?? 0, 'nh3');
        await checkAndRecordServer('Methane CH4', latestReading.ch4 ?? latestReading.methane ?? 0, 'ch4');
        await checkAndRecordServer('PM2.5 Feed Dust', latestReading.pm2_5 ?? 0, 'pm2.5');
        await checkAndRecordServer('PM10 Coarse Dust', latestReading.pm10 ?? 0, 'pm10');
        await checkAndRecordServer('Air Quality', latestReading.aqi ?? 0, 'aqi');

        // Sync activeAlert flag to the user's device document
        if (ownerId && ownerId !== 'guest') {
          const sensors = [
            { type: 'temp', val: latestReading.temperature ?? latestReading.temp ?? 0, name: 'Temperature' },
            { type: 'nh3', val: latestReading.nh3 ?? latestReading.ammonia ?? 0, name: 'Ammonia' },
            { type: 'co2', val: latestReading.co2 ?? 0, name: 'CO2' },
            { type: 'aqi', val: latestReading.aqi ?? 0, name: 'Air Quality' },
            { type: 'hum', val: latestReading.humidity ?? latestReading.hum ?? 0, name: 'Humidity' },
            { type: 'pm2.5', val: latestReading.pm2_5 ?? 0, name: 'PM2.5' },
            { type: 'pm10', val: latestReading.pm10 ?? 0, name: 'PM10' },
            { type: 'ch4', val: latestReading.ch4 ?? latestReading.methane ?? 0, name: 'Methane' }
          ];

          let isWarning = false;
          let alertType = '';
          let alertValue = 0;

          for (const s of sensors) {
            if (getStatusLabel(s.type, s.val) !== 'Good') {
              isWarning = true;
              alertType = s.name;
              alertValue = s.val;
              break; // Take the first one that is bad
            }
          }

          const userDevRef = doc(db, 'users', ownerId, 'devices', docId);
          await setDoc(userDevRef, {
            alerts: {
              activeAlert: isWarning,
              lastAlertTime: isWarning ? timestamp : 0,
              lastAlertType: alertType,
              lastAlertValue: alertValue,
              lastUpdate: timestamp
            }
          }, { merge: true });

          // Also populate the diagnostic alertReadings collection for push notification/UI debugging
          const dateStr = new Date(timestamp).toISOString().split('T')[0];
          const diagRef = collection(db, 'users', ownerId, 'devices', docId, 'alerts', dateStr, 'alertReadings');
          await addDoc(diagRef, {
            ...latestReading,
            userId: ownerId,
            alertType: isWarning ? alertType : null, // Add alertType at root for UI
            severity: isWarning ? 'warning' : 'info',
            message: isWarning ? `Threshold exceeded for ${alertType}` : '',
            alerts: {
              activeAlert: isWarning,
              lastAlertTime: isWarning ? timestamp : 0,
              lastAlertType: alertType,
              lastAlertValue: alertValue
            },
            timestamp: timestamp,
            deviceId: docId,
            source: 'server_telemetry'
          });
        }
      }
    }
  });

  // 2. Background Task for Online/Offline Detection (Timeout of 60 seconds)
  setInterval(async () => {
    try {
      const now = Date.now();
      const timeoutMs = 60000; // 60 seconds timeout

      const airMonitoringRef = collection(db, 'airMonitoring');
      const airSnap = await getDocs(airMonitoringRef);

      for (const airDoc of airSnap.docs) {
        const deviceId = airDoc.id;
        const data = airDoc.data();
        
        const latestReading = data.latestReading || {};
        const lastSeen = data.lastSeen || data.lastUpdate || latestReading.timestamp || 0;
        
        if (lastSeen > 0 && (now - lastSeen > timeoutMs)) {
          if (data.status !== 'Offline') {
            console.log(`[Server Offline Check] Device ${deviceId} has timed out. Setting to Offline. Last seen: ${lastSeen}`);
            
            // 1. Update airMonitoring status
            const airDocRef = doc(db, 'airMonitoring', deviceId);
            await setDoc(airDocRef, {
              status: 'Offline',
              lastSeen: lastSeen
            }, { merge: true });

            // 2. Update deviceRegistry status
            const registryRef = doc(db, 'deviceRegistry', deviceId);
            await setDoc(registryRef, {
              status: 'Offline',
              lastSeen: lastSeen
            }, { merge: true });

            // 3. Update owner's device doc in users collection if owner is known
            const registrySnap = await getDoc(registryRef);
            let ownerId = null;
            let deviceName = deviceId;
            if (registrySnap.exists()) {
              const regData = registrySnap.data();
              ownerId = regData.ownerId;
              deviceName = regData.deviceName || regData.name || deviceId;
            }

            if (ownerId && ownerId !== 'guest') {
              const userDevRef = doc(db, 'users', ownerId, 'devices', deviceId);
              await setDoc(userDevRef, {
                status: 'Offline',
                lastSeen: lastSeen
              }, { merge: true });

              // 4. Create an alert for Device Offline status change! (Deterministic ID)
              const alertTimestamp = Math.floor(now / 1000);
              const alertId = `alert_${ownerId}_${deviceId}_DeviceConnection_Offline_${alertTimestamp}`;
              
              const dateStr = new Date(now).toISOString().split('T')[0];
              const alertDocRef = doc(db, 'users', ownerId, 'devices', deviceId, 'alerts', dateStr, 'alertReadings', alertId);
              
              await setDoc(alertDocRef, {
                id: alertId,
                userId: ownerId,
                deviceId: deviceId,
                timestamp: alertTimestamp * 1000,
                alertType: 'Device Connection Status Change',
                message: `Device connection status shifted from Online to Offline (No signal received for over 60 seconds)`,
                severity: 'warning',
                location: deviceName,
                resolved: false,
                isRead: false,
                reading: null
              });
            }

            // 5. Add status history log for Device Connection (Deterministic ID)
            const today = new Date(now).toISOString().split('T')[0];
            const dateDocRef = doc(db, 'airMonitoring', deviceId, 'history', today);
            await setDoc(dateDocRef, { exists: true }, { merge: true });

            const logId = `history_${deviceId}_DeviceConnection_Offline_${now}`;
            const historyDocRef = doc(db, 'airMonitoring', deviceId, 'history', today, 'readings', logId);
            await setDoc(historyDocRef, {
              timestamp: now,
              sensorName: 'Device Connection',
              status: 'Offline',
              reading: 0,
              prevStatus: 'Online'
            });
          }
        }
      }
    } catch (err) {
      console.error('[Server Offline Check] Error in background offline check:', err);
    }
  }, 10000); // Check every 10 seconds

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
