import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Check, ExternalLink, Download, Laptop } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export function InstallModal({ isOpen, onClose, onNativeInstall, hasNativePrompt = false }: InstallModalProps) {
  const [isIframe, setIsIframe] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    // Detect if we are inside an iframe
    setIsIframe(window !== window.top);

    // Detect user OS to switch tab proactively
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ ease: 'easeOut', duration: 0.2 }}
          className="relative bg-system-panel w-full max-w-lg rounded-2xl border border-system-border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          id="install-pwa-modal"
        >
          {/* Header */}
          <div className="p-5 border-b border-system-border flex items-center justify-between bg-gradient-to-r from-system-bg to-system-panel">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-system-border flex items-center justify-center shrink-0 overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="LAS Logo" 
                  className="w-8 h-8 object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-semibold text-system-text text-base">Install AirSense App</h3>
                <p className="text-xs text-system-muted">Native experience on all your devices</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-system-muted hover:text-system-text hover:bg-system-bg rounded-lg border border-transparent hover:border-system-border transition-all"
              id="close-install-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Iframe Hint Banner */}
            {isIframe && (
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex flex-col gap-3">
                <div className="flex gap-2">
                  <span className="text-amber-600 font-bold text-sm">⚠️</span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900">Running in Preview</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Browsers prevent application installation inside preview frames. Please open the app in a new tab first to enable easy native install.
                    </p>
                  </div>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab & Install
                </a>
              </div>
            )}

            {/* Core PWA benefits list */}
            {!isIframe && (
              <div className="grid grid-cols-2 gap-2.5 bg-system-bg p-3.5 rounded-xl border border-system-border">
                <div className="flex gap-2 text-xs text-system-text">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Works offline</span>
                </div>
                <div className="flex gap-2 text-xs text-system-text">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fast launch speeds</span>
                </div>
                <div className="flex gap-2 text-xs text-system-text">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Interactive notifications</span>
                </div>
                <div className="flex gap-2 text-xs text-system-text">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Home Screen icon</span>
                </div>
              </div>
            )}

            {/* Direct PWA Action or Simple Browser Action Notice */}
            {!isIframe && (
              <div className="space-y-4 pt-2">
                {hasNativePrompt && (
                  <div className="p-4 bg-system-accent/10 border border-system-accent/20 rounded-xl space-y-3">
                    <p className="text-sm text-system-text font-medium leading-relaxed">
                      Your current browser supports direct automatic download & installation onto your device.
                    </p>
                    <button
                      onClick={() => {
                        if (onNativeInstall) onNativeInstall();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Natively Now</span>
                    </button>
                  </div>
                )}

                {/* Switchable device guides */}
                <div className="border border-system-border rounded-xl bg-system-bg p-4 space-y-4">
                  <div className="flex items-center gap-2 justify-between border-b border-system-border pb-3">
                    <h4 className="font-semibold text-sm text-system-text flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-system-accent" />
                      <span>Device Installation Guide</span>
                    </h4>
                    <span className="text-[10px] bg-system-border px-2 py-0.5 rounded-full font-mono text-system-muted">How-to Option</span>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex gap-1 p-1 bg-system-panel border border-system-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveTab('android')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'android'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                          : 'text-system-muted hover:text-system-text hover:bg-system-bg/50'
                      }`}
                    >
                      Android
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ios')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'ios'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                          : 'text-system-muted hover:text-system-text hover:bg-system-bg/50'
                      }`}
                    >
                      iOS (iPhone/iPad)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('desktop')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'desktop'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                          : 'text-system-muted hover:text-system-text hover:bg-system-bg/50'
                      }`}
                    >
                      Desktop
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="space-y-3.5 pt-1 text-xs">
                    {activeTab === 'android' && (
                      <div className="space-y-3">
                        <p className="text-system-muted leading-relaxed">
                          For Google Chrome, Microsoft Edge, Opera, or Samsung Internet:
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 text-system-text leading-relaxed">
                          <li>
                            Open the browser menu by tapping the <strong className="font-semibold text-system-text">three dots (⋮)</strong> icon in the top right.
                          </li>
                          <li>
                            Tap <strong className="font-semibold text-system-accent">"Install App"</strong> or <strong className="font-semibold text-system-accent">"Add to Home Screen"</strong>.
                          </li>
                          <li>
                            Confirm on the prompt to download. Livestock AirSense (LAS) will be added to your home screen immediately!
                          </li>
                        </ol>
                      </div>
                    )}

                    {activeTab === 'ios' && (
                      <div className="space-y-3">
                        <p className="text-system-muted leading-relaxed">
                          Apple Safari on iOS (iPhone/iPad) requires a quick manual step:
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 text-system-text leading-relaxed">
                          <li>
                            Tap the <strong className="font-semibold text-system-text">Share</strong> button <span className="inline-flex items-center justify-center bg-system-panel border border-system-border px-1 px-1.5 rounded text-[10px] uppercase font-mono">Square with Up Arrow</span> at the bottom of Safari.
                          </li>
                          <li>
                            Scroll down the action list and tap <strong className="font-semibold text-system-accent">"Add to Home Screen"</strong>.
                          </li>
                          <li>
                            Validate the app name and tap <strong className="font-semibold text-system-accent">"Add"</strong> in the top-right corner.
                          </li>
                        </ol>
                        <div className="p-2 bg-blue-500/5 rounded-lg border border-system-border/40 text-[11px] text-system-muted leading-relaxed">
                          💡 <strong>Pro Tip:</strong> There is no App Store download needed. Safari saves the app natively to your iPhone!
                        </div>
                      </div>
                    )}

                    {activeTab === 'desktop' && (
                      <div className="space-y-3">
                        <p className="text-system-muted leading-relaxed">
                          Desktop browsers (Chrome, Edge, Brave, Opera):
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 text-system-text leading-relaxed">
                          <li>
                            Look at the right side of the address bar for an <strong className="font-semibold text-system-accent">Install icon</strong> (computer screen with a down arrow, or a small square <strong className="font-mono text-system-text font-bold">+</strong> sign).
                          </li>
                          <li>
                            Click the button and accept to run Livestock AirSense as a desktop app.
                          </li>
                          <li>
                            Alternatively, open your browser settings and select <strong className="font-semibold text-system-accent">"Save and share" → "Install page as app"</strong>.
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-system-border bg-system-bg flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="py-2 px-4 border border-system-border hover:bg-system-border/40 text-system-text text-xs font-semibold rounded-lg transition-colors"
            >
              Back to App
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
