import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "livestockairsense",
  appId: "1:40896854963:web:28b33b7405ed78188229c6",
  apiKey: "AIzaSyCVKH_r4VfUrBsiA0RACVG6G3-AOpHbJf4",
  authDomain: "livestockairsense.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "livestockairsense.firebasestorage.app",
  messagingSenderId: "40896854963",
};

const fbApp = initializeApp(firebaseConfig, 'server-fb');
const dbCustom = getFirestore(fbApp);
const dbDefault = getFirestore(fbApp);

async function fetchAndSaveLatestData() {
  console.log('[Server] Querying Firestore path...');
  // Wait 2 seconds for Firestore client to initialize connection
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const output: any = {
    timestamp: new Date().toISOString(),
    customDb: {
      deviceDoc: null,
      readings: null
    },
    defaultDb: {
      deviceDoc: null,
      readings: null
    },
    errors: {}
  };

  // 1. Custom DB Query
  try {
    const docRef = doc(dbCustom, 'users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      output.customDb.deviceDoc = snap.data();
    } else {
      output.customDb.deviceDoc = 'NOT_FOUND';
    }
  } catch (err: any) {
    output.errors.customDbDeviceDoc = err.message;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const readingsRef = collection(dbCustom, `users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001/history/${today}/readings`);
    const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    output.customDb.readings = [];
    querySnapshot.forEach(docSnap => {
      output.customDb.readings.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err: any) {
    output.errors.customDbReadings = err.message;
  }

  // 2. Default DB Query
  try {
    const docRef = doc(dbDefault, 'users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      output.defaultDb.deviceDoc = snap.data();
    } else {
      output.defaultDb.deviceDoc = 'NOT_FOUND';
    }
  } catch (err: any) {
    output.errors.defaultDbDeviceDoc = err.message;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const readingsRef = collection(dbDefault, `users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001/history/${today}/readings`);
    const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    output.defaultDb.readings = [];
    querySnapshot.forEach(docSnap => {
      output.defaultDb.readings.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err: any) {
    output.errors.defaultDbReadings = err.message;
  }

  try {
    fs.writeFileSync(path.join(process.cwd(), 'latest_data.json'), JSON.stringify(output, null, 2));
    console.log('[Server] Successfully saved latest_data.json with dual db results');
  } catch (writeErr: any) {
    console.error('[Server] Failed to write latest_data.json:', writeErr);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Execute on startup
  fetchAndSaveLatestData();

  // Add Health Route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Latest Data API Route
  app.get('/api/latest-data', async (req, res) => {
    try {
      const docRef = doc(dbCustom, 'users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const today = new Date().toISOString().split('T')[0];
        const readingsRef = collection(dbCustom, `users/Mis9ziCC2eVtMRDLouR9a67WkLo1/devices/LAS-001/history/${today}/readings`);
        const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const readings: any[] = [];
        querySnapshot.forEach(docSnap => {
          readings.push({ id: docSnap.id, ...docSnap.data() });
        });
        res.json({ found: true, data: snap.data(), readings });
      } else {
        res.status(404).json({ found: false, message: 'Device not found' });
      }
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

    // Dynamic fallback for SPA routing in development mode under Vite middlewareMode
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
    // Standard static serving in production
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
