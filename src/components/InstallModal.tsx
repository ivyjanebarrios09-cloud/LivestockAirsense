import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Monitor, ChevronRight, Check, ExternalLink, Share, MoreVertical, PlusSquare, ArrowUpSquare, Download } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export function InstallModal({ isOpen, onClose, onNativeInstall, hasNativePrompt = false }: InstallModalProps) {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Detect if we are inside an iframe
    setIsIframe(window !== window.top);

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

            {/* Install trigger for browsers with beforeinstallprompt */}
            {hasNativePrompt && !isIframe && (
              <div className="p-4 bg-system-accent/5 border border-system-accent/15 rounded-xl flex flex-col gap-3">
                <p className="text-sm font-medium text-system-text">
                  Your browser supports direct automatic installation!
                </p>
                <button
                  onClick={() => {
                    if (onNativeInstall) onNativeInstall();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-system-accent hover:bg-opacity-95 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install App Instantly
                </button>
              </div>
            )}

            {/* Tabs Selector */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-system-muted uppercase tracking-wider">How to Install</span>
                <span className="text-[11px] font-medium text-system-muted px-2 py-0.5 rounded-full bg-system-bg border border-system-border">
                  Choose your device
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-1 p-1 bg-system-bg rounded-xl border border-system-border">
                <button
                  onClick={() => setActiveTab('android')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'android'
                      ? 'bg-system-panel text-system-accent shadow-sm border border-system-border'
                      : 'text-system-muted hover:text-system-text border border-transparent'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Android
                </button>
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'ios'
                      ? 'bg-system-panel text-system-accent shadow-sm border border-system-border'
                      : 'text-system-muted hover:text-system-text border border-transparent'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  iOS (Apple)
                </button>
                <button
                  onClick={() => setActiveTab('desktop')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'desktop'
                      ? 'bg-system-panel text-system-accent shadow-sm border border-system-border'
                      : 'text-system-muted hover:text-system-text border border-transparent'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
              </div>

              {/* Instructions Panel */}
              <div className="p-4 bg-system-bg/50 border border-system-border rounded-xl">
                {activeTab === 'android' && (
                  <ul className="space-y-3.5">
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="font-semibold">Open in your browser</p>
                        <p className="text-xs text-system-muted leading-relaxed">Make sure you are using Chrome on your Android device.</p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="font-semibold">Tap the Install or Menu icon</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Look for the <strong className="font-semibold text-system-accent">Download/App icon</strong> (or monitor icon with down arrow <Download className="inline-block w-3.5 h-3.5 text-system-accent mx-0.5" />) next to the browser bookmark star, or tap the three dots menu (<MoreVertical className="inline w-3.5 h-3.5 mx-0.5 text-system-text" />) in Chrome.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="font-semibold">Select "Install App"</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Tap the list option <strong className="font-medium">"Install app"</strong> or <strong className="font-medium">"Add to Home screen"</strong>. Confirm and complete your installation!
                        </p>
                      </div>
                    </li>
                  </ul>
                )}

                {activeTab === 'ios' && (
                  <ul className="space-y-3.5">
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="font-semibold">Open in Safari</p>
                        <p className="text-xs text-system-muted leading-relaxed">Open this web link inside Apple's native Safari browser.</p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="font-semibold">Tap the Install, Share or Bookmark bar</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Look for the <strong className="font-semibold text-system-accent">Download/App icon</strong> (or monitor icon with down arrow <Download className="inline-block w-3.5 h-3.5 text-system-accent mx-0.5" />) next to the address bookmark star, or tap the standard iOS <strong>Share</strong> button (<Share className="inline w-3.5 h-3.5 mx-0.5 text-system-accent" />) in Safari's toolbar.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="font-semibold">Select "Add to Home Screen"</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Scroll down the menu list and tap <strong className="font-medium">"Add to Home Screen"</strong> (<PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-system-text" />), then tap <strong className="font-medium">"Add"</strong> in the top-right corner.
                        </p>
                      </div>
                    </li>
                  </ul>
                )}

                {activeTab === 'desktop' && (
                  <ul className="space-y-3.5">
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="font-semibold">Look at address bar</p>
                        <p className="text-xs text-system-muted leading-relaxed">On modern desktop browsers (Chrome, Edge, Opera, etc.), view the right end of the URL bar.</p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="font-semibold">Click the "Install" icon</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Click the download/app icon (<Download className="inline w-3.5 h-3.5 mx-0.5 text-system-accent" /> or monitor icon with down arrow) next to the bookmark star.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-system-text">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-system-accent/15 text-system-accent text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="font-semibold">Confirm install option</p>
                        <p className="text-xs text-system-muted leading-relaxed">
                          Select the <strong className="font-medium">"Install"</strong> button inside browser notification overlay. The app now launches in its own native window!
                        </p>
                      </div>
                    </li>
                  </ul>
                )}
              </div>
            </div>
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
