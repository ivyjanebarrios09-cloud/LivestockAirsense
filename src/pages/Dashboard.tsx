import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, parseSafeDate, getSensorStatus, getStatusBgColor } from '../lib/utils';
import { useAppContext } from '../hooks/useAppContext';
import { Interactive3DAtmosphere } from '../components/Interactive3DAtmosphere';
import { AirLoading } from '../components/AirLoading';
import { recordStatusChange, subscribeToSensorData, getSensorReadings, addAlertToFirestore, subscribeToSensorReadings, subscribeToDeviceStatus } from '../lib/firebase';
import { toast } from 'sonner';
import { Cpu, Plus, Layers, Wifi, Sliders, Wrench, Zap, Clock } from 'lucide-react';

const TempSvg = ({ className, isWarning }: { className?: string; isWarning?: boolean }) => {
  const gradientId = isWarning ? "tempGradWarning" : "tempGradNormal";
  const colorStart = isWarning ? "#ef4444" : "#f97316";
  const colorEnd = isWarning ? "#b91c1c" : "#ea580c";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v6" stroke={`url(#${gradientId})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="2" fill={`url(#${gradientId})`} />
    </svg>
  );
};

const HumiditySvg = ({ className, isWarning }: { className?: string; isWarning?: boolean }) => {
  const gradientId = isWarning ? "humGradWarning" : "humGradNormal";
  const colorStart = isWarning ? "#ef4444" : "#3b82f6";
  const colorEnd = isWarning ? "#b91c1c" : "#1d4ed8";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8c2 2 3.5 4 3.5 5.5a3.5 3.5 0 1 1-7 0C8.5 12 10 10 12 8z" fill={`url(#${gradientId})`} />
    </svg>
  );
};

const Co2Svg = ({ className, isWarning }: { className?: string; isWarning?: boolean }) => {
  const gradientId = isWarning ? "co2GradWarning" : "co2GradNormal";
  const colorStart = isWarning ? "#ef4444" : "#10b981";
  const colorEnd = isWarning ? "#b91c1c" : "#047857";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-1.8-1.4-3.3-3.2-3.5C17.3 9.4 15 7.5 12 7.5s-5.3 1.9-5.8 4.5C4.4 12.2 3 13.7 3 15.5A3.5 3.5 0 0 0 6.5 19h11z" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="14" r="1.5" fill="currentColor" />
      <circle cx="14.5" cy="14" r="1.5" fill="currentColor" />
      <line x1="11" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

const AmmoniaSvg = ({ className, isWarning }: { className?: string; isWarning?: boolean }) => {
  const gradientId = isWarning ? "nh3GradWarning" : "nh3GradNormal";
  const colorStart = isWarning ? "#ef4444" : "#ca8a04";
  const colorEnd = isWarning ? "#b91c1c" : "#a16207";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <line x1="12" y1="7" x2="6" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="7" x2="18" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="7" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="3.5" fill={`url(#${gradientId})`} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="16" r="2.5" fill="currentColor" />
      <circle cx="18" cy="16" r="2.5" fill="currentColor" />
      <circle cx="12" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
};

const PM25Svg = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="dustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
      <path d="M2.5 7.5h14a2.5 2.5 0 0 0 2.5-2.5h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12h11a2 2 0 0 1 2 2h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 16.5h8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="11.5" r="1.5" fill="url(#dustGrad)" />
      <circle cx="14" cy="19" r="1" fill="url(#dustGrad)" />
      <circle cx="10" cy="4" r="1.2" fill="url(#dustGrad)" />
    </svg>
  );
};

const MethaneSvg = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="methaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <line x1="12" y1="12" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="6" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="18" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="url(#methaneGrad)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="6" cy="17" r="2" fill="currentColor" />
      <circle cx="18" cy="17" r="2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.8" fill="currentColor" />
    </svg>
  );
};

const AqiSvg = ({ className, isWarning }: { className?: string; isWarning?: boolean }) => {
  const gradientId = isWarning ? "aqiGradWarning" : "aqiGradNormal";
  const colorStart = isWarning ? "#ef4444" : "#10b981";
  const colorEnd = isWarning ? "#b91c1c" : "#059669";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
      <path d="M12 5a7 7 0 0 1 7 7 7 7 0 0 1-7 7 7 7 0 0 1-7-7" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.5" />
      <path d="M12 12l2-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};


const CloudWindAnimation = ({ colorClass }: { colorClass?: string }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Animated Air/Wind Current 1 */}
      <svg
        className={cn(
          "absolute right-2 bottom-6 w-20 h-6 opacity-20 group-hover:opacity-45 transition-all duration-500 animate-air-flow-1",
          colorClass
        )}
        viewBox="0 0 100 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M10 15c15-5 30 5 45 0s25-10 35-5" />
      </svg>
      {/* Animated Air/Wind Current 2 */}
      <svg
        className={cn(
          "absolute right-4 bottom-12 w-16 h-4 opacity-15 group-hover:opacity-35 transition-all duration-500 animate-air-flow-2",
          colorClass
        )}
        viewBox="0 0 100 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M5 10c20 5 40-5 55 0s25 8 35 2" />
      </svg>
      {/* Animated Air/Wind Current 3 */}
      <svg
        className={cn(
          "absolute left-4 top-8 w-24 h-5 opacity-10 group-hover:opacity-30 transition-all duration-500 animate-air-flow-3",
          colorClass
        )}
        viewBox="0 0 100 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <path d="M5 8c25-3 45 5 65-1s20-6 25-2" />
      </svg>

      {/* Cloud 1 (Drifting Background Cloud - Bottom Right) */}
      <svg
        className={cn(
          "absolute -right-2 -bottom-2 w-20 h-16 opacity-15 group-hover:opacity-30 transition-all duration-500 animate-cloud-drift",
          colorClass
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.36 15.37A5.474 5.474 0 0 0 20 12a5.5 5.5 0 0 0-5.5-5.5c-.32 0-.63.03-.94.09A7 7 0 0 0 4 10.5a7 7 0 0 0 5.4 6.8 5.46 5.46 0 0 0 3.1.2 5.5 5.5 0 0 0 6.86-2.13z" />
      </svg>

      {/* Cloud 2 (Drifting Background Cloud - Top Right) */}
      <svg
        className={cn(
          "absolute right-8 top-1 w-16 h-12 opacity-[0.08] group-hover:opacity-[0.18] transition-all duration-500 animate-cloud-drift-slow",
          colorClass
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.36 15.37A5.474 5.474 0 0 0 20 12a5.5 5.5 0 0 0-5.5-5.5c-.32 0-.63.03-.94.09A7 7 0 0 0 4 10.5a7 7 0 0 0 5.4 6.8 5.46 5.46 0 0 0 3.1.2 5.5 5.5 0 0 0 6.86-2.13z" />
      </svg>

      {/* Cloud 3 (Drifting Background Cloud - Middle Left) */}
      <svg
        className={cn(
          "absolute -left-3 bottom-4 w-12 h-10 opacity-[0.06] group-hover:opacity-[0.14] transition-all duration-500 animate-cloud-drift-fast",
          colorClass
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.36 15.37A5.474 5.474 0 0 0 20 12a5.5 5.5 0 0 0-5.5-5.5c-.32 0-.63.03-.94.09A7 7 0 0 0 4 10.5a7 7 0 0 0 5.4 6.8 5.46 5.46 0 0 0 3.1.2 5.5 5.5 0 0 0 6.86-2.13z" />
      </svg>
    </div>
  );
};

export function Dashboard() {
  const { 
    uid, 
    thresholds, 
    isSyncing, 
    triggerSync, 
    alertsList, 
    selectedDeviceId, 
    setSelectedDeviceId,
    devices, 
    refreshInterval,
    addDevice,
    isDevicesLoading,
    isOnline,
    connectionStatus
  } = useAppContext();

  const [isAddingDevicePopup, setIsAddingDevicePopup] = useState(false);
  const [onboardingDevId, setOnboardingDevId] = useState(() => `EP-ESP32-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [onboardingDevName, setOnboardingDevName] = useState('ESP32 Main Node');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = connectionStatus.lastSeen ? parseSafeDate(connectionStatus.lastSeen).getTime() : 0;
  const isStale = lastSeenMs > 0 && (now - lastSeenMs > 30000);
  const effectiveStatus = isStale ? 'Offline' : (lastSeenMs > 0 ? 'Online' : connectionStatus.status);
  const isEffectiveOnline = effectiveStatus === 'Online';

  const handleCustomRegisterSetup = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const devId = onboardingDevId.trim();
    const devName = onboardingDevName.trim();

    console.log('Starting registration for:', devId, devName);

    if (!devName || !devId) {
      setOnboardingError('Please fill in all the registration fields.');
      toast.error('Registration fields are required');
      return;
    }

    setIsOnboardingSaving(true);
    setOnboardingError(null);
    const toastId = toast.loading('Registering hardware node...');

    try {
      console.log('Calling addDevice...');
      await addDevice({
         id: devId,
         deviceId: devId,
         name: devName,
         locationId: 'default',
         type: 'Livestock Air Sensor'
      });
      
      console.log('addDevice successful');
      toast.success('Device registered successfully!', { id: toastId });
      setSelectedDeviceId(devId);
      setIsAddingDevicePopup(false);
    } catch (err: any) {
      console.error('Registration error in Dashboard:', err);
      const errMsg = err.message || 'Failed to register the custom telemetry device.';
      setOnboardingError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const registeredDevices = devices;

  const [deviceData, setDeviceData] = useState<any>(null);

  const currentDevice = devices.find(d => d.id === selectedDeviceId);
  const deviceOwnerUid = currentDevice?.sharedFromUid || uid;

  useEffect(() => {
    // Reset data when switching devices to avoid showing stale data from the previous device
    setDeviceData(null);

    // Only subscribe if we have a valid selection and the device actually exists in our list
    if (!selectedDeviceId || !deviceOwnerUid || devices.length === 0) return;
    
    // Safety check: ensure selectedDeviceId is in the current devices list
    const exists = devices.some(d => d.id === selectedDeviceId);
    if (!exists) return;

    const unsubscribeData = subscribeToSensorData(deviceOwnerUid, selectedDeviceId, (data) => {
        setDeviceData(data);
    });

    return () => {
      unsubscribeData();
    };
  }, [selectedDeviceId, deviceOwnerUid, devices.length]);

  const lastReading = deviceData || { 
      temperature: 0, 
      humidity: 0, 
      co2: 0, 
      nh3: 0, 
      ch4: 0, 
      aqi: 0,
      pm1_0: 0,
      pm2_5: 0,
      pm10: 0
  };

  const isTempAlert = getSensorStatus('temp', lastReading.temperature) !== 'GOOD';
  const isHumAlert = getSensorStatus('hum', lastReading.humidity) !== 'GOOD';
  const isCo2Alert = getSensorStatus('co2', lastReading.co2) !== 'GOOD';
  const isAmmoniaAlert = getSensorStatus('nh3', lastReading.nh3) !== 'GOOD';
  const isPm25Alert = getSensorStatus('pm2.5', lastReading.pm2_5 || 0) !== 'GOOD';
  const isMethaneAlert = getSensorStatus('ch4', lastReading.ch4 || 0) !== 'GOOD';
  const isAqiAlert = getSensorStatus('aqi', lastReading.aqi || 0) !== 'GOOD';

  const activeIssueCount = (isTempAlert ? 1 : 0) + (isHumAlert ? 1 : 0) + (isCo2Alert ? 1 : 0) + (isAmmoniaAlert ? 1 : 0) + (isPm25Alert ? 1 : 0) + (isMethaneAlert ? 1 : 0) + (isAqiAlert ? 1 : 0);

  const getStatus = (label: string, val: number) => {
    const status = getSensorStatus(label, val);
    switch (status) {
      case 'DANGER':
        return { label: 'Danger', icon: '🔴', color: 'text-red-500' };
      case 'POOR':
        return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
      case 'WARNING':
        return { label: 'Warning', icon: '🟡', color: 'text-yellow-500' };
      case 'GOOD':
      default:
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
    }
  };

  const getStylesByStatus = (status: { label: string; color: string }) => {
    const label = status?.label || 'Good';
    if (label === 'Good' || label === 'Excellent') {
      return {
        borderClass: 'border-emerald-500/25 hover:border-emerald-500/50 shadow-[0_4px_20px_rgba(16,185,129,0.04)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/5',
        bgClass: 'bg-emerald-500/10 border border-emerald-500/15 group-hover:bg-emerald-500/15',
        textClass: '!text-emerald-500',
        cardBg: 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]'
      };
    }
    if (label === 'Warning') {
      return {
        borderClass: 'border-yellow-500/25 hover:border-yellow-500/50 shadow-[0_4px_20px_rgba(234,179,8,0.04)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.1)] ring-1 ring-yellow-500/5',
        bgClass: 'bg-yellow-500/10 border border-yellow-500/15 group-hover:bg-yellow-500/15',
        textClass: '!text-yellow-500',
        cardBg: 'bg-yellow-500/[0.02] dark:bg-yellow-500/[0.01]'
      };
    }
    if (label === 'Poor') {
      return {
        borderClass: 'border-orange-500/30 hover:border-orange-500/60 shadow-[0_4px_20px_rgba(249,115,22,0.06)] hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/10',
        bgClass: 'bg-orange-500/10 border border-orange-500/15 group-hover:bg-orange-500/15',
        textClass: '!text-orange-500',
        cardBg: 'bg-orange-500/[0.02] dark:bg-orange-500/[0.01]'
      };
    }
    if (label === 'Danger' || label === 'Very Poor') {
      return {
        borderClass: 'bg-red-50/5 border-red-500/40 hover:border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.08)] hover:shadow-[0_8px_30px_rgba(239,68,68,0.16)] ring-1 ring-red-500/20',
        bgClass: 'bg-red-500/15 border border-red-500/25 group-hover:bg-red-500/20',
        textClass: '!text-red-500',
        cardBg: 'bg-red-500/[0.03] dark:bg-red-500/[0.01]'
      };
    }
    // Dangerous / Hazardous
    return {
      borderClass: 'bg-red-100/10 border-red-700/60 hover:border-red-800 shadow-[0_4px_20px_rgba(185,28,28,0.1)] hover:shadow-[0_8px_30px_rgba(185,28,28,0.22)] ring-2 ring-red-600/30',
      bgClass: 'bg-red-700/20 border border-red-700/30 group-hover:bg-red-700/25',
      textClass: '!text-red-600 dark:!text-red-400',
      cardBg: 'bg-red-700/[0.05] dark:bg-red-700/[0.02]'
    };
  };

  const prevDeviceDataRef = useRef<any>(null);

  useEffect(() => {
    if (!deviceData) return;
    
    if (prevDeviceDataRef.current) {
      const prev = prevDeviceDataRef.current;
      const curr = deviceData;

      const checkAndRecord = async (
        sensorName: string,
        currVal: number,
        prevVal: number,
        currStatus: string,
        prevStatus: string
      ) => {
        if (currStatus !== prevStatus) {
          console.log(`[Status Change] Sensor ${sensorName} changed from ${prevStatus} to ${currStatus} (Value: ${currVal})`);
          await recordStatusChange(selectedDeviceId, sensorName, currStatus, currVal, {
            temp: curr.temperature ?? 0,
            humidity: curr.humidity ?? 0,
            co2: curr.co2 ?? 0,
            ammonia: curr.nh3 ?? curr.ammonia ?? 0,
            methane: curr.ch4 ?? curr.methane ?? 0,
            pm1_0: curr.pm1_0 ?? 0,
            pm2_5: curr.pm2_5 ?? 0,
            pm10: curr.pm10 ?? 0,
            aqi: curr.aqi ?? 0
          });

          if (uid) {
            let severity: 'critical' | 'warning' | 'normal' = 'normal';
            if (currStatus === 'Dangerous' || currStatus === 'Hazardous' || currStatus === 'Very Poor') {
              severity = 'critical';
            } else if (currStatus === 'Warning' || currStatus === 'Poor' || currStatus === 'Moderate') {
              severity = 'warning';
            }

            await addAlertToFirestore(uid, {
              alertType: `${sensorName} Status Change`,
              message: `${sensorName} shifted from ${prevStatus} to ${currStatus} (Value: ${currVal})`,
              severity,
              location: currentDevice?.name || selectedDeviceId || 'ESP32 Main Node'
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

      const currTempStat = getStatus('Temperature', curr.temperature ?? 0).label;
      const prevTempStat = getStatus('Temperature', prev.temperature ?? 0).label;
      checkAndRecord('Temperature', curr.temperature ?? 0, prev.temperature ?? 0, currTempStat, prevTempStat);

      const currHumStat = getStatus('Humidity', curr.humidity ?? 0).label;
      const prevHumStat = getStatus('Humidity', prev.humidity ?? 0).label;
      checkAndRecord('Humidity', curr.humidity ?? 0, prev.humidity ?? 0, currHumStat, prevHumStat);

      const currCo2Stat = getStatus('CO2 Level', curr.co2 ?? 0).label;
      const prevCo2Stat = getStatus('CO2 Level', prev.co2 ?? 0).label;
      checkAndRecord('CO2 Level', curr.co2 ?? 0, prev.co2 ?? 0, currCo2Stat, prevCo2Stat);

      const currNh3Stat = getStatus('Ammonia NH3', curr.nh3 ?? curr.ammonia ?? 0).label;
      const prevNh3Stat = getStatus('Ammonia NH3', prev.nh3 ?? prev.ammonia ?? 0).label;
      checkAndRecord('Ammonia NH3', curr.nh3 ?? curr.ammonia ?? 0, prev.nh3 ?? prev.ammonia ?? 0, currNh3Stat, prevNh3Stat);

      const currCh4Stat = getStatus('Methane CH4', curr.ch4 ?? curr.methane ?? 0).label;
      const prevCh4Stat = getStatus('Methane CH4', prev.ch4 ?? prev.methane ?? 0).label;
      checkAndRecord('Methane CH4', curr.ch4 ?? curr.methane ?? 0, prev.ch4 ?? prev.methane ?? 0, currCh4Stat, prevCh4Stat);

      const currPm25Stat = getStatus('PM2.5 Feed Dust', curr.pm2_5 ?? 0).label;
      const prevPm25Stat = getStatus('PM2.5 Feed Dust', prev.pm2_5 ?? 0).label;
      checkAndRecord('PM2.5 Feed Dust', curr.pm2_5 ?? 0, prev.pm2_5 ?? 0, currPm25Stat, prevPm25Stat);

      const currAqiStat = getStatus('AQI', curr.aqi ?? 0).label;
      const prevAqiStat = getStatus('AQI', prev.aqi ?? 0).label;
      checkAndRecord('AQI', curr.aqi ?? 0, prev.aqi ?? 0, currAqiStat, prevAqiStat);
    }

    prevDeviceDataRef.current = deviceData;
  }, [deviceData, thresholds]);

  const tempStatus = getStatus('Temperature', lastReading.temperature);
  const humStatus = getStatus('Humidity', lastReading.humidity);
  const co2Status = getStatus('CO2 Level', lastReading.co2);
  const ammoniaStatus = getStatus('Ammonia NH3', lastReading.nh3);
  const pmStatus = getStatus('PM2.5 Feed Dust', lastReading.pm2_5 || 0);
  const methaneStatus = getStatus('Methane CH4', lastReading.ch4 || 0);
  const aqiStatus = getStatus('AQI Index', lastReading.aqi || 0);

  const metrics = [
    { 
      label: 'Temperature', 
      value: lastReading.temperature?.toFixed(1) + ' °C', 
      icon: TempSvg, 
      ...getStylesByStatus(tempStatus),
      bg: isTempAlert 
        ? getStylesByStatus(tempStatus).bgClass
        : 'bg-orange-500/10 border border-orange-500/15 group-hover:bg-orange-500/15',
      cardStyle: getStylesByStatus(tempStatus).borderClass,
      color: getStylesByStatus(tempStatus).textClass,
      isWarning: isTempAlert,
      status: tempStatus,
      limitInfo: `${thresholds.tempMax}°C`
    },
    { 
      label: 'Humidity', 
      value: lastReading.humidity?.toFixed(1) + ' %', 
      icon: HumiditySvg, 
      ...getStylesByStatus(humStatus),
      bg: isHumAlert 
        ? getStylesByStatus(humStatus).bgClass
        : 'bg-blue-500/10 border border-blue-500/15 group-hover:bg-blue-500/15',
      cardStyle: getStylesByStatus(humStatus).borderClass,
      color: getStylesByStatus(humStatus).textClass,
      isWarning: isHumAlert,
      status: humStatus,
      limitInfo: `${thresholds.humidityMax}%`
    },
    { 
      label: 'CO2 Level', 
      value: Math.round(lastReading.co2 || 0) + ' ppm', 
      icon: Co2Svg, 
      ...getStylesByStatus(co2Status),
      bg: isCo2Alert 
        ? getStylesByStatus(co2Status).bgClass
        : 'bg-emerald-500/10 border border-emerald-500/15 group-hover:bg-emerald-500/15',
      cardStyle: getStylesByStatus(co2Status).borderClass,
      color: getStylesByStatus(co2Status).textClass,
      isWarning: isCo2Alert,
      status: co2Status,
      limitInfo: `${thresholds.co2Max} ppm`
    },
    { 
      label: 'Ammonia NH3', 
      value: lastReading.nh3?.toFixed(2) + ' ppm', 
      icon: AmmoniaSvg, 
      ...getStylesByStatus(ammoniaStatus),
      bg: isAmmoniaAlert 
        ? getStylesByStatus(ammoniaStatus).bgClass
        : 'bg-yellow-600/10 border border-yellow-600/15 group-hover:bg-yellow-650/15',
      cardStyle: getStylesByStatus(ammoniaStatus).borderClass,
      color: getStylesByStatus(ammoniaStatus).textClass,
      isWarning: isAmmoniaAlert,
      status: ammoniaStatus,
      limitInfo: `${thresholds.ammoniaMax} ppm`
    },
    { 
      label: 'PM2.5 Feed Dust', 
      value: (lastReading.pm2_5 || 0).toFixed(1) + ' µg/m³', 
      icon: PM25Svg, 
      ...getStylesByStatus(pmStatus),
      bg: isPm25Alert 
        ? getStylesByStatus(pmStatus).bgClass
        : 'bg-purple-500/10 border border-purple-500/15 group-hover:bg-purple-500/15',
      cardStyle: getStylesByStatus(pmStatus).borderClass,
      color: getStylesByStatus(pmStatus).textClass,
      isWarning: isPm25Alert,
      status: pmStatus,
      limitInfo: '12 µg'
    },
    { 
      label: 'Methane CH4', 
      value: lastReading.ch4?.toFixed(2) + ' ppm', 
      icon: MethaneSvg, 
      ...getStylesByStatus(methaneStatus),
      bg: isMethaneAlert 
        ? getStylesByStatus(methaneStatus).bgClass
        : 'bg-slate-500/10 border border-slate-500/15 group-hover:bg-slate-500/15',
      cardStyle: getStylesByStatus(methaneStatus).borderClass,
      color: getStylesByStatus(methaneStatus).textClass,
      isWarning: isMethaneAlert,
      status: methaneStatus,
      limitInfo: `${thresholds.methaneMax} ppm`
    },
    { 
      label: 'Overall AQI', 
      value: Math.round(lastReading.aqi || 0).toString(), 
      icon: AqiSvg, 
      ...getStylesByStatus(aqiStatus),
      bg: isAqiAlert 
        ? getStylesByStatus(aqiStatus).bgClass
        : 'bg-emerald-500/10 border border-emerald-500/15 group-hover:bg-emerald-500/15',
      cardStyle: getStylesByStatus(aqiStatus).borderClass,
      color: getStylesByStatus(aqiStatus).textClass,
      isWarning: isAqiAlert,
      status: aqiStatus,
      limitInfo: '100 AQI'
    },
  ];

  if (isDevicesLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-28 min-h-[80vh] flex flex-col items-center justify-center bg-system-bg">
        <AirLoading />
        <div className="space-y-2 text-center -mt-4">
          <p className="text-system-accent font-bold font-mono uppercase tracking-widest text-[10px]">Synchronizing Nodes</p>
          <p className="text-system-muted text-[8px] font-mono uppercase tracking-tighter">Establishing Secure Telemetry Tunnel...</p>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-28 min-h-[80vh] flex flex-col justify-center">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-system-accent/15 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-36 -mb-36 pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-550/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold font-mono tracking-wide uppercase select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
              </span>
              No Telemetry Edge Nodes Registered
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase font-mono bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Register Your AirSense Node
            </h1>
            
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Connect your physical ESP32 edge telemetry hardware to your account. Enter your device's unique token below to begin receiving live livestock environment data.
            </p>
          </div>

          <div className="mt-10 relative z-10 border-t border-white/10 pt-8">
            <form onSubmit={handleCustomRegisterSetup} className="max-w-md space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Cpu className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase font-mono">Custom Device Pairing</h3>
              </div>

              {onboardingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-mono">
                  {onboardingError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block flex items-center justify-between">
                    Hardware Token ID
                    <span className="text-[9px] lowercase font-normal opacity-60">Found on device label</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingDevId}
                    onChange={(e) => setOnboardingDevId(e.target.value)}
                    className="w-full text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-system-accent bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">Friendly Device Name</label>
                <input
                  type="text"
                  required
                  value={onboardingDevName}
                  onChange={(e) => setOnboardingDevName(e.target.value)}
                  placeholder="e.g. ESP32 Sensor Array 1"
                  className="w-full text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-system-accent bg-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isOnboardingSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 py-3 px-4 text-xs font-bold tracking-wider shadow-lg hover:shadow-xl transition-all font-mono uppercase disabled:opacity-50 cursor-pointer"
                >
                  Register & Activate Node
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen removed to ensure dashboard always renders
  // if (selectedDeviceId && !deviceData) {
  //   return (
  //     <div className="p-4 md:p-8 max-w-md mx-auto space-y-6 animate-in fade-in duration-300 pb-28 min-h-[80vh] flex flex-col justify-center">
  //        ...
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-28">
      
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md md:shadow-xl rounded-xl md:rounded-2xl p-3 md:p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6 min-h-[auto] md:min-h-[140px] group transition-all duration-300">
        
        <Interactive3DAtmosphere hasAlerts={activeIssueCount > 0} />

        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 z-10 w-full md:w-auto">
          <div className="flex items-center gap-4">
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[8px] md:text-[9px] text-slate-300 font-mono uppercase tracking-widest font-bold select-none whitespace-nowrap hidden sm:block">Identifier</label>
            <div className="relative inline-block w-full sm:w-auto flex-1">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-white/10 hover:bg-white/15 border border-white/20 select-none cursor-pointer rounded-lg px-2 md:px-3 py-1 md:py-2 text-xs md:text-base font-black tracking-tight text-white focus:outline-none pr-7 md:pr-9 appearance-none transition-colors leading-none w-full sm:w-auto"
              >
                {devices?.map((dev) => (
                  <option key={dev.id} value={dev.id} className="text-slate-900 font-semibold bg-white">
                    {dev.name} ({dev.id})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 md:pr-3.5 text-white">
                <svg className="fill-current h-3 w-3 md:h-4 md:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 w-full md:w-auto bg-white/10 md:bg-white/5 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-4 md:gap-5 z-10 select-none min-w-0 md:min-w-[240px] overflow-hidden group shadow-lg">
          <div className="space-y-0.5 md:space-y-1 z-10 min-w-0 flex-1">
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-mono truncate font-bold">Climate Safety</p>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className={cn(
                "px-2 md:px-2.5 py-0.5 rounded md:rounded-lg text-[9px] md:text-xs font-black shrink-0 uppercase tracking-wider border",
                activeIssueCount > 0 
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              )}>
                {activeIssueCount > 0 ? `${activeIssueCount} HAZARDS` : 'SECURE'}
              </span>
            </div>
            <p className="text-[8px] md:text-[10px] text-slate-300 truncate hidden sm:block opacity-70">
              {activeIssueCount > 0 ? 'Exceeds thresholds!' : 'Ventilation operates efficiently.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Status Overlay (Only show when syncing) */}
      {isSyncing && (
        <div className="bg-system-accent/10 border border-system-accent/30 text-system-accent rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold animate-pulse shadow-sm mb-4">
          Synchronizing air quality data streams with cloud database...
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2.5">
        {metrics.filter(m => m.status.label === 'Good').length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 select-none shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-500">
              {metrics.filter(m => m.status.label === 'Good').length} Sensor{metrics.filter(m => m.status.label === 'Good').length > 1 ? 's' : ''} Normal
            </span>
          </div>
        )}
        {metrics.filter(m => m.status.label === 'Warning').length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 select-none shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-500">
              {metrics.filter(m => m.status.label === 'Warning').length} Sensor{metrics.filter(m => m.status.label === 'Warning').length > 1 ? 's' : ''} Warning
            </span>
          </div>
        )}
        {metrics.filter(m => m.status.label === 'Poor').length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 select-none shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-500">
              {metrics.filter(m => m.status.label === 'Poor').length} Sensor{metrics.filter(m => m.status.label === 'Poor').length > 1 ? 's' : ''} Poor
            </span>
          </div>
        )}
        {metrics.filter(m => m.status.label === 'Danger').length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 select-none shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-500">
              {metrics.filter(m => m.status.label === 'Danger').length} Sensor{metrics.filter(m => m.status.label === 'Danger').length > 1 ? 's' : ''} Hazard
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 md:mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {metrics.map((metric, idx) => {
          const IconComponent = metric.icon;
          const statusStyles = getStylesByStatus(metric.status);
          return (
            <div 
              key={idx} 
              className={cn(
                "rounded-[1.25rem] p-3 sm:p-3.5 flex flex-col justify-between h-24 sm:h-28 relative overflow-hidden transition-all duration-300 group select-none border hover:-translate-y-1",
                statusStyles.borderClass,
                statusStyles.cardBg
              )}
            >
              <div className="relative z-10 flex justify-between items-start gap-2">
                <span className="font-mono text-[8px] md:text-[9px] text-system-muted uppercase tracking-wider leading-tight mt-0.5 line-clamp-2 pr-0.5">{metric.label}</span>
                <div className={cn("p-1.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110", statusStyles.bgClass)}>
                  <IconComponent className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", statusStyles.textClass)} isWarning={metric.isWarning} />
                </div>
              </div>

              <div className="relative z-10 space-y-0.5 mt-1 sm:mt-0">
                <div className="text-sm sm:text-base md:text-lg font-black tracking-tight tabular-nums transition-colors duration-300 text-system-text">
                  {metric.value}
                </div>
                <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-system-muted min-h-[0.75rem]">
                  <span className={cn("flex items-center gap-1 font-bold", metric.status.color)}>
                    <span>{metric.status.icon}</span>
                    {metric.status.label}
                  </span>
                </div>
              </div>

              <CloudWindAnimation colorClass={statusStyles.textClass} />

              <div className={cn("absolute -bottom-10 -right-10 w-24 h-24 rounded-full opacity-[0.03] blur-xl group-hover:opacity-10 transition-opacity flex-shrink-0 bg-current pointer-events-none", statusStyles.textClass)} />
            </div>
          );
        })}
      </div>

      <div className="max-w-md w-full ml-0">
        
        {/* Recent Node Logs & Status Diagnostics */}
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 flex flex-col h-[400px] overflow-hidden select-none">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-system-border pb-3 shrink-0">
              <h3 className="text-sm font-bold tracking-tight uppercase font-mono">Telemetry Receivers</h3>
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all duration-500",
                isEffectiveOnline ? getStatusBgColor('GOOD') : getStatusBgColor('DANGER')
              )}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isEffectiveOnline ? "bg-emerald-400 animate-ping" : "bg-red-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    isEffectiveOnline ? "bg-emerald-500" : "bg-red-500"
                  )}></span>
                </span>
                {devices.length} {isEffectiveOnline ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>

            {/* List of hardware nodes */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase font-mono tracking-wider text-system-muted font-bold">
                  Registered Hardware Nodes
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto scrollbar-none">
                {devices.length === 0 ? (
                  <div className="w-full p-4 border border-dashed border-system-border rounded-xl text-center text-[10px] text-system-muted font-mono">
                    No hardware mapped.
                  </div>
                ) : (
                  devices.map((dev: any) => {
                    return (
                      <div key={dev.id} className="p-2 bg-system-bg border border-system-border rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-system-text">{dev.name || dev.deviceName}</p>
                          <p className="font-mono text-[9px] text-system-muted truncate uppercase">{dev.id}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-system-border/40 my-1 shrink-0" />

            <div className="flex items-center justify-between shrink-0">
              <div className="text-[10px] uppercase font-mono tracking-wider text-system-muted font-bold">
                Microclimate Feed Stream
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-500",
                isEffectiveOnline ? getStatusBgColor('GOOD') : getStatusBgColor('DANGER')
              )}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    isEffectiveOnline ? "bg-emerald-400 animate-ping" : "bg-red-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    isEffectiveOnline ? "bg-emerald-500" : "bg-red-500"
                  )}></span>
                </span>
                <span className="text-[8px] font-black uppercase font-mono tracking-tighter">
                  {isEffectiveOnline ? 'Live' : 'Stale'}
                </span>
              </div>
            </div>

            {/* Warn/Telemetry Events */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {alertsList.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-4"
                  >
                    <p className="text-[10px] text-system-muted font-mono">Environmental triggers normal.</p>
                  </motion.div>
                ) : (
                  alertsList
                    .slice(0, 10)
                    .map((log, i) => (
                      <motion.div 
                        key={log.id || i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                        className="flex gap-2.5 text-xs pb-2 border-b border-system-bg last:border-0"
                      >
                        <span className="font-mono text-[9px] text-system-muted w-12 shrink-0 mt-0.5">{log.time}</span>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className={cn(
                            "font-semibold break-words whitespace-normal text-[11px]",
                            log.resolved ? "text-system-muted line-through" : log.severity === 'critical' ? "text-red-500" : "text-yellow-600"
                          )}>
                            {log.alertType}
                          </p>
                          <p className="text-system-muted text-[10px] leading-normal break-words whitespace-normal">{log.message}</p>
                        </div>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>


    </div>

    {/* Register Device Popup Modal */}
    {isAddingDevicePopup && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-system-accent" />
              <h2 className="text-white font-bold uppercase font-mono tracking-tight">Register AirSense Node</h2>
            </div>
            <button 
              onClick={() => setIsAddingDevicePopup(false)}
              className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                Hardware Token ID
              </label>
              <input
                type="text"
                value={onboardingDevId}
                onChange={(e) => setOnboardingDevId(e.target.value)}
                className="w-full text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-system-accent"
                placeholder="e.g. LAS-XXX"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                Friendly Node Name
              </label>
              <input
                type="text"
                value={onboardingDevName}
                onChange={(e) => setOnboardingDevName(e.target.value)}
                className="w-full text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-system-accent"
                placeholder="e.g. Barn A - East Wing"
              />
            </div>

            {onboardingError && (
              <p className="text-[10px] text-red-500 font-mono">{onboardingError}</p>
            )}

            <button
              onClick={handleCustomRegisterSetup}
              disabled={isOnboardingSaving}
              className="w-full py-3 bg-system-accent text-system-bg font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 mt-2"
            >
              {isOnboardingSaving ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
