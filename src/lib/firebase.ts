import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  linkWithCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  collection, 
  collectionGroup,
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  where, 
  updateDoc, 
  getDoc,
  Timestamp,
  persistentLocalCache,
  persistentMultipleTabManager,
  writeBatch
} from 'firebase/firestore';
import { parseSafeDate, getSensorStatus } from './utils';
import { formatPHDate } from '../utils/date';
import autoConfig from '../../firebase-config.json';

const firebaseConfig = {
  apiKey: autoConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: autoConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: autoConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: autoConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: autoConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: autoConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: autoConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: autoConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId;

const getDb = () => {
  try {
    const finalDbId = dbId && dbId.trim() !== '' ? dbId.trim() : undefined;
    if (finalDbId) {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true
      }, finalDbId);
    } else {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true
      });
    }
  } catch (e) {
    return getFirestore(app);
  }
};

export const db = getDb();

const getCanonicalDeviceId = (id: string) => {
  if (!id) return id;
  // If it's a long string like "AIRSENSE LAS-001 - LAS-001", extract the core ID
  if (id.includes(' - ')) {
    const parts = id.split(' - ');
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart) return lastPart;
  }
  // Fallback for LAS-001 specifically as requested
  if (id.includes('LAS-001')) return 'LAS-001';
  return id;
};

// Detect and remember if the ESP32 is uploading timestamps with the GMT+8 timezone offset bug
let gmt8OffsetDetected = typeof window !== 'undefined' && localStorage.getItem('gmt8_offset_detected') === 'true';

export const adjustTimestamp = (ts: number): number => {
  if (!ts) return ts;
  const now = Date.now();
  const diff = ts - now;

  // If the timestamp is 7 to 9 hours in the future, we detect the GMT+8 bug
  if (diff >= 7 * 60 * 60 * 1000 && diff <= 9 * 60 * 60 * 1000) {
    if (!gmt8OffsetDetected) {
      gmt8OffsetDetected = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gmt8_offset_detected', 'true');
      }
    }
    return ts - 8 * 60 * 60 * 1000; // Subtract 8 hours
  }

  // If we previously detected the GMT+8 bug, we subtract 8 hours from all device timestamps
  // except client-side generated timestamps (which would be extremely close to now)
  if (gmt8OffsetDetected) {
    const isClientFresh = diff >= -5 * 60 * 1000 && diff <= 5 * 60 * 1000;
    if (!isClientFresh) {
      return ts - 8 * 60 * 60 * 1000; // Subtract 8 hours
    }
  }

  return ts;
};

const ensureNumber = (val: any) => {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
};

const getValue = (data: any, keys: string[]) => {
  if (!data) return undefined;
  // Try direct keys first
  for (const key of keys) {
    if (data[key] !== undefined) return data[key];
  }
  // Try case-insensitive keys
  const dataKeys = Object.keys(data);
  for (const key of keys) {
    const foundKey = dataKeys.find(dk => dk.toLowerCase() === key.toLowerCase());
    if (foundKey) return data[foundKey];
  }
  // Also check nested in 'data' object or 'payload' object
  const containers = [data.data, data.payload, data.state, data.readings];
  for (const container of containers) {
    if (container && typeof container === 'object') {
      for (const key of keys) {
        if (container[key] !== undefined) return container[key];
        const cKeys = Object.keys(container);
        const foundKey = cKeys.find(ck => ck.toLowerCase() === key.toLowerCase());
        if (foundKey) return container[foundKey];
      }
    }
  }
  return undefined;
};

const mapReadings = (rData: any, deviceId: string, metadata: any = {}) => {
  const temp = ensureNumber(getValue(rData, ['temperature', 'temp', 'temp_c', 't']));
  const hum = ensureNumber(getValue(rData, ['humidity', 'hum', 'rel_hum', 'h']));
  const co2 = ensureNumber(getValue(rData, ['co2', 'carbon_dioxide', 'c']));
  const nh3 = ensureNumber(getValue(rData, ['nh3', 'ammonia', 'NH3', 'n']));
  const ch4 = ensureNumber(getValue(rData, ['ch4', 'methane', 'CH4', 'm']));
  const aqi = ensureNumber(getValue(rData, ['aqi', 'air_quality_index']));
  
  // PM values
  const pm1_0 = ensureNumber(getValue(rData, ['pm1_0', 'pm10', 'pm1.0', 'pm1', 'PM1_0', 'pm01'])) ?? 0;
  const pm2_5 = ensureNumber(getValue(rData, ['pm2_5', 'pm25', 'pm2.5', 'PM2_5'])) ?? 0;
  const pm10 = ensureNumber(getValue(rData, ['pm10', 'pm10_0', 'PM10'])) ?? pm2_5;

  const normalizeStatus = (status: any, fallback: string) => {
    if (!status) return fallback;
    const s = String(status).toUpperCase();
    if (s === 'LOW' || s === 'EXCELLENT' || s === 'NORMAL') return 'GOOD';
    if (s === 'MODERATE') return 'WARNING';
    if (s === 'VERY POOR') return 'POOR';
    if (s === 'CRITICAL') return 'DANGER';
    return s;
  };

  const temperatureStatus = getValue(rData, ['temperatureStatus', 'tempStatus']);
  const humidityStatus = getValue(rData, ['humidityStatus', 'humStatus']);
  const co2Status = getValue(rData, ['co2Status']);
  const aqiStatus = getValue(rData, ['aqiStatus']);
  const nh3Status = getValue(rData, ['nh3Status', 'ammoniaStatus']);
  const ch4Status = getValue(rData, ['ch4Status', 'methaneStatus']);
  const pm25Status = getValue(rData, ['pm25Status', 'pm2_5Status']);
  const pm10Status = getValue(rData, ['pm10Status']);

  return {
    id: deviceId, // Keep original ID for UI
    deviceId: deviceId,
    deviceName: metadata.deviceName || metadata.name || 'AIRSENSE',
    ...metadata,
    ...rData,
    temperature: temp ?? 0,
    temperatureLevel: normalizeStatus(temperatureStatus, getSensorStatus('temp', temp ?? 0)),
    humidity: hum ?? 0,
    humidityLevel: normalizeStatus(humidityStatus, getSensorStatus('hum', hum ?? 0)),
    co2: co2 ?? 0,
    co2Level: normalizeStatus(co2Status, getSensorStatus('co2', co2 ?? 0)),
    aqi: aqi ?? 0,
    aqiLevel: normalizeStatus(aqiStatus, getSensorStatus('aqi', aqi ?? 0)),
    nh3: nh3 ?? 0,
    nh3Level: normalizeStatus(nh3Status, getSensorStatus('nh3', nh3 ?? 0)),
    ch4: ch4 ?? 0,
    ch4Level: normalizeStatus(ch4Status, getSensorStatus('ch4', ch4 ?? 0)),
    pm2_5: pm2_5,
    pm2_5Level: normalizeStatus(pm25Status, getSensorStatus('pm2.5', pm2_5)),
    pm10: pm10,
    pm10Level: normalizeStatus(pm10Status, getSensorStatus('pm10', pm10)),
    timestamp: (() => {
      const rawTime = rData.timestamp || rData.time || rData.date || rData.createdAt;
      const parsedTime = rawTime ? parseSafeDate(rawTime).getTime() : Date.now();
      return adjustTimestamp(parsedTime);
    })(),
    ammonia: nh3 ?? 0,
    methane: ch4 ?? 0,
    pm1_0,
  };
};

export const subscribeToSensorData = (uid: string, deviceId: string, callback: (data: any) => void) => {
  if (!uid || !deviceId) return () => {};
  
  const canonicalId = getCanonicalDeviceId(deviceId);
  const today = new Date().toISOString().split('T')[0];
  
  let latestFromUserSub: any = null;
  let latestFromAirSub: any = null;
  
  let userMetadata: any = {};
  let airMetadata: any = {};

  const handleUpdate = () => {
    const candidates: any[] = [];
    
    // 1. User doc source
    if (userMetadata) {
      const uReading = userMetadata.latestReading || userMetadata;
      if (uReading && (uReading.temperature || uReading.temp || uReading.humidity || uReading.hum || uReading.co2 || uReading.nh3 || uReading.ammonia)) {
        candidates.push({
          data: uReading,
          meta: userMetadata,
          id: deviceId
        });
      }
    }
    
    // 2. Air doc source
    if (airMetadata) {
      const aReading = airMetadata.latestReading || airMetadata;
      if (aReading && (aReading.temperature || aReading.temp || aReading.humidity || aReading.hum || aReading.co2 || aReading.nh3 || aReading.ammonia)) {
        candidates.push({
          data: aReading,
          meta: airMetadata,
          id: canonicalId
        });
      }
    }
    
    // 3. User subcollection source
    if (latestFromUserSub) {
      candidates.push({
        data: latestFromUserSub,
        meta: userMetadata || {},
        id: deviceId
      });
    }
    
    // 4. Air subcollection source
    if (latestFromAirSub) {
      candidates.push({
        data: latestFromAirSub,
        meta: airMetadata || {},
        id: canonicalId
      });
    }
    
    if (candidates.length === 0) {
      callback(mapReadings({}, deviceId, { ...userMetadata, ...airMetadata }));
      return;
    }
    
    const getTimestamp = (cand: any) => {
      const d = cand.data;
      const rawTime = d.timestamp || d.time || d.date || d.createdAt || d.lastSeen || d.lastUpdate;
      return rawTime ? parseSafeDate(rawTime).getTime() : 0;
    };
    
    candidates.sort((a, b) => getTimestamp(b) - getTimestamp(a));
    
    const absoluteLatest = candidates[0];
    const mergedMetadata = {
      ...userMetadata,
      ...airMetadata,
      ...absoluteLatest.meta
    };
    
    callback({
      ...mapReadings(absoluteLatest.data, absoluteLatest.id, mergedMetadata),
      status: mergedMetadata.status || 'Online',
      lastSeen: mergedMetadata.lastSeen || mergedMetadata.lastUpdate || getTimestamp(absoluteLatest)
    });
  };

  let userDocUnsubscribe = () => {};
  if (uid && uid !== 'guest') {
    userDocUnsubscribe = onSnapshot(doc(db, 'users', uid, 'devices', deviceId), (snapshot) => {
      if (snapshot.exists()) {
        userMetadata = snapshot.data();
        handleUpdate();
      }
    }, (err) => {
      console.warn(`[Firestore] User device doc listener error for ${deviceId}:`, err);
    });
  }
  
  const airDocUnsubscribe = onSnapshot(doc(db, 'airMonitoring', canonicalId), (snapshot) => {
    if (snapshot.exists()) {
      airMetadata = snapshot.data();
      handleUpdate();
    }
  }, (err) => {
    console.warn(`[Firestore] airMonitoring parent listener error for ${canonicalId}:`, err);
  });
  
  let userSubUnsubscribe = () => {};
  if (uid && uid !== 'guest') {
    const userSubRef = collection(db, 'users', uid, 'devices', deviceId, 'history', today, 'readings');
    const userSubQ = query(userSubRef, orderBy('timestamp', 'desc'), limit(1));
    userSubUnsubscribe = onSnapshot(userSubQ, (snapshot) => {
      if (!snapshot.empty) {
        latestFromUserSub = snapshot.docs[0].data();
        handleUpdate();
      }
    }, (err) => {
      console.warn(`[Firestore] User subcollection listener error for ${deviceId}:`, err);
    });
  }
  
  const airSubRef = collection(db, 'airMonitoring', canonicalId, 'readings');
  const airSubQ = query(airSubRef, orderBy('timestamp', 'desc'), limit(1));
  const airSubUnsubscribe = onSnapshot(airSubQ, (snapshot) => {
    if (!snapshot.empty) {
      latestFromAirSub = snapshot.docs[0].data();
      handleUpdate();
    }
  }, (err) => {
    console.warn(`[Firestore] Air subcollection listener error for ${canonicalId}:`, err);
  });

  return () => {
    userDocUnsubscribe();
    airDocUnsubscribe();
    userSubUnsubscribe();
    airSubUnsubscribe();
  };
};

export const subscribeToDeviceStatus = (uid: string | null, deviceId: string, callback: (status: { status: string; lastSeen: number }) => void) => {
  if (!deviceId) {
    callback({ status: 'Unknown', lastSeen: 0 });
    return () => {};
  }

  // Set up dual listeners for maximum responsiveness and offline fallback resilience
  let airStatus: any = null;
  let userStatus: any = null;

  const handleUpdate = () => {
    const status = airStatus?.status || userStatus?.status || 'Offline';
    const lastSeen = airStatus?.lastSeen || userStatus?.lastSeen || airStatus?.lastUpdate || 0;
    callback({ status, lastSeen });
  };

  const airRef = doc(db, 'airMonitoring', deviceId);
  const airUnsubscribe = onSnapshot(airRef, (snapshot) => {
    if (snapshot.exists()) {
      airStatus = snapshot.data();
      handleUpdate();
    }
  }, (error) => {
    console.warn(`[Firestore] airMonitoring status listener error for ${deviceId}:`, error);
  });

  let userUnsubscribe = () => {};
  if (uid && uid !== 'guest') {
    const deviceRef = doc(db, 'users', uid, 'devices', deviceId);
    userUnsubscribe = onSnapshot(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        userStatus = snapshot.data();
        handleUpdate();
      }
    }, (error) => {
      console.warn(`[Firestore] User device status listener error for ${deviceId}:`, error);
    });
  }

  return () => {
    airUnsubscribe();
    userUnsubscribe();
  };
};

export const subscribeToAlerts = (uid: string, callback: (alerts: any[]) => void, deviceId?: string) => {
  if (!uid || uid === 'guest') {
    callback([]);
    return () => {};
  }
  
  // Use collectionGroup to find all 'alertReadings' for this user across all devices/dates
  const alertsRef = collectionGroup(db, 'alertReadings');
  const q = query(
    alertsRef, 
    where('userId', '==', uid),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Only treat as an Alert if it has an alertType field
          if (!data.alertType) return null;
          
          const rawTime = data.createdAt || data.timestamp;
          const ts = rawTime ? adjustTimestamp(parseSafeDate(rawTime).getTime()) : 0;
          return { 
            id: doc.id, 
            ...data, 
            timestamp: ts,
            resolved: data.resolved === true || data.status === 'resolved' || false
          } as any;
        })
        .filter(Boolean) as any[];
      
      // Filter client-side if a specific deviceId is provided
      let filteredAlerts = alerts;
      if (deviceId) {
        filteredAlerts = alerts.filter(a => a.deviceId === deviceId);
      }
      
      callback(filteredAlerts);
    },
    (error) => {
      console.warn('[Firestore] Alerts subscription stream error or timed out/cancelled:', error);
    }
  );
};

export const addDevice = async (device: any) => {
  try {
    const docRef = doc(db, 'sensors', device.id);
    await setDoc(docRef, {
        deviceId: device.id,
        deviceName: device.name,
        temperature: 0,
        temperatureLevel: 'GOOD',
        humidity: 0,
        humidityLevel: 'GOOD',
        co2: 0,
        co2Level: 'GOOD',
        aqi: 0,
        aqiLevel: 'GOOD',
        nh3: 0,
        nh3Level: 'GOOD',
        ch4: 0,
        ch4Level: 'GOOD',
        timestamp: Date.now()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sensors');
    return false;
  }
};

export const getSensorReadings = async (uid: string, deviceId: string, limitCount: number = 100, selectedDateStr?: string): Promise<any[]> => {
    if (!uid || !deviceId) return [];
    const canonicalId = getCanonicalDeviceId(deviceId);
    try {
        const mapDoc = (docSnap: any, idVal: string) => {
          const data = docSnap.data();
          const parsedTime = parseSafeDate(data.timestamp || data.time).getTime();
          return {
            id: docSnap.id,
            deviceId: idVal,
            ...data,
            timestamp: adjustTimestamp(parsedTime),
            pm1_0: data.pm1_0 ?? data.pm10 ?? data['pm1.0'] ?? data['pm1_0'] ?? data.pm1 ?? 0,
            pm2_5: data.pm2_5 ?? data.pm25 ?? data['pm2.5'] ?? data['pm2_5'] ?? 0,
            pm10: data.pm10 ?? data.pm2_5 ?? data['pm10'] ?? data['pm10_0'] ?? data.pm10_0 ?? 0,
            ammonia: data.nh3 ?? data.ammonia,
            methane: data.ch4 ?? data.methane
          };
        };

        let docs: any[] = [];
        if (uid && uid !== 'guest') {
            const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
            const readingsRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
            const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);
            docs = querySnapshot.docs.map(d => mapDoc(d, deviceId));
        }

        if (docs.length === 0) {
            const legacyRef = collection(db, 'airMonitoring', canonicalId, 'readings');
            const legacyQ = query(legacyRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const legacySnap = await getDocs(legacyQ);
            docs = legacySnap.docs.map(d => mapDoc(d, canonicalId));
        }

        return docs;
    } catch (error) {
        console.error('getSensorReadings failed:', error);
        return [];
    }
};

export const subscribeToSensorReadings = (
  uid: string,
  deviceId: string,
  limitCount: number = 100,
  selectedDateStr: string,
  callback: (readings: any[]) => void
) => {
  if (!uid || !deviceId) {
    callback([]);
    return () => {};
  }
  const canonicalId = getCanonicalDeviceId(deviceId);
  const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];

  let activeUnsubscribe: (() => void) | null = null;
  let fallbackUnsubscribe: (() => void) | null = null;

  const mapDoc = (docSnap: any, idVal: string) => {
    const data = docSnap.data();
    const temp = ensureNumber(getValue(data, ['temperature', 'temp', 'temp_c', 't']));
    const hum = ensureNumber(getValue(data, ['humidity', 'hum', 'rel_hum', 'h']));
    const aqi = ensureNumber(getValue(data, ['aqi', 'air_quality_index']));
    const nh3 = ensureNumber(getValue(data, ['nh3', 'ammonia', 'NH3', 'n']));
    const ch4 = ensureNumber(getValue(data, ['ch4', 'methane', 'CH4', 'm']));
    const pm1_0 = ensureNumber(getValue(data, ['pm1_0', 'pm10', 'pm1.0', 'pm1', 'PM1_0'])) ?? 0;
    const pm2_5 = ensureNumber(getValue(data, ['pm2_5', 'pm25', 'pm2.5', 'PM2_5'])) ?? 0;
    const pm10 = ensureNumber(getValue(data, ['pm10', 'pm10_0', 'PM10'])) ?? pm2_5;
    const parsedTime = parseSafeDate(data.timestamp || data.time).getTime();

    return {
      id: docSnap.id,
      deviceId: idVal,
      ...data,
      timestamp: adjustTimestamp(parsedTime),
      temperature: temp ?? 0,
      humidity: hum ?? 0,
      aqi: aqi ?? 0,
      nh3: nh3 ?? 0,
      ch4: ch4 ?? 0,
      pm1_0,
      pm2_5,
      pm10,
      ammonia: nh3 ?? 0,
      methane: ch4 ?? 0
    };
  };

  if (uid && uid !== 'guest') {
    const userRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
    const userQ = query(userRef, orderBy('timestamp', 'desc'), limit(limitCount));
    
    activeUnsubscribe = onSnapshot(userQ, (snapshot) => {
      if (snapshot.docs.length > 0) {
        if (fallbackUnsubscribe) {
          fallbackUnsubscribe();
          fallbackUnsubscribe = null;
        }
        const docs = snapshot.docs.map(d => mapDoc(d, deviceId));
        callback(docs);
      } else {
        if (!fallbackUnsubscribe) {
          const sharedRef = collection(db, 'airMonitoring', canonicalId, 'readings');
          const sharedQ = query(sharedRef, orderBy('timestamp', 'desc'), limit(limitCount));
          fallbackUnsubscribe = onSnapshot(sharedQ, (sharedSnap) => {
            const docs = sharedSnap.docs.map(d => mapDoc(d, canonicalId));
            callback(docs);
          }, (err) => {
            console.warn('[Firestore] Global readings fallback subscription error:', err);
          });
        }
      }
    }, (error) => {
      console.warn('[Firestore] User readings subscription error:', error);
    });
  } else {
    const sharedRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    const sharedQ = query(sharedRef, orderBy('timestamp', 'desc'), limit(limitCount));
    activeUnsubscribe = onSnapshot(sharedQ, (snapshot) => {
      const docs = snapshot.docs.map(d => mapDoc(d, canonicalId));
      callback(docs);
    }, (error) => {
      console.warn('[Firestore] Guest global readings subscription error:', error);
    });
  }

  return () => {
    if (activeUnsubscribe) activeUnsubscribe();
    if (fallbackUnsubscribe) fallbackUnsubscribe();
  };
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error('Login failed:', error);
    if (error.code === 'auth/popup-blocked') {
      alert('Sign-in popup was blocked by your browser. Please open the app in a new tab (using the arrow icon in the top right of the preview panel) to run it natively!');
    } else if (error.code === 'auth/unauthorized-domain') {
      alert('Domain not authorized for OAuth. Please add this URL to Firebase Console > Authentication > Settings > Authorized domains.');
    } else if (error.code === 'auth/popup-closed-by-user') {
    } else {
      alert('Google Sign-in failed: ' + error.message);
    }
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string, isSignUp: boolean = false) => {
  try {
    if (isSignUp) {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (error: any) {
    console.error('Email auth failed:', error);
    if (error.code === 'auth/invalid-credential') {
        alert('Invalid email or password. Please check your credentials or click "Sign Up" to create a new account.');
    } else if (error.code === 'auth/email-already-in-use') {
       alert('Email already in use. Please sign in instead.');
    } else {
      alert('Sign-in failed: ' + error.message);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const changeUserPassword = async (newPassword: string, currentPassword?: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');

  // If email provider exists, we might need to re-authenticate
  const isEmailUser = user.providerData.some(p => p.providerId === 'password');
  
  if (isEmailUser && currentPassword) {
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }

  await updatePassword(user, newPassword);
};

export const linkEmailPassword = async (password: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No authenticated user with email found.');

  const credential = EmailAuthProvider.credential(user.email, password);
  await linkWithCredential(user, credential);
};

  
export const recordStatusChange = async (
  deviceId: string,
  sensorName: string,
  status: string,
  reading: number,
  allReadings?: {
    temp?: number;
    humidity?: number;
    co2?: number;
    ammonia?: number;
    methane?: number;
    pm1_0?: number;
    pm2_5?: number;
    pm10?: number;
    aqi?: number;
    timestamp?: number;
  }
) => {
  if (!deviceId) return;
  const canonicalId = getCanonicalDeviceId(deviceId);
  try {
    const timestamp = allReadings?.timestamp || Date.now();
    const today = getLocalDateString(timestamp);
    const dateDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today);
    await setDoc(dateDocRef, { exists: true }, { merge: true });

    const logId = `history_${canonicalId}_${sensorName.replace(/\s+/g, '')}_${status}_${timestamp}`;
    const logDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today, 'readings', logId);
    await setDoc(logDocRef, {
      timestamp,
      sensorName,
      status,
      reading,
      ...allReadings
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'history');
  }
};

export const updateDeviceTelemetry = async (
  userId: string,
  deviceId: string,
  readings: {
    temperature: number;
    humidity: number;
    co2: number;
    nh3: number;
    ch4: number;
    pm1_0: number;
    pm2_5: number;
    pm10: number;
    aqi: number;
    temperatureStatus: string;
    humidityStatus: string;
    co2Status: string;
    nh3Status: string;
    ch4Status: string;
  }
) => {
  try {
    if (!userId || !deviceId) return;
    const canonicalId = getCanonicalDeviceId(deviceId);
    const today = getLocalDateString(Date.now());
    const userDeviceRef = doc(db, 'users', userId, 'devices', deviceId);
    
    // 1. Update the latestReading on the device document
    const sensors = [
      { type: 'temp', val: readings.temperature ?? 0, name: 'Temperature' },
      { type: 'nh3', val: readings.nh3 ?? 0, name: 'Ammonia' },
      { type: 'co2', val: readings.co2 ?? 0, name: 'CO2' },
      { type: 'aqi', val: readings.aqi ?? 0, name: 'Air Quality' },
      { type: 'hum', val: readings.humidity ?? 0, name: 'Humidity' },
      { type: 'pm2.5', val: readings.pm2_5 ?? 0, name: 'PM2.5' },
      { type: 'pm10', val: readings.pm10 ?? 0, name: 'PM10' },
      { type: 'ch4', val: readings.ch4 ?? 0, name: 'Methane' }
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

    const alertStatus = {
      activeAlert: isWarning,
      lastAlertTime: isWarning ? Date.now() : 0,
      lastAlertType: alertType,
      lastAlertValue: alertValue
    };

    await updateDoc(userDeviceRef, {
      latestReading: {
        ...readings,
        timestamp: Date.now()
      },
      alerts: alertStatus,
      status: 'Online',
      lastSeen: Date.now()
    });

    // 2. Add to the new diagnostic structure: /users/{uid}/devices/{deviceId}/alerts/{date}/alertReadings
    const diagnosticReadingsRef = collection(db, 'users', userId, 'devices', deviceId, 'alerts', today, 'alertReadings');
    await addDoc(diagnosticReadingsRef, {
      ...readings,
      alerts: alertStatus,
      timestamp: Date.now(),
      deviceId
    });

    // 3. Add to history readings subcollection for charts
    const historyReadingsRef = collection(db, 'users', userId, 'devices', deviceId, 'history', today, 'readings');
    await addDoc(historyReadingsRef, {
      ...readings,
      timestamp: Date.now()
    });

    // 2.5 Add to global airMonitoring date-based history subcollection for historical logs
    const dateDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today);
    await setDoc(dateDocRef, { exists: true }, { merge: true });
    
    const globalDeviceHistoryRef = collection(db, 'airMonitoring', canonicalId, 'history', today, 'readings');
    await addDoc(globalDeviceHistoryRef, {
      ...readings,
      timestamp: Date.now(),
      deviceId: canonicalId
    });

    // 3. Update legacy and shared collections for full compatibility
    // Flat document structure as seen in user's screenshot
    const telemetryDoc = {
      deviceId: canonicalId,
      lastUpdate: Date.now(),
      status: 'Online',
      lastSeen: Date.now(),
      alerts: {
        activeAlert: (readings.temperature > 38 || readings.nh3 > 25),
        lastAlertTime: Date.now(),
        lastAlertType: readings.temperature > 38 ? 'High Temp' : (readings.nh3 > 25 ? 'High NH3' : ''),
        lastAlertValue: readings.temperature > 38 ? readings.temperature : readings.nh3
      },
      latestReading: {
        ...readings,
        timestamp: Date.now()
      },
      ...readings, // Flattened for easy console viewing as requested
      timestamp: Date.now()
    };

    const oldDocRef = doc(db, 'airMonitoring', canonicalId);
    await setDoc(oldDocRef, telemetryDoc, { merge: true });

    // Update Device Registry lookup
    const registryRef = doc(db, 'deviceRegistry', deviceId);
    await setDoc(registryRef, {
      status: 'Online',
      lastSeen: Date.now()
    }, { merge: true });

    const legacyReadingsRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    await addDoc(legacyReadingsRef, {
      ...readings,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('updateDeviceTelemetry failed:', error);
  }
};

export const getLocations = async (uid?: string): Promise<any[]> => {
  try {
    const locationsRef = collection(db, 'locations');
    const q = uid && uid !== 'guest' ? query(locationsRef, where('userId', '==', uid)) : query(locationsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'locations');
    return [];
  }
};

export const addLocationToFirestore = async (location: any) => {
  try {
    const docRef = doc(db, 'locations', location.id);
    await setDoc(docRef, { ...location });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'locations');
  }
};

export const deleteLocationFromFirestore = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'locations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'locations');
  }
};

export const getDevices = async (uid?: string): Promise<any[]> => {
  try {
    const devicesMap = new Map<string, any>();

    const addDeviceToMap = (id: string, data: any) => {
      const canonical = getCanonicalDeviceId(id) || getCanonicalDeviceId(data.deviceId);
      const targetId = id;
      
      const existing = devicesMap.get(targetId);
      const name = data.deviceName || data.name || (targetId === 'LAS-001' ? 'AIRSENSE' : 'AIRSENSE NODE');
      
      devicesMap.set(targetId, {
        ...existing,
        ...data,
        id: targetId,
        deviceId: data.deviceId || canonical || targetId,
        name: name,
        deviceName: name // Ensure both are present for UI resilience
      });
    };

    // If user is guest or not logged in, show global airMonitoring devices as demo
    if (!uid || uid === 'guest') {
      try {
        const airMonitoringRef = collection(db, 'airMonitoring');
        const airSnap = await getDocs(query(airMonitoringRef, limit(10)));
        airSnap.docs.forEach(docSnap => {
          addDeviceToMap(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.error('Error fetching global devices:', e);
      }

      // Forcefully fetch LAS-001 if it didn't come up (only for guests/demo)
      if (devicesMap.size === 0 && !devicesMap.has('LAS-001')) {
        addDeviceToMap('LAS-001', { deviceId: 'LAS-001', name: 'AIRSENSE' });
      }
    } else {
      // For logged-in users, query all possible collections where the user is the owner and merge them
      try {
        const userDevicesRef = collection(db, 'users', uid, 'devices');
        const userSnap = await getDocs(query(userDevicesRef));
        userSnap.docs.forEach(docSnap => {
          addDeviceToMap(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.error('Error fetching user devices subcollection:', e);
      }

      try {
        const airMonitoringRef = collection(db, 'airMonitoring');
        const qAir = query(airMonitoringRef, where('ownerId', '==', uid));
        const airSnap = await getDocs(qAir);
        airSnap.docs.forEach(docSnap => {
          addDeviceToMap(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.error('Error fetching airMonitoring devices owned by user:', e);
      }

      try {
        const registryRef = collection(db, 'deviceRegistry');
        const qRegistry = query(registryRef, where('ownerId', '==', uid));
        const regSnap = await getDocs(qRegistry);
        regSnap.docs.forEach(docSnap => {
          addDeviceToMap(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.error('Error fetching deviceRegistry owned by user:', e);
      }
    }
    
    return Array.from(devicesMap.values());
  } catch (error) {
    console.error('getDevices failed:', error);
    return [];
  }
};

export const addDeviceToFirestore = async (device: any) => {
  console.log('addDeviceToFirestore started for device:', device.deviceId || device.id);
  try {
    const userId = device.userId || 'guest';
    const deviceId = device.deviceId || device.id;
    
    if (!deviceId) throw new Error("Device ID is required for registration");

    // 1. Add to Device Registry (Primary Source for Registration)
    const registryRef = doc(db, 'deviceRegistry', deviceId);
    
    // Check if device is already registered by someone else
    const registrySnap = await getDoc(registryRef);
    if (registrySnap.exists()) {
      const existingData = registrySnap.data();
      if (existingData.ownerId && existingData.ownerId !== userId) {
        throw new Error(`Device ID "${deviceId}" is already registered to another account. Please contact support if you believe this is an error.`);
      }
    }

    const registrationData = {
      ownerId: userId,
      deviceId: deviceId,
      deviceName: device.name || 'Livestock AirSense',
      deviceType: device.type || 'Livestock Air Sensor',
      firmwareVersion: '1.0.0',
      status: 'Offline',
      lastRegisteredAt: Date.now(),
      createdAt: Date.now(),
      metadata: {
        type: device.type || 'Livestock Air Sensor',
        location: device.location || 'Default',
        facilityId: 'default'
      },
      alerts: {
        activeAlert: false,
        lastAlertTime: 0,
        lastAlertType: '',
        lastAlertValue: 0
      }
    };
    
    console.log('Writing to deviceRegistry:', deviceId);
    await setDoc(registryRef, registrationData, { merge: true });

    // 2. Add to user's devices subcollection for easy listing
    console.log('Writing to users devices:', userId, deviceId);
    const userDeviceRef = doc(db, 'users', userId, 'devices', deviceId);
    await setDoc(userDeviceRef, registrationData, { merge: true });

    // 3. Initialize airMonitoring entry
    console.log('Writing to airMonitoring:', deviceId);
    const airMonRef = doc(db, 'airMonitoring', deviceId);
    await setDoc(airMonRef, {
      ...registrationData,
      latestReading: {
        temperature: 0,
        humidity: 0,
        co2: 0,
        nh3: 0,
        timestamp: Date.now()
      }
    }, { merge: true });

    console.log('addDeviceToFirestore completed successfully');
    return true;
  } catch (error) {
    console.error('addDeviceToFirestore failed:', error);
    handleFirestoreError(error, OperationType.WRITE, 'deviceRegistry');
    throw error;
  }
};

/**
 * Dynamic Prototype Data Routing
 * This allows any prototype to send data using its deviceId.
 * The system automatically routes it to the registered owner's dashboard.
 */
export const updateDeviceDataById = async (deviceId: string, readings: any) => {
  if (!deviceId) return;
  const canonicalId = getCanonicalDeviceId(deviceId);
  
  try {
    // 1. Find the owner from the registry
    const registryRef = doc(db, 'deviceRegistry', deviceId);
    const registrySnap = await getDoc(registryRef);
    
    // Ensure timestamp is a number (ms since epoch)
    let timestamp = readings.timestamp || Date.now();
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed)) {
        timestamp = parsed;
      } else {
        const num = Number(timestamp);
        if (!isNaN(num)) timestamp = num;
        else timestamp = Date.now();
      }
    }
    
    const processedReadings = {
      ...readings,
      timestamp
    };

    // 2. Update Shared Global Collection (airMonitoring)
    const airMonitoringRef = doc(db, 'airMonitoring', canonicalId);
    await setDoc(airMonitoringRef, {
      latestReading: processedReadings,
      lastUpdate: timestamp,
      status: 'Online',
      lastSeen: timestamp
    }, { merge: true });

    // Add to history
    const readingsRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    await addDoc(readingsRef, processedReadings);

    // Update Device Registry lookup
    await setDoc(registryRef, {
      status: 'Online',
      lastSeen: timestamp
    }, { merge: true });

    // 3. Update the owner's user-specific document if registered
    if (registrySnap.exists()) {
      const ownerId = registrySnap.data().ownerId;
      if (ownerId && ownerId !== 'guest') {
        const userDeviceRef = doc(db, 'users', ownerId, 'devices', deviceId);
        await setDoc(userDeviceRef, {
          latestReading: processedReadings,
          status: 'Online',
          lastSeen: timestamp
        }, { merge: true });
        
        // Status history tracking (deterministic ID to prevent duplicates)
        const today = getLocalDateString(timestamp);
        const dateDocRef = doc(db, 'airMonitoring', canonicalId, 'history', today);
        await setDoc(dateDocRef, { exists: true }, { merge: true });

        const logId = `history_${canonicalId}_DeviceConnection_Online_${timestamp}`;
        const statusHistoryRef = doc(db, 'airMonitoring', canonicalId, 'history', today, 'readings', logId);
        await setDoc(statusHistoryRef, {
          timestamp,
          status: 'Online',
          sensorName: 'Device Connection',
          prevStatus: 'Offline',
          reading: 1
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error routing prototype data for ${deviceId}:`, error);
    return false;
  }
};

export const deleteDeviceFromFirestore = async (userId: string, id: string) => {
  try {
    // 1. Delete user-specific device (Primary)
    if (userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'devices', id));
      } catch (err) {
        console.warn(`[Firestore] Failed to delete primary user device doc:`, err);
      }
    }
    
    // 2. Delete from secondary/legacy collections (swallowing errors to prevent crashing the whole flow if rules are restrictive or documents don't exist)
    const secondaryDocs = [
      doc(db, 'deviceRegistry', id),
      doc(db, 'airMonitoring', id),
      doc(db, 'devices', id),
      doc(db, 'sensors', id)
    ];

    for (const docRef of secondaryDocs) {
      try {
        await deleteDoc(docRef);
      } catch (err) {
        console.debug(`[Firestore] Swallowed expected permission/not-found warning for secondary path ${docRef.path}:`, err);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'devices');
  }
};

export const getStatusHistory = async (
  deviceId: string, 
  startTime?: number, 
  endTime?: number,
  uid?: string
): Promise<any[]> => {
  if (!deviceId) return [];
  const targetUid = (uid && uid !== 'guest') ? uid : (auth.currentUser?.uid || 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2');
  try {
    const mergedMap = new Map<string, any>();
    
    // Fetch from user-specific devices history subcollection
    try {
      const userHistoryRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history');
      const userHistorySnap = await getDocs(userHistoryRef);
      for (const docSnap of userHistorySnap.docs) {
        const dateStr = docSnap.id;
        const readingsRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history', dateStr, 'readings');
        const readingsSnap = await getDocs(readingsRef);
        readingsSnap.docs.forEach(rDoc => {
          const rData = rDoc.data();
          if (rData.sensorName !== undefined && rData.context === undefined) return;
          const ts = adjustTimestamp(parseSafeDate(rData.timestamp || rData.time || rData.lastUpdate || (rData.context && rData.context.timestamp)).getTime());
          const mergedData = rData.context ? {
            ...rData,
            ...rData.context,
            temperature: rData.context.temp,
            humidity: rData.context.humidity,
            nh3: rData.context.ammonia,
            ch4: rData.context.methane,
            pm2_5: rData.context.pm2_5,
            pm25: rData.context.pm2_5,
          } : rData;
          const logItem = {
            id: rDoc.id,
            dateStr,
            ...mergedData,
            reading: mergedData.reading !== undefined ? mergedData.reading : mergedData.value,
            value: mergedData.value !== undefined ? mergedData.value : mergedData.reading,
            timestamp: ts
          };
          const key = rDoc.id || `${ts}`;
          mergedMap.set(key, logItem);
        });
      }
    } catch (err) {
      console.warn('[Firestore] Error fetching user-specific status history:', err);
    }

    // Fallback/Legacy query to global airMonitoring if user-specific is empty
    if (mergedMap.size === 0) {
      try {
        const canonicalId = getCanonicalDeviceId(deviceId);
        const historyRef = collection(db, 'airMonitoring', canonicalId, 'history');
        const historySnap = await getDocs(historyRef);
        for (const docSnap of historySnap.docs) {
          const dateStr = docSnap.id;
          const readingsRef = collection(db, 'airMonitoring', canonicalId, 'history', dateStr, 'readings');
          const readingsSnap = await getDocs(readingsRef);
          readingsSnap.docs.forEach(rDoc => {
            const rData = rDoc.data();
            if (rData.sensorName !== undefined && rData.context === undefined) return;
            const ts = adjustTimestamp(parseSafeDate(rData.timestamp || rData.time || rData.lastUpdate || (rData.context && rData.context.timestamp)).getTime());
            const mergedData = rData.context ? {
              ...rData,
              ...rData.context,
              temperature: rData.context.temp,
              humidity: rData.context.humidity,
              nh3: rData.context.ammonia,
              ch4: rData.context.methane,
              pm2_5: rData.context.pm2_5,
              pm25: rData.context.pm2_5,
            } : rData;
            const logItem = {
              id: rDoc.id,
              dateStr,
              ...mergedData,
              reading: mergedData.reading !== undefined ? mergedData.reading : mergedData.value,
              value: mergedData.value !== undefined ? mergedData.value : mergedData.reading,
              timestamp: ts
            };
            const key = rDoc.id || `${ts}`;
            mergedMap.set(key, logItem);
          });
        }
      } catch (err) {
        console.warn('[Firestore] Error fetching global status history fallback:', err);
      }
    }

    const combinedList = Array.from(mergedMap.values());

    let filteredLogs = combinedList;
    if (startTime !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
    }
    if (endTime !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
    }

    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    return filteredLogs;
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'history');
    return [];
  }
};

export const subscribeToStatusHistory = (
  deviceId: string,
  startTime: number | undefined,
  endTime: number | undefined,
  callback: (logs: any[]) => void,
  uid?: string
) => {
  if (!deviceId) {
    callback([]);
    return () => {};
  }
  const canonicalId = getCanonicalDeviceId(deviceId);
  const targetUid = (uid && uid !== 'guest') ? uid : (auth.currentUser?.uid || 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2');
  
  let isUnsubscribed = false;
  const activeUnsubs = new Map<string, () => void>();
  const readingsBySourceAndDate = new Map<string, any[]>();
  
  const triggerCallback = () => {
    if (isUnsubscribed) return;
    
    const mergedMap = new Map<string, any>();
    readingsBySourceAndDate.forEach((list) => {
      list.forEach(r => {
        const key = r.id || `${r.timestamp}`;
        const existing = mergedMap.get(key);
        if (!existing || (r.timestamp && existing.timestamp && r.timestamp > existing.timestamp)) {
          mergedMap.set(key, r);
        }
      });
    });
    
    const allReadings = Array.from(mergedMap.values());
    
    // Filter by startTime and endTime client-side
    let filtered = allReadings;
    if (startTime !== undefined && startTime > 0) {
      filtered = filtered.filter(r => r.timestamp >= startTime);
    }
    if (endTime !== undefined) {
      filtered = filtered.filter(r => r.timestamp <= endTime);
    }
    
    // Sort descending by timestamp
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    callback(filtered);
  };

  let userDates: string[] = [];
  let airDates: string[] = [];

  const updateListeners = () => {
    if (isUnsubscribed) return;

    const requiredKeys = new Set<string>();

    // 1. Add derived dates from the query range
    const derivedDates = getDateStringsInRange(startTime, endTime);
    derivedDates.forEach(dateStr => {
      requiredKeys.add(`user_${dateStr}`);
    });

    // 2. Also prepare user-specific history paths found dynamically in Firestore listing
    userDates.forEach(dateStr => {
      requiredKeys.add(`user_${dateStr}`);
    });

    // 3. Prepare Air Monitoring history paths as fallback if we have zero user dates
    if (userDates.length === 0 && derivedDates.length === 0) {
      airDates.forEach(dateStr => {
        requiredKeys.add(`air_${dateStr}`);
      });
    }

    // Unsubscribe from any listeners no longer needed
    activeUnsubs.forEach((unsub, key) => {
      if (!requiredKeys.has(key)) {
        unsub();
        activeUnsubs.delete(key);
        readingsBySourceAndDate.delete(key);
      }
    });

    // Set up new required listeners
    requiredKeys.forEach(key => {
      if (activeUnsubs.has(key)) return;

      const isUser = key.startsWith('user_');
      const dateStr = key.replace(/^(user_|air_)/, '');

      const readingsColRef = isUser 
        ? collection(db, 'users', targetUid, 'devices', deviceId, 'history', dateStr, 'readings')
        : collection(db, 'airMonitoring', canonicalId, 'history', dateStr, 'readings');

      const unsubReadings = onSnapshot(readingsColRef, (readingsSnap) => {
        const list = readingsSnap.docs
          .map(rDoc => {
            const rData = rDoc.data();
            return { id: rDoc.id, data: rData };
          })
          .filter(item => item.data.sensorName === undefined || item.data.context !== undefined) // Skip heartbeat and status change logs unless they have context telemetry
          .map(item => {
            const rData = item.data;
            const ts = adjustTimestamp(parseSafeDate(rData.timestamp || rData.time || rData.lastUpdate || (rData.context && rData.context.timestamp)).getTime());
            const mergedData = rData.context ? {
              ...rData,
              ...rData.context,
              temperature: rData.context.temp,
              humidity: rData.context.humidity,
              nh3: rData.context.ammonia,
              ch4: rData.context.methane,
              pm2_5: rData.context.pm2_5,
              pm25: rData.context.pm2_5,
            } : rData;
            return {
              id: item.id,
              dateStr,
              ...mergedData,
              timestamp: ts,
              reading: mergedData.reading !== undefined ? mergedData.reading : mergedData.value,
              value: mergedData.value !== undefined ? mergedData.value : mergedData.reading
            };
          });

        readingsBySourceAndDate.set(key, list);
        triggerCallback();
      }, (err) => {
        console.warn(`[Firestore] Failed to listen to readings for path key ${key}:`, err);
      });

      activeUnsubs.set(key, unsubReadings);
    });

    if (requiredKeys.size === 0) {
      callback([]);
    }
  };

  // 1. Subscribe to User device history dates
  const userHistoryRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history');
  const unsubUserHistory = onSnapshot(userHistoryRef, (userSnap) => {
    userDates = userSnap.docs.map(d => d.id);
    updateListeners();
  }, (err) => {
    console.warn('[Firestore] user devices history list listen error:', err);
    // If permission or collection error on user history, update empty list
    userDates = [];
    updateListeners();
  });

  // 2. Subscribe to Air Monitoring parent history dates (fallback)
  const airHistoryRef = collection(db, 'airMonitoring', canonicalId, 'history');
  const unsubAirHistory = onSnapshot(airHistoryRef, (airSnap) => {
    airDates = airSnap.docs.map(d => d.id);
    updateListeners();
  }, (err) => {
    console.warn('[Firestore] airMonitoring history list listen error:', err);
  });

  return () => {
    isUnsubscribed = true;
    unsubAirHistory();
    unsubUserHistory();
    activeUnsubs.forEach(unsub => unsub());
    activeUnsubs.clear();
  };
};

export const deleteStatusHistoryLog = async (deviceId: string, logId: string, dateStr?: string, uid?: string) => {
  if (!deviceId || !logId) return;
  const canonicalId = getCanonicalDeviceId(deviceId);
  const targetUid = (uid && uid !== 'guest') ? uid : (auth.currentUser?.uid || 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2');
  const finalDateStr = dateStr || getLocalDateString(Date.now());
  try {
    const userLogRef = doc(db, 'users', targetUid, 'devices', deviceId, 'history', finalDateStr, 'readings', logId);
    await deleteDoc(userLogRef);
  } catch (error) {
    console.warn('[Firestore] Swallowed user device history deletion error:', error);
  }
  try {
    const logRef = doc(db, 'airMonitoring', canonicalId, 'history', finalDateStr, 'readings', logId);
    await deleteDoc(logRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `airMonitoring/${canonicalId}/history/${dateStr || 'unknown'}/readings/${logId}`);
  }
};

export const getAnalyticsData = async (
  deviceId: string, 
  startTime: number, 
  endTime: number
): Promise<any[]> => {
  if (!deviceId) return [];
  const canonicalId = getCanonicalDeviceId(deviceId);
  const idsToTry = [canonicalId, deviceId];

  console.log(`[Analytics] Fetching range: ${formatPHDate(startTime)} - ${formatPHDate(endTime)}`);
  
  for (const idToTry of idsToTry) {
    try {
      const readingsRef = collection(db, 'airMonitoring', idToTry, 'readings');
      
      // 1. Try a broad query to get recent data if the specific range fails
      let docs: any[] = [];
      
      // Attempt range query first (efficient)
      const qRange = query(
        readingsRef, 
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        limit(500)
      );
      
      const snapshot = await getDocs(qRange);
      if (!snapshot.empty) {
        docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
      } else {
        // 2. Fallback: Fetch latest 200 and filter in-memory (resilient to missing indexes/wrong types)
        console.log(`[Analytics] Range query empty for ${idToTry}, trying in-memory fallback...`);
        const qLatest = query(readingsRef, orderBy('timestamp', 'desc'), limit(200));
        const latestSnap = await getDocs(qLatest);
        
        if (!latestSnap.empty) {
          docs = latestSnap.docs
            .map(d => ({ id: d.id, ...d.data() as any }))
            .filter((data: any) => {
              const parsed = parseSafeDate(data.timestamp || data.time).getTime();
              const t = adjustTimestamp(parsed);
              // If the user requested the latest, we skip filtering
              if (startTime === 0) return true;
              return t >= startTime && t <= endTime;
            });
        }
      }

      if (docs.length > 0) {
        // Resolve metadata for mapping
        const metaRef = doc(db, 'airMonitoring', idToTry);
        const metaSnap = await getDoc(metaRef);
        const metadata = metaSnap.exists() ? metaSnap.data() : {};

        return docs.map(data => mapReadings(data, idToTry, metadata))
                   .sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (error) {
      console.warn(`[Analytics] Error for ${idToTry}:`, error);
    }
  }
  
  // Final fallback: try user-specific history if shared is empty
  const user = auth.currentUser;
  if (user) {
    try {
      const targetDate = new Date(startTime).toISOString().split('T')[0];
      const userRef = collection(db, 'users', user.uid, 'devices', deviceId, 'history', targetDate, 'readings');
      const userSnap = await getDocs(query(userRef, limit(100)));
      if (!userSnap.empty) {
        return userSnap.docs.map(d => mapReadings(d.data(), deviceId))
                            .sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (e) {}
  }
  
  return [];
};

export const getHistoricalDailyAverages = async (deviceId: string, days: number = 7): Promise<any[]> => {
  if (!deviceId) return [];
  const canonicalId = getCanonicalDeviceId(deviceId);
  try {
    // We will aggregate from the legacy readings which contains all history
    const readingsRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    
    // We get readings for the last 'days' days.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = cutoffDate.getTime();

    // Query without a where clause on timestamp to avoid type mismatches (number vs Firestore Timestamp)
    const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(1000));
    const snapshot = await getDocs(q);

    const dailyData = new Map<string, {
      aqiSum: number, aqiCount: number,
      co2Sum: number, co2Count: number,
      tempSum: number, tempCount: number,
      humSum: number, humCount: number,
      nh3Sum: number, nh3Count: number,
      ch4Sum: number, ch4Count: number
    }>();

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.timestamp) return;
      
      let tsMs = data.timestamp;
      if (typeof data.timestamp === 'object' && typeof data.timestamp.toMillis === 'function') {
        tsMs = data.timestamp.toMillis();
      } else if (typeof data.timestamp === 'object' && data.timestamp.seconds) {
        tsMs = data.timestamp.seconds * 1000;
      }
      
      const dateObj = new Date(tsMs);
      if (isNaN(dateObj.getTime())) return;
      if (dateObj.getTime() < cutoffTime) return;
      
      const date = dateObj.toISOString().split('T')[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          aqiSum: 0, aqiCount: 0,
          co2Sum: 0, co2Count: 0,
          tempSum: 0, tempCount: 0,
          humSum: 0, humCount: 0,
          nh3Sum: 0, nh3Count: 0,
          ch4Sum: 0, ch4Count: 0
        });
      }

      const day = dailyData.get(date)!;
      const aqi = ensureNumber(getValue(data, ['aqi', 'air_quality_index']));
      if (aqi !== undefined) { day.aqiSum += aqi; day.aqiCount++; }
      
      const co2 = ensureNumber(getValue(data, ['co2', 'carbon_dioxide', 'c']));
      if (co2 !== undefined) { day.co2Sum += co2; day.co2Count++; }
      
      const temp = ensureNumber(getValue(data, ['temperature', 'temp', 'temp_c', 't']));
      if (temp !== undefined) { day.tempSum += temp; day.tempCount++; }
      
      const hum = ensureNumber(getValue(data, ['humidity', 'hum', 'rel_hum', 'h']));
      if (hum !== undefined) { day.humSum += hum; day.humCount++; }

      const nh3 = ensureNumber(getValue(data, ['nh3', 'ammonia', 'NH3', 'n']));
      if (nh3 !== undefined) { day.nh3Sum += nh3; day.nh3Count++; }

      const ch4 = ensureNumber(getValue(data, ['ch4', 'methane', 'CH4', 'm']));
      if (ch4 !== undefined) { day.ch4Sum += ch4; day.ch4Count++; }
    });

    const result = Array.from(dailyData.entries()).map(([dateStr, metrics]) => {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return {
        dateStr,
        time: formatPHDate(d, { month: 'short', day: 'numeric' }),
        aqi: metrics.aqiCount > 0 ? Math.round(metrics.aqiSum / metrics.aqiCount) : 0,
        co2: metrics.co2Count > 0 ? Math.round(metrics.co2Sum / metrics.co2Count) : 0,
        temp: metrics.tempCount > 0 ? Math.round((metrics.tempSum / metrics.tempCount) * 10) / 10 : 0,
        humidity: metrics.humCount > 0 ? Math.round((metrics.humSum / metrics.humCount) * 10) / 10 : 0,
        ammonia: metrics.nh3Count > 0 ? Math.round((metrics.nh3Sum / metrics.nh3Count) * 100) / 100 : 0,
        methane: metrics.ch4Count > 0 ? Math.round((metrics.ch4Sum / metrics.ch4Count) * 100) / 100 : 0,
      };
    }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    return result;
  } catch (error) {
    console.error('Failed to get historical daily averages:', error);
    return [];
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  READ = 'read',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveUserSettingsToFirestore = async (uid: string, settings: any) => {
  if (!uid || uid === 'guest') return;
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, settings, { merge: true });
  } catch (error) {
    console.error('Failed to save user settings:', error);
  }
};

export const recordUserInFirestore = async (user: any) => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLogin: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to record user sign-in event:', error);
  }
};

export const addAlertToFirestore = async (
  userId: string,
  alert: {
    alertType: string;
    message: string;
    severity: 'critical' | 'warning' | 'normal';
    location: string;
    deviceId?: string;
    reading?: number;
    timestamp?: number;
  }
) => {
  try {
    const devId = alert.deviceId || 'node';
    let alertTimestamp = Date.now();
    if (alert.timestamp) {
      alertTimestamp = alert.timestamp > 30000000000 ? alert.timestamp : alert.timestamp * 1000;
    }
    
    const today = getLocalDateString(alertTimestamp);
    // New nested path: /users/{uid}/devices/{deviceId}/alerts/{date}/alertReadings
    const alertsRef = collection(db, 'users', userId, 'devices', devId, 'alerts', today, 'alertReadings');
    
    const cleanAlertType = alert.alertType.replace(/\s+/g, '');
    const alertId = `alert_${userId}_${devId}_${cleanAlertType}_${alert.severity}_${Math.floor(alertTimestamp / 1000)}`;
    const alertDocRef = doc(alertsRef, alertId);
    
    await setDoc(alertDocRef, {
      id: alertId,
      userId,
      deviceId: devId,
      timestamp: alertTimestamp,
      alertType: alert.alertType,
      message: alert.message,
      severity: alert.severity,
      location: alert.location,
      resolved: false,
      isRead: false,
      reading: alert.reading ?? null
    });
  } catch (error) {
    console.error('addAlertToFirestore failed:', error);
  }
};

export const updateAlertResolved = async (alertId: string, resolved: boolean) => {
  try {
    // Find the alert across all possible paths
    const alertsGroup = collectionGroup(db, 'alertReadings');
    const q = query(alertsGroup, where('id', '==', alertId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const alertRef = snapshot.docs[0].ref;
      await updateDoc(alertRef, { resolved });
    }
  } catch (error) {
    console.error('updateAlertResolved failed:', error);
  }
};

export const deleteAlertFromFirestore = async (alertId: string) => {
  try {
    const alertsGroup = collectionGroup(db, 'alertReadings');
    const q = query(alertsGroup, where('id', '==', alertId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }
  } catch (error) {
    console.error('deleteAlertFromFirestore failed:', error);
  }
};

export const savePushSubscription = async (uid: string, subscriptionJSON: any) => {
  if (!uid || uid === 'guest' || !subscriptionJSON) return;
  try {
    const endpointHash = encodeURIComponent(subscriptionJSON.endpoint);
    const subRef = doc(db, 'users', uid, 'push_subscriptions', endpointHash);
    await setDoc(subRef, {
      ...subscriptionJSON,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Failed to save push subscription to Firestore:', error);
  }
};

export const deletePushSubscription = async (uid: string, endpoint: string) => {
  if (!uid || uid === 'guest' || !endpoint) return;
  try {
    const endpointHash = encodeURIComponent(endpoint);
    const subRef = doc(db, 'users', uid, 'push_subscriptions', endpointHash);
    await deleteDoc(subRef);
  } catch (error) {
    console.error('Failed to delete push subscription from Firestore:', error);
  }
};

export const getLocalDateString = (timestamp: any): string => {
  if (!timestamp) return '';
  const d = parseSafeDate(timestamp);
  if (isNaN(d.getTime())) return '';
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn('[Firestore] Intl date format error, fallback to offset math:', e);
  }
  
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(d.getTime() - offsetMs);
  return localDate.toISOString().split('T')[0];
};

export const getDateStringsInRange = (startTime: number | undefined, endTime: number | undefined): string[] => {
  if (!startTime || !endTime) {
    return [getLocalDateString(Date.now())];
  }
  
  const dates: string[] = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Safely limit to 45 days max
  const limit = new Date(start);
  limit.setDate(limit.getDate() + 45);
  const actualEnd = end > limit ? limit : end;
  
  const current = new Date(start);
  current.setHours(12, 0, 0, 0); // noon to avoid dst/offset shifts
  
  while (current <= actualEnd) {
    const dStr = getLocalDateString(current.getTime());
    if (dStr && !dates.includes(dStr)) {
      dates.push(dStr);
    }
    current.setDate(current.getDate() + 1);
  }
  
  const startStr = getLocalDateString(startTime);
  if (startStr && !dates.includes(startStr)) {
    dates.push(startStr);
  }
  const endStr = getLocalDateString(endTime);
  if (endStr && !dates.includes(endStr)) {
    dates.push(endStr);
  }
  
  return dates;
};

export const deleteStatusHistoryByDate = async (deviceId: string, dateStr: string, uid?: string) => {
  if (!deviceId || !dateStr) return 0;
  const canonicalId = getCanonicalDeviceId(deviceId);
  const targetUid = (uid && uid !== 'guest') ? uid : (auth.currentUser?.uid || 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2');
  let count = 0;
  try {
    const userReadingsRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history', dateStr, 'readings');
    const userReadingsSnap = await getDocs(userReadingsRef);
    if (!userReadingsSnap.empty) {
      const userBatch = writeBatch(db);
      userReadingsSnap.docs.forEach(docSnap => {
        userBatch.delete(docSnap.ref);
        count++;
      });
      await userBatch.commit();
    }
  } catch (err) {
    console.error('[Firestore] Error deleting user-specific status history by date:', err);
  }
  try {
    const readingsRef = collection(db, 'airMonitoring', canonicalId, 'history', dateStr, 'readings');
    const snapshot = await getDocs(readingsRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
      count++;
    });
    if (snapshot.size > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('[Firestore] deleteStatusHistoryByDate failed:', error);
  }
  return count;
};

export const deleteAllStatusHistory = async (deviceId: string, uid?: string) => {
  if (!deviceId) return 0;
  const canonicalId = getCanonicalDeviceId(deviceId);
  const targetUid = (uid && uid !== 'guest') ? uid : (auth.currentUser?.uid || 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2');
  let totalDeleted = 0;
  try {
    const userHistoryRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history');
    const userHistorySnap = await getDocs(userHistoryRef);
    for (const dateDoc of userHistorySnap.docs) {
      const dateStr = dateDoc.id;
      const readingsRef = collection(db, 'users', targetUid, 'devices', deviceId, 'history', dateStr, 'readings');
      const readingsSnap = await getDocs(readingsRef);
      const batch = writeBatch(db);
      readingsSnap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
        totalDeleted++;
      });
      batch.delete(dateDoc.ref);
      await batch.commit();
    }
  } catch (err) {
    console.error('[Firestore] Error deleting all user status history:', err);
  }
  try {
    const historyRef = collection(db, 'airMonitoring', canonicalId, 'history');
    const historySnap = await getDocs(historyRef);
    for (const dateDoc of historySnap.docs) {
      const dateStr = dateDoc.id;
      const readingsRef = collection(db, 'airMonitoring', canonicalId, 'history', dateStr, 'readings');
      const readingsSnap = await getDocs(readingsRef);
      const batch = writeBatch(db);
      readingsSnap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
        totalDeleted++;
      });
      batch.delete(dateDoc.ref);
      if (readingsSnap.size > 0 || historySnap.size > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.error('[Firestore] deleteAllStatusHistory failed:', error);
  }
  return totalDeleted;
};

export const clearResolvedAlerts = async (userId: string) => {
  if (!userId) return 0;
  try {
    const alertsRef = collectionGroup(db, 'alertReadings');
    const q = query(alertsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    let count = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const isResolved = data.resolved === true || data.status === 'resolved' || data.resolved === 'true';
      if (isResolved) {
        batch.delete(docSnap.ref);
        count++;
        batchCount++;
        
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return count;
  } catch (error) {
    console.error('[Firestore] clearResolvedAlerts failed:', error);
    throw error;
  }
};

export const deleteAllAlerts = async (userId: string) => {
  if (!userId) return 0;
  try {
    const alertsRef = collectionGroup(db, 'alertReadings');
    const q = query(alertsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    if (snapshot.size > 0) {
      await batch.commit();
    }
    return snapshot.size;
  } catch (error) {
    console.error('[Firestore] deleteAllAlerts failed:', error);
    throw error;
  }
};

export const deleteAlertsByDate = async (userId: string, dateStr: string) => {
  if (!userId || !dateStr) return 0;
  try {
    // With nested structure /alerts/{date}/alertReadings, we could technically target the specific date path
    // but collectionGroup is safer if we don't know the deviceId.
    const alertsRef = collectionGroup(db, 'alertReadings');
    const q = query(alertsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const rawTime = data.createdAt || data.timestamp;
      const logDate = getLocalDateString(rawTime);
      if (logDate === dateStr) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    console.error('[Firestore] deleteAlertsByDate failed:', error);
    throw error;
  }
};

export const deleteSensorReadingsByDate = async (userId: string, deviceId: string, dateStr: string) => {
  if (!deviceId || !dateStr) return 0;
  const canonicalId = getCanonicalDeviceId(deviceId);
  let count = 0;
  try {
    // 1. Delete from shared airMonitoring readings
    const sharedRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    const sharedSnap = await getDocs(sharedRef);
    let batch = writeBatch(db);
    let batchCount = 0;
    for (const docSnap of sharedSnap.docs) {
      const data = docSnap.data();
      const rawTime = data.timestamp || data.time || data.createdAt;
      const logDate = getLocalDateString(rawTime);
      if (logDate === dateStr) {
        batch.delete(docSnap.ref);
        count++;
        batchCount++;
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }

    // 2. Delete from user specific history readings for that date
    if (userId && userId !== 'guest') {
      const userReadingsRef = collection(db, 'users', userId, 'devices', deviceId, 'history', dateStr, 'readings');
      const userReadingsSnap = await getDocs(userReadingsRef);
      if (!userReadingsSnap.empty) {
        let userBatch = writeBatch(db);
        let userBatchCount = 0;
        for (const docSnap of userReadingsSnap.docs) {
          userBatch.delete(docSnap.ref);
          count++;
          userBatchCount++;
          if (userBatchCount === 500) {
            await userBatch.commit();
            userBatch = writeBatch(db);
            userBatchCount = 0;
          }
        }
        if (userBatchCount > 0) {
          await userBatch.commit();
        }
      }
    }
    return count;
  } catch (error) {
    console.error('[Firestore] deleteSensorReadingsByDate failed:', error);
    throw error;
  }
};

export const subscribeToAlertDiagnostics = (
  uid: string, 
  deviceId: string, 
  dateStr: string, // Kept for backwards compatibility but not used for path
  callback: (readings: any[]) => void
) => {
  if (!uid || uid === 'guest' || !deviceId) {
    callback([]);
    return () => {};
  }
  
  // Use collectionGroup to find all 'alertReadings' regardless of the date folder (e.g. UTC vs local time differences)
  const readingsRef = collectionGroup(db, 'alertReadings');
  
  // We can't filter by deviceId directly without a composite index on deviceId + timestamp,
  // so we'll just get the most recent ones and filter in memory if needed.
  // We CAN filter by userId if the documents have it, but diagnostic documents might not have userId.
  // Instead, we order by timestamp desc and filter by deviceId in memory.
  const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(200));
  
  return onSnapshot(q, (snapshot) => {
    const readings = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((d: any) => !d.alertType && (d.deviceId === deviceId || d.deviceId === getCanonicalDeviceId(deviceId)));
    callback(readings);
  }, (err) => {
    console.error('[Firestore] subscribeToAlertDiagnostics failed:', err);
    callback([]);
  });
};


