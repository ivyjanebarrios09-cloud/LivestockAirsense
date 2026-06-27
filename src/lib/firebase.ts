import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, doc, setDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
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
export const db = dbId && dbId !== '(default)'
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

export const subscribeToSensorData = (uid: string, deviceId: string, callback: (data: any) => void) => {
  if (!uid || !deviceId) return () => {};
  let innerUnsubscribe: (() => void) | null = null;
  const outerUnsubscribe = onSnapshot(
    doc(db, 'users', uid, 'devices', deviceId),
    (snapshot) => {
      if (snapshot.exists()) {
        if (innerUnsubscribe) {
          innerUnsubscribe();
          innerUnsubscribe = null;
        }
        const data = snapshot.data();
        const latestReading = data.latestReading || {};
        
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
      } else {
        if (!innerUnsubscribe) {
          const legacyRef = doc(db, 'airMonitoring', deviceId);
          innerUnsubscribe = onSnapshot(legacyRef, (legacySnap) => {
            if (legacySnap.exists()) {
              const data = legacySnap.data();
              const latestReading = data.latestReading || {};
              callback({
                id: legacySnap.id,
                deviceId: data.deviceId || legacySnap.id,
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
            } else {
              callback({
                id: deviceId,
                deviceId: deviceId,
                temperature: 0,
                temperatureLevel: 'Normal',
                humidity: 0,
                humidityLevel: 'Normal',
                co2: 0,
                co2Level: 'Good',
                aqi: 0,
                aqiLevel: 'GOOD',
                nh3: 0,
                nh3Level: 'Low',
                ch4: 0,
                ch4Level: 'Low',
                timestamp: Date.now()
              });
            }
          });
        }
      }
    },
    (error) => {
      console.warn(`[Firestore] Sensor data subscription stream error or timed out/cancelled for ${deviceId}:`, error);
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
        const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
        const readingsRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
        const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const querySnapshot = await getDocs(q);
        
        let docs = querySnapshot.docs.map(docSnap => {
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

        // Fallback to legacy structure for compatibility if new is empty
        if (docs.length === 0) {
            const legacyRef = collection(db, 'airMonitoring', deviceId, 'readings');
            const legacyQ = query(legacyRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const legacySnap = await getDocs(legacyQ);
            docs = legacySnap.docs.map(docSnap => {
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
  const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
  const readingsRef = collection(db, 'users', uid, 'devices', deviceId, 'history', targetDate, 'readings');
  const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(limitCount));

  return onSnapshot(
    q,
    async (snapshot) => {
      let docs = snapshot.docs.map(docSnap => {
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

      if (docs.length === 0) {
        try {
          const legacyRef = collection(db, 'airMonitoring', deviceId, 'readings');
          const legacyQ = query(legacyRef, orderBy('timestamp', 'desc'), limit(limitCount));
          const legacySnap = await getDocs(legacyQ);
          docs = legacySnap.docs.map(docSnap => {
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
        } catch (e) {
          console.warn('Fallback to legacy readings subscription failed:', e);
        }
      }

      callback(docs);
    },
    (error) => {
      console.warn(`[Firestore] Sensor readings subscription stream error for ${deviceId}:`, error);
    }
  );
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
  try {
    await addDoc(collection(db, 'status_history'), {
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
    let q;
    if (uid && uid !== 'guest') {
      const monitoringRef = collection(db, 'users', uid, 'devices');
      q = query(monitoringRef);
    } else {
      const monitoringRef = collection(db, 'airMonitoring');
      q = query(monitoringRef);
    }
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        deviceId: data.deviceId || docSnap.id,
        name: data.deviceName || 'AIRSENSE',
        ...data
      };
    });
  } catch (error) {
    console.error('getDevices failed:', error);
    return [];
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

export const getStatusHistory = async (): Promise<any[]> => {
  try {
    const q = query(collection(db, 'status_history'), orderBy('timestamp', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'status_history');
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

