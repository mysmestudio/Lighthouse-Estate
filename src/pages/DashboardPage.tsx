import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Ticket, 
  Bell, 
  QrCode, 
  Plus, 
  PhoneCall, 
  UserCheck, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Share2, 
  ArrowRight,
  Car,
  Search,
  ExternalLink,
  ShieldAlert,
  MoonStar,
  Calendar,
  Info,
  Flame,
  Pin,
  Download,
  Smartphone,
  Vote,
  Wrench,
  ShoppingBag
} from 'lucide-react';
import { AppUser, VisitorPass, AccessLog, EstateNotice } from '../types';
import { 
  getStoredPasses, 
  saveStoredPasses, 
  getStoredAccessLogs, 
  saveStoredAccessLogs,
  generatePassCode,
  getStoredNotices
} from '../lib/estate-data';
import { getStoredAppUsers, saveAppUsers } from '../lib/auth-helpers';
import { StarMotifDivider } from '../components/common/StarMotifDivider';
import { usePwa } from '../context/PwaContext';

interface DashboardPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, navigate }) => {
  const { isInstalled, setShowInstallModal } = usePwa();
  const [passes, setPasses] = useState<VisitorPass[]>(() => getStoredPasses());
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() => getStoredAccessLogs());
  const [allUsers, setAllUsers] = useState<AppUser[]>(() => getStoredAppUsers());
  const [notices] = useState<EstateNotice[]>(() => getStoredNotices());

  // Pass generation modal state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPlate, setGuestPlate] = useState('');
  const [passType, setPassType] = useState<VisitorPass['pass_type']>('guest');
  const [passNotes, setPassNotes] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Security Gate clearance input
  const [gateCodeInput, setGateCodeInput] = useState('');
  const [gateVerifyResult, setGateVerifyResult] = useState<{
    status: 'success' | 'failed' | null;
    pass?: VisitorPass;
    message?: string;
  }>({ status: null });

  // Filter passes for current resident
  const residentPasses = currentUser?.role === 'resident'
    ? passes.filter((p) => p.house_number === currentUser.house_number && p.house_unit === currentUser.house_unit)
    : passes;

  const pendingUsers = allUsers.filter((u) => u.status === 'pending');

  // Sorted notices for the compact widget (Emergency notices pinned, newest first)
  const isEmergency = (n: EstateNotice) =>
    n.type === 'emergency' ||
    n.category === 'emergency' ||
    n.priority === 'emergency' ||
    n.priority === 'urgent';

  const recentNotices = [...notices].sort((a, b) => {
    const aEmerg = isEmergency(a);
    const bEmerg = isEmergency(b);
    if (aEmerg && !bEmerg) return -1;
    if (!aEmerg && bEmerg) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, 2);

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !currentUser) return;

    const newPass: VisitorPass = {
      id: `pass-${Date.now()}`,
      resident_id: currentUser.id,
      resident_name: currentUser.full_name,
      resident_phone: currentUser.phone,
      house_number: currentUser.house_number,
      house_unit: currentUser.house_unit,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim() || undefined,
      guest_plate_number: guestPlate.trim().toUpperCase() || undefined,
      pass_type: passType,
      pass_code: generatePassCode(),
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 18 * 3600000).toISOString(),
      expires_at: new Date(Date.now() + 18 * 3600000).toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      notes: passNotes.trim() || undefined,
    };

    const updated = [newPass, ...passes];
    setPasses(updated);
    saveStoredPasses(updated);

    // Reset form
    setGuestName('');
    setGuestPhone('');
    setGuestPlate('');
    setPassNotes('');
    setIsPassModalOpen(false);
  };

  const handleCopyPass = (code: string) => {
    navigator.clipboard.writeText(`Lighthouse Estate Visitor Pass: Code [${code}] for House ${currentUser?.house_number} (${currentUser?.house_unit}). Valid for gate clearance.`);
    setCopySuccess(code);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  const handleGateVerify = (direction: 'in' | 'out') => {
    const code = gateCodeInput.trim().toUpperCase();
    if (!code) return;

    const matched = passes.find((p) => p.pass_code.toUpperCase() === code);
    if (matched) {
      const newLog: AccessLog = {
        id: `log-${Date.now()}`,
        pass_id: matched.id,
        pass_code: matched.pass_code,
        visitor_name: matched.guest_name,
        house_info: `House ${matched.house_number} (${matched.house_unit})`,
        direction,
        guard_name: currentUser?.full_name || 'Guard Station',
        timestamp: new Date().toISOString(),
        vehicle_plate: matched.guest_plate_number || 'N/A',
        verified_method: 'pin',
        notes: `Cleared by ${currentUser?.full_name || 'Guard'} at Gate 1`,
      };

      const updatedLogs = [newLog, ...accessLogs];
      setAccessLogs(updatedLogs);
      saveStoredAccessLogs(updatedLogs);

      setGateVerifyResult({
        status: 'success',
        pass: matched,
        message: `Clearance GRANTED for ${matched.guest_name} (House ${matched.house_number} - ${matched.house_unit}) [${direction.toUpperCase()}]`,
      });
      setGateCodeInput('');
    } else {
      setGateVerifyResult({
        status: 'failed',
        message: `Clearance DENIED: Pass Code '${code}' not recognized or expired.`,
      });
    }
  };

  const handleApproveUser = (userId: string) => {
    const updated = allUsers.map((u) =>
      u.id === userId
        ? { ...u, status: 'active' as const, approved_by: currentUser?.full_name || 'Admin', approved_at: new Date().toISOString() }
        : u
    );
    setAllUsers(updated);
    saveAppUsers(updated);
  };

  const handleRejectUser = (userId: string) => {
    const updated = allUsers.map((u) =>
      u.id === userId ? { ...u, status: 'rejected' as const } : u
    );
    setAllUsers(updated);
    saveAppUsers(updated);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] py-16 px-4 text-center">
        <div className="max-w-md mx-auto card-estate p-8 space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#C89B3C] mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#0A2F1C]">
            Session Required
          </h2>
          <p className="text-xs text-[#10241A]/70">
            Please log in with your role-specific PIN or email to access the estate portal.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 rounded-xl bg-[#0F472A] text-white font-semibold text-xs hover:bg-[#0A2F1C]"
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Profile Greeting */}
        <div className="card-estate p-6 sm:p-8 bg-white border-[#E4D9BE] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-[#C89B3C]">
                {currentUser.role.replace('_', ' ')} Dashboard
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2F1C]">
              Welcome back, {currentUser.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-[#10241A]/70">
              {currentUser.role === 'resident'
                ? `House ${currentUser.house_number} — ${currentUser.house_unit} • Account Active`
                : currentUser.role === 'security'
                ? 'Main Gate Command Console • Guard Terminal 1'
                : currentUser.role === 'staff'
                ? `House ${currentUser.house_number} (${currentUser.house_unit}) Domestic Staff`
                : 'Estate Administration & Madrasa Oversight Portal'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser.role === 'resident' && (
              <>
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Dues: Up to Date
                </span>
                <button
                  onClick={() => navigate('/passes')}
                  className="px-4 py-2.5 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C] transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#E7D19C]" />
                  <span>Passes Hub</span>
                </button>
              </>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'master_admin' || currentUser.role === 'madrasa_admin') && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2.5 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C] transition-all flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-[#E7D19C]" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. RESIDENT VIEW */}
        {currentUser.role === 'resident' && (
          <div className="space-y-6">
            {/* Hero Welcome Banner */}
            <div className="bg-[#0F472A] rounded-[14px] p-6 sm:p-8 relative overflow-hidden text-white shadow-soft">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#E7D19C] text-xs font-semibold uppercase tracking-wider mb-3 border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>House {currentUser.house_number} • {currentUser.house_unit}</span>
                </div>
                <h1 className="fraunces text-3xl sm:text-4xl font-bold mb-2">
                  Welcome Home, {currentUser.full_name}
                </h1>
                <p className="text-[#E7D19C] text-base sm:text-lg font-medium opacity-90 leading-relaxed">
                  All systems are active. Generate visitor tokens or review official estate bulletins.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/passes')}
                    className="bg-[#C89B3C] hover:bg-[#b28a35] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Generate Access Pass</span>
                  </button>
                  <button
                    onClick={() => navigate('/notices')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-bold border border-white/20 transition-all text-sm flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4 text-[#E7D19C]" />
                    <span>Notice Board & Gazettes</span>
                  </button>
                </div>
              </div>

              {/* Decorative Geometric Star Watermark */}
              <div className="absolute right-[-20px] top-[-20px] opacity-10 text-[#C89B3C] pointer-events-none">
                <svg width="240" height="240" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
                </svg>
              </div>
            </div>

            {/* Star Motif Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-[#E4D9BE]"></div>
              <div className="text-[#C89B3C]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
                </svg>
              </div>
              <div className="h-px flex-1 bg-[#E4D9BE]"></div>
            </div>

            {/* Community Services Quick Hub Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => navigate('/community/polls')}
                className="card-estate p-5 bg-white border border-[#E4D9BE] hover:border-[#C89B3C] shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#F2EAD9] group-hover:bg-[#0F472A] text-[#0F472A] group-hover:text-[#E7D19C] flex items-center justify-center transition-colors">
                      <Vote className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Live
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-[#0A2F1C] text-base group-hover:text-[#0F472A]">
                    Townhall Polls
                  </h3>
                  <p className="text-xs text-[#10241A]/70 leading-relaxed">
                    Cast your household vote on estate upgrades, gate automation, and community initiatives.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-[#E4D9BE]/60 flex items-center justify-between text-xs font-bold text-[#0F472A]">
                  <span>Vote in Polls</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => navigate('/community/tickets')}
                className="card-estate p-5 bg-white border border-[#E4D9BE] hover:border-[#C89B3C] shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#F2EAD9] group-hover:bg-[#0F472A] text-[#0F472A] group-hover:text-[#E7D19C] flex items-center justify-center transition-colors">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      Support
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-[#0A2F1C] text-base group-hover:text-[#0F472A]">
                    Fix-It Tickets
                  </h3>
                  <p className="text-xs text-[#10241A]/70 leading-relaxed">
                    Report electrical faults, plumbing leaks, or security issues with live tracking.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-[#E4D9BE]/60 flex items-center justify-between text-xs font-bold text-[#0F472A]">
                  <span>Track & Report Faults</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => navigate('/community/marketplace')}
                className="card-estate p-5 bg-white border border-[#E4D9BE] hover:border-[#C89B3C] shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#F2EAD9] group-hover:bg-[#0F472A] text-[#0F472A] group-hover:text-[#E7D19C] flex items-center justify-center transition-colors">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      Noticeboard
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-[#0A2F1C] text-base group-hover:text-[#0F472A]">
                    Resident Marketplace
                  </h3>
                  <p className="text-xs text-[#10241A]/70 leading-relaxed">
                    Browse neighbor goods, furniture, electronics, giveaways, and resident services.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-[#E4D9BE]/60 flex items-center justify-between text-xs font-bold text-[#0F472A]">
                  <span>Browse Notices</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* 12-Column Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Recent Activity Card */}
                  <div className="bg-white p-6 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="fraunces text-lg font-bold text-[#10241A] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C89B3C]"></span>
                        Active Passes
                      </h3>
                      <button
                        onClick={() => navigate('/passes')}
                        className="text-xs font-semibold text-[#0F472A] hover:underline"
                      >
                        All Passes →
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {residentPasses.length === 0 ? (
                        <div className="p-5 text-center bg-[#FBF8F1] rounded-xl border border-[#E4D9BE] space-y-2">
                          <Ticket className="w-8 h-8 text-[#C89B3C] mx-auto opacity-70" />
                          <p className="text-xs text-[#10241A]/70">No active visitor passes right now.</p>
                          <button
                            onClick={() => navigate('/passes')}
                            className="text-xs font-bold text-[#0F472A] hover:underline"
                          >
                            + Issue Guest Pass
                          </button>
                        </div>
                      ) : (
                        residentPasses.slice(0, 3).map((pass) => (
                          <div
                            key={pass.id}
                            className="flex items-start justify-between p-3 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE]/70 hover:border-[#C89B3C] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#F2EAD9] flex items-center justify-center text-[#0F472A] shrink-0 font-bold">
                                <Ticket className="w-4 h-4 text-[#0F472A]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#0A2F1C]">
                                  {pass.guest_name}
                                </p>
                                <p className="text-[11px] text-[#10241A]/60">
                                  {pass.pass_type.replace('_', ' ')} • Code:{' '}
                                  <strong className="font-mono text-[#0F472A]">{pass.pass_code}</strong>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopyPass(pass.pass_code)}
                              className="p-1.5 rounded-lg hover:bg-white text-[#0A2F1C] transition-colors border border-transparent hover:border-[#E4D9BE]"
                              title="Copy Pass Info"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-8 h-8 rounded-full bg-[#FBF8F1] flex items-center justify-center text-[#0F472A] shrink-0 border border-[#E4D9BE]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#10241A]">Estate Dues Verified</p>
                          <p className="text-[10px] text-[#10241A]/50">Status: Up to Date • Ref: LH-DUES-2026</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Compact Notice Widget (1-2 most recent notices) */}
                  <div className="bg-white p-6 rounded-[14px] border border-[#E4D9BE] shadow-soft flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="fraunces text-lg font-bold text-[#10241A] flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#C89B3C]" />
                          Notice Board
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F472A] bg-[#F2EAD9] px-2 py-0.5 rounded-md">
                          Latest Gazettes
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {recentNotices.map((notice) => {
                          const noticeEmerg = isEmergency(notice);
                          const noticeEvent = notice.type === 'event' || notice.category === 'event';

                          return (
                            <div
                              key={notice.id}
                              onClick={() => navigate('/notices')}
                              className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-xs space-y-1 ${
                                noticeEmerg
                                  ? 'bg-rose-50 border-red-300 hover:border-red-400'
                                  : noticeEvent
                                  ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                                  : 'bg-[#FBF8F1] border-[#E4D9BE] hover:border-[#0F472A]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    noticeEmerg
                                      ? 'bg-red-600 text-white'
                                      : noticeEvent
                                      ? 'bg-[#C89B3C] text-white'
                                      : 'bg-[#0F472A] text-white'
                                  }`}
                                >
                                  {noticeEmerg ? 'EMERGENCY' : noticeEvent ? 'EVENT' : 'INFO'}
                                </span>
                                <span className="text-[10px] text-[#10241A]/50">
                                  {new Date(notice.created_at).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-[#0A2F1C] line-clamp-1">
                                {notice.title}
                              </p>
                              <p className="text-[11px] text-[#10241A]/75 line-clamp-2 leading-tight">
                                {notice.body || notice.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/notices')}
                      className="w-full text-center text-xs font-bold text-[#0F472A] hover:underline pt-2 border-t border-[#E4D9BE]/60 flex items-center justify-center gap-1"
                    >
                      <span>Open Full Notice Board</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hotlines Banner */}
                <div className="card-estate p-5 bg-[#F2EAD9]/60 border-[#E4D9BE] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F472A] text-[#E7D19C] flex items-center justify-center font-bold">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#0A2F1C]">Gatehouse & Security Dispatch</h4>
                      <p className="text-xs text-[#10241A]/70">Gate 1: Ext. 100 • Gate 2: Ext. 102 • Management: Ext. 201</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      alert('Gatehouse Intercom dispatch connected (Ext. 100). Guard on duty notified.');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C] transition-colors whitespace-nowrap shadow-xs"
                  >
                    Call Security Ext. 100
                  </button>
                </div>
              </div>

              {/* Right Column (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* Quick PIN Access Card */}
                <div className="bg-[#F2EAD9] p-6 rounded-[14px] border border-[#E4D9BE] flex flex-col gap-4 shadow-soft">
                  <div>
                    <h3 className="fraunces text-lg font-bold text-[#10241A]">
                      Household PIN Key
                    </h3>
                    <p className="text-xs text-[#10241A]/70 mt-0.5">
                      Personal 6-character access key for automated gates.
                    </p>
                  </div>

                  <div className="flex justify-between gap-2 mt-1">
                    {(currentUser.pin || '4928AB').split('').map((char, i) => (
                      <div
                        key={i}
                        className="w-10 h-12 bg-white border border-[#C89B3C] rounded-lg flex items-center justify-center fraunces font-bold text-xl text-[#0A2F1C] shadow-2xs"
                      >
                        {char}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      alert(`Resident Key for House ${currentUser.house_number} (${currentUser.house_unit}) verified and active across all gates.`);
                    }}
                    className="w-full bg-[#0F472A] text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-[#0A2F1C] transition-all"
                  >
                    Validate Resident Key
                  </button>
                </div>

                {/* Progressive Web App Install & Offline Tile */}
                <div className="bg-white p-5 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0F472A] text-[#E7D19C] flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0A2F1C]">
                          {isInstalled ? 'Installed Native App' : 'Offline Access App'}
                        </h4>
                        <p className="text-[10px] text-[#10241A]/60">
                          {isInstalled ? 'Running in standalone mode' : 'Add to home screen for offline passes'}
                        </p>
                      </div>
                    </div>
                    {isInstalled ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowInstallModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Download className="w-3 h-3 text-[#E7D19C]" />
                        <span>Install</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Home Status Card */}
                <div className="bg-white p-6 rounded-[14px] border border-[#E4D9BE] shadow-soft flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C89B3C] font-bold">
                        Home Status
                      </p>
                      <div className="flex justify-between items-end mt-1">
                        <span className="fraunces text-2xl font-bold text-[#0A2F1C]">
                          Unit {currentUser.house_number}
                        </span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-[#10241A]/60 mt-0.5">
                        {currentUser.house_unit}
                      </p>
                    </div>

                    <div className="h-px bg-[#E4D9BE]"></div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C89B3C] font-bold">
                        Outstanding Dues
                      </p>
                      <p className="fraunces text-2xl font-bold text-[#0A2F1C]">₦0.00</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        ✓ All monthly levies paid
                      </p>
                    </div>

                    <div className="h-px bg-[#E4D9BE]"></div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest text-[#C89B3C] font-bold">
                          Household Staff & KYC
                        </p>
                        <button
                          onClick={() => navigate('/household')}
                          className="text-[11px] font-bold text-[#0F472A] hover:underline"
                        >
                          Manage Hub →
                        </button>
                      </div>
                      <div 
                        onClick={() => navigate('/household')}
                        className="flex items-center justify-between p-2.5 mt-2 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE] cursor-pointer hover:border-[#0F472A] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-[#0F472A] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                              FS
                            </div>
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-[#C89B3C] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                              YM
                            </div>
                          </div>
                          <span className="text-xs text-[#10241A] font-semibold">Active Household Staff</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          KYC Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Panic Emergency Button */}
                  <button
                    onClick={() => {
                      if (confirm('🚨 ACTIVATE EMERGENCY PANIC ALERT?\nThis will instantly dispatch armed security to House ' + currentUser.house_number + ' and notify gate officers.')) {
                        alert('EMERGENCY DISPATCH TRIGGERED: Armed guard unit dispatched to House ' + currentUser.house_number + '. Gatehouse alerted.');
                      }
                    }}
                    className="w-full py-3.5 mt-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs border border-red-200 flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>EMERGENCY PANIC ALERT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SECURITY GATE VIEW */}
        {currentUser.role === 'security' && (
          <div className="space-y-8">
            <div className="card-estate p-6 sm:p-8 bg-white border-2 border-[#0F472A] shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E4D9BE]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0F472A] text-[#E7D19C] flex items-center justify-center font-bold text-xl">
                    G1
                  </div>
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A2F1C]">
                      Main Gate Access Clearance Terminal
                    </h2>
                    <p className="text-xs text-[#10241A]/70">
                      Officer on Duty: <strong>{currentUser.full_name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/gate')}
                  className="px-4 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C]"
                >
                  Open Full Security Hub
                </button>
              </div>

              {/* Code Verification Input Form */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[#0A2F1C] uppercase tracking-wide">
                  Enter 6-Digit Visitor / Contractor Pass Code:
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="e.g. 482910"
                    value={gateCodeInput}
                    onChange={(e) => setGateCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3.5 rounded-xl border-2 border-[#0F472A] text-xl font-mono tracking-widest text-[#0A2F1C] uppercase outline-none focus:ring-4 focus:ring-[#C89B3C]/20 bg-[#FBF8F1]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleGateVerify('in')}
                      className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-colors shadow-md"
                    >
                      Clear IN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGateVerify('out')}
                      className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-[#C89B3C] text-[#0A2F1C] font-bold text-sm hover:bg-[#E7D19C] transition-colors shadow-md"
                    >
                      Log OUT
                    </button>
                  </div>
                </div>
              </div>

              {/* Result Banner */}
              {gateVerifyResult.message && (
                <div
                  className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 ${
                    gateVerifyResult.status === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-400'
                      : 'bg-red-50 text-red-900 border-2 border-red-400'
                  }`}
                >
                  {gateVerifyResult.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div>{gateVerifyResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Today's Gate Log Stream */}
            <div className="card-estate p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#0A2F1C] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C89B3C]" />
                <span>Today's Real-Time Access Audit Logs</span>
              </h3>

              <div className="divide-y divide-[#E4D9BE] overflow-x-auto">
                {accessLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          log.direction === 'in'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {log.direction.toUpperCase()}
                      </span>
                      <div>
                        <div className="font-bold text-[#0A2F1C]">{log.visitor_name}</div>
                        <div className="text-[#10241A]/60">{log.house_info}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {log.vehicle_plate && (
                        <div className="font-mono text-[#0F472A] font-semibold hidden sm:block">
                          {log.vehicle_plate}
                        </div>
                      )}
                      <div className="text-[#10241A]/60">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. STAFF VIEW */}
        {currentUser.role === 'staff' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="card-estate p-6 sm:p-8 space-y-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
                <span className="text-xs uppercase tracking-wider font-bold text-[#0F472A]">
                  Domestic Staff Credential Card
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  On Duty
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE] space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E4D9BE]/60">
                  <span className="text-[#10241A]/60">Staff Full Name:</span>
                  <span className="font-bold text-[#0A2F1C]">{currentUser.full_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4D9BE]/60">
                  <span className="text-[#10241A]/60">Assigned Household:</span>
                  <span className="font-bold text-[#0F472A]">
                    House {currentUser.house_number} ({currentUser.house_unit})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#10241A]/60">Staff Gate Badge:</span>
                  <span className="font-mono font-bold text-[#C89B3C]">
                    STF-{currentUser.house_number}-{currentUser.house_unit}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#10241A]/70 leading-relaxed">
                Staff must present this digital credential badge or state their assigned house number and 6-character PIN upon entering through pedestrian gate turnstiles.
              </p>
            </div>
          </div>
        )}

        {/* 4. ADMIN & MADRASA ADMIN OVERVIEW */}
        {(currentUser.role === 'admin' || currentUser.role === 'master_admin' || currentUser.role === 'madrasa_admin') && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card-estate p-4 bg-white border-[#E4D9BE]">
                <span className="text-xs text-[#10241A]/60 font-medium">Pending Approvals</span>
                <div className="font-serif text-2xl font-bold text-amber-700 mt-1">
                  {pendingUsers.length}
                </div>
              </div>
              <div className="card-estate p-4 bg-white border-[#E4D9BE]">
                <span className="text-xs text-[#10241A]/60 font-medium">Active Households</span>
                <div className="font-serif text-2xl font-bold text-[#0F472A] mt-1">
                  {allUsers.filter((u) => u.status === 'active' && u.role === 'resident').length}
                </div>
              </div>
              <div className="card-estate p-4 bg-white border-[#E4D9BE]">
                <span className="text-xs text-[#10241A]/60 font-medium">Active Passes</span>
                <div className="font-serif text-2xl font-bold text-[#C89B3C] mt-1">
                  {passes.filter((p) => p.status === 'active').length}
                </div>
              </div>
              <div className="card-estate p-4 bg-white border-[#E4D9BE]">
                <span className="text-xs text-[#10241A]/60 font-medium">Gate Logs Today</span>
                <div className="font-serif text-2xl font-bold text-[#0A2F1C] mt-1">
                  {accessLogs.length}
                </div>
              </div>
            </div>

            {/* Pending Approvals Queue */}
            <div className="card-estate p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">
                    Pending Resident Registrations
                  </h3>
                  <p className="text-xs text-[#10241A]/60">
                    Review and verify new household registrations
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-xs font-semibold text-[#0F472A] hover:underline"
                >
                  Manage All in Admin Console →
                </button>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#10241A]/60 bg-[#FBF8F1] rounded-xl border border-[#E4D9BE]">
                  ✓ All registration requests have been processed.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-sm text-[#0A2F1C]">
                          {user.full_name}
                        </div>
                        <div className="text-[#10241A]/70">
                          House {user.house_number} ({user.house_unit}) • {user.phone} • {user.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#0F472A] text-white font-semibold hover:bg-[#0A2F1C] transition-colors"
                        >
                          Approve PIN
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
