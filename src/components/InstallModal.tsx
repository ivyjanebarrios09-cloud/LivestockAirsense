import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Check, ExternalLink, Download } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export function InstallModal({ isOpen, onClose, onNativeInstall, hasNativePrompt = false }: InstallModalProps) {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Detect if we are inside an iframe
    setIsIframe(window !== window.top);
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
              <div className="w-10 h-10 rounded-xl bg-system-accent/10 flex items-center justify-center text-system-accent border border-system-accent/20">
                <Download className="w-5 h-5 animate-pulse" />
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
                {hasNativePrompt ? (
                  <div className="p-4 bg-system-accent/10 border border-system-accent/20 rounded-xl space-y-3">
                    <p className="text-sm text-system-text font-medium leading-relaxed">
                      Your device is ready to install the application in native full-screen PWA format.
                    </p>
                    <button
                      onClick={() => {
                        if (onNativeInstall) onNativeInstall();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Native App Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-system-bg border border-system-border rounded-xl space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-system-accent" />
                      <h4 className="font-semibold text-sm text-system-text">Run Natively on Your Device</h4>
                    </div>
                    <p className="text-xs text-system-muted leading-relaxed">
                      To install Livestock AirSense as a standalone native program, tap the <strong className="font-semibold text-system-accent">Download/Install App icon</strong> next to your browser's address bar star, or select <strong className="font-medium text-system-text">"Add to Home Screen"</strong> / <strong className="font-medium text-system-text">"Install App"</strong> from your browser's main menu.
                    </p>
                  </div>
                )}
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
