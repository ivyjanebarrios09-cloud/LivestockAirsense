import React, { createContext, useContext, useState, useEffect } from 'react';

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

const LOCATIONS: LocationDetail[] = [
  { id: 'barn-a', name: 'Barn A (Gestation)', type: 'Swine', animalCount: 145, baseTemp: 21, baseHumidity: 48, baseCo2: 450, baseAmmonia: 0.4 },
  { id: 'brooder-3', name: 'Brooder House 3', type: 'Poultry', animalCount: 420, baseTemp: 27, baseHumidity: 62, baseCo2: 650, baseAmmonia: 0.8 },
  { id: 'milking-parlor', name: 'Milking Parlor', type: 'Dairy Cattle', animalCount: 64, baseTemp: 19, baseHumidity: 45, baseCo2: 400, baseAmmonia: 0.3 }
];

interface AppContextType {
  uid: string;
  locations: LocationDetail[];
  addLocation: (loc: LocationDetail) => void;
  deleteLocation: (id: string) => void;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  activeLocation: LocationDetail;
  thresholds: Thresholds;
  saveThresholds: (newThresholds: Thresholds) => void;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  alertsList: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'time'>) => void;
  resolveAlert: (id: string) => void;
  clearAllAlerts: () => void;
  unreadAlertsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children, uid }: { children: React.ReactNode; uid: string }) {
  // Load location list and current selection
  const [locations, setLocations] = useState<LocationDetail[]>(() => {
    const saved = localStorage.getItem(`las_${uid}_locations`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return LOCATIONS;
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem(`las_${uid}_selected_location`) || 'barn-a';
  });

  const activeLocation = locations.find(l => l.id === selectedLocationId) || locations[0] || LOCATIONS[0];

  // Save selection
  useEffect(() => {
    localStorage.setItem(`las_${uid}_selected_location`, selectedLocationId);
  }, [selectedLocationId, uid]);

  // Save locations list
  useEffect(() => {
    localStorage.setItem(`las_${uid}_locations`, JSON.stringify(locations));
  }, [locations, uid]);

  const addLocation = (loc: LocationDetail) => {
    setLocations(prev => [...prev, loc]);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (selectedLocationId === id) {
        if (updated.length > 0) {
          setSelectedLocationId(updated[0].id);
        }
      }
      return updated;
    });
  };

  // Load alert thresholds
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

  const saveThresholds = (newThreshold: Thresholds) => {
    setThresholds(newThreshold);
    localStorage.setItem(`las_${uid}_thresholds`, JSON.stringify(newThreshold));
  };

  // Mock static initial list of historical alerts
  const [alertsList, setAlertsList] = useState<Alert[]>(() => {
    const saved = localStorage.getItem(`las_${uid}_alerts_list`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: '1',
        time: '10:45 AM',
        location: 'Brooder House 3',
        alertType: 'Ammonia Spike',
        message: 'Ammonia reading reached 4.1 ppm; ventilation check advised.',
        severity: 'warning',
        resolved: false
      },
      {
        id: '2',
        time: '08:12 AM',
        location: 'Barn A (Gestation)',
        alertType: 'High CO2',
        message: 'CO2 levels surpassed 800 ppm during feeding.',
        severity: 'warning',
        resolved: true
      },
      {
        id: '3',
        time: 'Yesterday',
        location: 'Milking Parlor',
        alertType: 'High Temp Alert',
        message: 'Temperature exceeded 26°C; heat stress mitigation active.',
        severity: 'critical',
        resolved: true
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`las_${uid}_alerts_list`, JSON.stringify(alertsList));
  }, [alertsList, uid]);

  // Handle live automatic threshold telemetry trigger simulation
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // Small randomized fluctuation to simulate potential warnings
      const randomValue = Math.random();
      if (randomValue > 0.95) {
        // Trigger simulated warning!
        const alertTriggerType = Math.random() > 0.5 ? 'CO2 Alert' : 'Temp Alert';
        let alertMessage = '';
        let severity: 'critical' | 'warning' = 'warning';

        if (alertTriggerType === 'CO2 Alert') {
          alertMessage = `Carbon Dioxide level reached ${Math.round(thresholds.co2Max + 120)} ppm, exceeding safe threshold.`;
          severity = 'warning';
        } else {
          alertMessage = `Temperature detected at ${(thresholds.tempMax + 1.5).toFixed(1)}°C, risk of animal distress.`;
          severity = 'critical';
        }

        const newAlert: Alert = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: activeLocation.name,
          alertType: alertTriggerType,
          message: alertMessage,
          severity,
          resolved: false
        };

        setAlertsList(prev => [newAlert, ...prev]);

        // Push Web Notifications if permitted
        if (localStorage.getItem(`las_${uid}_push_enabled`) === 'true' && 'Notification' in window && Notification.permission === 'granted') {
          const title = `LAS ${newAlert.severity.toUpperCase()}: ${newAlert.alertType}`;
          const options = {
            body: `${newAlert.location} - ${newAlert.message}`,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: severity === 'critical' ? [200, 100, 200, 100, 200] : [100, 50, 100],
            requireInteraction: severity === 'critical',
            tag: newAlert.id
          };
          
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(title, options);
            }).catch(err => {
              console.error('Service Worker showNotification failed, fallback to standard Notification', err);
              new Notification(title, options);
            });
          } else {
             new Notification(title, options);
          }
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checkInterval);
  }, [activeLocation, thresholds]);

  // Resolve Alert action
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

  // Clear all resolved Alerts
  const clearAllAlerts = () => {
    setAlertsList(prev => prev.filter(alert => !alert.resolved));
  };

  const unreadAlertsCount = alertsList.filter(alert => !alert.resolved).length;

  // Mock Pull-To-Refresh Syncing Animation Simulation
  const [isSyncing, setIsSyncing] = useState(false);
  const triggerSync = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSyncing(false);
  };

  return (
    <AppContext.Provider value={{
      uid,
      locations,
      addLocation,
      deleteLocation,
      selectedLocationId,
      setSelectedLocationId,
      activeLocation,
      thresholds,
      saveThresholds,
      isSyncing,
      triggerSync,
      alertsList,
      addAlert,
      resolveAlert,
      clearAllAlerts,
      unreadAlertsCount
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
