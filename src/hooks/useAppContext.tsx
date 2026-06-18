import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAlerts, getLocations, addLocationToFirestore, deleteLocationFromFirestore } from '../lib/firebase';

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

interface AppContextType {
  uid: string;
  locations: LocationDetail[];
  addLocation: (loc: LocationDetail) => void;
  deleteLocation: (id: string) => void;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children, uid }: { children: React.ReactNode; uid: string }) {
  // Load location list and current selection
  const [locations, setLocations] = useState<LocationDetail[]>([]);

  useEffect(() => {
    getLocations().then(setLocations);
  }, [uid]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem(`las_${uid}_selected_location`) || '';
  });

  const activeLocation = locations.find(l => l.id === selectedLocationId) || (locations.length > 0 ? locations[0] : undefined);

  // Save selection
  useEffect(() => {
    localStorage.setItem(`las_${uid}_selected_location`, selectedLocationId);
  }, [selectedLocationId, uid]);

  const addLocation = async (loc: LocationDetail) => {
    await addLocationToFirestore(loc);
    setLocations(prev => [...prev, loc]);
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

  // Alerts managed via Firestore
  const [alertsList, setAlertsList] = useState<Alert[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts((data) => {
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
