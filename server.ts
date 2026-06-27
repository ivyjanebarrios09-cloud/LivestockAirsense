import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc, addDoc } from 'firebase/firestore';
import autoConfig from './firebase-applet-config.json';

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
const db = getFirestore(fbApp);

async function startServer() {
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', projectId: firebaseConfig.projectId, databaseId: firebaseConfig.firestoreDatabaseId });
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
      await setDoc(globalRef, { latestReading: processedData, lastUpdate: timestamp }, { merge: true });
      await addDoc(collection(db, 'airMonitoring', canonicalId, 'readings'), processedData);
      
      // Update Registry lookup to find which user owns this prototype
      const registryRef = doc(db, 'deviceRegistry', deviceId);
      const registrySnap = await getDoc(registryRef);
      if (registrySnap.exists()) {
        const ownerId = registrySnap.data().ownerId;
        if (ownerId && ownerId !== 'guest') {
          const userDevRef = doc(db, 'users', ownerId, 'devices', deviceId);
          await setDoc(userDevRef, { latestReading: processedData, lastSeen: timestamp, status: 'Online' }, { merge: true });
          
          // History tracking for the user
          const today = new Date().toISOString().split('T')[0];
          const historyRef = collection(db, 'users', ownerId, 'devices', deviceId, 'history', today, 'readings');
          await addDoc(historyRef, processedData);
        }
      }

      res.json({ success: true, timestamp, routed: registrySnap.exists() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
