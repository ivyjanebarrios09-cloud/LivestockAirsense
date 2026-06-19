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
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || autoConfig.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId;
export const db = dbId && dbId !== '(default)'
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

export const subscribeToSensorData = (deviceId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, 'sensors', deviceId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
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
        timestamp: Date.now() / 1000
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sensors');
    return false;
  }
};

export const getSensorReadings = async (deviceId: string, limitCount: number = 100): Promise<any[]> => {
    try {
        const sensorReadingsRef = collection(db, 'sensor_readings');
        let q = query(sensorReadingsRef);
        if (deviceId) {
          q = query(sensorReadingsRef, where('deviceId', '==', deviceId));
        }
        const querySnapshot = await getDocs(q);
        let docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory by timestamp descending
        docs.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
        return docs.slice(0, limitCount);
    } catch (error) {
        handleFirestoreError(error, OperationType.READ, 'sensor_readings');
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
      // User closed the popup, do nothing
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
    // Explicitly handle cases without auto-signup on invalid credentials for signIn
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
    const devicesRef = collection(db, 'devices');
    const q = uid && uid !== 'guest' ? query(devicesRef, where('userId', '==', uid)) : query(devicesRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'devices');
    return [];
  }
};

export const addDeviceToFirestore = async (device: any) => {
  try {
    const docRef = doc(db, 'devices', device.id);
    await setDoc(docRef, { ...device });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'devices');
  }
};

export const deleteDeviceFromFirestore = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'devices', id));
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
    // Determine base characteristics
    const baseTemp = location?.baseTemp || 21;
    const baseHum = location?.baseHumidity || 55;
    const baseCo2 = location?.baseCo2 || 450;
    const baseNh3 = location?.baseAmmonia || 1.2;

    // Generate slight random adjustments to make it look alive and dynamic
    const temperature = Number((baseTemp + (Math.random() * 2.4 - 1.2)).toFixed(1));
    const humidity = Math.max(0, Math.min(100, Number((baseHum + (Math.random() * 6 - 3)).toFixed(1))));
    const co2 = Math.max(0, Math.round(baseCo2 + (Math.random() * 60 - 30)));
    const nh3 = Math.max(0, Number((baseNh3 + (Math.random() * 1.6 - 0.8)).toFixed(2)));
    const ch4 = Math.max(0, Number((0.05 + (Math.random() * 0.08 - 0.04)).toFixed(2)));
    const pm25 = Number((12.4 + (Math.random() * 3.2 - 1.6)).toFixed(1));
    const pm10 = Number((22.1 + (Math.random() * 4.8 - 2.4)).toFixed(1));

    // Calculate AQI realistically based on CO2 and NH3 density
    const aqi = Math.round(Math.max(10, Math.min(500, 35 + (co2 - 350) / 8 + nh3 * 8)));

    const temperatureLevel = temperature > thresholds.tempMax ? 'HIGH' : 'GOOD';
    const humidityLevel = humidity > thresholds.humidityMax ? 'HIGH' : 'GOOD';
    const co2Level = co2 > thresholds.co2Max ? 'HIGH' : 'GOOD';
    const nh3Level = nh3 > thresholds.ammoniaMax ? 'HIGH' : 'GOOD';
    const ch4Level = ch4 > thresholds.methaneMax ? 'HIGH' : 'GOOD';
    const aqiLevel = aqi > 300 ? 'HAZARDOUS' : aqi > 150 ? 'POOR' : 'GOOD';

    const timestampMs = Date.now();
    const timestampSec = timestampMs / 1000;

    const currentUid = location?.userId || auth.currentUser?.uid || '';

    // POST 1: Latest Sensor State
    const docRef = doc(db, 'sensors', deviceId);
    await setDoc(docRef, {
      deviceId,
      deviceName,
      temperature,
      temperatureLevel,
      humidity,
      humidityLevel,
      co2,
      co2Level,
      aqi,
      aqiLevel,
      nh3,
      nh3Level,
      ch4,
      ch4Level,
      timestamp: timestampSec
    });

    // POST 2: Historical series log in sensor_readings
    await addDoc(collection(db, 'sensor_readings'), {
      timestamp: timestampMs,
      temperature,
      humidity,
      ammonia: nh3,
      co2,
      methane: ch4,
      pm25,
      pm10,
      aqi,
      deviceId,
      userId: currentUid
    });

    // Check thresholds to write real alerts if they exceed limits!
    const triggers = [];
    if (temperature > thresholds.tempMax) triggers.push({ type: 'High Temperature', msg: `Temperature of ${temperature}°C exceeded critical threshold limit.` });
    if (humidity > thresholds.humidityMax) triggers.push({ type: 'High Humidity', msg: `Humidity of ${humidity}% exceeded comfort zone limits.` });
    if (co2 > thresholds.co2Max) triggers.push({ type: 'Elevated CO2', msg: `CO2 level reached ${co2} ppm - ventilation adjustment necessary.` });
    if (nh3 > thresholds.ammoniaMax) triggers.push({ type: 'Ammonia Spike', msg: `Ammonia density spiked to ${nh3} ppm - hazard to animal airways.` });

    for (const trigger of triggers) {
      await addDoc(collection(db, 'alerts'), {
        timestamp: timestampSec,
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

    // No longer seeding default structure to allow clean registered experience
    // The user will add real or simulated devices manually on onboarding/settings
    console.log('Skipping template database seed to let user register devices manually.');
  } catch (error) {
    console.error('Failed to record user sign-in event:', error);
  }
};
