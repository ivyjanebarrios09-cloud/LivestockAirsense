import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { subscribeToAlerts, getLocations, addLocationToFirestore, deleteLocationFromFirestore, getDevices, addDeviceToFirestore, deleteDeviceFromFirestore, saveUserSettingsToFirestore, db, updateAlertResolved, deleteAlertFromFirestore } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from './useAuthState';
import { parseSafeDate } from '../lib/utils';

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
  devices: any[];
  addDevice: (device: any) => void;
  deleteDevice: (id: string) => void;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
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
  pushEnabled: boolean;
  savePushEnabled: (enabled: boolean) => Promise<void>;
  isDevicesLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children, uid }: { children: React.ReactNode; uid: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);

  useEffect(() => {
    setIsDevicesLoading(true);
    getDevices(uid).then(res => {
      setDevices(res);
      setIsDevicesLoading(false);
    });
  }, [uid]);

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

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(`las_${uid}_push_enabled`);
    return saved === 'true';
  });

  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    const saved = localStorage.getItem(`las_${uid}_thresholds`);
    let parsed: Thresholds = {
      tempMax: 30,
      humidityMax: 70,
      co2Max: 800,
      ammoniaMax: 25.0,
      methaneMax: 50.0
    };
    if (saved) {
      try {
        parsed = { ...parsed, ...JSON.parse(saved) };
      } catch (e) {
        // Fall back to default
      }
    }
    // Automatically migrate old, low thresholds from previous version
    if (parsed.ammoniaMax === 4.0 || parsed.ammoniaMax < 10.0) {
      parsed.ammoniaMax = 10.0;
    }
    if (parsed.methaneMax === 0.2 || parsed.methaneMax < 25.0) {
      parsed.methaneMax = 25.0;
    }
    return parsed;
  });

  // Real-time synchronization of user choices from the Firestore users collection!
  useEffect(() => {
    if (!uid || uid === 'guest') return;

    const userDocRef = doc(db, 'users', uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.selectedDeviceId !== undefined) {
          setSelectedDeviceId(data.selectedDeviceId);
        }
        if (data.thresholds !== undefined) {
          const t = { ...data.thresholds };
          if (t.ammoniaMax === 4.0 || t.ammoniaMax < 10.0) {
            t.ammoniaMax = 10.0;
          }
          if (t.methaneMax === 0.2 || t.methaneMax < 25.0) {
            t.methaneMax = 25.0;
          }
          setThresholds(t);
        }
        if (data.refreshInterval !== undefined) {
          setRefreshInterval(data.refreshInterval);
        }
        if (data.firebaseSync !== undefined) {
          setFirebaseSync(data.firebaseSync);
        }
        if (data.pushEnabled !== undefined) {
          setPushEnabled(data.pushEnabled);
          localStorage.setItem(`las_${uid}_push_enabled`, String(data.pushEnabled));
        }
      }
    }, (error) => {
      console.error('Error syncing user document:', error);
    });

    return () => unsubscribeUser();
  }, [uid]);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem(`las_${uid}_selected_device`, selectedDeviceId);
      saveUserSettingsToFirestore(uid, { selectedDeviceId });
    }
  }, [selectedDeviceId, uid]);

  const addDevice = async (device: any) => {
    const enrichedDevice = { ...device, userId: uid || 'guest' };
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
    await deleteDeviceFromFirestore(uid || 'guest', id);
    setDevices(prev => {
      const updated = prev.filter(d => d.id !== id);
      if (selectedDeviceId === id) {
        if (updated.length > 0) {
          setSelectedDeviceId(updated[0].id);
        } else {
          setSelectedDeviceId('');
        }
      }
      return updated;
    });
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

  const savePushEnabled = async (enabled: boolean) => {
    setPushEnabled(enabled);
    localStorage.setItem(`las_${uid}_push_enabled`, String(enabled));
    await saveUserSettingsToFirestore(uid, { pushEnabled: enabled });
  };

  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());
  const lastUidRef = useRef<string>(uid);
  const isFirstMountRef = useRef<boolean>(true);

  useEffect(() => {
    if (lastUidRef.current !== uid) {
      notifiedAlertIdsRef.current.clear();
      lastUidRef.current = uid;
      isFirstMountRef.current = true;
    }

    const unsubscribe = subscribeToAlerts(uid, (data) => {
      const mappedAlerts = data.map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        time: a.timestamp ? parseSafeDate(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        location: a.location || 'Unknown',
        alertType: a.alertType || 'Alert',
        message: a.message || '',
        severity: (a.severity as 'critical' | 'warning' | 'normal') || 'normal',
        resolved: a.resolved || false
      }));

      if (isFirstMountRef.current) {
        data.forEach(a => {
          if (a.id) notifiedAlertIdsRef.current.add(a.id);
        });
        isFirstMountRef.current = false;
      } else {
        const storedPush = localStorage.getItem(`las_${uid}_push_enabled`) === 'true' || pushEnabled;
        if (storedPush && 'Notification' in window && Notification.permission === 'granted') {
          mappedAlerts.forEach(alert => {
            if (!alert.resolved && !notifiedAlertIdsRef.current.has(alert.id)) {
              const notificationTitle = alert.severity === 'critical'
                ? `🚨 Critical Air Quality Alert`
                : alert.severity === 'warning'
                ? `⚠️ Air Quality Warning`
                : `ℹ️ Air Quality Update`;

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                  if (reg) {
                    reg.showNotification(notificationTitle, {
                      body: `${alert.location}: ${alert.message}`,
                      icon: '/logo.png',
                      badge: '/logo.png',
                      tag: alert.id,
                      vibrate: [200, 100, 200]
                    } as any);
                  } else {
                    new Notification(notificationTitle, {
                      body: `${alert.location}: ${alert.message}`,
                      icon: '/logo.png'
                    });
                  }
                }).catch(() => {
                  new Notification(notificationTitle, {
                    body: `${alert.location}: ${alert.message}`,
                    icon: '/logo.png'
                  });
                });
              } else {
                new Notification(notificationTitle, {
                  body: `${alert.location}: ${alert.message}`,
                  icon: '/logo.png'
                });
              }
              notifiedAlertIdsRef.current.add(alert.id);
            }
          });
        }

        data.forEach(a => {
          if (a.id) notifiedAlertIdsRef.current.add(a.id);
        });
      }

      setAlertsList(mappedAlerts);
    });
    return () => unsubscribe();
  }, [uid, pushEnabled]);

  const addAlert = (alert: Omit<Alert, 'id' | 'time'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAlertsList(prev => [newAlert, ...prev]);
  };

  const resolveAlert = async (id: string) => {
    setAlertsList(prev => prev.map(alert => alert.id === id ? { ...alert, resolved: true } : alert));
    await updateAlertResolved(id, true);
  };

  const clearAllAlerts = async () => {
    const resolvedAlerts = alertsList.filter(alert => alert.resolved);
    setAlertsList(prev => prev.filter(alert => !alert.resolved));
    for (const alert of resolvedAlerts) {
      await deleteAlertFromFirestore(alert.id);
    }
  };

  const unreadAlertsCount = alertsList.filter(alert => !alert.resolved).length;

  const [isSyncing, setIsSyncing] = useState(false);
  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      if (uid) {
        const updatedDevices = await getDevices(uid);
        setDevices(updatedDevices);
      }
    } catch (e) {
      console.error('Failed to sync devices:', e);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSyncing(false);
  };

  return (
    <AppContext.Provider value={{
      uid,
      devices,
      addDevice,
      deleteDevice,
      selectedDeviceId,
      setSelectedDeviceId,
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
      saveSystemSettings,
      pushEnabled,
      savePushEnabled,
      isDevicesLoading
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
