import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  X, 
  Check, 
  QrCode, 
  Share2, 
  Calendar,
  Wrench,
  ShoppingBag,
  Bell,
  Clock,
  ShieldCheck,
  UserCheck,
  Building2,
  PhoneCall
} from 'lucide-react';
import { AppUser, VisitorPass, AccessLog, EstateNotice } from '../types';
import { 
  getStoredPasses, 
  saveStoredPasses, 
  getStoredAccessLogs, 
  generatePassCode,
  getStoredNotices
} from '../lib/estate-data';
import { getStoredStaffKYC } from '../lib/staff-service';
import { triggerSOSEvent, getStoredSOSEvents } from '../lib/sos-service';

interface DashboardPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
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

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, navigate }) => {
  const [passes, setPasses] = useState<VisitorPass[]>(() => getStoredPasses());
  const [accessLogs] = useState<AccessLog[]>(() => getStoredAccessLogs());
  const [notices] = useState<EstateNotice[]>(() => getStoredNotices());
  
  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Issue pass modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPlate, setGuestPlate] = useState('');
  const [passType, setPassType] = useState<VisitorPass['pass_type']>('guest');
  const [passNotes, setPassNotes] = useState('');
  const [newlyCreatedPass, setNewlyCreatedPass] = useState<VisitorPass | null>(null);

  // Artisan/Contractor conditional states
  const [artisanDate, setArtisanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [artisanStartTime, setArtisanStartTime] = useState<string>('08:00');
  const [artisanEndTime, setArtisanEndTime] = useState<string>('17:00');

  // Long Stay Visitor conditional states
  const [validFromDate, setValidFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [validToDate, setValidToDate] = useState<string>(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  // SOS button state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active dock tab
  const [activeDock, setActiveDock] = useState<'home' | 'passes' | 'facilities' | 'staff' | 'notices'>('home');

  // Daily Hadith selection
  const todayHadith = useMemo(() => {
    const day = new Date().getDate();
    return HADITHS[day % HADITHS.length];
  }, []);

  // Filter passes for current resident
  const residentPasses = useMemo(() => {
    if (!currentUser) return passes;
    if (currentUser.role === 'resident') {
      return passes.filter(
        (p) => p.house_number === currentUser.house_number && p.house_unit === currentUser.house_unit
      );
    }
    return passes;
  }, [passes, currentUser]);

  const activePassesList = useMemo(() => {
    return residentPasses.filter((p) => p.status === 'active' || p.status === 'used').slice(0, 3);
  }, [residentPasses]);

  // Metric counts
  const passesTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return passes.filter((p) => p.created_at?.startsWith(todayStr) || p.valid_from?.startsWith(todayStr)).length;
  }, [passes]);

  const activePassesCount = useMemo(() => {
    return residentPasses.filter((p) => p.status === 'active').length;
  }, [residentPasses]);

  const visitorsInEstateCount = useMemo(() => {
    return accessLogs.filter((l) => l.direction === 'in').length;
  }, [accessLogs]);

  // Household staff count
  const householdStaffCount = useMemo(() => {
    const allStaff = getStoredStaffKYC();
    const myStaff = allStaff.filter(
      (s) =>
        (currentUser?.id && s.employer_id === currentUser.id) ||
        (currentUser?.house_number && s.employer_house_number === currentUser.house_number)
    );
    return myStaff.length;
  }, [currentUser]);

  // Active alerts count
  const alertsCount = useMemo(() => {
    const sosEvents = getStoredSOSEvents();
    return sosEvents.filter((e) => e.status === 'triggered' || e.status === 'acknowledged').length;
  }, []);

  // Top notices for dashboard preview (up to 2)
  const dashboardNotices = useMemo(() => {
    return [...notices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
  }, [notices]);

  // User initials
  const userInitials = useMemo(() => {
    if (!currentUser?.full_name) return 'TA';
    const parts = currentUser.full_name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser]);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 1500);
  };

  // SOS hold handlers
  const handleSosPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${SOS_HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(() => {
      setIsHoldingSOS(false);
      setSosActivated(true);
      setShowSosToast(true);

      if (currentUser) {
        try {
          triggerSOSEvent(currentUser);
        } catch (err) {
          console.error('Error triggering SOS:', err);
        }
      }

      setTimeout(() => {
        setSosActivated(false);
        setShowSosToast(false);
        setSosTransition('none');
        setSosProgressOffset(SOS_RING_LENGTH);
      }, 4000);
    }, SOS_HOLD_MS);
  };

  const handleSosPointerCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(SOS_RING_LENGTH);
  };

  // Create Pass handler
  const handleCreatePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !currentUser) return;

    let validFrom = new Date().toISOString();
    let validUntil = new Date(Date.now() + 18 * 3600000).toISOString();
    let entryType: 'single' | 'multi' = 'single';

    if (passType === 'contractor') {
      entryType = 'single';
      validFrom = `${artisanDate}T${artisanStartTime}:00`;
      validUntil = `${artisanDate}T${artisanEndTime}:00`;
    } else if (passType === 'long_stay') {
      entryType = 'multi';
      validFrom = `${validFromDate}T00:00:00`;
      validUntil = `${validToDate}T23:59:59`;
    } else if (passType === 'guest') {
      entryType = 'single';
      validFrom = new Date().toISOString();
      validUntil = new Date(Date.now() + 30 * 60000).toISOString();
    } else if (passType === 'delivery') {
      entryType = 'single';
      validFrom = new Date().toISOString();
      validUntil = new Date(Date.now() + 15 * 60000).toISOString();
    }

    const newPass: VisitorPass = {
      id: `pass-${Date.now()}`,
      resident_id: currentUser.id,
      resident_name: currentUser.full_name,
      resident_phone: currentUser.phone,
      house_number: currentUser.house_number || 14,
      house_unit: currentUser.house_unit || 'Main House',
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim() || undefined,
      guest_plate_number: guestPlate.trim().toUpperCase() || undefined,
      pass_type: passType,
      pass_code: generatePassCode(),
      entry_type: entryType,
      artisan_date: passType === 'contractor' ? artisanDate : undefined,
      start_time: passType === 'contractor' ? artisanStartTime : undefined,
      end_time: passType === 'contractor' ? artisanEndTime : undefined,
      valid_to: passType === 'long_stay' ? validToDate : undefined,
      valid_from: validFrom,
      valid_until: validUntil,
      expires_at: validUntil,
      status: 'active',
      created_at: new Date().toISOString(),
      notes: passNotes.trim() || undefined,
    };

    const updated = [newPass, ...passes];
    setPasses(updated);
    saveStoredPasses(updated);
    setNewlyCreatedPass(newPass);

    // Reset fields
    setGuestName('');
    setGuestPhone('');
    setGuestPlate('');
    setPassNotes('');
  };

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-['Manrope',sans-serif] pb-[110px] select-none">
      {/* SVG Lattice Background Pattern */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="dash-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center py-4 px-4 md:px-6">
        <div className="flex items-center gap-2.5 bg-white/15 border border-white/20 backdrop-blur-[14px] rounded-full py-1.5 px-3.5 shadow-xs">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-[30px] h-[30px] rounded-[9px] bg-[#3FAE7A] flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="12" cy="12" r="8" stroke="#0D2A1F" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="#0D2A1F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-['Sora',sans-serif] font-bold text-[12.5px] text-white tracking-tight">
            {currentUser?.role === 'resident'
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : 'Light House Estate, Lekki'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-[14px] rounded-full p-1.5 shadow-xs">
          <button 
            type="button" 
            onClick={() => navigate('/notices')}
            aria-label="Notifications"
            className="relative w-[34px] h-[34px] rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-white/25 transition-colors"
          >
            <span className="absolute top-[5px] right-[6px] w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
              <path d="M10 20a2 2 0 004 0" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-[34px] h-[34px] rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora',sans-serif] font-bold text-[12.5px] cursor-pointer hover:opacity-90 transition-opacity"
            title="Account & Profile Settings"
          >
            {userInitials}
          </button>
        </div>
      </header>

      {/* Hero Header Card */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 md:px-6 pt-20 pb-12 -mt-16 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#dash-lattice)" />
        </svg>

        <div className="max-w-[720px] mx-auto relative z-10 pt-2">
          <h1 className="font-['Sora',sans-serif] font-bold text-[24px] sm:text-[27px] md:text-[29px] tracking-[-0.02em] mb-1.5">
            Welcome home, {currentUser?.full_name || 'Resident'}
          </h1>
          <p className="text-[14px] text-white/70 mb-5.5 font-medium">
            Everything about House {currentUser?.house_number || '14'}, in one place.
          </p>

          {/* Hadith Mini Card */}
          <div className="relative bg-white/[0.08] border border-white/[0.16] rounded-2xl py-4 px-4.5 text-left backdrop-blur-xs">
            <span className="absolute top-1 left-3.5 font-['Sora',sans-serif] text-[32px] font-extrabold text-[#E8C547] opacity-60 leading-none pointer-events-none select-none">
              &ldquo;
            </span>
            <p className="text-[13.5px] leading-relaxed text-white/[0.92] pl-5 mb-2 font-normal">
              &ldquo;{todayHadith.text}&rdquo;
            </p>
            <p className="text-[10.5px] font-bold tracking-[0.04em] uppercase text-white/55 pl-5">
              {todayHadith.source}
            </p>
          </div>
        </div>
      </div>

      {/* Content Sheet */}
      <div className="bg-[#FBFDF9] rounded-t-[26px] -mt-6 relative z-10 pt-6">
        <div className="max-w-[720px] mx-auto px-4 md:px-8 space-y-7">

          {/* Section 1: Metric Grid */}
          <section className="mb-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white border border-[#E3EFE7] rounded-[14px] py-3.5 px-2 text-center shadow-xs">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54] leading-tight">
                  {passesTodayCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-1 leading-tight">
                  Passes today
                </div>
              </div>

              <div className="bg-white border border-[#E3EFE7] rounded-[14px] py-3.5 px-2 text-center shadow-xs">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54] leading-tight">
                  {activePassesCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-1 leading-tight">
                  Active passes
                </div>
              </div>

              <div className="bg-white border border-[#E3EFE7] rounded-[14px] py-3.5 px-2 text-center shadow-xs">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54] leading-tight">
                  {visitorsInEstateCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-1 leading-tight">
                  Visitors in the estate
                </div>
              </div>

              <div className="bg-white border border-[#E3EFE7] rounded-[14px] py-3.5 px-2 text-center shadow-xs">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54] leading-tight">
                  {alertsCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-1 leading-tight">
                  Alerts
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Estate Services Grid (Replacing quick actions row) */}
          <section className="mb-7">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D]">
                Estate services
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                type="button"
                onClick={() => setIsPassModalOpen(true)}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <circle cx="7.5" cy="7.5" r="3.2" />
                    <line x1="9.8" y1="9.8" x2="19" y2="19" />
                    <line x1="15" y1="15" x2="17" y2="13" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Issue pass
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Visitor access codes
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/facilities')}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Book facility
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Estate Kitchen reservation
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/fix-it-tickets')}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <path d="M14.7 6.3a3 3 0 10-4.24 4.24L4 17v3h3l6.5-6.46a3 3 0 004.2-4.24z" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Report fault
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Maintenance tickets
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/household')}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
                    <circle cx="17" cy="9" r="2.3" />
                    <path d="M15 20c0-2.4 1-4 3.5-4.3" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Domestic staff
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Staff KYC &amp; registry
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/marketplace')}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#FBF3D9] text-[#B4922C] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <path d="M6 8h12l-1 12H7L6 8z" />
                    <path d="M9 8V6a3 3 0 016 0v2" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Marketplace
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Resident classifieds
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/notices')}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-4 text-left cursor-pointer transition-all hover:border-[#3FAE7A] hover:shadow-xs group"
              >
                <div className="w-8 h-8 rounded-[9px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                    <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
                    <path d="M10 20a2 2 0 004 0" />
                  </svg>
                </div>
                <h3 className="font-['Sora',sans-serif] text-[13px] font-bold text-[#16241D] mb-1">
                  Notice board
                </h3>
                <p className="text-[11.5px] text-[#8AA096] leading-tight">
                  Estate broadcasts
                </p>
              </button>
            </div>
          </section>

          {/* Section 3: Active visitor passes */}
          <section className="mb-7">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D]">
                Active visitor passes
              </h2>
              <button
                type="button"
                onClick={() => navigate('/passes')}
                className="text-[12.5px] font-bold text-[#257A54] hover:underline cursor-pointer"
              >
                All passes &rarr;
              </button>
            </div>

            {activePassesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePassesList.map((pass) => (
                  <div 
                    key={pass.id}
                    className="bg-white border border-[#E3EFE7] rounded-2xl py-3.5 px-4 flex items-center gap-3 transition-all hover:border-[#3FAE7A] shadow-xs"
                  >
                    <div className="w-[38px] h-[38px] rounded-[10px] bg-[#FBF3D9] text-[#B4922C] flex items-center justify-center shrink-0">
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

                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-[#16241D] truncate">
                        {pass.guest_name}
                      </div>
                      <div className="text-[11.5px] text-[#8AA096] capitalize truncate">
                        {pass.pass_type} &middot; {pass.status === 'used' ? 'Verified today' : 'Expires in 4h'}
                      </div>
                    </div>

                    <span className="font-['Sora',sans-serif] text-[13px] font-bold text-[#257A54] mr-1.5 font-mono">
                      {pass.pass_code}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(pass.pass_code)}
                      aria-label="Copy pass code"
                      className={`w-[32px] h-[32px] rounded-[9px] border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                        copiedCode === pass.pass_code
                          ? 'border-[#3FAE7A] text-[#257A54] bg-[#EAF7EE]'
                          : 'border-[#E3EFE7] bg-[#FBFDF9] text-[#516459] hover:border-[#8AA096]'
                      }`}
                    >
                      {copiedCode === pass.pass_code ? (
                        <Check className="w-3.5 h-3.5 text-[#257A54]" />
                      ) : (
                        <svg className="w-[15px] h-[15px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
                          <rect x="8" y="8" width="12" height="12" rx="2" />
                          <path d="M4 16V6a2 2 0 012-2h10" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#E3EFE7] rounded-2xl p-6 text-center text-[12.5px] text-[#8AA096]">
                No active passes currently.
              </div>
            )}
          </section>

          {/* Section 5: Notice Board */}
          <section className="mb-7">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D]">
                Notice board
              </h2>
              <button
                type="button"
                onClick={() => navigate('/notices')}
                className="text-[12.5px] font-bold text-[#257A54] hover:underline cursor-pointer"
              >
                View all &rarr;
              </button>
            </div>

            {dashboardNotices.length > 0 ? (
              dashboardNotices.map((n) => {
                const isEmerg = n.type === 'emergency' || n.category === 'emergency' || n.priority === 'urgent' || n.priority === 'emergency';
                const isEvent = n.type === 'event' || n.category === 'event';
                return (
                  <div 
                    key={n.id}
                    onClick={() => navigate('/notices')}
                    className={`bg-white border rounded-2xl py-3.5 px-4 mb-2.5 cursor-pointer transition-all ${
                      isEmerg 
                        ? 'border-[#A32D2D]/30 bg-gradient-to-r from-[#FFF8F8] to-white' 
                        : 'border-[#E3EFE7] hover:border-[#3FAE7A]'
                    }`}
                  >
                    <span className={`inline-block text-[10px] font-extrabold tracking-[0.05em] py-0.5 px-2.5 rounded-full mb-2 ${
                      isEmerg 
                        ? 'bg-[#FCEBEB] text-[#A32D2D]' 
                        : isEvent 
                        ? 'bg-[#FBF3D9] text-[#B4922C]' 
                        : 'bg-[#EAF7EE] text-[#257A54]'
                    }`}>
                      {isEmerg ? 'Emergency' : isEvent ? 'Event' : 'Info'}
                    </span>
                    <h3 className="font-['Sora',sans-serif] text-[13.5px] font-bold text-[#16241D] mb-1">
                      {n.title}
                    </h3>
                    <p className="text-[12px] text-[#516459] mb-1.5 leading-relaxed line-clamp-2">
                      {n.content || n.body}
                    </p>
                    <span className="text-[11px] text-[#8AA096]">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Today'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div 
                onClick={() => navigate('/notices')}
                className="bg-white border border-[#E3EFE7] rounded-2xl py-5 px-4 text-center cursor-pointer hover:border-[#3FAE7A] transition-all"
              >
                <p className="text-[12.5px] text-[#8AA096] font-medium">
                  No estate announcements at this time.
                </p>
              </div>
            )}
          </section>

          {/* Section 6: Household Management */}
          <section className="mb-7">
            <div className="bg-white border border-[#E3EFE7] rounded-[18px] py-4.5 px-5 flex justify-between items-center gap-3 shadow-xs">
              <div className="flex gap-5 sm:gap-6">
                <div>
                  <div className="font-['Sora',sans-serif] font-extrabold text-[18px] text-[#257A54] leading-tight">
                    {householdStaffCount}
                  </div>
                  <div className="text-[11px] text-[#8AA096] font-semibold mt-0.5">
                    Household staff
                  </div>
                </div>
                <div>
                  <div className="font-['Sora',sans-serif] font-extrabold text-[18px] text-[#257A54] leading-tight">
                    &#8358;0
                  </div>
                  <div className="text-[11px] text-[#8AA096] font-semibold mt-0.5">
                    Outstanding levy
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/household')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold py-2.5 px-4 rounded-full bg-transparent text-[#257A54] border border-[#E3EFE7] hover:border-[#3FAE7A] transition-all cursor-pointer whitespace-nowrap"
              >
                Manage household
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Floating Bottom Dock Navigation */}
      <nav 
        aria-label="Main navigation"
        className="fixed bottom-[18px] left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/[0.92] backdrop-blur-[14px] border border-white/10 p-2 rounded-full shadow-[0_16px_32px_-14px_rgba(0,0,0,0.4)]"
      >
        <button
          type="button"
          onClick={() => { setActiveDock('home'); navigate('/dashboard'); }}
          aria-label="Home"
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
            activeDock === 'home' 
              ? 'bg-white/[0.12] text-[#E8C547]' 
              : 'text-white/55 hover:text-white'
          }`}
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[9px] font-bold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveDock('passes'); navigate('/passes'); }}
          aria-label="Passes"
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
            activeDock === 'passes' 
              ? 'bg-white/[0.12] text-[#E8C547]' 
              : 'text-white/55 hover:text-white'
          }`}
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8z" />
          </svg>
          <span className="text-[9px] font-bold">Passes</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveDock('facilities'); navigate('/facilities'); }}
          aria-label="Facilities"
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
            activeDock === 'facilities' 
              ? 'bg-white/[0.12] text-[#E8C547]' 
              : 'text-white/55 hover:text-white'
          }`}
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[9px] font-bold">Facilities</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveDock('staff'); navigate('/household'); }}
          aria-label="Household"
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
            activeDock === 'staff' 
              ? 'bg-white/[0.12] text-[#E8C547]' 
              : 'text-white/55 hover:text-white'
          }`}
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[9px] font-bold">Staff</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveDock('notices'); navigate('/notices'); }}
          aria-label="Notices"
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
            activeDock === 'notices' 
              ? 'bg-white/[0.12] text-[#E8C547]' 
              : 'text-white/55 hover:text-white'
          }`}
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[9px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-50">
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="31" stroke="rgba(18,53,40,0.12)" strokeWidth="4" fill="none" />
          <circle 
            cx="35" 
            cy="35" 
            r="31" 
            stroke="#C23A38" 
            strokeWidth="4" 
            fill="none" 
            strokeLinecap="round" 
            strokeDasharray={SOS_RING_LENGTH} 
            strokeDashoffset={sosProgressOffset}
            style={{ transition: sosTransition }}
          />
        </svg>

        <button
          type="button"
          onPointerDown={handleSosPointerDown}
          onPointerUp={handleSosPointerCancel}
          onPointerLeave={handleSosPointerCancel}
          onPointerCancel={handleSosPointerCancel}
          aria-label="Hold for 5 seconds to send an SOS alert to gate security"
          className={`absolute top-[7px] left-[7px] w-[56px] h-[56px] rounded-full border-none flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-[0_10px_22px_-8px_rgba(194,58,56,0.65)] select-none touch-none active:scale-95 transition-transform ${
            sosActivated 
              ? 'animate-[sosPulseFast_0.6s_ease-in-out_3] bg-gradient-to-br from-[#FF6E68] to-[#D2413F]'
              : isHoldingSOS
                ? 'bg-gradient-to-br from-[#F0645F] to-[#C23A38]'
                : 'bg-gradient-to-br from-[#F0645F] to-[#C23A38] animate-[sosBreathe_2.6s_ease-in-out_infinite]'
          }`}
        >
          <svg className="w-[18px] h-[18px] stroke-white fill-none stroke-[1.7]" viewBox="0 0 24 24">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="#fff" stroke="none" />
          </svg>
          <span className="font-['Sora',sans-serif] text-[8.5px] font-extrabold tracking-[0.06em] text-white">
            SOS
          </span>
        </button>

        <div 
          className={`absolute bottom-[74px] right-0 bg-[#0D2A1F] border border-white/15 text-white text-[12px] font-semibold py-2 px-3 rounded-xl whitespace-nowrap shadow-lg pointer-events-none transition-all duration-250 ${
            showSosToast 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-1.5'
          }`}
        >
          Alert sent to gate security
        </div>
      </div>

      {/* Issue Pass Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#E3EFE7] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EFE7]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-['Sora',sans-serif] text-lg font-bold text-[#16241D]">
                  Issue Visitor Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPassModalOpen(false);
                  setNewlyCreatedPass(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-[#516459]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newlyCreatedPass ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF7EE] text-[#257A54] mx-auto flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-['Sora',sans-serif] text-base font-bold text-[#16241D]">
                    Pass Generated Successfully!
                  </h4>
                  <p className="text-xs text-[#516459] mt-0.5">
                    For {newlyCreatedPass.guest_name} &bull; House {newlyCreatedPass.house_number}
                  </p>
                </div>

                <div className="p-4 bg-[#FBFDF9] rounded-xl border border-[#E3EFE7] text-center space-y-2">
                  <span className="text-[11px] font-bold text-[#8AA096] uppercase tracking-wider">
                    Gate Access Code
                  </span>
                  <div className="font-['Sora',sans-serif] text-3xl font-extrabold tracking-widest text-[#257A54] font-mono">
                    {newlyCreatedPass.pass_code}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(newlyCreatedPass.pass_code)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#257A54] text-white font-bold text-xs hover:bg-[#123528] transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedCode === newlyCreatedPass.pass_code ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>Copy Pass Code</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPassModalOpen(false);
                      setNewlyCreatedPass(null);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-[#E3EFE7] text-[#16241D] font-bold text-xs hover:bg-gray-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreatePassSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#16241D] mb-1">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Engr. Yusuf Belgore"
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-[#FBFDF9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#16241D] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+234 803..."
                      className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-[#FBFDF9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#16241D] mb-1">
                      Vehicle Plate
                    </label>
                    <input
                      type="text"
                      value={guestPlate}
                      onChange={(e) => setGuestPlate(e.target.value)}
                      placeholder="e.g. ABJ-882-LK"
                      className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-[#FBFDF9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16241D] mb-1">
                    Pass Type
                  </label>
                  <select
                    value={passType}
                    onChange={(e) => setPassType(e.target.value as VisitorPass['pass_type'])}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-[#FBFDF9]"
                  >
                    <option value="guest">Guest (Standard)</option>
                    <option value="delivery">Delivery Dispatch</option>
                    <option value="contractor">Artisan/Contractor</option>
                    <option value="long_stay">Long Stay Visitor</option>
                  </select>
                </div>

                {/* Artisan/Contractor conditional fields: Date, Start Time, End Time */}
                {passType === 'contractor' && (
                  <div className="space-y-2.5 p-3 bg-[#F4F9F5] border border-[#3FAE7A]/25 rounded-xl">
                    <div>
                      <label className="block text-[11px] font-bold text-[#257A54] uppercase tracking-wider mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={artisanDate}
                        onChange={(e) => setArtisanDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#257A54] uppercase tracking-wider mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={artisanStartTime}
                          onChange={(e) => setArtisanStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#257A54] uppercase tracking-wider mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={artisanEndTime}
                          onChange={(e) => setArtisanEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Long Stay Visitor conditional fields: Valid From, Valid To */}
                {passType === 'long_stay' && (
                  <div className="p-3 bg-[#F4F9F5] border border-[#3FAE7A]/25 rounded-xl">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#257A54] uppercase tracking-wider mb-1">
                          Valid From *
                        </label>
                        <input
                          type="date"
                          required
                          value={validFromDate}
                          onChange={(e) => setValidFromDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#257A54] uppercase tracking-wider mb-1">
                          Valid To *
                        </label>
                        <input
                          type="date"
                          required
                          value={validToDate}
                          onChange={(e) => setValidToDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#16241D] mb-1">
                    Visit Purpose / Notes
                  </label>
                  <input
                    type="text"
                    value={passNotes}
                    onChange={(e) => setPassNotes(e.target.value)}
                    placeholder="e.g. Lunch delivery, repair inspection"
                    className="w-full px-3 py-2 rounded-xl border border-[#E3EFE7] text-xs focus:outline-none focus:border-[#3FAE7A] bg-[#FBFDF9]"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#257A54] text-white font-bold text-xs hover:bg-[#123528] transition-colors"
                  >
                    Generate 6-Digit Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPassModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-[#E3EFE7] text-[#516459] font-bold text-xs hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
