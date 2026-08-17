import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = usePwa();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-[#0A2F1C] text-[#E7D19C] border-b border-[#C89B3C]/50 px-4 py-2.5 sm:py-3 shadow-md transition-all sticky top-0 z-50 animate-in fade-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <span>
            <strong className="font-bold text-white">You're offline</strong> — showing last synced data. Active passes and cached notices remain accessible.
          </span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C89B3C]/20 hover:bg-[#C89B3C]/30 text-[#E7D19C] text-xs font-semibold border border-[#C89B3C]/40 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};
