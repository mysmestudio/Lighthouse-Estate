import React from 'react';
import { Phone, Shield, MapPin, Clock, Moon, Download } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const Footer: React.FC = () => {
  const { isInstalled, setShowInstallModal } = usePwa();

  return (
    <footer className="bg-[#0A2F1C] text-[#FBF8F1] border-t border-[#C89B3C]/30 pt-12 pb-10 mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#0F472A]">
          {/* Col 1: Estate Identity */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F472A] flex items-center justify-center border border-[#C89B3C]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
                  <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
                  <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
                  <circle cx="12" cy="12" r="2.5" fill="#E7D19C"/>
                </svg>
              </div>
              <div>
                <span className="font-serif font-bold text-xl text-[#FBF8F1] tracking-tight">
                  Lighthouse
                </span>
                <span className="block text-xs uppercase tracking-widest text-[#C89B3C]">
                  Estate Community
                </span>
              </div>
            </div>
            <p className="text-xs text-[#E7D19C]/80 leading-relaxed">
              A serene, sanctuary-inspired residential community blending modern access-control with graceful living and timeless architectural harmony.
            </p>
          </div>

          {/* Col 2: Gate & Security Hotlines */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-sm text-[#C89B3C] tracking-wide uppercase">
              Gate Operations
            </h4>
            <ul className="space-y-2 text-xs text-[#FBF8F1]/85">
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>24/7 Security Gatehouse: <strong>Lane 1 & 2</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Emergency Intercom: <strong>Ext. 100 / 101</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Contractor Window: <strong>08:00 – 18:00</strong></span>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Madrasa */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-sm text-[#C89B3C] tracking-wide uppercase">
              Community & Faith
            </h4>
            <ul className="space-y-2 text-xs text-[#FBF8F1]/85">
              <li className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Al-Noor Central Prayer Pavilion</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Madrasa: Sat & Sun (After Asr)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Community Garden & Walking Trail</span>
              </li>
            </ul>
          </div>

          {/* Col 4: PWA App Status */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-sm text-[#C89B3C] tracking-wide uppercase">
              PWA Platform Status
            </h4>
            <div className="p-3 rounded-xl bg-[#0F472A]/80 border border-[#C89B3C]/30 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#E7D19C]">Cloudflare Edge:</span>
                <span className="font-mono text-emerald-400 font-semibold">Active (SPA)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#E7D19C]">Service Worker:</span>
                <span className="font-mono text-emerald-400">Offline Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#E7D19C]">App Mode:</span>
                <span className="font-mono text-[#FBF8F1]">
                  {isInstalled ? 'Standalone Installed' : 'Web Browser'}
                </span>
              </div>
            </div>

            {!isInstalled && (
              <button
                onClick={() => setShowInstallModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-[#C89B3C]/20 hover:bg-[#C89B3C]/30 border border-[#C89B3C]/40 text-[#E7D19C] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Install Lighthouse App</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#E7D19C]/60 gap-3">
          <p>© {new Date().getFullYear()} Lighthouse Estate Residents Association. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>By-Laws & Access Policy</span>
            <span>•</span>
            <span>Security Guidelines</span>
            <span>•</span>
            <span>PWA v1.2</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
