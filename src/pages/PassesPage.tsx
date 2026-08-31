import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  QrCode,
  Copy,
  Share2,
  Clock,
  Car,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calendar,
  AlertTriangle,
  Sparkles,
  Phone,
  ArrowRight,
  Check,
  X,
  User,
  Search,
  RefreshCw,
  Bell
} from 'lucide-react';
import { AppUser, VisitorPass, PassType, PassStatus } from '../types';
import { getStoredPasses, saveStoredPasses } from '../lib/estate-data';
import {
  generateUnique6DigitCode,
  calculatePassExpiry,
  generatePassQRCode,
  buildWhatsAppShareMessage,
} from '../lib/pass-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface PassesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ITEMS_PER_PAGE = 20;
const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const PassesPage: React.FC<PassesPageProps> = ({ currentUser, navigate }) => {
  const [passes, setPasses] = useState<VisitorPass[]>(() => getStoredPasses());
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalPass, setQrModalPass] = useState<VisitorPass | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Live clock state for real-time countdown recalculation every second
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form State
  const [passType, setPassType] = useState<PassType>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPlate, setGuestPlate] = useState('');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdPassSuccess, setCreatedPassSuccess] = useState<VisitorPass | null>(null);

  // Artisan/Contractor conditional states
  const [artisanDate, setArtisanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [artisanStartTime, setArtisanStartTime] = useState<string>('08:00');
  const [artisanEndTime, setArtisanEndTime] = useState<string>('17:00');

  // Long Stay Visitor conditional states
  const [validFromDate, setValidFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [validToDate, setValidToDate] = useState<string>(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  // Whenever a QR pass modal opens, generate its QR code
  useEffect(() => {
    if (qrModalPass) {
      generatePassQRCode(qrModalPass.id, qrModalPass.pass_code).then((url) => {
        setQrDataUrl(url);
      });
    } else {
      setQrDataUrl(null);
    }
  }, [qrModalPass]);

  // Check and auto-expire passes
  useEffect(() => {
    let hasChanges = false;
    const now = Date.now();
    const updated = passes.map((p) => {
      const exp = new Date(p.valid_until || p.expires_at || '').getTime();
      if (p.status === 'active' && exp < now) {
        hasChanges = true;
        return { ...p, status: 'expired' as PassStatus };
      }
      return p;
    });

    if (hasChanges) {
      setPasses(updated);
      saveStoredPasses(updated);
    }
  }, [currentTime, passes]);

  // Filter passes by search and resident house
  const residentPasses = useMemo(() => {
    let list = passes;
    if (currentUser && currentUser.role === 'resident') {
      list = list.filter(
        (p) => p.house_number === currentUser.house_number && p.house_unit === currentUser.house_unit
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.guest_name.toLowerCase().includes(q) ||
          p.pass_code.includes(q) ||
          (p.guest_plate_number && p.guest_plate_number.toLowerCase().includes(q))
      );
    }
    return list;
  }, [passes, currentUser, searchTerm]);

  // Split into active vs history
  const activePasses = useMemo(() => {
    return residentPasses.filter((p) => p.status === 'active');
  }, [residentPasses]);

  const historyPasses = useMemo(() => {
    return residentPasses.filter((p) => p.status !== 'active');
  }, [residentPasses]);

  // Metric stats
  const activeCount = activePasses.length;
  const historyCount = historyPasses.length;
  const usedTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return passes.filter((p) => p.status === 'used' && p.created_at?.startsWith(today)).length;
  }, [passes]);

  // Create Pass handler
  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsCreating(true);
    const code = generateUnique6DigitCode(passes.map((p) => p.pass_code));
    
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
      house_number: currentUser?.house_number || 0,
      house_unit: currentUser?.house_unit || 'Main House',
      resident_name: currentUser?.full_name || 'Resident',
      resident_id: currentUser?.id || 'res-1',
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim() || undefined,
      guest_plate_number: guestPlate.trim().toUpperCase() || undefined,
      pass_type: passType,
      pass_code: code,
      entry_type: entryType,
      artisan_date: passType === 'contractor' ? artisanDate : undefined,
      start_time: passType === 'contractor' ? artisanStartTime : undefined,
      end_time: passType === 'contractor' ? artisanEndTime : undefined,
      valid_to: passType === 'long_stay' ? validToDate : undefined,
      valid_from: validFrom,
      valid_until: validUntil,
      expires_at: validUntil,
      status: 'active',
      guest_count: passType === 'group' ? guestCount : undefined,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const updated = [newPass, ...passes];
    setPasses(updated);
    saveStoredPasses(updated);

    setCreatedPassSuccess(newPass);
    setIsCreating(false);

    // Reset form
    setGuestName('');
    setGuestPhone('');
    setGuestPlate('');
    setNotes('');
  };

  // Revoke a pass
  const handleRevokePass = (passId: string) => {
    if (!confirm('Are you sure you want to revoke this pass? Security will deny entry immediately.')) {
      return;
    }
    const updated = passes.map((p) =>
      p.id === passId ? { ...p, status: 'revoked' as PassStatus } : p
    );
    setPasses(updated);
    saveStoredPasses(updated);
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (pass: VisitorPass) => {
    const text = buildWhatsAppShareMessage(pass);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(pass.pass_code);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // WhatsApp Share Trigger
  const handleShareWhatsApp = (pass: VisitorPass) => {
    const text = buildWhatsAppShareMessage(pass);
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Format countdown string
  const formatCountdown = (validUntil: string): { label: string; isUrgent: boolean } => {
    const exp = new Date(validUntil).getTime();
    const diff = exp - currentTime;

    if (diff <= 0) {
      return { label: 'Expired', isUrgent: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return {
        label: `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`,
        isUrgent: false,
      };
    }

    if (hours > 0) {
      return {
        label: `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
        isUrgent: hours < 1,
      };
    }

    return {
      label: `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
      isUrgent: true,
    };
  };

  const getPassTypeLabel = (type: PassType) => {
    switch (type) {
      case 'guest':
      case 'one_time':
        return 'Guest (30m)';
      case 'delivery':
        return 'Delivery (15m)';
      case 'long_stay':
      case 'recurring':
        return 'Long-Stay';
      case 'exit':
        return 'Exit Pass';
      case 'group':
        return 'Group Visit';
      default:
        return 'Pass';
    }
  };

  // SOS Press & Hold Functions
  const handleSOSStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${SOS_HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(async () => {
      setSosActivated(true);
      setIsHoldingSOS(false);
      setShowSosToast(true);

      if (currentUser) {
        try {
          await triggerSOSEvent(currentUser);
        } catch (err) {
          console.error(err);
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

  const handleSOSCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(SOS_RING_LENGTH);
  };

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TA';

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-sans pb-32">
      {/* SVG Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="lattice-passes" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Top Header Pillbars */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <div className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident' && currentUser?.house_number
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : currentUser?.role === 'admin' || currentUser?.role === 'master_admin'
              ? 'Estate Passes Registry'
              : currentUser?.role === 'security'
              ? 'Gate Pass Verification'
              : 'Visitor Passes'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            title="Account & Profile Settings"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice-passes)" />
        </svg>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Sora'] font-bold text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                Visitor & Access Passes
              </h1>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Generate encrypted 6-digit access codes and WhatsApp passes for verified entry at Main Gate 1 & 2.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/gate')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#E8C547]" />
                <span>Gate Hub</span>
              </button>
              <button
                onClick={() => {
                  setCreatedPassSuccess(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Pass</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Metric Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 text-center shadow-xs">
              <div className="font-['Sora'] font-extrabold text-xl text-[#257A54]">{activeCount}</div>
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Active Passes</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 text-center shadow-xs">
              <div className="font-['Sora'] font-extrabold text-xl text-[#16241D]">{passes.length}</div>
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Total Issued</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 text-center shadow-xs">
              <div className="font-['Sora'] font-extrabold text-xl text-[#B4922C]">{usedTodayCount}</div>
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Logged In Today</div>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#EAF7EE] p-1 rounded-xl border border-[#3FAE7A]/20">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'active'
                    ? 'bg-white text-[#257A54] shadow-xs'
                    : 'text-[#516459] hover:text-[#16241D]'
                }`}
              >
                Active Passes ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-[#257A54] shadow-xs'
                    : 'text-[#516459] hover:text-[#16241D]'
                }`}
              >
                History ({historyCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA096]" />
              <input
                type="text"
                placeholder="Search visitor, code or plate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-8 pr-3 bg-white border border-[#E3EFE7] rounded-xl text-xs text-[#16241D] placeholder-[#8AA096] focus:outline-none focus:border-[#3FAE7A] focus:ring-2 focus:ring-[#3FAE7A]/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8AA096] hover:text-[#16241D]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Passes List Section */}
          {activeTab === 'active' ? (
            <div className="space-y-4">
              {activePasses.length === 0 ? (
                <div className="bg-white border border-[#E3EFE7] rounded-2xl p-10 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">No active passes</h3>
                  <p className="text-xs text-[#516459] max-w-sm mx-auto">
                    You do not have any pending or active visitor codes. Issue a pass before your guests arrive at the gate.
                  </p>
                  <button
                    onClick={() => {
                      setCreatedPassSuccess(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Pass Now</span>
                  </button>
                </div>
              ) : (
                activePasses.map((pass) => {
                  const countdown = formatCountdown(pass.valid_until || pass.expires_at || '');
                  return (
                    <div
                      key={pass.id}
                      className="bg-white border border-[#E3EFE7] rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#3FAE7A]/40"
                    >
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-['Sora'] font-extrabold text-[10.5px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#FBF3D9] text-[#B4922C]">
                            {getPassTypeLabel(pass.pass_type)}
                          </span>
                          {pass.guest_plate_number && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#516459] bg-[#FBFDF9] border border-[#E3EFE7] px-2 py-0.5 rounded-md">
                              <Car className="w-3 h-3 text-[#8AA096]" />
                              {pass.guest_plate_number}
                            </span>
                          )}
                        </div>

                        {/* Countdown Badge */}
                        <span
                          className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${
                            countdown.isUrgent
                              ? 'bg-[#FCEBEB] text-[#A32D2D]'
                              : 'bg-[#EAF7EE] text-[#257A54]'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {countdown.label}
                        </span>
                      </div>

                      {/* Visitor Name & Info */}
                      <div className="mb-4">
                        <h3 className="font-['Sora'] font-bold text-lg text-[#16241D]">
                          {pass.guest_name}
                        </h3>
                        {pass.guest_phone && (
                          <div className="flex items-center gap-1 text-xs text-[#8AA096] mt-0.5">
                            <Phone className="w-3 h-3" />
                            {pass.guest_phone}
                          </div>
                        )}
                        {pass.notes && (
                          <p className="text-xs text-[#516459] mt-1 italic bg-[#FBFDF9] p-2 rounded-lg border border-[#E3EFE7]">
                            "{pass.notes}"
                          </p>
                        )}
                      </div>

                      {/* 6-Digit Code Box */}
                      <div className="bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl p-3.5 flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#8AA096] uppercase tracking-wider mb-0.5">
                            6-Digit Access Code
                          </div>
                          <div className="font-['Sora'] font-extrabold text-2xl sm:text-3xl text-[#257A54] tracking-widest font-mono">
                            {pass.pass_code}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQrModalPass(pass)}
                            className="w-10 h-10 rounded-xl bg-white border border-[#E3EFE7] hover:border-[#3FAE7A] hover:bg-[#EAF7EE] text-[#257A54] flex items-center justify-center transition-colors shadow-2xs"
                            title="View Gate QR Code"
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(pass)}
                            className="w-10 h-10 rounded-xl bg-white border border-[#E3EFE7] hover:border-[#3FAE7A] hover:bg-[#EAF7EE] text-[#257A54] flex items-center justify-center transition-colors shadow-2xs"
                            title="Copy Access Details"
                          >
                            {copyFeedback === pass.pass_code ? (
                              <Check className="w-5 h-5 text-[#257A54]" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          onClick={() => handleShareWhatsApp(pass)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#EAF7EE] text-[#257A54] font-bold hover:bg-[#d8f2df] transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleRevokePass(pass.id)}
                          className="font-bold text-[#A32D2D] hover:underline px-2 py-1"
                        >
                          Revoke Pass
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {historyPasses.length === 0 ? (
                <div className="bg-white border border-[#E3EFE7] rounded-2xl p-10 text-center text-[#8AA096] text-xs shadow-xs">
                  No historical visitor passes found.
                </div>
              ) : (
                historyPasses.map((pass) => (
                  <div
                    key={pass.id}
                    className="bg-white border border-[#E3EFE7] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs opacity-85"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Sora'] font-bold text-sm text-[#16241D]">
                          {pass.guest_name}
                        </span>
                        <span className="font-mono font-bold text-xs text-[#8AA096]">
                          {pass.pass_code}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8AA096] mt-0.5">
                        {getPassTypeLabel(pass.pass_type)} &middot; {new Date(pass.created_at || '').toLocaleDateString()}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                        pass.status === 'used'
                          ? 'bg-[#EAF7EE] text-[#257A54]'
                          : pass.status === 'revoked'
                          ? 'bg-[#FCEBEB] text-[#A32D2D]'
                          : 'bg-[#FBF3D9] text-[#B4922C]'
                      }`}
                    >
                      {pass.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* Floating Bottom Dock */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-2xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[8.5px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/passes')}
          className="w-12 h-11 border-none bg-white/12 text-[#E8C547] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V9z" />
            <path d="M9 14h6" />
          </svg>
          <span className="text-[8.5px] font-bold">Passes</span>
        </button>
        <button
          onClick={() => navigate('/facilities')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z" />
          </svg>
          <span className="text-[8.5px] font-bold">Facilities</span>
        </button>
        <button
          onClick={() => navigate('/household')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[8.5px] font-bold">Staff</span>
        </button>
        <button
          onClick={() => navigate('/notices')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[8.5px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Floating Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-50">
        <svg className="absolute inset-0 w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 70 70">
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
          onMouseDown={handleSOSStart}
          onMouseUp={handleSOSCancel}
          onMouseLeave={handleSOSCancel}
          onTouchStart={handleSOSStart}
          onTouchEnd={handleSOSCancel}
          onTouchCancel={handleSOSCancel}
          className={`absolute top-[7px] left-[7px] w-14 h-14 rounded-full border-none bg-gradient-to-br from-[#F0645F] to-[#C23A38] flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg select-none touch-none ${
            isHoldingSOS ? 'scale-95' : 'animate-pulse'
          } ${sosActivated ? 'bg-gradient-to-br from-[#FF6E68] to-[#D2413F] scale-105' : ''}`}
          aria-label="Hold for 5 seconds for SOS"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="white" stroke="none" />
          </svg>
          <span className="font-['Sora'] font-extrabold text-[8.5px] tracking-wider text-white">SOS</span>
        </button>

        {showSosToast && (
          <div className="absolute bottom-20 right-0 bg-[#0D2A1F] border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
            Alert sent to gate security
          </div>
        )}
      </div>

      {/* CREATE PASS MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459] hover:text-[#16241D]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <span className="font-['Sora'] font-bold text-[10.5px] uppercase tracking-wider text-[#257A54]">
                Gate Access
              </span>
              <h2 className="font-['Sora'] font-bold text-xl text-[#16241D] mt-0.5">
                Issue Visitor Pass
              </h2>
              <p className="text-xs text-[#516459]">
                Generate an immediate 6-digit access code for your guest or delivery.
              </p>
            </div>

            {createdPassSuccess ? (
              <div className="space-y-4">
                <div className="bg-[#EAF7EE] border border-[#3FAE7A]/30 rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#3FAE7A] text-white flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">Pass Generated</h3>
                  <p className="text-xs text-[#257A54] mt-0.5">Valid for {createdPassSuccess.guest_name}</p>

                  <div className="font-['Sora'] font-extrabold text-3xl text-[#257A54] tracking-widest my-3 font-mono">
                    {createdPassSuccess.pass_code}
                  </div>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleCopyToClipboard(createdPassSuccess)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E3EFE7] text-xs font-bold text-[#16241D] flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copyFeedback === createdPassSuccess.pass_code ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(createdPassSuccess)}
                      className="px-3 py-1.5 rounded-xl bg-[#257A54] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCreatedPassSuccess(null);
                    setIsCreateModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreatePass} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alhaji Mustapha Bello"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="0803 000 0000"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      Vehicle Plate
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KSF-419-AA"
                      value={guestPlate}
                      onChange={(e) => setGuestPlate(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Pass Type
                  </label>
                  <select
                    value={passType}
                    onChange={(e) => setPassType(e.target.value as PassType)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                  >
                    <option value="guest">Guest (Standard)</option>
                    <option value="delivery">Delivery Dispatch</option>
                    <option value="contractor">Artisan/Contractor</option>
                    <option value="long_stay">Long Stay Visitor</option>
                  </select>
                </div>

                {/* Conditional Fields for Artisan / Contractor */}
                {passType === 'contractor' && (
                  <div className="space-y-2.5 p-3 bg-[#F4F9F5] border border-[#3FAE7A]/25 rounded-xl">
                    <div>
                      <label className="block font-bold text-[#257A54] uppercase tracking-wider mb-1 text-[10.5px]">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={artisanDate}
                        onChange={(e) => setArtisanDate(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-[#257A54] uppercase tracking-wider mb-1 text-[10.5px]">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={artisanStartTime}
                          onChange={(e) => setArtisanStartTime(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#257A54] uppercase tracking-wider mb-1 text-[10.5px]">
                          End Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={artisanEndTime}
                          onChange={(e) => setArtisanEndTime(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields for Long Stay Visitor */}
                {passType === 'long_stay' && (
                  <div className="p-3 bg-[#F4F9F5] border border-[#3FAE7A]/25 rounded-xl">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-[#257A54] uppercase tracking-wider mb-1 text-[10.5px]">
                          Valid From *
                        </label>
                        <input
                          type="date"
                          required
                          value={validFromDate}
                          onChange={(e) => setValidFromDate(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#257A54] uppercase tracking-wider mb-1 text-[10.5px]">
                          Valid To *
                        </label>
                        <input
                          type="date"
                          required
                          value={validToDate}
                          onChange={(e) => setValidToDate(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Visit Purpose / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Electrician maintenance, Family visit"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-sm hover:bg-[#DDB63A] active:scale-98 transition-all mt-2"
                >
                  Generate 6-Digit Pass
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR CODE PREVIEW MODAL */}
      {qrModalPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative">
            <button
              onClick={() => setQrModalPass(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459]"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="font-['Sora'] font-bold text-[10.5px] uppercase tracking-wider text-[#257A54]">
              Scan at Gate Hub
            </span>
            <h3 className="font-['Sora'] font-bold text-lg text-[#16241D] mt-0.5">
              {qrModalPass.guest_name}
            </h3>

            <div className="my-4 p-4 bg-[#FBFDF9] border border-[#E3EFE7] rounded-2xl inline-block">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Pass QR Code" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-[#8AA096]">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="font-['Sora'] font-extrabold text-2xl text-[#257A54] tracking-widest font-mono mb-4">
              {qrModalPass.pass_code}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleShareWhatsApp(qrModalPass)}
                className="flex-1 py-2 rounded-xl bg-[#257A54] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
              <button
                onClick={() => setQrModalPass(null)}
                className="px-4 py-2 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] text-[#16241D] font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
