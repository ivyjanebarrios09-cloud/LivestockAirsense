import { useState } from 'react';
import { Save, Server, Shield, Database, Sliders, CheckCircle, User, LogOut } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { useAppContext } from '../hooks/useAppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/firebase';

export function SettingsPage() {
  const { user } = useAuthState();
  const { thresholds, saveThresholds } = useAppContext();
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
        <p className="text-sm text-system-muted mt-1">Configure global parameters, sensor safety thresholds, and administrative limits.</p>
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
            <div className="px-5 py-4 border-b border-system-border bg-system-bg flex items-center gap-2">
              <Server className="w-4 h-4 text-system-muted" />
              <h3 className="font-bold text-sm tracking-tight uppercase font-mono text-system-text">Device Registration</h3>
            </div>
            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono">Device ID Token</label>
                <input type="text" defaultValue="EP-ESP32-LAS99X" className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-system-muted font-mono">Telemetry Host broker</label>
                <input type="text" defaultValue="mqtt.livestock-airsense.io" className="w-full bg-system-bg border border-system-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-system-accent font-semibold text-system-text transition-colors" />
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
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded-lg border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel cursor-pointer" />
                  <span className="text-sm font-medium group-hover:text-system-accent transition-colors">Send Push Notifications for Critical Alerts</span>
                </label>
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

          <div className="flex items-center justify-end gap-3 pt-2">
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
      )}
    </div>
  );
}
