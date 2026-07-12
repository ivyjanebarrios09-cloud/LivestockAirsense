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
const dbId = firebaseConfig.firestoreDatabaseId;
const db = (dbId && dbId !== '(default)' && dbId.trim() !== '')
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

const processedReadingDocIds = new Set<string>();

function getSensorStatus(type: string, value: number): 'GOOD' | 'WARNING' | 'POOR' | 'DANGER' {
  switch (type.toLowerCase()) {
    case 'temperature':
    case 'temp':
    case 'temp.':
      if (value <= 30) return 'GOOD';
      if (value <= 35) return 'WARNING';
      if (value <= 40) return 'POOR';
      return 'DANGER';
    case 'humidity':
    case 'hum':
    case 'hum.':
      if (value <= 70) return 'GOOD';
      if (value <= 85) return 'WARNING';
      if (value <= 90) return 'POOR';
      return 'DANGER';
    case 'co2':
    case 'co2 level':
      if (value <= 800) return 'GOOD';
      if (value <= 1200) return 'WARNING';
      if (value <= 2000) return 'POOR';
      return 'DANGER';
    case 'aqi':
    case 'aqi index':
    case 'aqi status':
      if (value <= 100) return 'GOOD';
      if (value <= 200) return 'WARNING';
      if (value <= 300) return 'POOR';
      return 'DANGER';
    case 'nh3':
    case 'ammonia':
    case 'ammonia nh3':
      if (value < 25) return 'GOOD';
      if (value <= 50) return 'WARNING';
      if (value <= 100) return 'POOR';
      return 'DANGER';
    case 'ch4':
    case 'methane':
    case 'methane ch4':
      if (value <= 50) return 'GOOD';
      if (value <= 100) return 'WARNING';
      if (value <= 500) return 'POOR';
      return 'DANGER';
    case 'pm2_5':
    case 'pm2.5':
    case 'pm2.5 feed dust':
      if (value <= 12) return 'GOOD';
      if (value <= 35.4) return 'WARNING';
      if (value <= 55.4) return 'POOR';
      return 'DANGER';
    case 'pm10':
    case 'pm10 coarse dust':
      if (value <= 54) return 'GOOD';
      if (value <= 154) return 'WARNING';
      if (value <= 254) return 'POOR';
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

    const payload = JSON.stringify({
      title: alertData.severity === 'critical' ? '🚨 Critical Air Quality Alert' : '⚠️ Air Quality Warning',
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
      
      const flatReading = {
        ...readings,
        deviceId: canonicalId,
        lastUpdate: timestamp,
        timestamp,
        alerts: {
          activeAlert: (readings.temperature > 38 || readings.nh3 > 25),
          lastAlertTime: timestamp,
          lastAlertType: readings.temperature > 38 ? 'High Temp' : (readings.nh3 > 25 ? 'High NH3' : ''),
          lastAlertValue: readings.temperature > 38 ? readings.temperature : readings.nh3
        }
      };

      await setDoc(globalRef, { 
        ...flatReading,
        latestReading: flatReading 
      }, { merge: true });
      
      const docRef = await addDoc(collection(db, 'airMonitoring', canonicalId, 'readings'), flatReading);
      processedReadingDocIds.add(docRef.id);
      
      // Update Registry lookup to find which user owns this prototype
      const registryRef = doc(db, 'deviceRegistry', deviceId);
      const registrySnap = await getDoc(registryRef);
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
              
              // Record status change in status history
              const historyRef = collection(db, 'airMonitoring', canonicalId, 'status_history');
              await addDoc(historyRef, {
                deviceId: canonicalId,
                sensorName,
                status: currStatus,
                value: currVal,
                reading: currVal, // Dual compatibility
                timestamp: flatReading.timestamp,
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
              let severity: 'critical' | 'warning' | 'normal' = 'normal';
              if (currStatus === 'Danger') {
                severity = 'critical';
              } else if (currStatus === 'Warning' || currStatus === 'Poor') {
                severity = 'warning';
              }

              const deviceName = registrySnap.data()?.name || deviceId;

              // Add Alert document
              const alertsRef = collection(db, 'alerts');
              const alertDocRef = await addDoc(alertsRef, {
                userId: ownerId,
                deviceId: deviceId,
                timestamp: Math.floor(flatReading.timestamp / 1000),
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
              if (severity === 'critical' || severity === 'warning') {
                await dispatchServerPush(ownerId, alertDocRef.id, {
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
        }
      }

      res.json({ success: true, timestamp, routed: registrySnap.exists() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Set up background Firestore 'readings' collection listener to detect telemetry uploaded from ESP32 directly to the database
  let isReadingsInitialLoad = true;

  onSnapshot(query(collectionGroup(db, 'readings')), async (snapshot) => {
    if (isReadingsInitialLoad) {
      isReadingsInitialLoad = false;
      console.log('[Server Readings] Loaded existing readings. Active live telemetry observer running.');
      // Populate processed set so we don't double process existing data
      snapshot.docs.forEach(docSnap => {
        processedReadingDocIds.add(docSnap.id);
      });
      return;
    }

    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const docId = change.doc.id;
        if (processedReadingDocIds.has(docId)) {
          continue;
        }
        processedReadingDocIds.add(docId);
        // Limit set size to avoid memory leaks
        if (processedReadingDocIds.size > 2000) {
          const iterator = processedReadingDocIds.values();
          const firstValue = iterator.next().value;
          if (firstValue) {
            processedReadingDocIds.delete(firstValue);
          }
        }

        const flatReading = change.doc.data();
        const pathParts = change.doc.ref.path.split('/');
        
        // Path should be "airMonitoring/{deviceId}/readings/{docId}"
        if (pathParts.length === 4 && pathParts[0] === 'airMonitoring' && pathParts[2] === 'readings') {
          const deviceId = pathParts[1];
          const timestamp = flatReading.timestamp || flatReading.lastUpdate || flatReading.time || Date.now();
          const canonicalId = deviceId.includes('LAS-001') ? 'LAS-001' : deviceId;

          console.log(`[Server Readings] New telemetry write detected for device: ${deviceId}`, flatReading);

          try {
            // Find who owns this device
            const registryRef = doc(db, 'deviceRegistry', deviceId);
            const registrySnap = await getDoc(registryRef);
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

                // Update the user's specific device state in Firestore
                // This ensures the device's main status is "Online" and lastSeen is fresh!
                await setDoc(userDevRef, {
                  ...flatReading,
                  latestReading: flatReading,
                  status: 'Online',
                  lastSeen: timestamp
                }, { merge: true });

                // Synchronize the reading into the user's date-specific history collection
                const today = new Date(timestamp).toISOString().split('T')[0];
                const historyRef = collection(db, 'users', ownerId, 'devices', deviceId, 'history', today, 'readings');
                
                // Write with docId to prevent duplicates!
                await setDoc(doc(historyRef, docId), flatReading, { merge: true });

                // Helper to perform threshold/status checks and generate alerts & status history entries
                const checkAndRecordServer = async (
                  sensorName: string,
                  currVal: number,
                  prevVal: number,
                  currStatus: string,
                  prevStatus: string
                ) => {
                  if (currStatus !== prevStatus) {
                    console.log(`[Server Telemetry Change] Sensor ${sensorName} changed from ${prevStatus} to ${currStatus} (Value: ${currVal})`);
                    
                    // Record status change in status history
                    const historyRef = collection(db, 'airMonitoring', canonicalId, 'status_history');
                    await addDoc(historyRef, {
                      deviceId: canonicalId,
                      sensorName,
                      status: currStatus,
                      value: currVal,
                      reading: currVal, // Dual compatibility
                      timestamp: timestamp,
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
                        timestamp: timestamp
                      }
                    });

                    // Determine severity
                    let severity: 'critical' | 'warning' | 'normal' = 'normal';
                    if (currStatus === 'Danger') {
                      severity = 'critical';
                    } else if (currStatus === 'Warning' || currStatus === 'Poor') {
                      severity = 'warning';
                    }

                    const deviceName = registrySnap.data()?.name || deviceId;

                    // Add Alert document
                    const alertsRef = collection(db, 'alerts');
                    const alertDocRef = await addDoc(alertsRef, {
                      userId: ownerId,
                      deviceId: deviceId,
                      timestamp: Math.floor(timestamp / 1000),
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
                    if (severity === 'critical' || severity === 'warning') {
                      await dispatchServerPush(ownerId, alertDocRef.id, {
                        severity,
                        location: deviceName,
                        message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`
                      });
                    }
                  }
                };

                // Perform comparisons using getStatusLabel (which uses the updated getSensorStatus with full support)
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

                const currPm25Stat = getStatusLabel('pm2.5', flatReading.pm2_5 ?? 0);
                const prevPm25Stat = getStatusLabel('pm2.5', prevReading.pm2_5 ?? 0);
                await checkAndRecordServer('PM2.5 Feed Dust', flatReading.pm2_5 ?? 0, prevReading.pm2_5 ?? 0, currPm25Stat, prevPm25Stat);

                const currPm10Stat = getStatusLabel('pm10', flatReading.pm10 ?? 0);
                const prevPm10Stat = getStatusLabel('pm10', prevReading.pm10 ?? 0);
                await checkAndRecordServer('PM10 Coarse Dust', flatReading.pm10 ?? 0, prevReading.pm10 ?? 0, currPm10Stat, prevPm10Stat);

                const currAqiStat = getStatusLabel('aqi', flatReading.aqi ?? 0);
                const prevAqiStat = getStatusLabel('aqi', prevReading.aqi ?? 0);
                await checkAndRecordServer('AQI Index', flatReading.aqi ?? 0, prevReading.aqi ?? 0, currAqiStat, prevAqiStat);
              }
            }
          } catch (err) {
            console.error('[Server Readings] Failed to process telemetry update:', err);
          }
        }
      }
    }
  }, (err) => {
    console.error('[Server Readings] Background collectionGroup observer failed:', err);
  });

  // Periodically check for stale devices and mark them as offline in Firestore
  setInterval(async () => {
    try {
      const registryRef = collection(db, 'deviceRegistry');
      const registrySnap = await getDocs(registryRef);
      const nowMs = Date.now();
      
      for (const regDoc of registrySnap.docs) {
        const regData = regDoc.data();
        const deviceId = regDoc.id;
        const ownerId = regData.ownerId;
        
        if (ownerId && ownerId !== 'guest') {
          const userDevRef = doc(db, 'users', ownerId, 'devices', deviceId);
          const userDevSnap = await getDoc(userDevRef);
          
          if (userDevSnap.exists()) {
            const devData = userDevSnap.data();
            const lastSeen = devData.lastSeen || 0;
            const lastSeenMsVal = typeof lastSeen === 'string' ? new Date(lastSeen).getTime() : Number(lastSeen);
            
            if (devData.status === 'Online' && lastSeenMsVal > 0 && (nowMs - lastSeenMsVal > 35000)) {
              console.log(`[Server Offline Sweeper] Marking device ${deviceId} as Offline due to inactivity (lastSeen: ${lastSeen})`);
              await setDoc(userDevRef, { status: 'Offline' }, { merge: true });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Server Offline Sweeper] Error sweeping stale devices:', err);
    }
  }, 30000);

  // Set up background Firestore 'alerts' collection listener to trigger standard Web Push
  const alertsCollectionRef = collection(db, 'alerts');
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

        if (alertData.severity === 'critical' || alertData.severity === 'warning') {
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

            const payload = JSON.stringify({
              title: alertData.severity === 'critical' ? '🚨 Critical Air Quality Alert' : '⚠️ Air Quality Warning',
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
