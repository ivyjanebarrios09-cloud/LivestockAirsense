import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';

export function PWAPromoCard() {
  const { isInstallable, install, showModal, setShowModal, triggerNativeInstall, hasNativePrompt } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <>
      <div 
        className="w-full max-w-md mx-auto bg-[#0a0f1d] border border-slate-800/80 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.3)] text-left hover:border-slate-700/60 transition-all duration-300"
        id="pwa-install-promo-card"
      >
        {/* Device pill */}
        <div className="flex items-center gap-2 mb-3.5">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            Android & iOS App
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          Install AirSense
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Install AirSense on your Home Screen for a full-screen experience and fast offline access!
        </p>

        {/* Button */}
        <button
          onClick={install}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-[0.98]"
        >
          <Download className="w-4 h-4 text-white" />
          <span>One-Tap Install</span>
        </button>
      </div>

      <InstallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onNativeInstall={triggerNativeInstall} 
        hasNativePrompt={hasNativePrompt} 
      />
    </>
  );
}
