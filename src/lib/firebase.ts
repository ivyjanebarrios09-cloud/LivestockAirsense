import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || autoConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || autoConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || autoConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || autoConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || autoConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || autoConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || autoConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || autoConfig.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId;
export const db = dbId && dbId !== '(default)'
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

export const subscribeToSensorData = (deviceId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, 'airMonitoring', deviceId), (snapshot) => {
    if (snapshot.exists()) {
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
        pm1_0: latestReading.pm1_0 || 0,
        pm2_5: latestReading.pm2_5 || 0,
        pm10: latestReading.pm10 || 0
      });
    } else {
      onSnapshot(doc(db, 'sensors', deviceId), (sensorsSnap) => {
        if (sensorsSnap.exists()) {
          const sensorsData = sensorsSnap.data();
          callback({
            id: sensorsSnap.id,
            deviceId: sensorsSnap.id,
            ...sensorsData,
            ammonia: sensorsData.nh3,
            methane: sensorsData.ch4
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
  });
};

export const subscribeToAlerts = (uid: string, callback: (alerts: any[]) => void) => {
  const alertsRef = collection(db, 'alerts');
  const q = uid && uid !== 'guest' ? query(alertsRef, where('userId', '==', uid)) : query(alertsRef);
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(alerts);
  });
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

export const getSensorReadings = async (deviceId: string, limitCount: number = 100): Promise<any[]> => {
    if (!deviceId) return [];
    try {
        const readingsRef = collection(db, 'airMonitoring', deviceId, 'readings');
        const q = query(readingsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const querySnapshot = await getDocs(q);
        
        let docs = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            // Consistency normalization
            ammonia: data.nh3,
            methane: data.ch4,
            deviceId: deviceId
          };
        });

        if (docs.length === 0) {
            const legacyRef = collection(db, 'sensorReadings');
            const legacyQ = query(legacyRef, where('deviceId', '==', deviceId), orderBy('timestamp', 'desc'), limit(limitCount));
            const legacySnap = await getDocs(legacyQ);
            docs = legacySnap.docs.map(doc => ({ 
              id: doc.id, 
              deviceId: deviceId,
              ...doc.data(),
              ammonia: (doc.data() as any).nh3,
              methane: (doc.data() as any).ch4
            }));
        }

        return docs;
    } catch (error) {
        console.error('getSensorReadings failed:', error);
        return [];
    }
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

  
export const recordStatusChange = async (sensorName: string, status: string, reading: number) => {
  try {
    await addDoc(collection(db, 'status_history'), {
      timestamp: Date.now(),
      sensorName,
      status,
      reading
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'status_history');
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
    const monitoringRef = collection(db, 'airMonitoring');
    const q = uid && uid !== 'guest' ? query(monitoringRef, where('user.userId', '==', uid)) : query(monitoringRef);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
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
    const docRef = doc(db, 'airMonitoring', device.id);
    
    const structuredDoc = {
      deviceId: device.deviceId || device.id,
      deviceName: device.name || 'AIRSENSE',
      deviceType: device.type || 'Livestock Air Sensor',
      firmwareVersion: '1.0.0',
      status: 'Online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
      user: {
        userId: device.userId || '',
        firstName: '',
        lastName: '',
        email: device.email || '',
        contactNumber: '',
        role: 'Owner'
      },
      location: {
        farmId: device.locationId || 'FARM001',
        farmName: device.locationName || 'Livestock Farm A',
        building: device.building || 'House A',
        address: '',
        latitude: 0,
        longitude: 0
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

    await setDoc(docRef, structuredDoc, { merge: true });
    
    // Maintain legacy/backup collections for compatibility
    const oldDocRef = doc(db, 'devices', device.id);
    await setDoc(oldDocRef, { ...device, deviceId: device.deviceId || device.id }, { merge: true });
    
    const sensorsRef = doc(db, 'sensors', device.id);
    await setDoc(sensorsRef, { deviceId: device.id, deviceName: device.name, timestamp: Date.now() }, { merge: true });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'airMonitoring');
  }
};

export const deleteDeviceFromFirestore = async (id: string) => {
  try {
    // Delete from all relevant collections
    await deleteDoc(doc(db, 'airMonitoring', id));
    await deleteDoc(doc(db, 'devices', id));
    await deleteDoc(doc(db, 'sensors', id));
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

export const postSimulatedReading = async (
  deviceId: string,
  deviceName: string,
  location: any,
  thresholds: any
) => {
  try {
    const baseTemp = location?.baseTemp || 21;
    const baseHum = location?.baseHumidity || 55;
    const baseCo2 = location?.baseCo2 || 450;
    const baseNh3 = location?.baseAmmonia || 1.2;

    const temperature = Number((baseTemp + (Math.random() * 2.4 - 1.2)).toFixed(1));
    const humidity = Math.max(0, Math.min(100, Number((baseHum + (Math.random() * 6 - 3)).toFixed(1))));
    const co2 = Math.max(0, Math.round(baseCo2 + (Math.random() * 60 - 30)));
    const nh3 = Math.max(0, Number((baseNh3 + (Math.random() * 1.6 - 0.8)).toFixed(2)));
    const ch4 = Math.max(0, Number((0.05 + (Math.random() * 0.08 - 0.04)).toFixed(2)));
    const pm1_0 = Math.round(Math.random() * 5 + 5);
    const pm2_5 = Number((12.4 + (Math.random() * 3.2 - 1.6)).toFixed(1));
    const pm10 = Number((22.1 + (Math.random() * 4.8 - 2.4)).toFixed(1));

    const aqi = Math.round(Math.max(10, Math.min(500, 35 + (co2 - 350) / 8 + nh3 * 8)));

    const temperatureStatus = temperature > thresholds.tempMax ? 'High' : 'Normal';
    const humidityStatus = humidity > thresholds.humidityMax ? 'High' : 'Normal';
    const co2Status = co2 > thresholds.co2Max ? 'High' : 'Good';
    const nh3Status = nh3 > thresholds.ammoniaMax ? 'High' : 'Low';
    const ch4Status = ch4 > thresholds.methaneMax ? 'High' : 'Low';

    const timestampMs = Date.now();
    const currentUid = location?.userId || auth.currentUser?.uid || '';

    const triggers = [];
    if (temperature > thresholds.tempMax) triggers.push({ type: 'Temperature', msg: `Temperature of ${temperature}°C exceeded critical threshold limit.` });
    if (humidity > thresholds.humidityMax) triggers.push({ type: 'Humidity', msg: `Humidity of ${humidity}% exceeded comfort zone limits.` });
    if (co2 > thresholds.co2Max) triggers.push({ type: 'CO2', msg: `CO2 level reached ${co2} ppm - ventilation adjustment necessary.` });
    if (nh3 > thresholds.ammoniaMax) triggers.push({ type: 'NH3', msg: `Ammonia density spiked to ${nh3} ppm - hazard to animal airways.` });

    const readingPayload = {
      temperature,
      humidity,
      co2,
      pm1_0,
      pm2_5,
      pm10,
      aqi,
      nh3,
      ch4,
      timestamp: timestampMs
    };

    const currentAlertObj = triggers.length > 0 ? {
      activeAlert: true,
      lastAlertType: triggers[triggers.length - 1].type,
      lastAlertValue: (readingPayload as any)[triggers[triggers.length - 1].type.toLowerCase().includes('temp') ? 'temperature' : triggers[triggers.length - 1].type.toLowerCase().includes('hum') ? 'humidity' : triggers[triggers.length - 1].type.toLowerCase().includes('co2') ? 'co2' : 'nh3'] || 0,
      lastAlertTime: timestampMs
    } : {
      activeAlert: false,
      lastAlertType: '',
      lastAlertValue: 0,
      lastAlertTime: 0
    };

    const deviceDocRef = doc(db, 'airMonitoring', deviceId);
    await setDoc(deviceDocRef, {
      deviceId,
      deviceName,
      latestReading: {
        ...readingPayload,
        temperatureStatus,
        humidityStatus,
        co2Status,
        nh3Status,
        ch4Status
      },
      lastSeen: timestampMs,
      user: {
        userId: currentUid,
        email: auth.currentUser?.email || '',
        role: 'Owner'
      },
      location: {
        farmName: location?.name || 'My Farm',
        address: location?.address || 'Default Address',
        farmId: location?.id || 'FARM001'
      },
      thresholds: {
        temperatureMax: thresholds.tempMax,
        humidityMax: thresholds.humidityMax,
        co2Max: thresholds.co2Max,
        pm25Max: thresholds.pm25Max || 35,
        pm10Max: thresholds.pm10Max || 50,
        nh3Max: thresholds.ammoniaMax,
        ch4Max: thresholds.methaneMax
      },
      alerts: currentAlertObj
    }, { merge: true });

    const historyDocRef = doc(db, 'airMonitoring', deviceId, 'readings', String(timestampMs));
    await setDoc(historyDocRef, readingPayload);

    const legacyDocRef = doc(db, 'sensors', deviceId);
    await setDoc(legacyDocRef, { ...readingPayload, deviceId, deviceName, nh3Level: nh3Status, ch4Level: ch4Status }, { merge: true });
    await addDoc(collection(db, 'sensorReadings'), { ...readingPayload, deviceId, deviceName, userId: currentUid, ammonia: nh3, methane: ch4 });

    for (const trigger of triggers) {
      await addDoc(collection(db, 'alerts'), {
        timestamp: timestampMs / 1000,
        alertType: trigger.type,
        severity: 'critical',
        message: trigger.msg,
        location: location?.name || 'Unknown Zone',
        resolved: false,
        isRead: false,
        userId: currentUid
      });
    }

  } catch (err) {
    console.error('Failed to post simulated reading:', err);
  }
};

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
