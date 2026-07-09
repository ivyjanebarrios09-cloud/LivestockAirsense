import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { subscribeToAlerts, getLocations, addLocationToFirestore, deleteLocationFromFirestore, getDevices, addDeviceToFirestore, deleteDeviceFromFirestore, saveUserSettingsToFirestore, db, updateAlertResolved, deleteAlertFromFirestore, subscribeToDeviceStatus, subscribeToSensorData, recordStatusChange, addAlertToFirestore, savePushSubscription, deletePushSubscription } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { useAuthState } from './useAuthState';
import { parseSafeDate, getSensorStatus } from '../lib/utils';
import { toast } from 'sonner';

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
  deleteAlert: (id: string) => Promise<void>;
  unreadAlertsCount: number;
  refreshInterval: number;
  firebaseSync: boolean;
  saveSystemSettings: (interval: number, sync: boolean) => void;
  pushEnabled: boolean;
  savePushEnabled: (enabled: boolean) => Promise<void>;
  isDevicesLoading: boolean;
  isOnline: boolean;
  connectionStatus: { status: string; lastSeen: number };
  theme: 'light' | 'dark' | 'forest' | 'wind' | 'farm';
  setTheme: (theme: 'light' | 'dark' | 'forest' | 'wind' | 'farm') => void;
  deviceData: any;
  setDeviceData: React.Dispatch<React.SetStateAction<any>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AppContextProvider({ children, uid }: { children: React.ReactNode; uid: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<{ status: string; lastSeen: number }>({ 
    status: 'Connecting', 
    lastSeen: 0 
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!uid || uid === 'guest') {
      setIsDevicesLoading(true);
      getDevices(uid).then(res => {
        setDevices(res);
        setIsDevicesLoading(false);
      });
      return;
    }

    setIsDevicesLoading(true);
    const devicesRef = collection(db, 'users', uid, 'devices');
    const unsubscribeDevices = onSnapshot(devicesRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure id and deviceId are always present and not overwritten by empty data
          deviceId: data.deviceId || doc.id
        };
      });
      setDevices(docs);
      setIsDevicesLoading(false);
    }, (error) => {
      console.error('Error subscribing to devices:', error);
      setIsDevicesLoading(false);
    });

    return () => unsubscribeDevices();
  }, [uid]);

  const [selectedDeviceId, setInternalSelectedDeviceId] = useState<string>(() => {
    const uidFromLocalStorage = uid || 'guest';
    return localStorage.getItem(`las_${uidFromLocalStorage}_selected_device`) || '';
  });

  const setSelectedDeviceId = (id: string) => {
    setInternalSelectedDeviceId(id);
    localStorage.setItem(`las_${uid}_selected_device`, id);
    if (uid && uid !== 'guest') {
      saveUserSettingsToFirestore(uid, { selectedDeviceId: id });
    }
  };

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
        if (data.selectedDeviceId !== undefined && data.selectedDeviceId !== selectedDeviceId) {
          setInternalSelectedDeviceId(data.selectedDeviceId);
          localStorage.setItem(`las_${uid}_selected_device`, data.selectedDeviceId);
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
      const defaultId = devices[0].id;
      setInternalSelectedDeviceId(defaultId);
      localStorage.setItem(`las_${uid}_selected_device`, defaultId);
    }
  }, [devices, selectedDeviceId, uid]);

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

  const subscribeToWebPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push is not supported in this browser.');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        console.warn('Service worker registration not found.');
        return;
      }

      // Fetch public VAPID key from the server
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) throw new Error('Failed to fetch VAPID key');
      const { publicKey } = await keyRes.json();

      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('[Web Push] Subscribed successfully:', subscription);

      // Save subscription in Firestore
      if (uid && uid !== 'guest') {
        const subscriptionJSON = subscription.toJSON();
        await savePushSubscription(uid, subscriptionJSON);
      }
    } catch (err) {
      console.error('[Web Push] Failed to subscribe to push notifications:', err);
    }
  };

  const unsubscribeFromWebPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        if (uid && uid !== 'guest') {
          await deletePushSubscription(uid, endpoint);
        }
        console.log('[Web Push] Unsubscribed successfully.');
      }
    } catch (err) {
      console.error('[Web Push] Failed to unsubscribe:', err);
    }
  };

  const savePushEnabled = async (enabled: boolean) => {
    setPushEnabled(enabled);
    localStorage.setItem(`las_${uid}_push_enabled`, String(enabled));
    await saveUserSettingsToFirestore(uid, { pushEnabled: enabled });
    if (enabled) {
      await subscribeToWebPush();
    } else {
      await unsubscribeFromWebPush();
    }
  };

  useEffect(() => {
    if (uid && uid !== 'guest' && pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToWebPush();
    }
  }, [uid, pushEnabled]);

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
      const mappedAlerts = data
        .map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          time: a.timestamp ? parseSafeDate(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
          location: a.location || 'Unknown',
          alertType: a.alertType || 'Alert',
          message: a.message || '',
          severity: (a.severity as 'critical' | 'warning' | 'normal') || 'normal',
          resolved: a.resolved === true || a.status === 'resolved' || a.resolved === 'true' || false,
          reading: a.reading !== undefined ? a.reading : null
        }));

      if (isFirstMountRef.current) {
        data.forEach(a => {
          if (a.id) notifiedAlertIdsRef.current.add(a.id);
        });
        isFirstMountRef.current = false;
      } else {
        const storedPush = localStorage.getItem(`las_${uid}_push_enabled`) === 'true' || pushEnabled;
        const currentStatus = connectionStatusRef.current;
        const lastSeenMsVal = currentStatus.lastSeen ? parseSafeDate(currentStatus.lastSeen).getTime() : 0;
        const isStaleVal = lastSeenMsVal > 0 && (Date.now() - lastSeenMsVal > 30000);
        const isDeviceOnlineVal = currentStatus.status === 'Online' && lastSeenMsVal > 0 && !isStaleVal;

        if (isDeviceOnlineVal && storedPush && 'Notification' in window && Notification.permission === 'granted') {
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
    }, selectedDeviceId);
    return () => unsubscribe();
  }, [uid, pushEnabled, selectedDeviceId]);

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

  const deleteAlert = async (id: string) => {
    setAlertsList(prev => prev.filter(alert => alert.id !== id));
    await deleteAlertFromFirestore(id);
  };

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  const isEffectiveOnline = connectionStatus.status === 'Online' && lastSeenMs > 0 && !isStale;

  const unreadAlertsCount = isEffectiveOnline ? alertsList.filter(alert => !alert.resolved).length : 0;

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

  useEffect(() => {
    if (!selectedDeviceId || devices.length === 0) {
      setConnectionStatus({ status: 'Disconnected', lastSeen: 0 });
      return;
    }
    
    // Reset to connecting state immediately when switching devices
    setConnectionStatus({ status: 'Connecting', lastSeen: 0 });
    
    const currentDevice = devices.find(d => d.id === selectedDeviceId);
    if (!currentDevice) return;

    // Use device owner if available, otherwise fallback to current user or guest
    const deviceOwnerUid = currentDevice.userId || uid || 'guest';

    const unsubscribeStatus = subscribeToDeviceStatus(deviceOwnerUid, selectedDeviceId, (status) => {
      setConnectionStatus(status);
    });

    return () => unsubscribeStatus();
  }, [uid, selectedDeviceId, devices.length]);

  const [theme, setThemeState] = useState<'light' | 'dark' | 'forest' | 'wind' | 'farm'>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as 'light' | 'dark' | 'forest' | 'wind' | 'farm') || 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark' | 'forest' | 'wind' | 'farm') => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-forest', 'theme-wind', 'theme-farm');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'forest') {
      root.classList.add('theme-forest');
    } else if (theme === 'wind') {
      root.classList.add('theme-wind');
    } else if (theme === 'farm') {
      root.classList.add('theme-farm');
    }
  }, [theme]);

  const [deviceData, setDeviceData] = useState<any>(null);
  const prevDeviceDataRef = useRef<any>(null);

  useEffect(() => {
    setDeviceData(null);
    prevDeviceDataRef.current = null;

    if (!selectedDeviceId || devices.length === 0) return;

    const currentDevice = devices.find(d => d.id === selectedDeviceId);
    if (!currentDevice) return;

    // Use device owner if available, otherwise fallback to current user or guest
    const deviceOwnerUid = currentDevice.userId || uid || 'guest';

    const unsubscribeData = subscribeToSensorData(deviceOwnerUid, selectedDeviceId, (data) => {
      setDeviceData(data);
    });

    return () => {
      unsubscribeData();
    };
  }, [uid, selectedDeviceId, devices.length]);

  useEffect(() => {
    if (!deviceData) return;

    const checkAndRecord = async (
      sensorName: string,
      currVal: number,
      prevVal: number,
      currStatus: string,
      prevStatus: string
    ) => {
      if (currStatus !== prevStatus) {
        console.log(`[Status Change] Sensor ${sensorName} changed from ${prevStatus} to ${currStatus} (Value: ${currVal})`);
        
        const currentDevice = devices.find(d => d.id === selectedDeviceId);
        
        await recordStatusChange(selectedDeviceId, sensorName, currStatus, currVal, {
          temp: curr.temperature ?? 0,
          humidity: curr.humidity ?? 0,
          co2: curr.co2 ?? 0,
          ammonia: curr.nh3 ?? curr.ammonia ?? 0,
          methane: curr.ch4 ?? curr.methane ?? 0,
          pm1_0: curr.pm1_0 ?? 0,
          pm2_5: curr.pm2_5 ?? 0,
          pm10: curr.pm10 ?? 0,
          aqi: curr.aqi ?? 0,
          timestamp: curr.timestamp
        });

        if (uid && uid !== 'guest') {
          let severity: 'critical' | 'warning' | 'normal' = 'normal';
          if (currStatus === 'Danger') {
            severity = 'critical';
          } else if (currStatus === 'Warning' || currStatus === 'Poor') {
            severity = 'warning';
          }

          await addAlertToFirestore(uid, {
            alertType: `${sensorName} Status Change`,
            message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`,
            severity,
            location: currentDevice?.name || selectedDeviceId || 'ESP32 Main Node',
            deviceId: selectedDeviceId,
            reading: currVal,
            timestamp: curr.timestamp
          });

          if (severity === 'critical') {
            toast.error(`Critical Alert: ${sensorName}`, {
              description: `Status shifted to ${currStatus} (Value: ${currVal}).`,
              duration: 8000,
            });
          }
        }
      }
    };

    const curr = deviceData;
    const prev = prevDeviceDataRef.current;

    if (prev) {
      const getStatusLabel = (type: string, val: number) => {
        const s = getSensorStatus(type, val);
        switch (s) {
          case 'DANGER': return 'Danger';
          case 'POOR': return 'Poor';
          case 'WARNING': return 'Warning';
          case 'GOOD':
          default:
            return 'Good';
        }
      };

      const currTempStat = getStatusLabel('temp', curr.temperature ?? 0);
      const prevTempStat = getStatusLabel('temp', prev.temperature ?? 0);
      checkAndRecord('Temperature', curr.temperature ?? 0, prev.temperature ?? 0, currTempStat, prevTempStat);

      const currHumStat = getStatusLabel('hum', curr.humidity ?? 0);
      const prevHumStat = getStatusLabel('hum', prev.humidity ?? 0);
      checkAndRecord('Humidity', curr.humidity ?? 0, prev.humidity ?? 0, currHumStat, prevHumStat);

      const currCo2Stat = getStatusLabel('co2', curr.co2 ?? 0);
      const prevCo2Stat = getStatusLabel('co2', prev.co2 ?? 0);
      checkAndRecord('CO2 Level', curr.co2 ?? 0, prev.co2 ?? 0, currCo2Stat, prevCo2Stat);

      const currNh3Stat = getStatusLabel('nh3', curr.nh3 ?? curr.ammonia ?? 0);
      const prevNh3Stat = getStatusLabel('nh3', prev.nh3 ?? prev.ammonia ?? 0);
      checkAndRecord('Ammonia NH3', curr.nh3 ?? curr.ammonia ?? 0, prev.nh3 ?? prev.ammonia ?? 0, currNh3Stat, prevNh3Stat);

      const currCh4Stat = getStatusLabel('ch4', curr.ch4 ?? curr.methane ?? 0);
      const prevCh4Stat = getStatusLabel('ch4', prev.ch4 ?? prev.methane ?? 0);
      checkAndRecord('Methane CH4', curr.ch4 ?? curr.methane ?? 0, prev.ch4 ?? prev.methane ?? 0, currCh4Stat, prevCh4Stat);

      const currPm25Stat = getStatusLabel('pm2.5', curr.pm2_5 ?? 0);
      const prevPm25Stat = getStatusLabel('pm2.5', prev.pm2_5 ?? 0);
      checkAndRecord('PM2.5 Feed Dust', curr.pm2_5 ?? 0, prev.pm2_5 ?? 0, currPm25Stat, prevPm25Stat);

      const currPm10Stat = getStatusLabel('pm10', curr.pm10 ?? 0);
      const prevPm10Stat = getStatusLabel('pm10', prev.pm10 ?? 0);
      checkAndRecord('PM10 Coarse Dust', curr.pm10 ?? 0, prev.pm10 ?? 0, currPm10Stat, prevPm10Stat);

      const currAqiStat = getStatusLabel('aqi', curr.aqi ?? 0);
      const prevAqiStat = getStatusLabel('aqi', prev.aqi ?? 0);
      checkAndRecord('AQI', curr.aqi ?? 0, prev.aqi ?? 0, currAqiStat, prevAqiStat);
    }

    prevDeviceDataRef.current = deviceData;
  }, [deviceData, thresholds, devices, selectedDeviceId, uid]);

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
      deleteAlert,
      unreadAlertsCount,
      refreshInterval,
      firebaseSync,
      saveSystemSettings,
      pushEnabled,
      savePushEnabled,
      isDevicesLoading,
      isOnline,
      connectionStatus,
      theme,
      setTheme,
      deviceData,
      setDeviceData
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
