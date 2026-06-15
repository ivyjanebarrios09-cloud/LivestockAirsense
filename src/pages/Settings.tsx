import { useState } from 'react';
import { Save, Server, Shield, Database, Smartphone, Download } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { cn } from '../lib/utils';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from '../components/InstallModal';

export function SettingsPage() {
  const { user } = useAuthState();
  const [saving, setSaving] = useState(false);
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-system-muted mt-1">Configure global parameters and administrative controls.</p>
      </div>

      {!user ? (
        <div className="bg-system-panel border border-system-border shadow-sm rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-system-muted mb-4" />
          <h3 className="font-medium text-lg text-system-muted">Administrator Access Required</h3>
          <p className="text-sm text-system-muted max-w-md mt-2">
            You must be logged in as an administrator to modify system integration settings, sensor thresholds, and network configurations.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {isInstallable && (
            <section className="relative overflow-hidden bg-gradient-to-r from-indigo-950/20 via-blue-950/10 to-transparent border border-indigo-500/20 rounded-xl p-6 shadow-md hover:border-indigo-500/30 transition-all">
              {/* Decorative glow */}
              <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                      Native Web Application (PWA)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Install AirSense on your device
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    Add AirSense to your home screen or desktop docking bar to launch as a standalone application, enjoy full-screen tracking, and receive push alerts.
                  </p>
                </div>
                
                <button
                  onClick={install}
                  className="flex items-center justify-center gap-2.5 py-3 px-5 bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-600 hover:from-indigo-400 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow-md transition-all shrink-0 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>One-Tap Install</span>
                </button>
              </div>

              <InstallModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                onNativeInstall={triggerNativeInstall} 
                hasNativePrompt={hasNativePrompt} 
              />
            </section>
          )}
          
          <section className="bg-system-panel border border-system-border shadow-sm rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-system-border flex items-center gap-2">
              <Server className="w-4 h-4 text-system-muted" />
              <h3 className="font-medium text-sm">Device Registration</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-system-muted font-mono">Device ID</label>
                <input type="text" placeholder="e.g. NODE-01" className="w-full bg-system-bg border border-system-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-system-accent transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-system-muted font-mono">Device Name</label>
                <input type="text" placeholder="e.g. Barn A Sensor" className="w-full bg-system-bg border border-system-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-system-accent transition-colors" />
              </div>
            </div>
          </section>

          <section className="bg-system-panel border border-system-border shadow-sm rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-system-border flex items-center gap-2">
              <Database className="w-4 h-4 text-system-muted" />
              <h3 className="font-medium text-sm">Integration Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-system-muted font-mono">Refresh Interval (ms)</label>
                <select defaultValue="5000 (5 seconds)" className="w-full bg-system-bg border border-system-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-system-accent transition-colors">
                  <option>1000 (1 second)</option>
                  <option>2000 (2 seconds)</option>
                  <option>5000 (5 seconds)</option>
                  <option>10000 (10 seconds)</option>
                </select>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel" />
                  <span className="text-sm">Enable Firebase Real-time Synchronization</span>
                </label>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-system-border bg-system-bg text-system-accent focus:ring-system-accent focus:ring-offset-system-panel" />
                  <span className="text-sm">Send Push Notifications for Critical Alerts</span>
                </label>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button 
              onClick={handleSave}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all",
                saving ? "bg-system-border text-system-muted" : "bg-system-accent text-white hover:bg-opacity-90 shadow-sm"
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
