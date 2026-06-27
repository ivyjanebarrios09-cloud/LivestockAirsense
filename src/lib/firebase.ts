import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, doc, setDoc, deleteDoc, where, updateDoc, getDoc } from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || autoConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || autoConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || autoConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || autoConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || autoConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || autoConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || autoConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || autoConfig.firestoreDatabaseId || '(default)'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' && dbId !== 'default'
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

export const subscribeToSensorData = (uid: string, deviceId: string, callback: (data: any) => void) => {
  if (!uid || !deviceId) return () => {};
  let innerUnsubscribe: (() => void) | null = null;
  let lastMetadata: any = {};

  const setupReadingsListener = (id: string) => {
    if (innerUnsubscribe) return;
    
    // Listen to the shared readings collection as the primary source for live data
    const readingsQ = query(collection(db, 'airMonitoring', id, 'readings'), orderBy('timestamp', 'desc'), limit(1));
    innerUnsubscribe = onSnapshot(readingsQ, (readingsSnap) => {
      if (!readingsSnap.empty) {
        const rData = readingsSnap.docs[0].data();
        callback({
          id: id,
          deviceId: id,
          deviceName: lastMetadata.deviceName || 'AIRSENSE',
          ...lastMetadata,
          ...rData,
          temperature: rData.temperature || rData.temp || 0,
          temperatureLevel: 'Normal',
          humidity: rData.humidity || rData.hum || 0,
          humidityLevel: 'Normal',
          co2: rData.co2 || 0,
          co2Level: 'Good',
          aqi: rData.aqi || 0,
          aqiLevel: rData.aqi > 150 ? 'POOR' : 'GOOD',
          nh3: rData.nh3 || rData.ammonia || 0,
          nh3Level: 'Low',
          ch4: rData.ch4 || rData.methane || 0,
          ch4Level: 'Low',
          timestamp: rData.timestamp || Date.now(),
          ammonia: rData.nh3 || rData.ammonia || 0,
          methane: rData.ch4 || rData.methane || 0,
          pm1_0: rData.pm1_0 ?? rData.pm10 ?? rData['pm1.0'] ?? rData['pm1_0'] ?? rData.pm1 ?? 0,
          pm2_5: rData.pm2_5 ?? rData.pm25 ?? rData['pm2.5'] ?? rData['pm2_5'] ?? 0,
          pm10: rData.pm10 ?? rData.pm2_5 ?? rData['pm10'] ?? rData['pm10_0'] ?? rData.pm10_0 ?? 0
        });
      } else if (lastMetadata.latestReading) {
        // Fallback to latestReading field in the document if subcollection is empty
        const lr = lastMetadata.latestReading;
        callback({
          id: id,
          deviceId: id,
          deviceName: lastMetadata.deviceName || 'AIRSENSE',
          ...lastMetadata,
          ...lr,
          temperature: lr.temperature || 0,
          humidity: lr.humidity || 0,
          timestamp: lr.timestamp || Date.now()
        });
      }
    }, (err) => {
      console.warn(`[Firestore] Inner readings listener error for ${id}:`, err);
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
        callback({
          id: snapshot.id,
          deviceId: data.deviceId || snapshot.id,
          deviceName: data.deviceName || 'AIRSENSE',
          temperature: latestReading.temperature || 0,
          temperatureLevel: latestReading.temperatureStatus || 'Normal',
          humidity: latestReading.humidity || 0,
          humidityLevel: latestReading.humidityStatus || 'Normal',
          co2: latestReading.co2 || 0,
          co2Level: latestReading.co2Status || 'Good',
          aqi: latestReading.aqi || 0,
          aqiLevel: latestReading.aqi > 150 ? 'POOR' : 'GOOD',
          nh3: latestReading.nh3 || 0,
          nh3Level: latestReading.nh3Status || 'Low',
          ch4: latestReading.ch4 || 0,
          ch4Level: latestReading.ch4Status || 'Low',
          timestamp: latestReading.timestamp || Date.now(),
          ammonia: latestReading.nh3 || 0,
          methane: latestReading.ch4 || 0,
          pm1_0: latestReading.pm1_0 ?? latestReading.pm10 ?? latestReading['pm1.0'] ?? latestReading['pm1_0'] ?? latestReading.pm1 ?? 0,
          pm2_5: latestReading.pm2_5 ?? latestReading.pm25 ?? latestReading['pm2.5'] ?? latestReading['pm2_5'] ?? 0,
          pm10: latestReading.pm10 ?? latestReading.pm2_5 ?? latestReading['pm10'] ?? latestReading['pm10_0'] ?? latestReading.pm10_0 ?? 0
        });

        // Setup the inner listener for subcollection if not already doing so
        setupReadingsListener(deviceId);
      } else {
        // Fallback for global devices not registered to user
        setupReadingsListener(deviceId);
      }
    },
    (error) => {
      console.warn(`[Firestore] User device doc listener error for ${deviceId}:`, error);
      // Even if user doc fails (e.g. permission), try to listen to global readings
      setupReadingsListener(deviceId);
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
    try {
        // Primary source: shared readings as requested by the user
        const legacyRef = collection(db, 'airMonitoring', deviceId, 'readings');
        const legacyQ = query(legacyRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const legacySnap = await getDocs(legacyQ);
        let docs = legacySnap.docs.map(docSnap => {
          const data = docSnap.data();
          return { 
            id: docSnap.id, 
            deviceId: deviceId,
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
  
  // Primary source: shared readings as requested
  const sharedRef = collection(db, 'airMonitoring', deviceId, 'readings');
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
          return {
            id: docSnap.id,
            deviceId: deviceId,
            ...data,
            pm1_0: data.pm1_0 ?? data.pm10 ?? data['pm1.0'] ?? data['pm1_0'] ?? data.pm1 ?? 0,
            pm2_5: data.pm2_5 ?? data.pm25 ?? data['pm2.5'] ?? data['pm2_5'] ?? 0,
            pm10: data.pm10 ?? data.pm2_5 ?? data['pm10'] ?? data['pm10_0'] ?? data.pm10_0 ?? 0,
            ammonia: data.nh3 ?? data.ammonia,
            methane: data.ch4 ?? data.methane
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
              return { 
                id: docSnap.id, 
                deviceId: deviceId,
                ...data,
                pm1_0: data.pm1_0 ?? data.pm10 ?? data['pm1.0'] ?? data['pm1_0'] ?? data.pm1 ?? 0,
                pm2_5: data.pm2_5 ?? data.pm25 ?? data['pm2.5'] ?? data['pm2_5'] ?? 0,
                pm10: data.pm10 ?? data.pm2_5 ?? data['pm10'] ?? data['pm10_0'] ?? data.pm10_0 ?? 0,
                ammonia: data.nh3 ?? data.ammonia,
                methane: data.ch4 ?? data.methane
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
  try {
    const historyRef = collection(db, 'airMonitoring', deviceId, 'status_history');
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

    // 3. Update legacy collections for full compatibility
    const oldDocRef = doc(db, 'airMonitoring', deviceId);
    await setDoc(oldDocRef, {
      latestReading: {
        ...readings,
        timestamp: Date.now()
      }
    }, { merge: true });

    const legacyReadingsRef = collection(db, 'airMonitoring', deviceId, 'readings');
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

    // Always fetch global airMonitoring devices
    try {
      const airMonitoringRef = collection(db, 'airMonitoring');
      const airSnap = await getDocs(query(airMonitoringRef));
      console.log('Fetched airMonitoring docs:', airSnap.docs.length);
      airSnap.docs.forEach(docSnap => {
        const data = docSnap.data() as any;
        devicesMap.set(docSnap.id, {
          id: docSnap.id,
          deviceId: data.deviceId || docSnap.id,
          name: (docSnap.id === 'LAS-001') ? 'AIRSENSE' : (data.deviceName || 'AIRSENSE'),
          ...data
        });
      });
    } catch (e) {
      console.error('Error fetching global devices:', e);
    }

    // Fallback: forcefully fetch LAS-001 if it didn't come up in collection query
    if (!devicesMap.has('LAS-001')) {
      devicesMap.set('LAS-001', {
        id: 'LAS-001',
        deviceId: 'LAS-001',
        name: 'AIRSENSE'
      });
    }

    if (uid && uid !== 'guest') {
      try {
        const userDevicesRef = collection(db, 'users', uid, 'devices');
        const userSnap = await getDocs(query(userDevicesRef));
        userSnap.docs.forEach(docSnap => {
          const data = docSnap.data() as any;
          devicesMap.set(docSnap.id, {
            id: docSnap.id,
            deviceId: data.deviceId || docSnap.id,
            name: (docSnap.id === 'LAS-001') ? 'AIRSENSE' : (data.deviceName || 'AIRSENSE'),
            ...data
          });
        });
      } catch (e) {
        console.error('Error fetching user devices:', e);
      }
    }
    
    const result = Array.from(devicesMap.values());
    console.log('getDevices returning:', result);
    return result;
  } catch (error) {
    console.error('getDevices failed with outer catch:', error);
    return [
      {
        id: 'LAS-001',
        deviceId: 'LAS-001',
        name: 'AIRSENSE (LAS-001)'
      }
    ];
  }
};

export const addDeviceToFirestore = async (device: any) => {
  try {
    const userId = device.userId || 'guest';
    const deviceId = device.deviceId || device.id;
    
    // 1. Add to Device Registry
    const registryRef = doc(db, 'deviceRegistry', deviceId);
    await setDoc(registryRef, {
      ownerId: userId,
      deviceName: device.name || 'AIRSENSE',
      status: 'Online',
      createdAt: Date.now()
    }, { merge: true });

    // 2. Add to user's devices
    const userDeviceRef = doc(db, 'users', userId, 'devices', deviceId);
    
    const structuredDoc = {
      deviceId: deviceId,
      deviceName: device.name || 'AIRSENSE',
      deviceType: device.type || 'Livestock Air Sensor',
      firmwareVersion: '1.0.0',
      status: 'Online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
      sharedFromUid: device.sharedFromUid || '',
      user: {
        userId: userId,
        firstName: '',
        lastName: '',
        email: device.email || '',
        contactNumber: '',
        role: 'Owner'
      },
      latestReading: {
        temperature: 0,
        humidity: 0,
        co2: 0,
        pm1_0: 0,
        pm2_5: 0,
        pm10: 0,
        aqi: 0,
        nh3: 0,
        ch4: 0,
        temperatureStatus: 'Normal',
        humidityStatus: 'Normal',
        co2Status: 'Good',
        nh3Status: 'Low',
        ch4Status: 'Low',
        timestamp: Date.now()
      },
      thresholds: {
        temperatureMax: 35,
        humidityMax: 90,
        co2Max: 1000,
        pm25Max: 35,
        pm10Max: 50,
        nh3Max: 25,
        ch4Max: 200
      },
      statistics: {
        dailyAverageCO2: 0,
        dailyAverageNH3: 0,
        dailyAverageCH4: 0,
        dailyAverageTemp: 0,
        dailyAverageHumidity: 0
      },
      alerts: {
        activeAlert: false,
        lastAlertType: '',
        lastAlertValue: 0,
        lastAlertTime: 0
      }
    };

    await setDoc(userDeviceRef, structuredDoc, { merge: true });
    
    // Maintain legacy collections for compatibility during transition
    const oldDocRef = doc(db, 'airMonitoring', deviceId);
    await setDoc(oldDocRef, structuredDoc, { merge: true });
    
    const cleanDevice = Object.fromEntries(
      Object.entries(device).filter(([_, v]) => v !== undefined)
    );
    const legacyDeviceRef = doc(db, 'devices', deviceId);
    await setDoc(legacyDeviceRef, { ...cleanDevice, deviceId: deviceId }, { merge: true });
    
    const sensorsRef = doc(db, 'sensors', deviceId);
    await setDoc(sensorsRef, { deviceId: deviceId, deviceName: device.name || 'AIRSENSE', timestamp: Date.now() }, { merge: true });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/devices');
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
  try {
    const historyRef = collection(db, 'airMonitoring', deviceId, 'status_history');
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
  try {
    // We will aggregate from the legacy readings which contains all history
    const readingsRef = collection(db, 'airMonitoring', deviceId, 'readings');
    
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
      if (data.aqi !== undefined) { day.aqiSum += data.aqi; day.aqiCount++; }
      if (data.co2 !== undefined) { day.co2Sum += data.co2; day.co2Count++; }
      
      const temp = data.temperature ?? data.temp;
      if (temp !== undefined) { day.tempSum += temp; day.tempCount++; }
      
      const hum = data.humidity ?? data.hum;
      if (hum !== undefined) { day.humSum += hum; day.humCount++; }

      const nh3 = data.nh3 ?? data.ammonia;
      if (nh3 !== undefined) { day.nh3Sum += nh3; day.nh3Count++; }

      const ch4 = data.ch4 ?? data.methane;
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

