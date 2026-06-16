import { Wind, Activity, Cloud, BarChart3, ShieldCheck, Star, MonitorDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Interactive3DAtmosphere } from '../components/Interactive3DAtmosphere';
import { cn } from '../lib/utils';

export function LandingPage() {
  const { isInstallable, install } = usePWAInstall();

  return (
    <div className="min-h-screen bg-system-bg text-system-text flex flex-col font-sans selection:bg-system-accent/30">
      {/* Header */}
      <header className="h-16 border-b border-system-border bg-system-panel flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Livestock AirSense Logo" className="h-10 sm:h-12 w-auto object-contain" />
          <span className="font-bold text-lg tracking-tight">Livestock AirSense</span>
        </div>
        <div className="flex items-center gap-4">
          {isInstallable && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-system-bg border border-system-border rounded-lg shadow-inner">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" title="Bookmark style indicator" />
              <div className="w-[1px] h-4 bg-system-border" />
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-sm active:scale-95"
                title="Install Native App (PWA)"
              >
                <MonitorDown className="w-4 h-4 shrink-0" />
                <span>Install PWA</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-system-bg border-b border-system-border min-h-[500px]">
          {/* Detailed 3D perspective Atmosphere & Billboarding Clouds Layer */}
          <Interactive3DAtmosphere variant="sky" roundedClass="rounded-none" />
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/40 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none animate-pulse duration-10000" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none animate-pulse duration-10000" />

          <section className="relative z-10 py-24 md:py-32 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 backdrop-blur-md shadow-sm">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-800">Next-Gen Agricultural Monitoring</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight max-w-4xl text-slate-900 leading-tight drop-shadow-sm select-none">
              Optimize Livestock Health with <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">Precision Air Quality</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-700 max-w-2xl leading-relaxed drop-shadow-sm select-none">
              Continuous real-time monitoring of temperature, humidity, ammonia, and CO2. Prevent respiratory diseases and maximize yield with predictive analytics.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link to="/login" className="px-6 py-3 bg-system-accent text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-opacity-95 transition-all shadow-lg shadow-system-accent/20 border border-transparent flex items-center gap-2 transform active:scale-95">
                <span>Sign Up</span>
              </Link>
              <Link to="/login" className="px-6 py-3 bg-white/60 hover:bg-white/80 text-system-accent text-sm font-bold uppercase tracking-wider rounded-xl transition-all border border-white flex items-center gap-2 transform active:scale-95 backdrop-blur-sm shadow-sm">
                <span>Log In</span>
              </Link>
            </div>
          </section>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-system-border bg-system-bg text-center text-system-muted text-sm px-6">
        <p>&copy; {new Date().getFullYear()} Livestock AirSense (LAS). All rights reserved.</p>
      </footer>
    </div>
  );
}
