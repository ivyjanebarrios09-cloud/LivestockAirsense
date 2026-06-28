import { useState, useEffect, ChangeEvent } from 'react';
import { Save, Server, Shield, Database, Sliders, CheckCircle, User, LogOut, Plus, Trash2, Cpu, MapPin, Sun, Moon } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { useAppContext } from '../hooks/useAppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { logout, changeUserPassword, linkEmailPassword } from '../lib/firebase';
import { toast } from 'sonner';
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react';

interface Device {
  id: string;
  deviceId: string;
  name: string;
  locationId: string;
}

export function SettingsPage() {
  const { user } = useAuthState();
  const { 
    thresholds, 
    saveThresholds, 
    selectedDeviceId, 
    setSelectedDeviceId, 
    devices, 
    addDevice, 
    deleteDevice,
    refreshInterval,
    firebaseSync,
    saveSystemSettings,
    pushEnabled,
    savePushEnabled
  } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [localTempMax, setLocalTempMax] = useState(thresholds.tempMax);
  const [localHumidityMax, setLocalHumidityMax] = useState(thresholds.humidityMax);
  const [localCo2Max, setLocalCo2Max] = useState(thresholds.co2Max);
  const [localAmmoniaMax, setLocalAmmoniaMax] = useState(thresholds.ammoniaMax);
  const [localMethaneMax, setLocalMethaneMax] = useState(thresholds.methaneMax);
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval);
  const [localFirebaseSync, setLocalFirebaseSync] = useState(firebaseSync);

  useEffect(() => {
    setLocalTempMax(thresholds.tempMax);
    setLocalHumidityMax(thresholds.humidityMax);
    setLocalCo2Max(thresholds.co2Max);
    setLocalAmmoniaMax(thresholds.ammoniaMax);
    setLocalMethaneMax(thresholds.methaneMax);
    setLocalRefreshInterval(refreshInterval);
    setLocalFirebaseSync(firebaseSync);
  }, [thresholds, refreshInterval, firebaseSync]);

  const uid = user?.uid || 'guest';
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');
  const isEmailUser = user?.providerData.some(p => p.providerId === 'password');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handlePasswordAction = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    const tid = toast.loading(isEmailUser ? 'Updating password...' : 'Linking password...');
    try {
      if (isEmailUser) {
        if (!currentPassword) {
          toast.error('Current password is required for security', { id: tid });
          setAuthLoading(false);
          return;
        }
        await changeUserPassword(newPassword, currentPassword);
        toast.success('Password updated successfully', { id: tid });
      } else {
        await linkEmailPassword(newPassword);
        toast.success('Password added to account', { id: tid });
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password action failed:', error);
      toast.error(error.message || 'Authentication operation failed', { id: tid });
    } finally {
      setAuthLoading(false);
    }
  };
// ...

  const [isEditingNew, setIsEditingNew] = useState(false);

  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');

  const [showDeviceSavedFeedback, setShowDeviceSavedFeedback] = useState(false);
  const [deviceFeedbackText, setDeviceFeedbackText] = useState('');

  const [isAddingDevicePopup, setIsAddingDevicePopup] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const handlePushToggle = async (e: ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    if (isEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await savePushEnabled(true);
          
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
              if (reg) {
                reg.showNotification('AirSense Notifications Enabled', {
                  body: 'You will now receive alerts for microclimate hazards.',
                  icon: '/logo.png',
                  badge: '/logo.png',
                  vibrate: [100, 50, 100]
                } as any);
              } else {
                new Notification('AirSense Notifications Enabled', { body: 'Alerts are enabled.', icon: '/logo.png' });
              }
            }).catch(e => {
              new Notification('AirSense Notifications Enabled', { body: 'Alerts are enabled.', icon: '/logo.png' });
            });
          } else {
            new Notification('AirSense', { body: 'Enabled', icon: '/logo.png' });
          }
        } else {
          await savePushEnabled(false);
          alert('Notification permission was denied. Please update your browser settings.');
        }
      } else {
        alert('Your browser does not support notifications.');
      }
    } else {
      await savePushEnabled(false);
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('app_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isEditingNew) {
      const active = devices.find(d => d.id === selectedDeviceId) || devices[0];
      if (active) {
        setDeviceIdInput(active.id);
        setDeviceNameInput(active.name);
      }
    }
  }, [selectedDeviceId, devices, isEditingNew]);

  const handleAddNewDeviceClick = () => {
    setDeviceError(null);
    setIsEditingNew(true);
    setIsAddingDevicePopup(true); // Open popup
    const randTag = Math.random().toString(36).substring(2, 7).toUpperCase();
    setDeviceIdInput(`EP-ESP32-${randTag}`);
    setDeviceNameInput('');
  };

  const handleSaveDevice = async () => {
    setDeviceError(null);
    if (!deviceIdInput.trim()) {
      setDeviceError('Please enter a valid Device ID Token.');
      return;
    }
    if (!deviceNameInput.trim()) {
      setDeviceError('Please enter a Device Name.');
      toast.error('Device Name is required');
      return;
    }

    const toastId = toast.loading('Registering hardware node...');
    try {
      if (isEditingNew) {
        if (devices.some(d => d.id.toLowerCase() === deviceIdInput.trim().toLowerCase())) {
          const err = 'A device with this Device ID Token already exists.';
          setDeviceError(err);
          toast.error(err, { id: toastId });
          return;
        }
        const newD: Device = {
          id: deviceIdInput.trim(),
          deviceId: deviceIdInput.trim(),
          name: deviceNameInput.trim(),
          locationId: 'default'
        };
        
        await addDevice(newD);
        
        setSelectedDeviceId(newD.id);
        setIsEditingNew(false);
        setIsAddingDevicePopup(false); 
        setDeviceFeedbackText('Device registered successfully!');
        toast.success('Device registered successfully!', { id: toastId });
      } else {
        const updatedD: Device = {
          id: selectedDeviceId || '',
          deviceId: selectedDeviceId || '',
          name: deviceNameInput.trim(),
          locationId: 'default'
        };
        await addDevice(updatedD);
        setDeviceFeedbackText('Device properties updated!');
        toast.success('Device properties updated!', { id: toastId });
      }

      setShowDeviceSavedFeedback(true);
      setTimeout(() => setShowDeviceSavedFeedback(false), 2500);
    } catch (err: any) {
      console.error('Save device error:', err);
      let msg = err?.message || 'Failed to register the telemetry node in Firestore.';
      setDeviceError(msg);
      toast.error(msg, { id: toastId });
    }
  };

  const handleDeleteClick = (dev: Device) => {
    setDeviceError(null);
    if (devices.length <= 1) {
      setDeviceError('Cannot delete the last registered device. At least one device is required.');
      return;
    }
    setDeviceToDelete(dev);
  };

  const executeDeleteDevice = async () => {
    if (!deviceToDelete) return;
    await deleteDevice(deviceToDelete.id);

    const remainingDevices = devices.filter(d => d.id !== deviceToDelete.id);
    const nextActive = remainingDevices[0]?.id || '';
    setSelectedDeviceId(nextActive);
    setIsEditingNew(false);
    setDeviceToDelete(null);

    setDeviceFeedbackText('Device removed.');
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
        methaneMax: localMethaneMax
      });
      saveSystemSettings(localRefreshInterval, localFirebaseSync);
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

      <div className="space-y-6">
        {!user && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex gap-3 items-start animate-fade-in">
            <Shield className="w-5 h-5 text-sky-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-bold text-xs font-mono uppercase tracking-wide text-sky-400">AirSense Guest Workspace</h4>
              <p className="text-[11px] text-system-muted mt-0.5 leading-relaxed">
                You are currently operating as a guest. All configurations, Facility Settings, and Registered Telemetry Nodes will persist in your local Firestore browser session for development testing.
              </p>
            </div>
          </div>
        )}


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

            {showDeviceSavedFeedback && (
              <div className="p-3 bg-emerald-500/15 border-b border-system-border text-emerald-600 text-xs font-semibold flex items-center justify-between gap-3 animate-bounce">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-ping shrink-0" />
                  {deviceFeedbackText || 'Device registered successfully!'}
                </span>
                <button 
                  onClick={() => setShowDeviceSavedFeedback(false)}
                  className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-750 cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="divide-y divide-system-border">
              {/* Left Column: List of Devices */}
              <div className="p-4 bg-system-bg/30 space-y-2.5 max-h-[350px] overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-system-muted font-bold font-mono px-1">
                  Registered Telemetry Nodes ({devices.length})
                </div>

                <div className="space-y-1.5">
                  {devices.map((dev) => {
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

              {/* Right Column: Device Registration Overview */}

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
                <select 
                  value={String(localRefreshInterval)} 
                  onChange={(e) => setLocalRefreshInterval(Number(e.target.value))}
                  className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text cursor-pointer transition-colors"
                >
                  <option value="1000">1000 (1 second)</option>
                  <option value="2000">2000 (2 seconds)</option>
                  <option value="5000">5000 (5 seconds)</option>
                  <option value="10500">10000 (10 seconds)</option>
                </select>
              </div>
              <div className="space-y-1 pt-2">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium group-hover:text-system-accent transition-colors">Dark Mode</span>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 bg-system-bg border border-system-border rounded-xl transition-all hover:border-system-accent"
                  >
                    {isDarkMode ? <Sun className="w-5 h-5 text-system-accent" /> : <Moon className="w-5 h-5 text-system-muted" />}
                  </button>
                </label>
              </div>

              <div className="space-y-1 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={localFirebaseSync} 
                    onChange={(e) => setLocalFirebaseSync(e.target.checked)}
                    className="w-4 h-4 rounded-lg border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel cursor-pointer" 
                  />
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
            {user ? (
              <div className="p-5 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

                {(isGoogleUser || isEmailUser) && (
                  <div className="pt-6 border-t border-system-border/40 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-3.5 h-3.5 text-system-muted" />
                      <h4 className="text-[10px] uppercase tracking-widest font-bold font-mono text-system-muted">
                        {isEmailUser ? 'Update Security Credentials' : 'Set Account Password'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isEmailUser && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono px-1">Current Password</label>
                          <div className="relative">
                            <input 
                              type={showPasswords ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Required to verify identity"
                              className="w-full bg-system-bg border border-system-border rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors"
                            />
                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-system-muted" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono px-1">New Password</label>
                        <div className="relative">
                          <input 
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full bg-system-bg border border-system-border rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors"
                          />
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-system-muted" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono px-1">Confirm New Password</label>
                        <div className="relative">
                          <input 
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Match new password"
                            className="w-full bg-system-bg border border-system-border rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-system-muted hover:text-system-accent transition-colors"
                          >
                            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handlePasswordAction}
                        disabled={authLoading}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95",
                          authLoading ? "bg-system-border text-system-muted cursor-not-allowed" : "bg-system-text text-system-bg hover:bg-opacity-90"
                        )}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {isEmailUser ? 'Update Password' : 'Add Password to Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <Shield className="w-10 h-10 text-system-muted mx-auto opacity-20" />
                <p className="text-xs text-system-muted font-mono uppercase tracking-widest">Guest session active</p>
              </div>
            )}
          </section>

        </div>

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

      {isAddingDevicePopup && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-system-panel border border-system-border rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base uppercase font-mono tracking-tight text-system-text mb-4">Register New Telemetry Node</h3>
            
            {deviceError && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-500 rounded-xl text-xs font-mono font-semibold flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-550 block animate-ping shrink-0" />
                  <span>{deviceError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeviceError(null)}
                  className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono block">Device ID Token</label>
                <input
                  type="text"
                  value={deviceIdInput}
                  onChange={(e) => setDeviceIdInput(e.target.value)}
                  placeholder="e.g. EP-ESP32-LAS99X"
                  className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors font-mono"
                />
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
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setIsAddingDevicePopup(false)}
                className="px-4 py-2 bg-system-bg border border-system-border hover:bg-system-panel font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDevice}
                className="px-4 py-2 bg-system-accent hover:bg-opacity-90 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Location Popups removed */}
    </div>
  );
}
