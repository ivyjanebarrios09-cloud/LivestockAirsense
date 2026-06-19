import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { useAppContext } from '../hooks/useAppContext';
import { Interactive3DAtmosphere } from '../components/Interactive3DAtmosphere';
import { recordStatusChange, subscribeToSensorData, getSensorReadings } from '../lib/firebase';
import { Cpu, Plus, Layers, Wifi, Sparkles } from 'lucide-react';

// Custom robust vector SVGs for the dashboard metrics
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


// Animated background showcasing soft drifting clouds and flowing wind/air streams
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
    activeLocation, 
    thresholds, 
    isSyncing, 
    triggerSync, 
    alertsList, 
    locations, 
    selectedLocationId, 
    setSelectedLocationId, 
    selectedDeviceId, 
    setSelectedDeviceId,
    devices, 
    refreshInterval,
    addLocation,
    addDevice 
  } = useAppContext();

  // Onboarding parameters for registering a first device
  const [onboardingLocName, setOnboardingLocName] = useState('Main Broiler Barn');
  const [onboardingLocType, setOnboardingLocType] = useState('Poultry');
  const [onboardingDevId, setOnboardingDevId] = useState(() => `EP-ESP32-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [onboardingDevName, setOnboardingDevName] = useState('ESP32 Main Node');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);

  const handleQuickDemoSetup = async () => {
    setIsOnboardingSaving(true);
    setOnboardingError(null);
    try {
      const slug = 'main-broiler-barn';
      await addLocation({
        id: slug,
        name: 'Main Broiler Barn',
        type: 'Poultry',
        animalCount: 0,
        baseTemp: 22.5,
        baseHumidity: 60,
        baseCo2: 500,
        baseAmmonia: 2.1
      });
      const devId = `EP-ESP32-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await addDevice({
        id: devId,
        name: 'ESP32 Main Node',
        locationId: slug
      });
      setSelectedLocationId(slug);
      setSelectedDeviceId(devId);
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to complete quick onboarding.');
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const handleCustomRegisterSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingLocName.trim() || !onboardingDevName.trim() || !onboardingDevId.trim()) {
      setOnboardingError('Please fill in all the registration fields.');
      return;
    }
    setIsOnboardingSaving(true);
    setOnboardingError(null);
    try {
      const slug = onboardingLocName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await addLocation({
        id: slug,
        name: onboardingLocName.trim(),
        type: onboardingLocType,
        animalCount: 0,
        baseTemp: 22.0,
        baseHumidity: 60,
        baseCo2: 500,
        baseAmmonia: 1.5
      });
      await addDevice({
         id: onboardingDevId.trim(),
         name: onboardingDevName.trim(),
         locationId: slug
      });
      setSelectedLocationId(slug);
      setSelectedDeviceId(onboardingDevId.trim());
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to register the custom telemetry device.');
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  // Load registered devices to show them linked to the monitoring zone
  const registeredDevices = devices;

  const locationDevices = registeredDevices.filter(d => d.locationId === activeLocation?.id);

  const [deviceData, setDeviceData] = useState<any>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  
  useEffect(() => {
    if (!selectedDeviceId) return;
    const unsubscribe = subscribeToSensorData(selectedDeviceId, (data) => {
        setDeviceData(data);
    });
    return () => unsubscribe();
  }, [selectedDeviceId]);

  useEffect(() => {
    const fetchData = async () => {
      const logs = await getSensorReadings(selectedDeviceId, 12);
      setTelemetryLogs(logs.reverse());
    };
    fetchData();
    const interval = setInterval(fetchData, refreshInterval + 100);
    return () => clearInterval(interval);
  }, [selectedDeviceId, refreshInterval]);

  const chartData = telemetryLogs.map(log => ({
    time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
    aqi: log.aqi || 0,
    co2: log.co2 || 0,
    temp: log.temperature || 0
  }));

  const lastReading = deviceData || { 
      temperature: 0, 
      humidity: 0, 
      co2: 0, 
      nh3: 0, 
      ch4: 0, 
      aqi: 0 
  };

  // Evaluate state alerts
  const isTempAlert = lastReading.temperature > thresholds.tempMax;
  const isHumAlert = lastReading.humidity > thresholds.humidityMax;
  const isCo2Alert = lastReading.co2 > thresholds.co2Max;
  const isAmmoniaAlert = lastReading.nh3 > thresholds.ammoniaMax;

  const activeIssueCount = (isTempAlert ? 1 : 0) + (isHumAlert ? 1 : 0) + (isCo2Alert ? 1 : 0) + (isAmmoniaAlert ? 1 : 0);

  const getStatus = (label: string, val: number) => {
    switch (label) {
      case 'Temperature':
        if (val > 40) return { label: 'Dangerous', icon: '⚫', color: 'text-gray-900' };
        if (val >= 36) return { label: 'Warning', icon: '🔴', color: 'text-red-500' };
        if (val >= 31) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if (val >= 27) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
      case 'Humidity':
        if (val < 10 || val > 90) return { label: 'Dangerous', icon: '⚫', color: 'text-gray-900' };
        if ((val >= 10 && val < 20) || (val > 80 && val <= 90)) return { label: 'Warning', icon: '🔴', color: 'text-red-500' };
        if ((val >= 20 && val < 30) || (val > 70 && val <= 80)) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if ((val >= 30 && val < 40) || (val > 60 && val <= 70)) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
      case 'CO2 Level':
        if (val > 5000) return { label: 'Dangerous', icon: '⚫', color: 'text-gray-900' };
        if (val >= 2001) return { label: 'Warning', icon: '🔴', color: 'text-red-500' };
        if (val >= 1201) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if (val >= 801) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
      case 'Ammonia NH3':
        if (val > 100) return { label: 'Dangerous', icon: '⚫', color: 'text-gray-900' };
        if (val >= 51) return { label: 'Warning', icon: '🔴', color: 'text-red-500' };
        if (val >= 26) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if (val >= 11) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
      case 'PM2.5 Feed Dust':
        if (val > 150.4) return { label: 'Dangerous', icon: '⚫', color: 'text-gray-900' };
        if (val >= 55.5) return { label: 'Warning', icon: '🔴', color: 'text-red-500' };
        if (val >= 35.5) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if (val >= 12.1) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
      case 'AQI':
        if (val > 900) return { label: 'Hazardous', icon: '⚫', color: 'text-gray-900' };
        if (val >= 801) return { label: 'Very Poor', icon: '🔴', color: 'text-red-500' };
        if (val >= 601) return { label: 'Poor', icon: '🟠', color: 'text-orange-500' };
        if (val >= 401) return { label: 'Moderate', icon: '🟡', color: 'text-yellow-500' };
        if (val >= 201) return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
        return { label: 'Excellent', icon: '🟢', color: 'text-emerald-500' };
      default:
        return { label: 'Good', icon: '🟢', color: 'text-emerald-500' };
    }
  };

  const tempStatus = getStatus('Temperature', lastReading.temperature);
  const humStatus = getStatus('Humidity', lastReading.humidity);
  const co2Status = getStatus('CO2 Level', lastReading.co2);
  const ammoniaStatus = getStatus('Ammonia NH3', lastReading.nh3);
  const pmStatus = getStatus('PM2.5 Feed Dust', 12.4); // Still simulated

  const metrics = [
    { 
      label: 'Temperature', 
      value: lastReading.temperature?.toFixed(1) + ' °C', 
      icon: TempSvg, 
      color: isTempAlert ? 'text-red-500' : 'text-orange-500', 
      bg: isTempAlert 
        ? 'bg-red-500/15 border-red-500/30' 
        : 'bg-orange-500/10 border border-orange-500/15 group-hover:bg-orange-500/15',
      cardStyle: isTempAlert 
        ? 'bg-red-50 border-red-500/40 hover:border-red-500/60 shadow-[0_8px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20' 
        : 'border-orange-500/15 hover:border-orange-500/40 hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)]',
      isWarning: isTempAlert,
      status: tempStatus,
      limitInfo: `${thresholds.tempMax}°C`
    },
    { 
      label: 'Humidity', 
      value: lastReading.humidity?.toFixed(1) + ' %', 
      icon: HumiditySvg, 
      color: isHumAlert ? 'text-red-500' : 'text-blue-500', 
      bg: isHumAlert 
        ? 'bg-red-500/15 border-red-500/30' 
        : 'bg-blue-500/10 border border-blue-500/15 group-hover:bg-blue-500/15',
      cardStyle: isHumAlert 
        ? 'bg-red-50 border-red-500/40 hover:border-red-500/60 shadow-[0_8px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20' 
        : 'border-blue-500/15 hover:border-blue-500/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]',
      isWarning: isHumAlert,
      status: humStatus,
      limitInfo: `${thresholds.humidityMax}%`
    },
    { 
      label: 'CO2 Level', 
      value: Math.round(lastReading.co2 || 0) + ' ppm', 
      icon: Co2Svg, 
      color: isCo2Alert ? 'text-red-500' : 'text-emerald-500', 
      bg: isCo2Alert 
        ? 'bg-red-500/15 border-red-500/30' 
        : 'bg-emerald-500/10 border border-emerald-500/15 group-hover:bg-emerald-500/15',
      cardStyle: isCo2Alert 
        ? 'bg-red-50 border-red-500/40 hover:border-red-500/60 shadow-[0_8px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20' 
        : 'border-emerald-500/15 hover:border-emerald-500/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]',
      isWarning: isCo2Alert,
      status: co2Status,
      limitInfo: `${thresholds.co2Max} ppm`
    },
    { 
      label: 'Ammonia NH3', 
      value: lastReading.nh3?.toFixed(2) + ' ppm', 
      icon: AmmoniaSvg, 
      color: isAmmoniaAlert ? 'text-red-500' : 'text-yellow-600', 
      bg: isAmmoniaAlert 
        ? 'bg-red-500/15 border-red-500/30' 
        : 'bg-yellow-600/10 border border-yellow-600/15 group-hover:bg-yellow-650/15',
      cardStyle: isAmmoniaAlert 
        ? 'bg-red-50 border-red-500/40 hover:border-red-500/60 shadow-[0_8px_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20' 
        : 'border-amber-500/15 hover:border-amber-500/40 hover:shadow-[0_8px_30px_rgba(217,119,6,0.06)]',
      isWarning: isAmmoniaAlert,
      status: ammoniaStatus,
      limitInfo: `${thresholds.ammoniaMax} ppm`
    },
    { 
      label: 'PM2.5 Feed Dust', 
      value: '12.4 µg/m³', // Still simulated? The user requested this structure in firestore, but it's not in the Firestore structure they provided. I'll leave as is.
      icon: PM25Svg, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10 border border-purple-500/15 group-hover:bg-purple-500/15',
      cardStyle: 'border-purple-500/15 hover:border-purple-500/40 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]',
      isWarning: false,
      status: pmStatus,
      limitInfo: '35 µg'
    },
    { 
      label: 'Methane CH4', 
      value: lastReading.ch4?.toFixed(2) + ' ppm', 
      icon: MethaneSvg, 
      color: 'text-gray-500', 
      bg: 'bg-slate-500/10 border border-slate-500/15 group-hover:bg-slate-500/15',
      cardStyle: 'border-slate-500/15 hover:border-slate-500/40 hover:shadow-[0_8px_30px_rgba(71,85,105,0.06)]',
      isWarning: false,
      status: { label: 'Good', icon: '🟢', color: 'text-emerald-500' },
      limitInfo: `${thresholds.methaneMax} ppm`
    },
  ];

  if (devices.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-28 min-h-[80vh] flex flex-col justify-center">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-system-accent/15 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-36 -mb-36 pointer-events-none" />

          {/* Core Onboarding Message Header */}
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-550/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold font-mono tracking-wide uppercase select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
              </span>
              No Telemetry Edge Nodes Registered
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase font-mono bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Register Your AirSense Device
            </h1>
            
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Welcome to <strong>Livestock AirSense</strong>! You have successfully signed up. Let's register your first physical ESP32 edge telemetry hardware node so you can monitor animal comfort and air quality indices.
            </p>
          </div>

          {/* Segmented Form options */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-8 mt-10 relative z-10 border-t border-white/10 pt-8">
            
            {/* Quick Demo setup - Left Side (4 Cols) */}
            <div className="md:col-span-4 space-y-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-system-accent">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-sm tracking-wide uppercase font-mono">1-Click Smart Sim</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instantly provision a simulated Broiler Barn paired with an ESP32 microclimate telemetry node. Ideal for immediate exploring.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickDemoSetup}
                  disabled={isOnboardingSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-system-accent to-indigo-600 hover:from-system-accent/90 hover:to-indigo-500/95 py-3 px-4 text-xs font-bold tracking-wider text-white shadow-xl hover:shadow-2xl transition-all font-mono uppercase disabled:opacity-50 cursor-pointer"
                >
                  {isOnboardingSaving ? 'Provisioning...' : 'Provision Sim Node'}
                </button>
              </div>
            </div>

            {/* Manual Hardware device registration forms - Right Side (6 Cols) */}
            <form onSubmit={handleCustomRegisterSetup} className="md:col-span-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Cpu className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase font-mono">Custom Device Pairing</h3>
              </div>

              {onboardingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-mono">
                  {onboardingError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">Facility Location Name</label>
                  <input
                    type="text"
                    required
                    value={onboardingLocName}
                    onChange={(e) => setOnboardingLocName(e.target.value)}
                    placeholder="e.g. Main Chicken Barn"
                    className="w-full text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-system-accent focus:ring-1 focus:ring-system-accent bg-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">Livestock Cohort Type</label>
                  <select
                    value={onboardingLocType}
                    onChange={(e) => setOnboardingLocType(e.target.value)}
                    className="w-full text-xs rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-system-accent"
                  >
                    <option value="Poultry">Poultry / Chicken</option>
                    <option value="Dairy">Dairy / Cattle</option>
                    <option value="Equine">Equine / Horses</option>
                    <option value="Other">Other / General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">Hardware Token ID</label>
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

  if (selectedDeviceId && !deviceData) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto space-y-6 animate-in fade-in duration-300 pb-28 min-h-[80vh] flex flex-col justify-center">
        <div className="bg-system-panel border border-system-border shadow-xl rounded-2xl p-6 md:p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-system-accent via-indigo-500 to-cyan-500 animate-pulse" />

          {/* Radiating Antenna Waves animation */}
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-system-accent/10 border border-system-accent/20">
            <span className="absolute animate-ping inline-flex h-16 w-16 rounded-full bg-system-accent/20 opacity-75"></span>
            <span className="absolute animate-ping inline-flex h-20 w-20 rounded-full bg-system-accent/10 opacity-50"></span>
            <Wifi className="w-10 h-10 text-system-accent animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 border border-sky-500/20 text-[9px] font-bold font-mono tracking-wide uppercase select-none">
              Awaiting First Sensor Transmission
            </div>
            <h2 className="text-xl font-bold text-system-text uppercase font-mono tracking-tight">
              Establishing Data Link...
            </h2>
            <p className="text-xs text-system-muted leading-relaxed max-w-sm">
              Node <span className="font-mono font-bold text-system-text bg-system-bg px-1.5 py-0.5 rounded border border-system-border/45 select-all">{selectedDeviceId}</span> is paired. We are now listening for the first environmental broadcast from your sensor.
            </p>
          </div>

          <div className="w-full border-t border-system-border/40 pt-4 space-y-3">
            <p className="text-[10px] text-system-muted font-mono leading-tight">
              Using simulated stream or local device? Wake up the node or trigger the manual stream injector tool below.
            </p>
            <button
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-system-accent to-indigo-600 hover:from-system-accent/90 hover:to-indigo-500 py-2.5 px-4 text-xs font-bold tracking-wider text-white shadow-md hover:shadow-lg transition-all font-mono uppercase disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? 'Synchronizing stream...' : 'Trigger Seed Injection Signal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-28">
      
      {/* Dynamic Header Barn Description & Pull Indicator with Immersive 3D Atmosphere */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md md:shadow-xl rounded-xl md:rounded-2xl p-3 md:p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6 min-h-[auto] md:min-h-[140px] group transition-all duration-300">
        
        {/* Interactive 3D perspective Atmosphere & Billboarding Clouds Layer */}
        <Interactive3DAtmosphere hasAlerts={activeIssueCount > 0} />

        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 z-10 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-white/10 text-emerald-450 text-[8px] md:text-[10px] font-bold tracking-wide border border-white/5 uppercase select-none">
              <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-400"></span>
              </span>
              Live Node
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[8px] md:text-[9px] text-slate-300 font-mono uppercase tracking-widest font-bold select-none whitespace-nowrap hidden sm:block">Zone</label>
            <div className="relative inline-block w-full sm:w-auto flex-1">
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="bg-white/10 hover:bg-white/15 border border-white/20 select-none cursor-pointer rounded-lg px-2 md:px-3 py-1 md:py-2 text-xs md:text-base font-black tracking-tight text-white focus:outline-none pr-7 md:pr-9 appearance-none transition-colors leading-none w-full sm:w-auto"
              >
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id} className="text-slate-900 font-semibold bg-white">
                    {loc.name}
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

        {/* Unified AQI & State Gauge */}
        <div className="relative shrink-0 w-full md:w-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-lg md:rounded-2xl p-2 md:p-4 flex items-center gap-2 md:gap-5 z-10 select-none min-w-0 md:min-w-[240px] overflow-hidden group">
          <div className="flex flex-col items-center justify-center bg-white/5 w-10 h-10 md:w-16 md:h-16 rounded-full border border-white/10 shrink-0 z-10">
            <span className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">AQI</span>
            <span className="text-lg md:text-2xl font-black mt-0.5 md:mt-1 tracking-tight leading-none tabular-nums">{deviceData?.aqi || 0}</span>
            <span className={cn("text-[8px] md:text-[9px] font-bold mt-0.5", getStatus('AQI', deviceData?.aqi || 0).color)}>
              {getStatus('AQI', deviceData?.aqi || 0).icon} {getStatus('AQI', deviceData?.aqi || 0).label}
            </span>
          </div>
          <div className="w-[1px] h-8 md:h-12 bg-white/10 z-10" />
          <div className="space-y-0.5 md:space-y-1 z-10 min-w-0 flex-1">
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-mono truncate">Microclimate</p>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className={cn(
                "px-1.5 md:px-2.5 py-0.5 rounded md:rounded-lg text-[9px] md:text-xs font-bold shrink-0 uppercase tracking-wider",
                activeIssueCount > 0 
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              )}>
                {activeIssueCount > 0 ? `${activeIssueCount} Hazards` : 'Safe'}
              </span>
            </div>
            <p className="text-[8px] md:text-[10px] text-slate-300 truncate hidden xs:block">
              {activeIssueCount > 0 ? 'Exceeds thresholds!' : 'Ventilation operates efficiently.'}
            </p>
          </div>
        </div>
      </div>

      {/* Syncing Simulator feedback Overlay Banner */}
      {isSyncing && (
        <div className="bg-system-accent/10 border border-system-accent/30 text-system-accent rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold animate-pulse shadow-sm">
          Synchronizing air quality data streams with cloud database...
        </div>
      )}

      {/* Grid of Micro-Environmental Sensoring Cards */}
      <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
        {metrics.map((metric, idx) => {
          const IconComponent = metric.icon;
          return (
            <div 
              key={idx} 
              className={cn(
                "rounded-[1.25rem] p-3 sm:p-3.5 flex flex-col justify-between h-24 sm:h-28 relative overflow-hidden transition-all duration-300 group select-none border bg-system-panel shadow-sm hover:-translate-y-1 hover:shadow-md",
                metric.cardStyle
              )}
            >
              <div className="relative z-10 flex justify-between items-start gap-2">
                <span className="font-mono text-[8px] md:text-[9px] text-system-muted uppercase tracking-wider leading-tight mt-0.5 line-clamp-2 pr-0.5">{metric.label}</span>
                <div className={cn("p-1.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110", metric.bg)}>
                  <IconComponent className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", metric.color)} isWarning={metric.isWarning} />
                </div>
              </div>

              <div className="relative z-10 space-y-0.5 mt-1 sm:mt-0">
                <div className={cn(
                  "text-sm sm:text-base md:text-lg font-black tracking-tight tabular-nums text-system-text",
                  metric.isWarning && "text-red-600"
                )}>
                  {metric.value}
                </div>
                <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-system-muted min-h-[0.75rem]">
                  <span className={cn("flex items-center gap-1 font-bold", metric.status.color)}>
                    <span>{metric.status.icon}</span>
                    {metric.status.label}
                  </span>
                </div>
              </div>

              {/* Animated Cloud & Air Wind background layer */}
              <CloudWindAnimation colorClass={metric.color} />

              {/* Decorative subtle visual glow backgrounds */}
              <div className={cn("absolute -bottom-10 -right-10 w-24 h-24 rounded-full opacity-[0.03] blur-xl group-hover:opacity-10 transition-opacity flex-shrink-0 bg-current pointer-events-none", metric.color)} />
            </div>
          );
        })}
      </div>

      {/* Live Graph Analytics & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Air Quality Index Area Chart */}
        <div className="lg:col-span-2 bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-system-text uppercase font-mono">Microclimate Graph (CO2 / AQI Trend)</h3>
              <p className="text-xs text-system-muted">Real-time edge telemetry tracking (6s interval)</p>
            </div>
            <span className="text-[10px] font-mono bg-system-bg border border-system-border px-2.5 py-1 rounded-lg text-system-muted">
              Live Feed
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAqiDashboard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-system-accent)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-system-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaf0f6" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={25}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'var(--font-mono)' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="aqi" 
                  name="Air Quality Index"
                  stroke="var(--color-system-accent)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAqiDashboard)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Node Logs & Status Diagnostics */}
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-5 md:p-6 flex flex-col h-[400px] overflow-hidden select-none">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-system-border pb-3 shrink-0">
              <h3 className="text-sm font-bold tracking-tight uppercase font-mono">Telemetry Receivers</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                {locationDevices.length} ACTIVE
              </div>
            </div>

            {/* List of hardware nodes matching current location */}
            <div className="space-y-2 shrink-0">
              <div className="text-[10px] uppercase font-mono tracking-wider text-system-muted font-bold">
                Zone Hardware Node Devices
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto scrollbar-none">
                {locationDevices.length === 0 ? (
                  <div className="p-2 border border-dashed border-system-border rounded-xl text-center text-[10px] text-system-muted font-mono">
                    No hardware mapped. Register a node in settings page.
                  </div>
                ) : (
                  locationDevices.map((dev: any) => (
                    <div key={dev.id} className="p-2 bg-system-bg border border-system-border rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-system-text">{dev.name}</p>
                        <p className="font-mono text-[9px] text-system-muted truncate">{dev.id}</p>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-550/20 text-[8px] font-mono font-bold uppercase rounded">
                        CONNECTED
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-system-border/40 my-1 shrink-0" />

            <div className="text-[10px] uppercase font-mono tracking-wider text-system-muted font-bold shrink-0">
              Microclimate Feed Stream
            </div>

            {/* Warn/Telemetry Events */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
              {alertsList.filter(l => l.location.toLowerCase().includes(activeLocation.name.split(' (')[0].toLowerCase()) || l.location.toLowerCase() === activeLocation.name.toLowerCase()).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-[10px] text-system-muted font-mono">Environmental triggers normal for this zone.</p>
                </div>
              ) : (
                alertsList
                  .filter(l => l.location.toLowerCase().includes(activeLocation.name.split(' (')[0].toLowerCase()) || l.location.toLowerCase() === activeLocation.name.toLowerCase())
                  .slice(0, 4)
                  .map((log, i) => (
                    <div key={log.id || i} className="flex gap-2.5 text-xs pb-2 border-b border-system-bg last:border-0">
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
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
