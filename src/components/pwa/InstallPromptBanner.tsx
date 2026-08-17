import React from 'react';
import { Download, X, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const InstallPromptBanner: React.FC = () => {
  const { showInstallBanner, dismissInstallBanner, triggerInstall, isInstalled } = usePwa();

  if (!showInstallBanner || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#0A2F1C] border border-[#C89B3C] text-white p-4 sm:p-5 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Decorative background star glow */}
        <div className="absolute right-[-20px] top-[-20px] opacity-10 text-[#C89B3C] pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
          </svg>
        </div>

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0F472A] border border-[#C89B3C]/50 flex items-center justify-center text-[#E7D19C] shrink-0 shadow-md">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
                <circle cx="12" cy="12" r="2.5" fill="#E7D19C"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#C89B3C]">
                  Installable Web App
                </span>
              </div>
              <h4 className="font-serif font-bold text-base text-[#FBF8F1]">
                Install Lighthouse Estate App
              </h4>
            </div>
          </div>

          <button
            onClick={dismissInstallBanner}
            aria-label="Dismiss install banner"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#E7D19C]/80 mt-2 relative z-10 leading-relaxed">
          Add Lighthouse to your home screen for rapid offline visitor pass generation and instant gatehouse clearance.
        </p>

        <div className="mt-4 flex items-center gap-2.5 relative z-10">
          <button
            onClick={triggerInstall}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#C89B3C] hover:bg-[#b58b34] text-[#0A2F1C] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-[#0A2F1C]" />
            <span>Install App</span>
          </button>

          <button
            onClick={dismissInstallBanner}
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
