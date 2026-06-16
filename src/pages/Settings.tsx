import { useState, useEffect } from 'react';
import { Save, Server, Shield, Database, Sliders, CheckCircle, User, LogOut, Plus, Trash2, Cpu, MapPin } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { useAppContext } from '../hooks/useAppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/firebase';

interface Device {
  id: string;
  name: string;
  locationId: string;
}

export function SettingsPage() {
  const { user } = useAuthState();
  const { thresholds, saveThresholds, locations, addLocation, deleteLocation } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Local state for sliders so it holds temporary draft before saving
  const [localTempMax, setLocalTempMax] = useState(thresholds.tempMax);
  const [localHumidityMax, setLocalHumidityMax] = useState(thresholds.humidityMax);
  const [localCo2Max, setLocalCo2Max] = useState(thresholds.co2Max);
  const [localAmmoniaMax, setLocalAmmoniaMax] = useState(thresholds.ammoniaMax);

  const uid = user?.uid || 'guest';
  // Device List & State Management loaded from localStorage with default placeholders
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem(`las_${uid}_devices`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'EP-ESP32-LAS99X', name: 'AirSense Station Alpha', locationId: 'barn-a' },
      { id: 'EP-ESP32-BRD30A', name: 'Brooder House 3 Sentinel', locationId: 'brooder-3' },
      { id: 'EP-ESP32-MLK32F', name: 'Milking Parlor Controller', locationId: 'milking-parlor' }
    ];
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return devices[0]?.id || 'EP-ESP32-LAS99X';
  });
  const [isEditingNew, setIsEditingNew] = useState(false);

  // Form input states
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [deviceLocationInput, setDeviceLocationInput] = useState('');

  // Device status response trackers
  const [showDeviceSavedFeedback, setShowDeviceSavedFeedback] = useState(false);
  const [deviceFeedbackText, setDeviceFeedbackText] = useState('');

  // Validation & confirmation states preventing iframe alert/confirm issues
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // Facility Location Placement management states
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState('Swine');
  const [newLocationAnimalCount, setNewLocationAnimalCount] = useState(100);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<any | null>(null);

  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem(`las_${uid}_push_enabled`) === 'true';
  });

  const handlePushToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    if (isEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          localStorage.setItem(`las_${uid}_push_enabled`, 'true');
          
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('AirSense Notifications Enabled', {
                body: 'You will now receive alerts even when the app is in the background.',
                icon: '/logo.png',
                vibrate: [100, 50, 100]
              });
            });
          }
        } else {
          setPushEnabled(false);
          alert('Notification permission was denied. Please update your browser settings.');
        }
      } else {
        alert('Your browser does not support notifications.');
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem(`las_${uid}_push_enabled`, 'false');
    }
  };

  // Sync state with active selection
  useEffect(() => {
    if (!isEditingNew) {
      const active = devices.find(d => d.id === selectedDeviceId) || devices[0];
      if (active) {
        setDeviceIdInput(active.id);
        setDeviceNameInput(active.name);
        setDeviceLocationInput(active.locationId);
      }
    }
  }, [selectedDeviceId, devices, isEditingNew]);

  const handleAddNewDeviceClick = () => {
    setDeviceError(null);
    setIsEditingNew(true);
    const randTag = Math.random().toString(36).substring(2, 7).toUpperCase();
    setDeviceIdInput(`EP-ESP32-${randTag}`);
    setDeviceNameInput('');
    setDeviceLocationInput(locations[0]?.id || 'barn-a');
  };

  const handleSaveDevice = () => {
    setDeviceError(null);
    if (!deviceIdInput.trim()) {
      setDeviceError('Please enter a valid Device ID Token.');
      return;
    }
    if (!deviceNameInput.trim()) {
      setDeviceError('Please enter a Device Name.');
      return;
    }

    if (isEditingNew) {
      if (devices.some(d => d.id.toLowerCase() === deviceIdInput.trim().toLowerCase())) {
        setDeviceError('A device with this Device ID Token already exists. Please choose a unique token.');
        return;
      }
      const newD: Device = {
        id: deviceIdInput.trim(),
        name: deviceNameInput.trim(),
        locationId: deviceLocationInput
      };
      const updated = [...devices, newD];
      setDevices(updated);
      try {
        localStorage.setItem(`las_${uid}_devices`, JSON.stringify(updated));
      } catch (e) {}
      setSelectedDeviceId(newD.id);
      setIsEditingNew(false);
      setDeviceFeedbackText('Device registered successfully!');
    } else {
      const updated = devices.map(d => {
        if (d.id === selectedDeviceId) {
          return {
            ...d,
            name: deviceNameInput.trim(),
            locationId: deviceLocationInput
          };
        }
        return d;
      });
      setDevices(updated);
      try {
        localStorage.setItem(`las_${uid}_devices`, JSON.stringify(updated));
      } catch (e) {}
      setDeviceFeedbackText('Device properties updated!');
    }

    setShowDeviceSavedFeedback(true);
    setTimeout(() => setShowDeviceSavedFeedback(false), 2500);
  };

  const handleDeleteClick = (dev: Device) => {
    setDeviceError(null);
    if (devices.length <= 1) {
      setDeviceError('Cannot delete the last registered device. At least one device is required.');
      return;
    }
    setDeviceToDelete(dev);
  };

  const executeDeleteDevice = () => {
    if (!deviceToDelete) return;
    const updated = devices.filter(d => d.id !== deviceToDelete.id);
    setDevices(updated);
    try {
      localStorage.setItem(`las_${uid}_devices`, JSON.stringify(updated));
    } catch (e) {}

    const nextActive = updated[0]?.id || '';
    setSelectedDeviceId(nextActive);
    setIsEditingNew(false);
    setDeviceToDelete(null);

    setDeviceFeedbackText('Device removed.');
    setShowDeviceSavedFeedback(true);
    setTimeout(() => setShowDeviceSavedFeedback(false), 2500);
  };

  const handleAddLocationClick = () => {
    setLocationError(null);
    setIsAddingLocation(true);
    setNewLocationName('');
    setNewLocationType('Swine');
    setNewLocationAnimalCount(100);
  };

  const handleSaveLocation = () => {
    setLocationError(null);
    if (!newLocationName.trim()) {
      setLocationError('Please specify a Location Name.');
      return;
    }
    const slug = newLocationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (locations.some(l => l.id === slug)) {
      setLocationError('A location with this name or code already exists. Please use a unique name.');
      return;
    }

    addLocation({
      id: slug,
      name: newLocationName.trim(),
      type: newLocationType.trim(),
      animalCount: Number(newLocationAnimalCount) || 120,
      baseTemp: 21,
      baseHumidity: 50,
      baseCo2: 450,
      baseAmmonia: 0.5
    });

    setDeviceFeedbackText('Location added successfully!');
    setShowDeviceSavedFeedback(true);
    setTimeout(() => setShowDeviceSavedFeedback(false), 2500);
    setIsAddingLocation(false);
  };

  const handleDeleteLocationClick = (loc: any) => {
    setLocationError(null);
    if (locations.length <= 1) {
      setLocationError('Cannot delete the last facility location. At least one location is required.');
      return;
    }
    setLocationToDelete(loc);
  };

  const executeDeleteLocation = () => {
    if (!locationToDelete) return;
    deleteLocation(locationToDelete.id);
    setLocationToDelete(null);

    setDeviceFeedbackText('Facility placement removed.');
    setShowDeviceSavedFeedback(true);
    setTimeout(() => setShowDeviceSavedFeedback(false), 2500);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveThresholds({
        tempMax: localTempMax,
        humidityMax: localHumidityMax,
        co2Max: localCo2Max,
        ammoniaMax: localAmmoniaMax,
        methaneMax: thresholds.methaneMax
      });
      setSaving(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);
    }, 800);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase font-mono">System Settings</h1>
      </div>

      {!user ? (
        <div className="bg-system-panel border border-system-border shadow-sm rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-system-muted mb-4 animate-bounce" />
          <h3 className="font-bold text-lg text-system-text uppercase font-mono">Administrator Access Required</h3>
          <p className="text-sm text-system-muted max-w-md mt-2 leading-relaxed">
            Please authenticate using authorized credentials to adjust live ventilation safety triggers, integration settings, and device properties.
          </p>
        </div>
      ) : (
        <div className="space-y-6">


          <section className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-system-border bg-system-bg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-system-muted" />
                <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Device Registration</h3>
              </div>
              <button
                onClick={handleAddNewDeviceClick}
                className="flex items-center gap-1 px-3 py-1 bg-system-accent/15 hover:bg-system-accent/25 border border-system-accent/35 text-system-accent font-bold rounded-lg text-[11px] uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Device
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-system-border">
              {/* Left Column: List of Devices */}
              <div className="md:col-span-1 p-4 bg-system-bg/30 space-y-2.5 max-h-[350px] overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-system-muted font-bold font-mono px-1">
                  Registered Telemetry Nodes ({devices.length})
                </div>

                <div className="space-y-1.5">
                  {devices.map((dev) => {
                    const devLocation = locations?.find(l => l.id === dev.locationId);
                    const isSelected = selectedDeviceId === dev.id && !isEditingNew;
                    return (
                      <div
                        key={dev.id}
                        onClick={() => {
                          setSelectedDeviceId(dev.id);
                          setIsEditingNew(false);
                        }}
                        className={cn(
                          "group p-3 rounded-xl border transition-all cursor-pointer text-left flex items-start justify-between gap-2.5",
                          isSelected
                            ? "bg-system-panel border-system-accent/50 shadow-sm"
                            : "bg-system-panel/50 border-system-border hover:border-system-accent/30 hover:bg-system-panel"
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <h4 className={cn("text-xs font-bold leading-tight truncate", isSelected ? "text-system-accent" : "text-system-text")}>
                            {dev.name || 'Unnamed Device'}
                          </h4>
                          <p className="font-mono text-[9px] text-system-muted truncate bg-system-bg px-1.5 py-0.5 rounded border border-system-border/40 inline-block">
                            {dev.id}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-system-muted font-medium">
                            <MapPin className="w-3 h-3 text-system-accent/60" />
                            <span className="truncate">{devLocation ? devLocation.name : 'Unknown Location'}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(dev);
                          }}
                          className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Delete Device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Device Editing / Provisioning Form */}
              <div className="md:col-span-2 p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-system-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-system-accent" />
                    <span className="text-[11px] uppercase tracking-wider font-bold font-mono text-system-muted">
                      {isEditingNew ? 'Register New Telemetry Node' : 'Edit Telemetry Node Properties'}
                    </span>
                  </div>
                  {isEditingNew && (
                    <button
                      onClick={() => setIsEditingNew(false)}
                      className="text-[10px] uppercase tracking-wider text-system-muted hover:text-system-text font-bold font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {deviceError && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-500 rounded-xl text-xs font-mono font-semibold flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-ping shrink-0" />
                      <span>{deviceError}</span>
                    </div>
                    <button 
                      onClick={() => setDeviceError(null)}
                      className="text-[10px] uppercase font-bold text-red-500 hover:text-red-650 cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono block">Device ID Token</label>
                    <input
                      type="text"
                      disabled={!isEditingNew}
                      value={deviceIdInput}
                      onChange={(e) => setDeviceIdInput(e.target.value)}
                      placeholder="e.g. EP-ESP32-LAS99X"
                      className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                    />
                    {isEditingNew && (
                      <p className="text-[9px] text-system-muted font-mono leading-relaxed">
                        Hardware network token used as MQTT Client ID. Cannot be modified after registration.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono block">Device Name</label>
                    <input
                      type="text"
                      value={deviceNameInput}
                      onChange={(e) => setDeviceNameInput(e.target.value)}
                      placeholder="e.g. Gestation Temperature Monitor"
                      className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono block">Facility Location Placement</label>
                    <select
                      value={deviceLocationInput}
                      onChange={(e) => setDeviceLocationInput(e.target.value)}
                      className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text cursor-pointer transition-colors"
                    >
                      {locations?.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-system-border/40 pt-4 mt-2">
                  <div className="flex-1">
                    {showDeviceSavedFeedback && (
                      <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        {deviceFeedbackText}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveDevice}
                    className="flex items-center gap-1.5 px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isEditingNew ? 'Register Node' : 'Update Node'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-system-border bg-system-bg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-system-muted" />
                <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Facility Location Placements ({locations.length})</h3>
              </div>
              <button
                onClick={handleAddLocationClick}
                className="flex items-center gap-1 px-3 py-1 bg-system-accent/15 hover:bg-system-accent/25 border border-system-accent/35 text-system-accent font-bold rounded-lg text-[11px] uppercase tracking-wider transition-all cursor-pointer animate-pulse"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Location
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-system-border">
              {/* Left Column: List of Facility Locations */}
              <div className="md:col-span-1 p-4 bg-system-bg/30 space-y-2.5 max-h-[350px] overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-system-muted font-bold font-mono px-1">
                  Available placements ({locations.length})
                </div>

                <div className="space-y-1.5">
                  {locations.map((loc) => {
                    const isSelected = !isAddingLocation && deviceLocationInput === loc.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setIsAddingLocation(false);
                          setDeviceLocationInput(loc.id);
                        }}
                        className={cn(
                          "group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none",
                          isSelected
                            ? "bg-system-bg border-system-border pl-4"
                            : "bg-system-panel hover:bg-system-bg/40 border-system-border/60"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold font-sans text-system-text truncate">{loc.name}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocationClick(loc);
                          }}
                          className="p-1.5 text-system-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Delete Location"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {locationError && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-500 rounded-xl text-xs font-mono font-semibold flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-ping shrink-0" />
                      <span>{locationError}</span>
                    </div>
                    <button 
                      onClick={() => setLocationError(null)}
                      className="text-[10px] uppercase font-bold text-red-500 hover:text-red-650 cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Configuration form */}
              <div className="md:col-span-2 p-5 md:p-6 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-system-muted font-bold font-mono">
                  {isAddingLocation ? 'New Location Placement Parameters' : 'Placement Detail Overview'}
                </div>

                {isAddingLocation ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono block">Location / Barn Name</label>
                      <input
                        type="text"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="e.g. Barn B (Nursery)"
                        className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors font-sans"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-system-border/40 pt-4 mt-2">
                      <button
                        onClick={() => setIsAddingLocation(false)}
                        className="px-4 py-2 border border-system-border text-system-muted hover:bg-system-bg rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLocation}
                        className="flex items-center gap-1.5 px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Placement
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-system-border/85 rounded-2xl text-center h-[200px]">
                    <MapPin className="w-8 h-8 text-system-accent/80 mb-2.5 animate-bounce" />
                    <p className="text-xs text-system-muted font-sans font-medium leading-relaxed max-w-sm">
                      Select any placement on the left sidebar to associate with telemetry hardware, or tap <span className="font-bold text-system-accent">"Add New Location"</span> to deploy a new sector in the ventilation safety monitor.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-system-border bg-system-bg flex items-center gap-2">
              <Database className="w-4 h-4 text-system-muted" />
              <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Integration Settings</h3>
            </div>
            <div className="p-5 md:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono">Refresh Interval (ms)</label>
                <select defaultValue="5000 (5 seconds)" className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text cursor-pointer transition-colors">
                  <option>1000 (1 second)</option>
                  <option>2000 (2 seconds)</option>
                  <option>5000 (5 seconds)</option>
                  <option>10000 (10 seconds)</option>
                </select>
              </div>
              <div className="space-y-1 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded-lg border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel cursor-pointer" />
                  <span className="text-sm font-medium group-hover:text-system-accent transition-colors">Enable Firebase Real-time Synchronization</span>
                </label>
              </div>
              <div className="space-y-1 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={pushEnabled} 
                    onChange={handlePushToggle}
                    className="w-4 h-4 rounded-lg border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel cursor-pointer" 
                  />
                  <span className="text-sm font-medium group-hover:text-system-accent transition-colors">Send Push Notifications for Critical Alerts</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-system-border/40 mt-6">
                {showSavedFeedback && (
                  <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl animate-bounce">
                    <CheckCircle className="w-4 h-4" />
                    Settings saved successfully!
                  </span>
                )}

                <button 
                  onClick={handleSave}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95",
                    saving ? "bg-system-border text-system-muted" : "bg-system-accent text-white hover:bg-opacity-90 inline-flex"
                  )}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-system-panel border border-system-border shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-system-border bg-system-bg flex items-center gap-2">
              <User className="w-4 h-4 text-system-muted" />
              <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Account & Session</h3>
            </div>
            <div className="p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border border-system-border shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-12 h-12 text-system-muted bg-system-bg border border-system-border rounded-full p-2.5 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-system-text">{user.displayName || 'Authorized Administrator'}</h4>
                  <p className="text-xs text-system-muted font-mono mt-0.5">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Logout
              </button>
            </div>
          </section>

        </div>
      )}

      {/* Sleek Custom Confirm Modal for deleting devices */}
      {deviceToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-system-panel border border-system-border rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-500 mb-3">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base uppercase font-mono tracking-tight text-system-text">Remove Device?</h3>
            </div>
            
            <p className="text-xs text-system-muted mb-5 leading-relaxed">
              Are you sure you want to remove the node <span className="font-black text-system-text font-mono">"{deviceToDelete.name}"</span>? 
              This action detaches the physical telemetry mapping of this sensor.
            </p>
            
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setDeviceToDelete(null)}
                className="px-3 py-1.5 bg-system-bg border border-system-border hover:bg-system-panel font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteDevice}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Custom Confirm Modal for deleting locations */}
      {locationToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-system-panel border border-system-border rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-500 mb-3">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base uppercase font-mono tracking-tight text-system-text">Delete Placement?</h3>
            </div>
            
            <p className="text-xs text-system-muted mb-5 leading-relaxed">
              Are you sure you want to remove the facility placement <span className="font-black text-system-text font-mono">"{locationToDelete.name}"</span>? 
              This will unbind telemetry devices mapped to this physical sector.
            </p>
            
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setLocationToDelete(null)}
                className="px-3 py-1.5 bg-system-bg border border-system-border hover:bg-system-panel font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteLocation}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
