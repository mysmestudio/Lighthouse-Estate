import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const InstallModal: React.FC = () => {
  const { showInstallModal, setShowInstallModal, isIos, isInstalled, triggerInstall } = usePwa();

  if (!showInstallModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0A2F1C] text-white p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F472A] border border-[#C89B3C]/40 flex items-center justify-center text-[#E7D19C]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
                <circle cx="12" cy="12" r="2.5" fill="#E7D19C"/>
              </svg>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C89B3C]">
                {isIos ? 'iOS Safari Installation' : 'Web App Installation'}
              </span>
              <h3 className="font-serif text-lg font-bold text-[#FBF8F1]">
                Install Lighthouse App
              </h3>
            </div>
          </div>

          <button
            onClick={() => setShowInstallModal(false)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isInstalled ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#0A2F1C]">
                Lighthouse is Already Installed
              </h4>
              <p className="text-xs text-[#10241A]/70 max-w-xs mx-auto">
                You are currently accessing the official standalone app on your device.
              </p>
            </div>
          ) : isIos ? (
            <div className="space-y-4">
              <p className="text-xs text-[#10241A]/80 leading-relaxed">
                To install Lighthouse on your iPhone or iPad, follow these simple steps in <strong>Safari</strong>:
              </p>

              <div className="space-y-3 text-xs">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4D9BE]">
                  <div className="w-7 h-7 rounded-lg bg-[#F2EAD9] text-[#0F472A] flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-[#0A2F1C] flex items-center gap-1.5">
                      <span>Tap the <strong>Share</strong> button</span>
                      <Share className="w-3.5 h-3.5 text-[#0F472A]" />
                    </div>
                    <p className="text-[#10241A]/60 text-[11px] mt-0.5">
                      Located in the bottom toolbar of Safari (or top right on iPad).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4D9BE]">
                  <div className="w-7 h-7 rounded-lg bg-[#F2EAD9] text-[#0F472A] flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-[#0A2F1C] flex items-center gap-1.5">
                      <span>Scroll down & tap <strong>"Add to Home Screen"</strong></span>
                      <PlusSquare className="w-3.5 h-3.5 text-[#0F472A]" />
                    </div>
                    <p className="text-[#10241A]/60 text-[11px] mt-0.5">
                      Look for the plus icon in the share options sheet.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4D9BE]">
                  <div className="w-7 h-7 rounded-lg bg-[#F2EAD9] text-[#0F472A] flex items-center justify-center font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-[#0A2F1C]">
                      Tap <strong>"Add"</strong> in the top right corner
                    </div>
                    <p className="text-[#10241A]/60 text-[11px] mt-0.5">
                      Lighthouse Estate will appear as a standalone app on your home screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#10241A]/80 leading-relaxed">
                Install Lighthouse Estate as a standalone web application for faster launch and offline pass access.
              </p>

              <div className="p-4 rounded-xl bg-white border border-[#E4D9BE] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                  <ShieldCheck className="w-4 h-4 text-[#0F472A]" />
                  <span>Key App Benefits</span>
                </div>
                <ul className="text-[11px] text-[#10241A]/70 space-y-1 list-disc list-inside">
                  <li>Instant visitor pass generation without browser address bar</li>
                  <li>Offline gate code inspection and local emergency hotlines</li>
                  <li>Fast PIN credential validation at security gates</li>
                </ul>
              </div>

              <button
                onClick={async () => {
                  await triggerInstall();
                  setShowInstallModal(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-[#E7D19C]" />
                <span>Prompt Native Install</span>
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 rounded-xl border border-[#E4D9BE] text-xs font-semibold text-[#10241A]/70 hover:text-[#10241A] hover:bg-[#F2EAD9] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
