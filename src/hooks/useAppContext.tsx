import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAlerts, getLocations, addLocationToFirestore, deleteLocationFromFirestore, getDevices, addDeviceToFirestore, deleteDeviceFromFirestore, postSimulatedReading, saveUserSettingsToFirestore, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from './useAuthState';

export interface Thresholds {
  tempMax: number;
  humidityMax: number;
  co2Max: number;
  ammoniaMax: number;
  methaneMax: number;
}

export interface Alert {
  id: string;
  time: string;
  location: string;
  alertType: string;
  message: string;
  severity: 'critical' | 'warning' | 'normal';
  resolved: boolean;
}

export interface LocationDetail {
  id: string;
  name: string;
  type: string;
  animalCount: number;
  baseTemp: number;
  baseHumidity: number;
  baseCo2: number;
  baseAmmonia: number;
}

const LOCATIONS: LocationDetail[] = [];

export interface AppContextType {
  uid: string;
  locations: LocationDetail[];
  addLocation: (loc: LocationDetail) => void;
  deleteLocation: (id: string) => void;
  devices: any[];
  addDevice: (device: any) => void;
  deleteDevice: (id: string) => void;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  activeLocation: LocationDetail | undefined;
  thresholds: Thresholds;
  saveThresholds: (newThresholds: Thresholds) => void;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  alertsList: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'time'>) => void;
  resolveAlert: (id: string) => void;
  clearAllAlerts: () => void;
  unreadAlertsCount: number;
  refreshInterval: number;
  firebaseSync: boolean;
  saveSystemSettings: (interval: number, sync: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children, uid }: { children: React.ReactNode; uid: string }) {
  const [locations, setLocations] = useState<LocationDetail[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    getLocations(uid).then(setLocations);
    getDevices(uid).then(setDevices);
  }, [uid]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem(`las_${uid}_selected_location`) || '';
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem(`las_${uid}_selected_device`) || '';
  });

  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem(`las_${uid}_refresh_interval`);
    return saved ? Number(saved) : 5000;
  });

  const [firebaseSync, setFirebaseSync] = useState<boolean>(() => {
    const saved = localStorage.getItem(`las_${uid}_firebase_sync`);
    return saved === 'true';
  });

  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    const saved = localStorage.getItem(`las_${uid}_thresholds`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back to default
      }
    }
    return {
      tempMax: 26,
      humidityMax: 70,
      co2Max: 800,
      ammoniaMax: 4.0,
      methaneMax: 0.2
    };
  });

  // Real-time synchronization of user choices from the Firestore users collection!
  useEffect(() => {
    if (!uid || uid === 'guest') return;

    const userDocRef = doc(db, 'users', uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.selectedLocationId !== undefined) {
          setSelectedLocationId(data.selectedLocationId);
        }
        if (data.selectedDeviceId !== undefined) {
          setSelectedDeviceId(data.selectedDeviceId);
        }
        if (data.thresholds !== undefined) {
          setThresholds(data.thresholds);
        }
        if (data.refreshInterval !== undefined) {
          setRefreshInterval(data.refreshInterval);
        }
        if (data.firebaseSync !== undefined) {
          setFirebaseSync(data.firebaseSync);
        }
      }
    }, (error) => {
      console.error('Error syncing user document:', error);
    });

    return () => unsubscribeUser();
  }, [uid]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  const activeLocation = locations.find(l => l.id === selectedLocationId) || (locations.length > 0 ? locations[0] : undefined);

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem(`las_${uid}_selected_location`, selectedLocationId);
      saveUserSettingsToFirestore(uid, { selectedLocationId });
    }
  }, [selectedLocationId, uid]);

  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem(`las_${uid}_selected_device`, selectedDeviceId);
      saveUserSettingsToFirestore(uid, { selectedDeviceId });
    }
  }, [selectedDeviceId, uid]);

  const addLocation = async (loc: LocationDetail) => {
    const enrichedLocation = { ...loc, userId: uid };
    await addLocationToFirestore(enrichedLocation);
    setLocations(prev => {
      const index = prev.findIndex(l => l.id === loc.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = enrichedLocation;
        return copy;
      }
      return [...prev, enrichedLocation];
    });
  };

  const deleteLocation = async (id: string) => {
    await deleteLocationFromFirestore(id);
    setLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (selectedLocationId === id) {
        if (updated.length > 0) {
          setSelectedLocationId(updated[0].id);
        } else {
          setSelectedLocationId('');
        }
      }
      return updated;
    });
  };

  const addDevice = async (device: any) => {
    const enrichedDevice = { ...device, userId: uid };
    await addDeviceToFirestore(enrichedDevice);
    setDevices(prev => {
      const index = prev.findIndex(d => d.id === device.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = enrichedDevice;
        return copy;
      }
      return [...prev, enrichedDevice];
    });
  };

  const deleteDevice = async (id: string) => {
    await deleteDeviceFromFirestore(id);
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const saveThresholds = (newThreshold: Thresholds) => {
    setThresholds(newThreshold);
    localStorage.setItem(`las_${uid}_thresholds`, JSON.stringify(newThreshold));
    saveUserSettingsToFirestore(uid, { thresholds: newThreshold });
  };

  const saveSystemSettings = (interval: number, sync: boolean) => {
    setRefreshInterval(interval);
    setFirebaseSync(sync);
    localStorage.setItem(`las_${uid}_refresh_interval`, String(interval));
    localStorage.setItem(`las_${uid}_firebase_sync`, String(sync));
    saveUserSettingsToFirestore(uid, { refreshInterval: interval, firebaseSync: sync });
  };

  const [alertsList, setAlertsList] = useState<Alert[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(uid, (data) => {
      setAlertsList(data.map(a => ({
        id: a.id,
        time: a.timestamp ? new Date(a.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        location: a.location || 'Unknown',
        alertType: a.alertType || 'Alert',
        message: a.message || '',
        severity: (a.severity as 'critical' | 'warning' | 'normal') || 'normal',
        resolved: a.resolved || false
      })));
    });
    return () => unsubscribe();
  }, [uid]);

  const addAlert = (alert: Omit<Alert, 'id' | 'time'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAlertsList(prev => [newAlert, ...prev]);
  };

  const resolveAlert = (id: string) => {
    setAlertsList(prev => prev.map(alert => alert.id === id ? { ...alert, resolved: true } : alert));
  };

  const clearAllAlerts = () => {
    setAlertsList(prev => prev.filter(alert => !alert.resolved));
  };

  const unreadAlertsCount = alertsList.filter(alert => !alert.resolved).length;

  useEffect(() => {
    if (!selectedDeviceId) return;

    const device = devices.find(d => d.id === selectedDeviceId);
    const deviceName = device?.name || 'ESP32 Node';

    if (firebaseSync) {
      postSimulatedReading(selectedDeviceId, deviceName, activeLocation, thresholds);
    }

    const intervalId = setInterval(() => {
      if (firebaseSync) {
        postSimulatedReading(selectedDeviceId, deviceName, activeLocation, thresholds);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [selectedDeviceId, activeLocation, devices, thresholds, refreshInterval, firebaseSync]);

  const [isSyncing, setIsSyncing] = useState(false);
  const triggerSync = async () => {
    setIsSyncing(true);
    if (selectedDeviceId) {
      const device = devices.find(d => d.id === selectedDeviceId);
      const deviceName = device?.name || 'ESP32 Node';
      await postSimulatedReading(selectedDeviceId, deviceName, activeLocation, thresholds);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSyncing(false);
  };

  return (
    <AppContext.Provider value={{
      uid,
      locations,
      addLocation,
      deleteLocation,
      devices,
      addDevice,
      deleteDevice,
      selectedLocationId,
      setSelectedLocationId,
      selectedDeviceId,
      setSelectedDeviceId,
      activeLocation,
      thresholds,
      saveThresholds,
      isSyncing,
      triggerSync,
      alertsList,
      addAlert,
      resolveAlert,
      clearAllAlerts,
      unreadAlertsCount,
      refreshInterval,
      firebaseSync,
      saveSystemSettings
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}
