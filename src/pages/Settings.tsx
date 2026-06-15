import { useState } from 'react';
import { Save, Server, Shield, Database } from 'lucide-react';
import { useAuthState } from '../hooks/useAuthState';
import { cn } from '../lib/utils';

export function SettingsPage() {
  const { user } = useAuthState();
  const [saving, setSaving] = useState(false);

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
