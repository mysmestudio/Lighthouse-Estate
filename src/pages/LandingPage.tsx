import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppUser } from '../types';
import { usePwa } from '../context/PwaContext';
import { triggerSOSEvent } from '../lib/sos-service';

interface LandingPageProps {
  navigate: (path: string) => void;
  currentUser: AppUser | null;
}

interface HadithItem {
  text: string;
  source: string;
}

const HADITHS: HadithItem[] = [
  { 
    text: "None of you truly believes until you love for others what you love for yourself.", 
    source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" 
  },
  { 
    text: "Whoever believes in Allah and the Last Day should do good to their neighbour.", 
    source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" 
  },
  { 
    text: "The believers, in their mutual love and mercy, are like one body — when a single part aches, the whole body stays awake with fever.", 
    source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" 
  },
  { 
    text: "Jibril kept urging kindness to neighbours, until I thought they might even be given a share of inheritance.", 
    source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" 
  }
];

const TOTAL_SLIDES = 6;
const RING_LENGTH = 213.6;
const HOLD_MS = 5000;

export const LandingPage: React.FC<LandingPageProps> = ({ navigate, currentUser }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setShowInstallModal, triggerInstall, isInstallable, isIos } = usePwa();

  // SOS button states
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');

  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Today's Hadith selection
  const todayHadith = useMemo(() => {
    const day = new Date().getDate();
    return HADITHS[day % HADITHS.length];
  }, []);

  const handleInstallClick = () => {
    if (isInstallable && !isIos) {
      triggerInstall();
    } else {
      setShowInstallModal(true);
    }
  };

  const goToSlide = (idx: number) => {
    const nextIdx = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx));
    setCurrentSlide(nextIdx);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(TOTAL_SLIDES - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) {
        setCurrentSlide((prev) => Math.min(TOTAL_SLIDES - 1, prev + 1));
      } else {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      }
    }
    touchStartXRef.current = null;
  };

  // SOS hold handlers
  const handleSosPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(() => {
      // SOS Triggered!
      setIsHoldingSOS(false);
      setSosActivated(true);
      setShowSosToast(true);

      // Trigger actual SOS event if user logged in
      if (currentUser) {
        try {
          triggerSOSEvent(currentUser);
        } catch (err) {
          console.error('Error triggering SOS:', err);
        }
      }

      // Reset after 4 seconds
      setTimeout(() => {
        setSosActivated(false);
        setShowSosToast(false);
        setSosTransition('none');
        setSosProgressOffset(RING_LENGTH);
      }, 4000);
    }, HOLD_MS);
  };

  const handleSosPointerCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(RING_LENGTH);
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#123528] text-white font-['Manrope',sans-serif] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* SVG Lattice Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="lattice" width="64" height="64" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="12" y="12" width="40" height="40" transform="rotate(45 32 32)" />
              <rect x="17" y="17" width="30" height="30" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Rotating Conic Beam Effect */}
      <div 
        className="fixed -top-[40%] -left-[10%] w-[140%] h-[180%] pointer-events-none z-0 animate-[sweep_16s_linear_infinite]"
        style={{
          background: 'conic-gradient(from 200deg at 30% 20%, rgba(255,255,255,0.14), rgba(255,255,255,0) 22%, rgba(255,255,255,0) 100%)'
        }}
      />

      {/* Lattice Overlay */}
      <svg className="fixed inset-0 w-full h-full opacity-[0.035] pointer-events-none text-white z-0">
        <rect width="100%" height="100%" fill="url(#lattice)" />
      </svg>

      {/* Header Pillbars */}
      <header className="fixed top-[18px] left-[18px] right-[18px] z-40 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-white/[0.08] border border-white/[0.14] backdrop-blur-[14px] rounded-full py-2 pl-3.5 pr-2.5 shadow-sm">
          <button 
            type="button" 
            onClick={() => goToSlide(0)}
            className="flex items-center gap-2.5 font-['Sora',sans-serif] font-bold text-[15.5px] text-white hover:opacity-90 transition-opacity"
          >
            <span className="w-[30px] h-[30px] rounded-[9px] bg-[#3FAE7A] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <circle cx="12" cy="12" r="8" stroke="#0D2A1F" strokeWidth="1.8" />
                <path d="M12 7v10M7 12h10" stroke="#0D2A1F" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span>Light House Estate, Lekki</span>
          </button>
        </div>

        {/* Right Header Pillbar */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/[0.08] border border-white/[0.14] backdrop-blur-[14px] rounded-full p-1.5 shadow-sm">
          {currentUser ? (
            <>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 font-bold text-[13.5px] py-2 px-4 rounded-full bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] transition-all active:scale-95 whitespace-nowrap"
              >
                Dashboard
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 font-bold text-[13.5px] py-2 px-4 rounded-full bg-transparent text-white border border-white/[0.14] hover:border-white/40 transition-all active:scale-95 whitespace-nowrap"
              >
                Login
              </button>
              <button 
                type="button" 
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 font-bold text-[13.5px] py-2 px-4 rounded-full bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] transition-all active:scale-95 whitespace-nowrap"
              >
                Install app
              </button>
            </>
          )}
        </div>
      </header>

      {/* Center Progress Pill (Desktop / Tablet) */}
      <div className="hidden md:block pointer-events-none fixed top-[18px] left-1/2 -translate-x-1/2 z-40 bg-white/[0.08] border border-white/[0.14] backdrop-blur-[14px] rounded-full py-2 px-4 font-['Sora',sans-serif] text-[12.5px] font-bold tracking-[0.04em] text-white/85 shadow-sm">
        {String(currentSlide + 1).padStart(2, '0')} / {String(TOTAL_SLIDES).padStart(2, '0')}
      </div>

      {/* Carousel Main Container */}
      <main className="fixed inset-0 overflow-hidden z-10">
        <div 
          className="flex h-full transition-transform duration-[650ms] ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform"
          style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
        >
          {/* SLIDE 1: Hero */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <p className="text-[13.5px] sm:text-[14px] text-white/60 font-semibold mb-2.5">
                Assalamu Alaikum Warahmatullahi Wabarakatuh &mdash; welcome home
              </p>
              <h1 className="font-['Sora',sans-serif] font-bold text-[32px] sm:text-[42px] md:text-[50px] leading-[1.08] tracking-[-0.02em] mb-4">
                This is your <span className="text-[#E8C547]">estate, online.</span>
              </h1>
              <p className="text-[14.5px] sm:text-[16px] md:text-[17px] text-white/75 max-w-[520px] mx-auto mb-7 leading-relaxed">
                Your gate, your passes, your dues, your community &mdash; the whole estate now runs from here. Built for Light House Estate, Lekki.
              </p>
              <div className="flex gap-3 justify-center flex-wrap mb-5">
                <button 
                  type="button" 
                  onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
                  className="inline-flex items-center justify-center gap-2 font-bold text-[14.5px] py-3 px-6 rounded-full bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] transition-all active:scale-95 shadow-md"
                >
                  Enter the portal
                </button>
                <button 
                  type="button" 
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-2 font-bold text-[14.5px] py-3 px-6 rounded-full bg-transparent text-white border border-white/[0.14] hover:border-white/40 transition-all active:scale-95"
                >
                  Install the app
                </button>
              </div>
              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="text-[12.5px] text-white/45 font-semibold inline-flex items-center gap-1.5 justify-center hover:text-white/70 transition-colors mx-auto cursor-pointer"
              >
                <span>Swipe to see what's inside</span>
                <svg className="w-3.5 h-3.5 animate-[nudge_1.6s_ease-in-out_infinite]" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </section>

          {/* SLIDE 2: Access & Security */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#E8C547] mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E8C547]">
                Access &amp; security
              </span>
              <h2 className="font-['Sora',sans-serif] font-bold text-[28px] sm:text-[38px] md:text-[46px] leading-[1.08] tracking-[-0.02em] mb-3">
                Your gate, simplified.
              </h2>
              <p className="text-[14.5px] sm:text-[16px] text-white/75 max-w-[520px] mx-auto mb-6">
                No passwords, no queues &mdash; just your PIN or your pass, verified on the spot.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left mb-6">
                {/* Chip 1 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <circle cx="7.5" cy="7.5" r="3.2" />
                      <line x1="9.8" y1="9.8" x2="19" y2="19" />
                      <line x1="15" y1="15" x2="17" y2="13" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Passwordless PIN</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">A 6-character code gets you and your household through the gate.</p>
                </div>

                {/* Chip 2 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] fill-current stroke-none" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="6" height="6" />
                      <rect x="15" y="3" width="6" height="6" />
                      <rect x="3" y="15" width="6" height="6" />
                      <rect x="13" y="13" width="3" height="3" />
                      <rect x="18" y="13" width="3" height="3" />
                      <rect x="13" y="18" width="3" height="3" />
                      <rect x="18" y="18" width="3" height="3" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Instant QR passes</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Issue a guest or delivery pass in seconds, expiring on your terms.</p>
                </div>

                {/* Chip 3 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M12 3l9 16H3L12 3z" />
                      <line x1="12" y1="9" x2="12" y2="14" />
                      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Emergency SOS</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">One hold sends your house number straight to gate security.</p>
                </div>

                {/* Chip 4 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M4 11l8-7 8 7" />
                      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Full audit trail</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Every entry and exit logged, day and night, across both gates.</p>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex gap-2.5 justify-center flex-wrap">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-white/80 bg-white/[0.06] border border-white/[0.14] py-1.5 px-3.5 rounded-full before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#3FAE7A] before:shadow-[0_0_0_3px_rgba(63,174,122,0.4)] before:animate-[pulse_2s_ease-in-out_infinite]">
                  Gate 1 &amp; 2 online
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-white/80 bg-white/[0.06] border border-white/[0.14] py-1.5 px-3.5 rounded-full">
                  14 passes today
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-white/80 bg-white/[0.06] border border-white/[0.14] py-1.5 px-3.5 rounded-full">
                  0 alerts
                </span>
              </div>
            </div>
          </section>

          {/* SLIDE 3: Home & Household */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#E8C547] mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E8C547]">
                Home &amp; household
              </span>
              <h2 className="font-['Sora',sans-serif] font-bold text-[28px] sm:text-[38px] md:text-[46px] leading-[1.08] tracking-[-0.02em] mb-3">
                Everything about your home, in one place.
              </h2>
              <p className="text-[14.5px] sm:text-[16px] text-white/75 max-w-[520px] mx-auto mb-6">
                Your dashboard, your staff, your requests &mdash; no more chasing the estate office.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
                {/* Chip 1 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M4 11l8-7 8 7" />
                      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
                      <circle cx="12" cy="15" r="1.6" />
                      <line x1="13.2" y1="16.2" x2="15" y2="18" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Household dashboard</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Occupancy, dues standing, and emergency contacts, always current.</p>
                </div>

                {/* Chip 2 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <circle cx="9" cy="8" r="3" />
                      <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
                      <circle cx="17" cy="9" r="2.3" />
                      <path d="M15 20c0-2.4 1-4 3.5-4.3" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Staff KYC</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Onboard cooks, cleaners and drivers with an invite code and ID checks.</p>
                </div>

                {/* Chip 3 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M14.7 6.3a3 3 0 10-4.24 4.24L4 17v3h3l6.5-6.46a3 3 0 004.2-4.24z" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Fix-it tickets</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Report electrical, plumbing or security faults with live tracking.</p>
                </div>

                {/* Chip 4 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
                      <path d="M10 20a2 2 0 004 0" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Notice board</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Estate gazettes and urgent notices, straight to your household.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 4: Community & Culture */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#E8C547] mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E8C547]">
                Community &amp; culture
              </span>
              <h2 className="font-['Sora',sans-serif] font-bold text-[28px] sm:text-[38px] md:text-[46px] leading-[1.08] tracking-[-0.02em] mb-3">
                Built around how we actually live.
              </h2>
              <p className="text-[14.5px] sm:text-[16px] text-white/75 max-w-[520px] mx-auto mb-6">
                From Jumu&rsquo;ah to the football pitch, the portal moves at the estate's own rhythm.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
                {/* Chip 1 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="7" y1="3" x2="7" y2="7" />
                      <line x1="17" y1="3" x2="17" y2="7" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Facility bookings</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Reserve the football pitch, mosque hall, kitchen or clubhouse.</p>
                </div>

                {/* Chip 2 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M12 3a5 5 0 015 5H7a5 5 0 015-5z" />
                      <rect x="5" y="8" width="14" height="10" rx="1" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Madrasa programs</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Schedules and hall allocations for the community's religious center.</p>
                </div>

                {/* Chip 3 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8z" />
                      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Jumu&rsquo;ah passes</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">Pre-register Friday congregation guests before they reach the gate.</p>
                </div>

                {/* Chip 4 */}
                <div className="bg-white/[0.06] border border-white/[0.14] rounded-2xl p-4 transition-all hover:bg-white/[0.1] hover:-translate-y-1">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8C547]/[0.16] text-[#E8C547] flex items-center justify-center mb-3">
                    <svg className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24">
                      <path d="M20 14a8 8 0 11-9-9 6.5 6.5 0 009 9z" />
                    </svg>
                  </div>
                  <h3 className="font-['Sora',sans-serif] text-[14px] font-bold mb-1 text-white">Quiet hours</h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">10 PM onward, honoured estate-wide &mdash; deliveries run 8 AM&ndash;6 PM only.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SLIDE 5: Daily Reminder / Hadith */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#E8C547] mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E8C547]">
                Daily reminder
              </span>
              <h2 className="font-['Sora',sans-serif] font-bold text-[24px] sm:text-[30px] md:text-[34px] leading-[1.08] tracking-[-0.02em] mb-6">
                A hadith for today
              </h2>

              <div className="relative bg-white/[0.06] border border-white/[0.14] rounded-[22px] pt-10 px-8 sm:px-10 pb-7 text-left max-w-[600px] mx-auto shadow-md">
                <span className="absolute top-3.5 left-6 font-['Sora',sans-serif] text-[56px] font-extrabold text-[#E8C547] opacity-50 leading-none pointer-events-none select-none">
                  &ldquo;
                </span>
                <p className="text-[16px] sm:text-[18px] md:text-[19px] leading-[1.75] text-white mb-4 relative z-10">
                  &ldquo;{todayHadith.text}&rdquo;
                </p>
                <p className="text-[12px] font-bold tracking-[0.04em] uppercase text-white/50 relative z-10">
                  {todayHadith.source}
                </p>
              </div>

              <p className="text-[14.5px] sm:text-[16px] text-white/75 max-w-[520px] mx-auto mt-6">
                A new reflection each day, chosen around community, kindness and neighbourliness.
              </p>
            </div>
          </section>

          {/* SLIDE 6: Roles / Everyone has a place */}
          <section className="w-screen h-full shrink-0 flex items-center justify-center px-5 sm:px-7 pt-24 pb-20 overflow-y-auto">
            <div className="max-w-[760px] w-full text-center m-auto">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#E8C547] mb-3 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E8C547]">
                Everyone has a place
              </span>
              <h2 className="font-['Sora',sans-serif] font-bold text-[28px] sm:text-[38px] md:text-[46px] leading-[1.08] tracking-[-0.02em] mb-3">
                One portal, six roles.
              </h2>
              <p className="text-[14.5px] sm:text-[16px] text-white/75 max-w-[520px] mx-auto mb-6">
                Residents, staff, security and admins &mdash; each with exactly the access they need.
              </p>

              <div className="flex gap-2.5 justify-center flex-wrap my-2 mb-7">
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.14] py-2 px-4 rounded-full text-[13px] font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#3FAE7A] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 stroke-[#0D2A1F] stroke-[2.2] fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  </span>
                  Resident
                </span>

                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.14] py-2 px-4 rounded-full text-[13px] font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#3FAE7A] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 stroke-[#0D2A1F] stroke-[2.2] fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  </span>
                  Household staff
                </span>

                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.14] py-2 px-4 rounded-full text-[13px] font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#3FAE7A] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 stroke-[#0D2A1F] stroke-[2.2] fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  </span>
                  Security guard
                </span>

                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.14] py-2 px-4 rounded-full text-[13px] font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#3FAE7A] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 stroke-[#0D2A1F] stroke-[2.2] fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  </span>
                  Estate admin
                </span>

                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.14] py-2 px-4 rounded-full text-[13px] font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#3FAE7A] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 stroke-[#0D2A1F] stroke-[2.2] fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
                    </svg>
                  </span>
                  Madrasa admin
                </span>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <button 
                  type="button" 
                  onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
                  className="inline-flex items-center justify-center gap-2 font-bold text-[14.5px] py-3 px-6 rounded-full bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] transition-all active:scale-95 shadow-md"
                >
                  Enter the portal
                </button>
                <button 
                  type="button" 
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-2 font-bold text-[14.5px] py-3 px-6 rounded-full bg-transparent text-white border border-white/[0.14] hover:border-white/40 transition-all active:scale-95"
                >
                  Install the app
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Navigation Arrows (Desktop / Tablet) */}
      <button 
        type="button" 
        onClick={() => goToSlide(currentSlide - 1)}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
        className="hidden sm:flex fixed top-1/2 -translate-y-1/2 left-[18px] z-40 w-[44px] h-[44px] rounded-full bg-white/[0.08] border border-white/[0.14] backdrop-blur-[10px] items-center justify-center text-white hover:bg-white/[0.16] transition-all disabled:opacity-25 disabled:cursor-default"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <button 
        type="button" 
        onClick={() => goToSlide(currentSlide + 1)}
        disabled={currentSlide === TOTAL_SLIDES - 1}
        aria-label="Next slide"
        className="hidden sm:flex fixed top-1/2 -translate-y-1/2 right-[18px] z-40 w-[44px] h-[44px] rounded-full bg-white/[0.08] border border-white/[0.14] backdrop-blur-[10px] items-center justify-center text-white hover:bg-white/[0.16] transition-all disabled:opacity-25 disabled:cursor-default"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Bottom Dots Pill Navigation */}
      <nav 
        aria-label="Slide navigation"
        className="fixed bottom-5 sm:bottom-[56px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-white/[0.08] border border-white/[0.14] backdrop-blur-[10px] py-2.5 px-3.5 rounded-full shadow-sm"
      >
        {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-[7px] rounded-full transition-all duration-300 ${
              idx === currentSlide 
                ? 'w-[22px] bg-[#E8C547]' 
                : 'w-[7px] bg-white/35 hover:bg-white/60'
            }`}
          />
        ))}
      </nav>

      {/* Bottom Copyright Footer (Desktop) */}
      <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-30 text-center py-3.5 px-5 text-[11.5px] text-white/40 pointer-events-none">
        &copy; 2026 Light House Estate, Lekki
      </div>

      {/* Emergency SOS Hold-to-Activate Button */}
      <div className="fixed right-4 sm:right-6 bottom-6 sm:bottom-11 w-[76px] h-[76px] z-50">
        {/* SVG Circular Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="34" stroke="rgba(255,255,255,0.18)" strokeWidth="4" fill="none" />
          <circle 
            cx="38" 
            cy="38" 
            r="34" 
            stroke="#fff" 
            strokeWidth="4" 
            fill="none" 
            strokeLinecap="round" 
            strokeDasharray={RING_LENGTH} 
            strokeDashoffset={sosProgressOffset}
            style={{ transition: sosTransition }}
          />
        </svg>

        {/* SOS Touch Button */}
        <button
          type="button"
          onPointerDown={handleSosPointerDown}
          onPointerUp={handleSosPointerCancel}
          onPointerLeave={handleSosPointerCancel}
          onPointerCancel={handleSosPointerCancel}
          aria-label="Hold for 5 seconds to send an SOS alert to gate security"
          className={`absolute top-2 left-2 w-[60px] h-[60px] rounded-full border-none flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-[0_10px_24px_-8px_rgba(194,58,56,0.65)] select-none touch-none transition-transform active:scale-95 ${
            sosActivated 
              ? 'animate-[sosPulseFast_0.6s_ease-in-out_3] bg-gradient-to-br from-[#FF6E68] to-[#D2413F]'
              : isHoldingSOS
                ? 'bg-gradient-to-br from-[#F0645F] to-[#C23A38]'
                : 'bg-gradient-to-br from-[#F0645F] to-[#C23A38] animate-[sosBreathe_2.6s_ease-in-out_infinite]'
          }`}
        >
          <svg className="w-5 h-5 stroke-white fill-none stroke-[1.6]" viewBox="0 0 24 24">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="#fff" stroke="none" />
          </svg>
          <span className="font-['Sora',sans-serif] text-[9px] font-extrabold tracking-[0.06em] text-white">
            SOS
          </span>
        </button>

        {/* SOS Activated Toast */}
        <div 
          className={`absolute bottom-20 right-0 bg-[#0D2A1F] border border-white/[0.14] text-white text-[12.5px] font-semibold py-2.5 px-3.5 rounded-xl whitespace-nowrap shadow-lg pointer-events-none transition-all duration-250 ${
            showSosToast 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-1.5'
          }`}
        >
          Alert sent to gate security
        </div>
      </div>
    </div>
  );
};
