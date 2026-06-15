import { ArrowRight, Wind, Activity, Cloud, BarChart3, ShieldCheck, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function LandingPage() {
  const { isInstallable, install } = usePWAInstall();

  return (
    <div className="min-h-screen bg-system-bg text-system-text flex flex-col font-sans selection:bg-system-accent/30">
      {/* Header */}
      <header className="h-16 border-b border-system-border bg-system-panel flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Livestock AirSense Logo" className="h-10 sm:h-12 w-auto object-contain" />
          <span className="font-bold text-lg tracking-tight">Livestock AirSense</span>
        </div>
        <div className="flex items-center gap-4">
          {isInstallable && (
            <button
              onClick={install}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-system-bg border border-system-border text-system-text text-sm font-medium rounded-md hover:bg-system-border/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          )}
          <Link to="/login" className="text-sm font-medium text-system-muted hover:text-system-text transition-colors">
            Log In
          </Link>
          <Link to="/login" className="px-4 py-2 bg-system-accent text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-system-accent/10 text-system-accent text-xs font-semibold tracking-wide uppercase border border-system-accent/20">
            <Activity className="w-3 h-3" />
            <span className="mt-0.5">Next-Gen Agricultural Monitoring</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl text-system-text leading-tight">
            Optimize Livestock Health with Precision Air Quality
          </h1>
          
          <p className="text-lg md:text-xl text-system-muted max-w-2xl leading-relaxed">
            Continuous real-time monitoring of temperature, humidity, ammonia, and CO2. Prevent respiratory diseases and maximize yield with predictive analytics.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Link to="/app/dashboard" className="px-8 py-3 bg-system-accent text-white font-medium rounded-lg hover:bg-opacity-90 transition-all shadow-sm flex items-center gap-2">
              View Live Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="px-8 py-3 bg-system-panel border border-system-border text-system-text font-medium rounded-lg hover:bg-system-border/50 transition-colors">
              Sign In
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-system-panel border-t border-system-border px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight">Enterprise-Grade Monitoring</h2>
              <p className="text-system-muted mt-4">Built for modern agricultural facilities.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Cloud,
                  title: 'Comprehensive Sensors',
                  desc: 'Detect accurate levels of Ammonia, Methane, particulate matter (PM2.5/PM10), and more.'
                },
                {
                  icon: BarChart3,
                  title: 'Predictive Analytics',
                  desc: 'Identify unhealthy trends before they impact livestock with historical pattern analysis.'
                },
                {
                  icon: ShieldCheck,
                  title: 'Automated Alerts',
                  desc: 'Get instant notifications for critical environmental shifts, preventing irreversible damage.'
                }
              ].map((feature, i) => (
                <div key={i} className="bg-system-bg border border-system-border rounded-xl p-8 hover:border-system-accent/50 transition-colors">
                  <div className="w-12 h-12 bg-system-panel rounded-lg border border-system-border flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-system-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-system-muted leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-system-border bg-system-bg text-center text-system-muted text-sm px-6">
        <p>&copy; {new Date().getFullYear()} Livestock AirSense (LAS). All rights reserved.</p>
      </footer>
    </div>
  );
}
