import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const UpdateToast: React.FC = () => {
  const { updateAvailable, applyUpdate } = usePwa();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom duration-300 max-w-sm w-[90%]"
    >
      <div className="bg-[#0A2F1C] border-2 border-[#C89B3C] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C89B3C]/20 border border-[#C89B3C] flex items-center justify-center text-[#E7D19C] shrink-0 animate-spin-slow">
            <RefreshCw className="w-4 h-4 text-[#E7D19C]" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-[#FBF8F1]">
              New version available
            </h4>
            <p className="text-[11px] text-[#E7D19C]/80">
              Update to get latest estate features.
            </p>
          </div>
        </div>

        <button
          onClick={applyUpdate}
          className="px-4 py-2 rounded-xl bg-[#C89B3C] hover:bg-[#b28a35] text-[#0A2F1C] font-bold text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
        >
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
