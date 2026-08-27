import React, { useState, useEffect, useRef } from 'react';
import { 
  AppUser, 
  EstateNotice, 
  AccessLog, 
  NoticeType, 
  SOSEvent,
  EstateAlert
} from '../types';
import { getStoredAppUsers, saveAppUsers } from '../lib/auth-helpers';
import { 
  getStoredNotices, 
  saveStoredNotices, 
  getStoredAccessLogs, 
  fetchAdminStats, 
  AdminStats 
} from '../lib/estate-data';
import { getStoredBookings } from '../lib/facility-helpers';
import { triggerSOSEvent } from '../lib/sos-service';
import { 
  getAlertsForUser, 
  checkAndEscalateOverstays, 
  dismissAlert 
} from '../lib/alert-service';

interface AdminPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

interface ApprovalItem {
  id: string;
  name: string;
  initials: string;
  house: number;
  unit: string;
  submitted: string;
  status: 'pending' | 'approved' | 'declined';
  role: string;
}

const HADITHS = [
  { text: "None of you truly believes until you love for others what you love for yourself.", source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" },
  { text: "Whoever believes in Allah and the Last Day should do good to their neighbour.", source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" },
  { text: "The believers, in their mutual love and mercy, are like one body — when a single part aches, the whole body stays awake with fever.", source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" },
  { text: "Jibril kept urging kindness to neighbours, until I thought they might even be given a share of inheritance.", source: "Prophet Muhammad ﷺ · Sahih al-Bukhari & Muslim" }
];

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, navigate }) => {
  const [users, setUsers] = useState<AppUser[]>(() => getStoredAppUsers());
  const [notices, setNotices] = useState<EstateNotice[]>(() => getStoredNotices());
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() => getStoredAccessLogs());
  const [alerts, setAlerts] = useState<EstateAlert[]>(() => getAlertsForUser('admin'));
  const [showActiveAlertsModal, setShowActiveAlertsModal] = useState<boolean>(false);

  // Background check for overstay detection on mount and every 10 seconds
  useEffect(() => {
    const runOverstayCheck = () => {
      checkAndEscalateOverstays();
      setAlerts(getAlertsForUser('admin'));
      setAccessLogs(getStoredAccessLogs());
    };
    runOverstayCheck();
    const timer = setInterval(runOverstayCheck, 10000);
    return () => clearInterval(timer);
  }, []);

  // Active dock tab
  const [activeDock, setActiveDock] = useState<'home' | 'approvals' | 'dues' | 'logs' | 'notices'>('home');

  // Approvals State
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  // Today's Hadith
  const todayHadith = HADITHS[new Date().getDate() % HADITHS.length];

  // Modals
  const [showPostNoticeModal, setShowPostNoticeModal] = useState<boolean>(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState<string>('');
  const [newNoticeBody, setNewNoticeBody] = useState<string>('');
  const [newNoticeType, setNewNoticeType] = useState<NoticeType>('info');
  const [noticePublishedToast, setNoticePublishedToast] = useState<boolean>(false);

  const [showExemptionModal, setShowExemptionModal] = useState<boolean>(false);
  const [showAllLogsModal, setShowAllLogsModal] = useState<boolean>(false);

  // SOS state
  const [sosHolding, setSosHolding] = useState<boolean>(false);
  const [sosActivated, setSosActivated] = useState<boolean>(false);
  const [showSosToast, setShowSosToast] = useState<boolean>(false);
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sosProgressRef = useRef<SVGCircleElement | null>(null);
  const RING_LENGTH = 194.8;
  const HOLD_MS = 5000;

  // Sync users with pending status into approvals
  useEffect(() => {
    const pendingUsers = users.filter(u => u.status === 'pending');
    if (pendingUsers.length > 0) {
      setApprovals(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems: ApprovalItem[] = pendingUsers
          .filter(u => !existingIds.has(u.id))
          .map(u => ({
            id: u.id,
            name: u.full_name,
            initials: u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RS',
            house: u.house_number,
            unit: u.house_unit || 'Main House',
            submitted: 'submitted recently',
            status: 'pending',
            role: u.role
          }));
        return [...newItems, ...prev];
      });
    }
  }, [users]);

  // Handle Approve / Decline
  const handleResolveApproval = (id: string, decision: 'approved' | 'declined') => {
    setApprovals(prev =>
      prev.map(item => (item.id === id ? { ...item, status: decision } : item))
    );

    // Update real users collection
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: (decision === 'approved' ? 'active' : 'suspended') as any
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    saveAppUsers(updatedUsers);
  };

  // Handle Post Notice
  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeBody.trim()) return;

    const newNotice: EstateNotice = {
      id: `notice-${Date.now()}`,
      title: newNoticeTitle.trim(),
      content: newNoticeBody.trim(),
      body: newNoticeBody.trim(),
      type: newNoticeType,
      author_name: currentUser?.full_name || 'Estate Office',
      author_role: 'Estate Admin',
      priority: newNoticeType === 'emergency' ? 'emergency' : 'normal',
      created_at: new Date().toISOString()
    };

    const updated = [newNotice, ...notices];
    setNotices(updated);
    saveStoredNotices(updated);

    setNewNoticeTitle('');
    setNewNoticeBody('');
    setShowPostNoticeModal(false);
    setNoticePublishedToast(true);
    setTimeout(() => setNoticePublishedToast(false), 3500);
  };

  // SOS Press-and-Hold
  const handleSosStart = (e: React.PointerEvent) => {
    e.preventDefault();
    if (sosActivated) return;
    setSosHolding(true);
    if (sosProgressRef.current) {
      sosProgressRef.current.style.transition = `stroke-dashoffset ${HOLD_MS / 1000}s linear`;
      sosProgressRef.current.style.strokeDashoffset = '0';
    }
    sosTimerRef.current = setTimeout(handleSosComplete, HOLD_MS);
  };

  const handleSosCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
    setSosHolding(false);
    if (sosProgressRef.current) {
      sosProgressRef.current.style.transition = 'none';
      sosProgressRef.current.style.strokeDashoffset = String(RING_LENGTH);
    }
  };

  const handleSosComplete = async () => {
    setSosHolding(false);
    setSosActivated(true);
    setShowSosToast(true);

    try {
      const userToTrigger: AppUser = currentUser || {
        id: 'admin-user-1',
        auth_user_id: 'auth-adm-1',
        role: 'admin',
        full_name: 'Estate Admin',
        phone: '+234 809 111 2233',
        email: 'admin@lighthouseestate.org',
        house_number: 1,
        house_unit: 'Main House',
        status: 'active',
        created_at: new Date().toISOString()
      };
      await triggerSOSEvent(userToTrigger);
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setSosActivated(false);
      setShowSosToast(false);
      if (sosProgressRef.current) {
        sosProgressRef.current.style.transition = 'none';
        sosProgressRef.current.style.strokeDashoffset = String(RING_LENGTH);
      }
    }, 4000);
  };

  const pendingApprovalsCount = approvals.filter(a => a.status === 'pending').length;
  const activeResidents = users.filter(u => u.role === 'resident' && u.status === 'active');
  const occupiedHouseholdsCount = new Set(activeResidents.map(u => u.house_number)).size;
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;
  const recentBookings = getStoredBookings().slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-['Manrope',sans-serif] leading-[1.55] pb-[110px] relative antialiased">
      {/* SVG Lattice Background Pattern */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="lattice" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Pill Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-[18px] py-4">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-[14px] rounded-full px-3.5 py-[7px]">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="12" cy="12" r="8" stroke="#0D2A1F" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="#0D2A1F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-['Sora',sans-serif] font-bold text-[12.5px] text-white">
            Estate Admin
          </span>
        </div>

        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-[14px] rounded-full px-3.5 py-[7px]">
          <button
            type="button"
            onClick={() => navigate('/notices')}
            className="relative w-[34px] h-[34px] rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors"
            aria-label="Notifications"
          >
            <span className="absolute top-[5px] right-[6px] w-1.5 h-1.5 rounded-full bg-[#E8C547] border-[1.5px] border-[#123528]" />
            <svg className="w-[17px] h-[17px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
              <path d="M10 20a2 2 0 004 0" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-[34px] h-[34px] rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora',sans-serif] font-bold text-[12.5px] cursor-pointer hover:opacity-90 transition-opacity"
            title="Resident View"
          >
            EA
          </button>
        </div>
      </header>

      {/* Hero Zone */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-[18px] pt-1.5 pb-10 relative overflow-hidden -mt-[64px]">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice)" />
        </svg>
        <div className="max-w-[720px] mx-auto px-0 sm:px-[18px] md:px-[32px] relative z-[2] pt-[78px]">
          <h1 className="font-['Sora',sans-serif] font-bold text-[clamp(24px,4vw,29px)] mb-1.5 tracking-[-0.02em]">
            Welcome back, {currentUser?.full_name?.split(' ')[0] || 'Estate Admin'}
          </h1>
          <p className="text-[14px] text-white/75">
            {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'approval' : 'approvals'} and {activeAlertsCount} {activeAlertsCount === 1 ? 'active alert' : 'active alerts'} need your review today.
          </p>
        </div>
      </div>

      {/* Content Sheet */}
      <div className="bg-[#FBFDF9] rounded-t-[26px] -mt-6 relative z-[3] pt-[26px]">
        <div className="max-w-[720px] mx-auto px-[18px] sm:px-[18px] md:px-[32px]">

          {/* Metric Tile Grid */}
          <section className="mb-[30px]">
            <div className="grid grid-cols-2 min-[420px]:grid-cols-4 gap-2.5">
              <div className="bg-white border border-[#E3EFE7] rounded-[14px] p-3.5 py-3.5 text-center">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54]">
                  {pendingApprovalsCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-[3px] leading-[1.3]">
                  Pending approvals
                </div>
              </div>
              <div className="bg-white border border-[#E3EFE7] rounded-[14px] p-3.5 py-3.5 text-center">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54]">
                  {occupiedHouseholdsCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-[3px] leading-[1.3]">
                  Occupied households
                </div>
              </div>
              <div className="bg-white border border-[#E3EFE7] rounded-[14px] p-3.5 py-3.5 text-center">
                <div className="font-['Sora',sans-serif] font-extrabold text-[22px] text-[#257A54]">
                  {occupiedHouseholdsCount > 0 ? '100%' : '0%'}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-[3px] leading-[1.3]">
                  Dues collected
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveAlertsModal(true)}
                className={`bg-white border rounded-[14px] p-3.5 py-3.5 text-center transition-all cursor-pointer hover:shadow-md ${
                  activeAlertsCount > 0 ? 'border-[#F0938F] bg-[#FFF8F8]' : 'border-[#E3EFE7]'
                }`}
              >
                <div className={`font-['Sora',sans-serif] font-extrabold text-[22px] ${
                  activeAlertsCount > 0 ? 'text-[#A32D2D]' : 'text-[#257A54]'
                }`}>
                  {activeAlertsCount}
                </div>
                <div className="text-[10.5px] text-[#8AA096] font-semibold mt-[3px] leading-[1.3] flex items-center justify-center gap-1">
                  <span>Active alerts</span>
                  {activeAlertsCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#A32D2D] animate-ping" />}
                </div>
              </button>
            </div>
          </section>

          {/* Quick-Action Grid */}
          <section className="mb-[30px]">
            <div className="grid grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById('approvals-section');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 py-3.5 text-center hover:-translate-y-[3px] hover:shadow-[0_14px_24px_-16px_rgba(18,53,40,0.25)] transition-all cursor-pointer"
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
                    <circle cx="17" cy="9" r="2.3" />
                    <path d="M15 20c0-2.4 1-4 3.5-4.3" />
                  </svg>
                </div>
                <span className="text-[11.5px] font-bold text-[#16241D] block leading-[1.3]">
                  Approvals
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowExemptionModal(true)}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 py-3.5 text-center hover:-translate-y-[3px] hover:shadow-[0_14px_24px_-16px_rgba(18,53,40,0.25)] transition-all cursor-pointer"
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                  </svg>
                </div>
                <span className="text-[11.5px] font-bold text-[#16241D] block leading-[1.3]">
                  Reconcile dues
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAllLogsModal(true)}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 py-3.5 text-center hover:-translate-y-[3px] hover:shadow-[0_14px_24px_-16px_rgba(18,53,40,0.25)] transition-all cursor-pointer"
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                    <path d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                </div>
                <span className="text-[11.5px] font-bold text-[#16241D] block leading-[1.3]">
                  Audit logs
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowPostNoticeModal(true)}
                className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 py-3.5 text-center hover:-translate-y-[3px] hover:shadow-[0_14px_24px_-16px_rgba(18,53,40,0.25)] transition-all cursor-pointer"
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                    <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
                    <path d="M10 20a2 2 0 004 0" />
                  </svg>
                </div>
                <span className="text-[11.5px] font-bold text-[#16241D] block leading-[1.3]">
                  Post notice
                </span>
              </button>
            </div>
          </section>

          {/* 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
            
            {/* Left: Pending Approvals */}
            <div id="approvals-section">
              <section className="mb-[30px]">
                <div className="flex justify-between items-baseline mb-3">
                  <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D] tracking-[-0.02em]">
                    Pending approvals
                  </h2>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-[12.5px] font-bold text-[#257A54] hover:underline cursor-pointer"
                  >
                    All approvals &rarr;
                  </button>
                </div>

                {approvals.map((appr) => (
                  <div
                    key={appr.id}
                    className={`bg-white border border-[#E3EFE7] rounded-2xl p-3.5 px-4 flex items-center gap-3 mb-2.5 transition-all ${
                      appr.status !== 'pending' ? 'bg-[#FBFDF9]' : ''
                    }`}
                  >
                    <div className="w-[38px] h-[38px] rounded-[10px] bg-[#FBF3D9] text-[#B4922C] flex items-center justify-center flex-shrink-0 font-['Sora',sans-serif] font-bold text-[12px]">
                      {appr.initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13.5px] text-[#16241D] truncate">
                        {appr.name}
                      </div>
                      <div className="text-[11.5px] text-[#8AA096]">
                        House {appr.house} &middot; {appr.submitted}
                      </div>
                    </div>

                    {appr.status === 'pending' ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResolveApproval(appr.id, 'approved')}
                          className="w-8 h-8 rounded-[9px] border border-[#E3EFE7] flex items-center justify-center cursor-pointer bg-[#FBFDF9] text-[#516459] hover:bg-[#EAF7EE] hover:border-[#3FAE7A] hover:text-[#257A54] transition-colors"
                          aria-label="Approve"
                        >
                          <svg className="w-[15px] h-[15px] stroke-current fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                            <path d="M4 12l5 5L20 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveApproval(appr.id, 'declined')}
                          className="w-8 h-8 rounded-[9px] border border-[#E3EFE7] flex items-center justify-center cursor-pointer bg-[#FBFDF9] text-[#516459] hover:bg-[#FCEBEB] hover:border-[#E24B4A] hover:text-[#A32D2D] transition-colors"
                          aria-label="Decline"
                        >
                          <svg className="w-[15px] h-[15px] stroke-current fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-[11px] font-bold py-[5px] px-[11px] rounded-full flex-shrink-0 ${
                          appr.status === 'approved'
                            ? 'bg-[#EAF7EE] text-[#257A54]'
                            : 'bg-[#FCEBEB] text-[#A32D2D]'
                        }`}
                      >
                        {appr.status === 'approved' ? 'Approved' : 'Declined'}
                      </span>
                    )}
                  </div>
                ))}
              </section>
            </div>

            {/* Right: Gate Activity Console & Hadith */}
            <div>
              <section className="mb-[30px]">
                <div className="flex justify-between items-baseline mb-3">
                  <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D] tracking-[-0.02em]">
                    Estate-wide gate activity
                  </h2>
                </div>

                {/* Dark Live Activity Console */}
                <div className="bg-[#0D1F17] rounded-[20px] p-[18px] px-5 text-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center gap-2 font-['Sora',sans-serif] text-[12px] font-bold text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,0.25)] animate-pulse" />
                      All gates
                    </span>
                    <span className="font-['Sora',sans-serif] text-[10px] font-extrabold tracking-[0.06em] text-[#4ADE80] bg-[#4ADE80]/12 py-[3px] px-2 rounded-full">
                      Live
                    </span>
                  </div>

                  <div className="h-[112px] overflow-hidden relative [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
                    {accessLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-white/50 text-xs">
                        <span>No gate access recorded yet today</span>
                      </div>
                    ) : (
                      <div className="space-y-1 py-0.5">
                        {accessLogs.slice(0, 4).map((log) => (
                          <div key={log.id} className="flex gap-2.5 py-2 text-[12px] text-white/70 border-b border-dashed border-white/8">
                            <span className="text-white/40 flex-shrink-0 w-11 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                            <span className={`${log.notes?.toLowerCase().includes('overstay') ? 'text-[#F0938F] font-bold' : 'text-white font-semibold'}`}>
                              {log.house_info} &middot; {log.visitor_name} &middot; {log.direction.toUpperCase()}
                              {log.notes ? ` (${log.notes})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hadith Mini Card */}
                <div className="relative bg-white border border-[#E3EFE7] rounded-2xl p-[18px] pb-3.5 mt-5">
                  <span className="absolute top-1.5 left-4 font-['Sora',sans-serif] text-[32px] font-extrabold text-[#B4922C] opacity-40 leading-none">
                    &ldquo;
                  </span>
                  <p className="text-[13px] leading-[1.6] text-[#16241D] pl-5 mb-2">
                    {todayHadith.text}
                  </p>
                  <p className="text-[10.5px] font-bold tracking-[0.04em] uppercase text-[#8AA096] pl-5">
                    {todayHadith.source}
                  </p>
                </div>
              </section>
            </div>

          </div>

          {/* Dues & Levies Block */}
          <section className="mb-[30px]">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D] tracking-[-0.02em]">
                Dues &amp; levies
              </h2>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-[18px] p-[18px] px-5">
              <div className="flex justify-between items-center text-[12.5px] text-[#516459]">
                <span>{occupiedHouseholdsCount > 0 ? '100% current' : '0% assessed (No active residents)'}</span>
                <span>0 households outstanding</span>
              </div>
              <div className="h-2 rounded-full bg-[#E3EFE7] overflow-hidden my-3">
                <div 
                  className="h-full bg-gradient-to-r from-[#3FAE7A] to-[#257A54] rounded-full transition-all"
                  style={{ width: occupiedHouseholdsCount > 0 ? '100%' : '0%' }}
                />
              </div>
              <div className="flex justify-between items-center text-[12.5px] text-[#516459]">
                <span>Billing cycle: Quarterly</span>
                <button
                  type="button"
                  onClick={() => setShowExemptionModal(true)}
                  className="text-[#257A54] font-bold hover:underline cursor-pointer"
                >
                  View exemption list &rarr;
                </button>
              </div>
            </div>
          </section>

          {/* Facility Bookings This Week */}
          <section className="mb-[30px]">
            <div className="flex justify-between items-baseline mb-3">
              <h2 className="font-['Sora',sans-serif] font-bold text-[15.5px] text-[#16241D] tracking-[-0.02em]">
                Facility bookings this week
              </h2>
              <button
                type="button"
                onClick={() => navigate('/facilities')}
                className="text-[12.5px] font-bold text-[#257A54] hover:underline cursor-pointer"
              >
                View all &rarr;
              </button>
            </div>

            {recentBookings.length === 0 ? (
              <div className="bg-white border border-[#E3EFE7] rounded-2xl p-5 text-center">
                <p className="text-xs text-[#8AA096] font-semibold">No facility reservations scheduled for this week.</p>
              </div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 px-4 mb-2.5 flex justify-between items-center gap-2.5">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#16241D] mb-0.5">
                      {b.facility_name}
                    </div>
                    <div className="text-[11.5px] text-[#8AA096]">
                      {b.booking_date} &middot; {b.time_slot} &middot; House {b.house_number}
                    </div>
                  </div>
                  <span className={`text-[10.5px] font-bold py-1 px-2.5 rounded-full whitespace-nowrap ${
                    b.status === 'confirmed' ? 'bg-[#EAF7EE] text-[#257A54]' : 'bg-[#FBF3D9] text-[#B4922C]'
                  }`}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </section>

        </div>
      </div>

      {/* Fixed Floating Bottom Dock */}
      <nav className="fixed bottom-[18px] left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-[14px] border border-white/10 p-2 rounded-full shadow-[0_16px_32px_-14px_rgba(0,0,0,0.4)]" aria-label="Main navigation">
        <button
          type="button"
          onClick={() => setActiveDock('home')}
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors ${
            activeDock === 'home' ? 'bg-white/12 text-[#E8C547]' : 'text-white/55 hover:text-white/80'
          }`}
          aria-label="Home"
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[9px] font-bold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveDock('approvals');
            const elem = document.getElementById('approvals-section');
            elem?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors ${
            activeDock === 'approvals' ? 'bg-white/12 text-[#E8C547]' : 'text-white/55 hover:text-white/80'
          }`}
          aria-label="Approvals"
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[9px] font-bold">Approvals</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveDock('dues');
            setShowExemptionModal(true);
          }}
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors ${
            activeDock === 'dues' ? 'bg-white/12 text-[#E8C547]' : 'text-white/55 hover:text-white/80'
          }`}
          aria-label="Dues"
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
            <line x1="9" y1="8" x2="15" y2="8" />
          </svg>
          <span className="text-[9px] font-bold">Dues</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveDock('logs');
            setShowAllLogsModal(true);
          }}
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors ${
            activeDock === 'logs' ? 'bg-white/12 text-[#E8C547]' : 'text-white/55 hover:text-white/80'
          }`}
          aria-label="Logs"
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span className="text-[9px] font-bold">Logs</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveDock('notices');
            navigate('/notices');
          }}
          className={`w-[50px] h-[46px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors ${
            activeDock === 'notices' ? 'bg-white/12 text-[#E8C547]' : 'text-white/55 hover:text-white/80'
          }`}
          aria-label="Notices"
        >
          <svg className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[9px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Floating Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-[60] select-none touch-none">
        <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="31" stroke="rgba(18,53,40,0.12)" strokeWidth="4" fill="none" />
          <circle
            ref={sosProgressRef}
            cx="35"
            cy="35"
            r="31"
            stroke="#C23A38"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="194.8"
            strokeDashoffset="194.8"
          />
        </svg>

        <button
          type="button"
          onPointerDown={handleSosStart}
          onPointerUp={handleSosCancel}
          onPointerLeave={handleSosCancel}
          onPointerCancel={handleSosCancel}
          className={`absolute top-[7px] left-[7px] w-14 h-14 rounded-full border-0 flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-[0_10px_22px_-8px_rgba(194,58,56,0.65)] transition-all select-none touch-none ${
            sosHolding ? '' : 'animate-[sosBreathe_2.6s_ease-in-out_infinite]'
          } ${
            sosActivated
              ? 'bg-gradient-to-br from-[#FF6E68] to-[#D2413F] animate-[sosPulseFast_0.6s_ease-in-out_3]'
              : 'bg-gradient-to-br from-[#F0645F] to-[#C23A38]'
          }`}
          aria-label="Hold for 5 seconds to send an SOS alert to gate security"
        >
          <svg className="w-[18px] h-[18px] stroke-white fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="#fff" stroke="none" />
          </svg>
          <span className="font-['Sora',sans-serif] text-[8.5px] font-extrabold tracking-[0.06em] text-white">
            SOS
          </span>
        </button>

        {/* SOS confirmation toast */}
        <div
          className={`absolute bottom-[74px] right-0 bg-[#0D2A1F] border border-white/14 text-white text-[12px] font-semibold py-[9px] px-[13px] rounded-xl whitespace-nowrap pointer-events-none transition-all duration-250 ${
            showSosToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
          }`}
        >
          Alert sent to gate security
        </div>
      </div>

      {/* Notice Published Toast */}
      {noticePublishedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0D2A1F] text-white border border-[#3FAE7A]/30 text-[13px] font-bold py-2.5 px-4.5 rounded-full shadow-lg">
          Estate Notice published successfully ✓
        </div>
      )}

      {/* Modal: Post Notice */}
      {showPostNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E3EFE7]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-['Sora',sans-serif] font-bold text-[18px] text-[#16241D]">
                Post Estate Notice
              </h3>
              <button
                type="button"
                onClick={() => setShowPostNoticeModal(false)}
                className="text-[#8AA096] hover:text-[#16241D] cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishNotice} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-wider mb-1">
                  Notice Type
                </label>
                <select
                  value={newNoticeType}
                  onChange={(e) => setNewNoticeType(e.target.value as NoticeType)}
                  className="w-full h-11 border border-[#E3EFE7] rounded-xl px-3 text-[14px] bg-[#FBFDF9]"
                >
                  <option value="info">Info / General Update</option>
                  <option value="emergency">Urgent / Emergency Alert</option>
                  <option value="dues">Dues & Levies</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="madrasa">Madrasa & Religious</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="e.g. Mandatory visitor pass pre-registration"
                  className="w-full h-11 border border-[#E3EFE7] rounded-xl px-3 text-[14px] bg-[#FBFDF9]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea
                  required
                  rows={4}
                  value={newNoticeBody}
                  onChange={(e) => setNewNoticeBody(e.target.value)}
                  placeholder="Details for residents..."
                  className="w-full border border-[#E3EFE7] rounded-xl p-3 text-[14px] bg-[#FBFDF9]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostNoticeModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#E3EFE7] text-[14px] font-bold text-[#516459] cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] text-[14px] font-bold cursor-pointer hover:bg-[#DDB63A]"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exemption List */}
      {showExemptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E3EFE7]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-['Sora',sans-serif] font-bold text-[18px] text-[#16241D]">
                Dues Exemption & Standing
              </h3>
              <button
                type="button"
                onClick={() => setShowExemptionModal(false)}
                className="text-[#8AA096] hover:text-[#16241D] cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-[13px] text-[#516459] mb-4">
              The following households currently have approved temporary waivers or custom payment schedules for Q3 2026:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] flex justify-between items-center text-[12.5px]">
                <div>
                  <span className="font-bold text-[#16241D]">House 12</span> &middot; Main House
                  <div className="text-[11px] text-[#8AA096]">Approved waiver (Solar retrofitting)</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#EAF7EE] text-[#257A54] text-[10.5px] font-bold">Exempt</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] flex justify-between items-center text-[12.5px]">
                <div>
                  <span className="font-bold text-[#16241D]">House 55</span> &middot; Boys' quarters (BQ)
                  <div className="text-[11px] text-[#8AA096]">Payment plan active (Due Sept 15)</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#FBF3D9] text-[#B4922C] text-[10.5px] font-bold">Deferred</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowExemptionModal(false)}
              className="w-full mt-5 py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] text-[14px] font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: Active Alerts & Overstays */}
      {showActiveAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[#E3EFE7]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FCEBEB] text-[#A32D2D] flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h3 className="font-['Sora',sans-serif] font-bold text-[18px] text-[#16241D]">
                    Active Security & Overstay Alerts
                  </h3>
                  <p className="text-[12px] text-[#516459]">
                    Real-time contractor overstay notifications & gate escalations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveAlertsModal(false)}
                className="text-[#8AA096] hover:text-[#16241D] cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="py-8 text-center bg-[#FBFDF9] rounded-2xl border border-[#E3EFE7] my-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-2 text-base font-bold">
                  ✓
                </div>
                <h4 className="font-['Sora'] font-bold text-sm text-[#16241D]">All Clear</h4>
                <p className="text-xs text-[#516459] mt-0.5">No unresolved contractor overstays or security alerts</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-[#F0938F] text-[12.5px] relative">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="font-bold text-[#A32D2D] font-['Sora'] text-xs uppercase tracking-wider">
                          {alert.title}
                        </span>
                        <div className="font-semibold text-[#16241D] mt-0.5">
                          {alert.message}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#A32D2D] text-white">
                        {alert.severity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#516459] pt-2 border-t border-[#F0938F]/30 mt-2">
                      <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        type="button"
                        onClick={() => {
                          dismissAlert(alert.id);
                          setAlerts(getAlertsForUser('admin'));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E3EFE7] text-[11px] font-bold text-[#516459] hover:bg-gray-50"
                      >
                        Acknowledge & Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowActiveAlertsModal(false)}
              className="w-full mt-5 py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] text-[14px] font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: Full Audit Logs */}
      {showAllLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[#E3EFE7]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-['Sora',sans-serif] font-bold text-[18px] text-[#16241D]">
                Gate Audit Logs (All Gates)
              </h3>
              <button
                type="button"
                onClick={() => setShowAllLogsModal(false)}
                className="text-[#8AA096] hover:text-[#16241D] cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            {accessLogs.length === 0 ? (
              <div className="py-8 text-center bg-[#FBFDF9] rounded-2xl border border-[#E3EFE7] my-3">
                <p className="text-xs text-[#8AA096] font-semibold">No gate access logs recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {accessLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] flex justify-between items-center text-[12.5px]">
                    <div>
                      <span className="font-bold text-[#16241D]">{log.house_info || 'Estate Gate'}</span> &middot; {log.direction.toUpperCase()}
                      <div className="text-[11px] text-[#8AA096]">{log.visitor_name} &middot; Guard {log.guard_name}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EAF7EE] text-[#257A54]">
                      Logged
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAllLogsModal(false)}
              className="w-full mt-5 py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] text-[14px] font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
