import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, doc, setDoc, deleteDoc, where, updateDoc, getDoc } from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

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
export const db = (dbId && dbId !== '(default)' && dbId.trim() !== '')
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

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

export const subscribeToSensorData = (uid: string, deviceId: string, callback: (data: any) => void) => {
  if (!uid || !deviceId) return () => {};
  let innerUnsubscribe: (() => void) | null = null;
  let lastMetadata: any = {};
  const canonicalId = getCanonicalDeviceId(deviceId);

  const mapReadings = (rData: any, id: string) => {
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

    return {
      id: deviceId, // Keep original ID for UI
      deviceId: id,
      deviceName: lastMetadata.deviceName || lastMetadata.name || 'AIRSENSE',
      ...lastMetadata,
      ...rData,
      temperature: temp ?? 0,
      temperatureLevel: (temp ?? 0) > 35 ? 'Warning' : 'Normal',
      humidity: hum ?? 0,
      humidityLevel: (hum ?? 0) > 80 ? 'High' : 'Normal',
      co2: co2 ?? 0,
      co2Level: (co2 ?? 0) > 1000 ? 'Warning' : 'Good',
      aqi: aqi ?? 0,
      aqiLevel: (aqi || 0) > 150 ? 'POOR' : 'GOOD',
      nh3: nh3 ?? 0,
      nh3Level: (nh3 ?? 0) > 25 ? 'High' : 'Low',
      ch4: ch4 ?? 0,
      ch4Level: (ch4 ?? 0) > 100 ? 'High' : 'Low',
      timestamp: rData.timestamp || rData.time || rData.date || rData.createdAt || Date.now(),
      ammonia: nh3 ?? 0,
      methane: ch4 ?? 0,
      pm1_0,
      pm2_5,
      pm10
    };
  };

  const setupReadingsListener = (id: string) => {
    if (!id || innerUnsubscribe) return;
    
    // Listen to the shared readings collection as the primary source for live data
    const readingsRef = collection(db, 'airMonitoring', id, 'readings');
    const readingsQ = query(readingsRef, orderBy('timestamp', 'desc'), limit(1));
    
    innerUnsubscribe = onSnapshot(readingsQ, (readingsSnap) => {
      if (!readingsSnap.empty) {
        callback(mapReadings(readingsSnap.docs[0].data(), id));
      } else {
        // Try without orderBy as a fallback in case timestamp field is missing
        const fallbackQ = query(readingsRef, limit(1));
        getDocs(fallbackQ).then(snap => {
          if (!snap.empty) {
             callback(mapReadings(snap.docs[0].data(), id));
          } else if (lastMetadata.latestReading) {
            callback(mapReadings(lastMetadata.latestReading, id));
          }
        }).catch(() => {
          if (lastMetadata.latestReading) {
            callback(mapReadings(lastMetadata.latestReading, id));
          }
        });
      }
    }, (err) => {
      console.warn(`[Firestore] Inner readings listener error for ${id}:`, err);
      // Fallback to simpler query if the first one failed (likely index issue)
      const fallbackQ = query(readingsRef, limit(1));
      getDocs(fallbackQ).then(snap => {
        if (!snap.empty) callback(mapReadings(snap.docs[0].data(), id));
      }).catch(console.error);
    });
  };

  const outerUnsubscribe = onSnapshot(
    doc(db, 'users', uid, 'devices', deviceId),
    (snapshot) => {
      if (snapshot.exists()) {
        lastMetadata = snapshot.data();
        const data = lastMetadata;
        const latestReading = data.latestReading || {};
        
        // Initial callback from metadata
        callback(mapReadings(latestReading, data.deviceId || deviceId));

        // Setup the inner listener for subcollection using canonical ID
        setupReadingsListener(data.deviceId || canonicalId);
      } else {
        // Try the canonical path if user doc doesn't exist
        setupReadingsListener(canonicalId);
      }
    },
    (error) => {
      console.warn(`[Firestore] User device doc listener error for ${deviceId}:`, error);
      setupReadingsListener(canonicalId);
    }
  );

  return () => {
    outerUnsubscribe();
    if (innerUnsubscribe) {
      innerUnsubscribe();
    }
  };
};

export const subscribeToAlerts = (uid: string, callback: (alerts: any[]) => void) => {
  if (!uid || uid === 'guest') {
    callback([]);
    return () => {};
  }
  const alertsRef = collection(db, 'alerts');
  const q = query(alertsRef, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(alerts);
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
        // Primary source: shared readings as requested by the user
        const legacyRef = collection(db, 'airMonitoring', canonicalId, 'readings');
        const legacyQ = query(legacyRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const legacySnap = await getDocs(legacyQ);
        let docs = legacySnap.docs.map(docSnap => {
          const data = docSnap.data();
          return { 
            id: docSnap.id, 
            deviceId: canonicalId,
            ...data,
            pm1_0: data.pm1_0 ?? data.pm10 ?? data['pm1.0'] ?? data['pm1_0'] ?? data.pm1 ?? 0,
            pm2_5: data.pm2_5 ?? data.pm25 ?? data['pm2.5'] ?? data['pm2_5'] ?? 0,
            pm10: data.pm10 ?? data.pm2_5 ?? data['pm10'] ?? data['pm10_0'] ?? data.pm10_0 ?? 0,
            ammonia: data.nh3 ?? data.ammonia,
            methane: data.ch4 ?? data.methane
          };
        });

        // Fallback to user-specific history if shared is empty
        if (docs.length === 0 && uid && uid !== 'guest') {
            const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
            const readingsRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
            const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);
            
            docs = querySnapshot.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                ...data,
                pm1_0: data.pm1_0 ?? data.pm10 ?? data['pm1.0'] ?? data['pm1_0'] ?? data.pm1 ?? 0,
                pm2_5: data.pm2_5 ?? data.pm25 ?? data['pm2.5'] ?? data['pm2_5'] ?? 0,
                pm10: data.pm10 ?? data.pm2_5 ?? data['pm10'] ?? data['pm10_0'] ?? data.pm10_0 ?? 0,
                ammonia: data.nh3 ?? data.ammonia,
                methane: data.ch4 ?? data.methane,
                deviceId: deviceId
              };
            });
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
  
  // Primary source: shared readings as requested
  const sharedRef = collection(db, 'airMonitoring', canonicalId, 'readings');
  const sharedQ = query(sharedRef, orderBy('timestamp', 'desc'), limit(limitCount));

  let innerUnsubscribe: (() => void) | null = null;
  const outerUnsubscribe = onSnapshot(
    sharedQ,
    (snapshot) => {
      if (snapshot.docs.length > 0) {
        if (innerUnsubscribe) {
          innerUnsubscribe();
          innerUnsubscribe = null;
        }
        let docs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const temp = ensureNumber(getValue(data, ['temperature', 'temp', 'temp_c', 't']));
          const hum = ensureNumber(getValue(data, ['humidity', 'hum', 'rel_hum', 'h']));
          const aqi = ensureNumber(getValue(data, ['aqi', 'air_quality_index']));
          const nh3 = ensureNumber(getValue(data, ['nh3', 'ammonia', 'NH3', 'n']));
          const ch4 = ensureNumber(getValue(data, ['ch4', 'methane', 'CH4', 'm']));
          const pm1_0 = ensureNumber(getValue(data, ['pm1_0', 'pm10', 'pm1.0', 'pm1', 'PM1_0'])) ?? 0;
          const pm2_5 = ensureNumber(getValue(data, ['pm2_5', 'pm25', 'pm2.5', 'PM2_5'])) ?? 0;
          const pm10 = ensureNumber(getValue(data, ['pm10', 'pm10_0', 'PM10'])) ?? pm2_5;

          return {
            id: docSnap.id,
            deviceId: canonicalId,
            ...data,
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
        });
        callback(docs);
      } else {
        // Fallback to user-specific history
        if (!innerUnsubscribe && uid && uid !== 'guest') {
          const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
          const userRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
          const userQ = query(userRef, orderBy('timestamp', 'desc'), limit(limitCount));
          innerUnsubscribe = onSnapshot(userQ, (userSnap) => {
            let docs = userSnap.docs.map(docSnap => {
              const data = docSnap.data();
              const temp = ensureNumber(getValue(data, ['temperature', 'temp', 'temp_c', 't']));
              const hum = ensureNumber(getValue(data, ['humidity', 'hum', 'rel_hum', 'h']));
              const aqi = ensureNumber(getValue(data, ['aqi', 'air_quality_index']));
              const nh3 = ensureNumber(getValue(data, ['nh3', 'ammonia', 'NH3', 'n']));
              const ch4 = ensureNumber(getValue(data, ['ch4', 'methane', 'CH4', 'm']));
              const pm1_0 = ensureNumber(getValue(data, ['pm1_0', 'pm10', 'pm1.0', 'pm1', 'PM1_0'])) ?? 0;
              const pm2_5 = ensureNumber(getValue(data, ['pm2_5', 'pm25', 'pm2.5', 'PM2_5'])) ?? 0;
              const pm10 = ensureNumber(getValue(data, ['pm10', 'pm10_0', 'PM10'])) ?? pm2_5;

              return { 
                id: docSnap.id, 
                deviceId: deviceId,
                ...data,
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
            });
            callback(docs);
          });
        }
      }
    },
    (error) => {
      console.warn(`[Firestore] Sensor readings subscription stream error for ${deviceId}:`, error);
    }
  );

  return () => {
    outerUnsubscribe();
    if (innerUnsubscribe) {
      innerUnsubscribe();
    }
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
  }
) => {
  if (!deviceId) return;
  const canonicalId = getCanonicalDeviceId(deviceId);
  try {
    const historyRef = collection(db, 'airMonitoring', canonicalId, 'status_history');
    await addDoc(historyRef, {
      timestamp: Date.now(),
      sensorName,
      status,
      reading,
      ...allReadings
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'status_history');
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
    const today = new Date().toISOString().split('T')[0];
    const userDeviceRef = doc(db, 'users', userId, 'devices', deviceId);
    
    // 1. Update the latestReading on the device document
    await updateDoc(userDeviceRef, {
      latestReading: {
        ...readings,
        timestamp: Date.now()
      }
    });

    // 2. Add to history readings subcollection for charts
    const readingsRef = collection(db, 'users', userId, 'devices', deviceId, 'history', today, 'readings');
    await addDoc(readingsRef, {
      ...readings,
      timestamp: Date.now()
    });

    // 3. Update legacy and shared collections for full compatibility
    // Flat document structure as seen in user's screenshot
    const telemetryDoc = {
      deviceId: canonicalId,
      lastUpdate: Date.now(),
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
      devicesMap.set(targetId, {
        ...existing,
        ...data,
        id: targetId,
        deviceId: data.deviceId || canonical || targetId,
        name: data.deviceName || data.name || (targetId === 'LAS-001' ? 'AIRSENSE' : 'AIRSENSE NODE')
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
      // For logged-in users, ONLY fetch their own devices
      // This ensures a dynamic experience where users only see what they register
      try {
        const userDevicesRef = collection(db, 'users', uid, 'devices');
        const userSnap = await getDocs(query(userDevicesRef));
        userSnap.docs.forEach(docSnap => {
          addDeviceToMap(docSnap.id, docSnap.data());
        });
      } catch (e) {
        console.error('Error fetching user devices:', e);
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
    const registrationData = {
      ownerId: userId,
      deviceId: deviceId,
      deviceName: device.name || 'Livestock AirSense',
      deviceType: device.type || 'Livestock Air Sensor',
      firmwareVersion: '1.0.0',
      status: 'Online',
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
    
    const timestamp = readings.timestamp || Date.now();
    const processedReadings = {
      ...readings,
      timestamp
    };

    // 2. Update Shared Global Collection (airMonitoring)
    const airMonitoringRef = doc(db, 'airMonitoring', canonicalId);
    await setDoc(airMonitoringRef, {
      latestReading: processedReadings,
      lastUpdate: timestamp
    }, { merge: true });

    // Add to history
    const readingsRef = collection(db, 'airMonitoring', canonicalId, 'readings');
    await addDoc(readingsRef, processedReadings);

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
        
        // Status history tracking
        const statusHistoryRef = collection(db, 'airMonitoring', canonicalId, 'status_history');
        await addDoc(statusHistoryRef, {
          timestamp,
          status: 'Online',
          sensorName: registrySnap.data().deviceName || 'AIRSENSE'
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

export const getStatusHistory = async (deviceId: string): Promise<any[]> => {
  if (!deviceId) return [];
  const canonicalId = getCanonicalDeviceId(deviceId);
  try {
    const historyRef = collection(db, 'airMonitoring', canonicalId, 'status_history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'status_history');
    return [];
  }
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
        time: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
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
  }
) => {
  try {
    const alertsRef = collection(db, 'alerts');
    await addDoc(alertsRef, {
      userId,
      timestamp: Math.floor(Date.now() / 1000),
      alertType: alert.alertType,
      message: alert.message,
      severity: alert.severity,
      location: alert.location,
      resolved: false,
      isRead: false
    });
  } catch (error) {
    console.error('addAlertToFirestore failed:', error);
  }
};

export const updateAlertResolved = async (alertId: string, resolved: boolean) => {
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, { resolved });
  } catch (error) {
    console.error('updateAlertResolved failed:', error);
  }
};

export const deleteAlertFromFirestore = async (alertId: string) => {
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await deleteDoc(alertRef);
  } catch (error) {
    console.error('deleteAlertFromFirestore failed:', error);
  }
};

