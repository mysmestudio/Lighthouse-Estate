import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MessageSquare, 
  Share2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Phone, 
  MapPin, 
  Lock, 
  Search, 
  Plus, 
  X, 
  Bell, 
  AlertTriangle 
} from 'lucide-react';
import { 
  AppUser, 
  StaffKYC, 
  StaffInviteCode, 
  StaffRole, 
  StaffSchedule, 
  EmployerRemark 
} from '../types';
import { 
  getStoredStaffKYC, 
  createStaffInvite, 
  approveStaff, 
  rejectStaff, 
  updateStaffSchedule, 
  appendEmployerRemark, 
  markStaffOffDuty, 
  setStaffActive,
  getStoredInviteCodes
} from '../lib/staff-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface HouseholdHubPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STAFF_ROLES: StaffRole[] = ['Cook', 'Cleaner', 'Driver', 'Gardener', 'Nanny', 'Security Guard', 'Housekeeper', 'Other'];
const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const HouseholdHubPage: React.FC<HouseholdHubPageProps> = ({ currentUser, navigate }) => {
  const employerId = currentUser?.id || 'user-res-1';
  const employerName = currentUser?.full_name || 'Dr. Tariq Al-Mansoor';

  // Data States
  const [staffList, setStaffList] = useState<StaffKYC[]>([]);
  const [inviteCodes, setInviteCodes] = useState<StaffInviteCode[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'off_duty'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInviteGenerated, setNewInviteGenerated] = useState<StaffInviteCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Schedule Modal
  const [scheduleModalStaff, setScheduleModalStaff] = useState<StaffKYC | null>(null);
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('17:00');

  // Remark State
  const [remarkInputs, setRemarkInputs] = useState<{ [key: string]: string }>({});
  const [remarkLoading, setRemarkLoading] = useState<{ [key: string]: boolean }>({});

  // Invite Form State
  const [inviteRole, setInviteRole] = useState<StaffRole>('Cook');
  const [inviteDays, setInviteDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [inviteStartTime, setInviteStartTime] = useState('08:00');
  const [inviteEndTime, setInviteEndTime] = useState('17:00');

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshData = () => {
    const allStaff = getStoredStaffKYC();
    const myStaff = allStaff.filter(
      (s) =>
        s.employer_id === employerId ||
        s.employer_house_number === (currentUser?.house_number || 14)
    );
    setStaffList(myStaff.length > 0 ? myStaff : allStaff.slice(0, 3));

    const allInvites = getStoredInviteCodes();
    const myInvites = allInvites.filter(
      (i) =>
        i.employer_id === employerId ||
        i.employer_house_number === (currentUser?.house_number || 14)
    );
    setInviteCodes(myInvites);
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  // Counts
  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const pendingCount = staffList.filter((s) => s.status === 'pending').length;
  const offDutyCount = staffList.filter((s) => s.status === 'off_duty').length;

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const res = await createStaffInvite({
      employer: currentUser,
      role: inviteRole,
      workLocation: `House ${currentUser?.house_number || 14} (${currentUser?.house_unit || 'Main House'})`,
      schedule: {
        days: inviteDays,
        startTime: inviteStartTime,
        endTime: inviteEndTime,
      },
    });

    if (res.success && res.invite) {
      setNewInviteGenerated(res.invite);
      refreshData();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleApprove = async (staffId: string) => {
    const res = await approveStaff(staffId, employerName);
    if (res.success) refreshData();
  };

  const handleToggleDutyStatus = async (staff: StaffKYC) => {
    if (staff.status === 'active') {
      const res = await markStaffOffDuty(staff.id, employerName);
      if (res.success) refreshData();
    } else if (staff.status === 'off_duty') {
      const res = await setStaffActive(staff.id, employerName);
      if (res.success) refreshData();
    }
  };

  const handleAddRemark = async (staffId: string) => {
    const text = remarkInputs[staffId];
    if (!text || !text.trim()) return;

    setRemarkLoading((prev) => ({ ...prev, [staffId]: true }));
    try {
      const res = await appendEmployerRemark(staffId, text, employerName);
      if (res.success) {
        setRemarkInputs((prev) => ({ ...prev, [staffId]: '' }));
        refreshData();
      }
    } finally {
      setRemarkLoading((prev) => ({ ...prev, [staffId]: false }));
    }
  };

  // SOS Press & Hold
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

  const filteredStaff = staffList.filter((s) => {
    if (activeTab !== 'all' && s.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    }
    return true;
  });

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
          <pattern id="lattice-staff" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Top Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <div className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident'
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : 'Household Staff'}
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
          <rect width="100%" height="100%" fill="url(#lattice-staff)" />
        </svg>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Sora'] font-bold text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                Household Staff &amp; KYC
              </h1>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Generate 6-digit staff invite codes, verify domestic profiles, review ID documents, and manage gate PIN access.
              </p>
            </div>
            <button
              onClick={() => {
                setNewInviteGenerated(null);
                setShowInviteModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all shrink-0 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff</span>
            </button>
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
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Active Staff</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 text-center shadow-xs">
              <div className="font-['Sora'] font-extrabold text-xl text-[#B4922C]">{pendingCount}</div>
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Pending KYC</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-3.5 text-center shadow-xs">
              <div className="font-['Sora'] font-extrabold text-xl text-[#516459]">{offDutyCount}</div>
              <div className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider mt-0.5">Off Duty</div>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 bg-[#EAF7EE] p-1 rounded-xl border border-[#3FAE7A]/20 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'all' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'active' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'pending' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA096]" />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 bg-white border border-[#E3EFE7] rounded-xl text-xs text-[#16241D] placeholder-[#8AA096] focus:outline-none focus:border-[#3FAE7A]"
              />
            </div>
          </div>

          {/* Staff Cards List */}
          <div className="space-y-4">
            {filteredStaff.length === 0 ? (
              <div className="bg-white border border-[#E3EFE7] rounded-2xl p-10 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">No staff members found</h3>
                <p className="text-xs text-[#516459] max-w-sm mx-auto">
                  You have not registered any domestic staff for your household. Send an invite code to begin.
                </p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Generate Invite Code</span>
                </button>
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isExpanded = expandedStaffId === staff.id;
                return (
                  <div
                    key={staff.id}
                    className="bg-white border border-[#E3EFE7] rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#3FAE7A]/40"
                  >
                    {/* Main Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#FBF3D9] text-[#B4922C] flex items-center justify-center font-['Sora'] font-bold text-base shrink-0">
                          {staff.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">
                              {staff.full_name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-[#EAF7EE] text-[#257A54] text-[10.5px] font-['Sora'] font-bold">
                              {staff.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#8AA096] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#257A54]" />
                              {staff.phone}
                            </span>
                            <span>&middot;</span>
                            <span>Gate PIN: ••••</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                          staff.status === 'active'
                            ? 'bg-[#EAF7EE] text-[#257A54]'
                            : staff.status === 'pending'
                            ? 'bg-[#FBF3D9] text-[#B4922C]'
                            : 'bg-[#FCEBEB] text-[#A32D2D]'
                        }`}>
                          {staff.status === 'off_duty' ? 'Off Duty' : staff.status}
                        </span>
                        <button
                          onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                          className="w-8 h-8 rounded-lg bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459]"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Schedule Snippet */}
                    <div className="mt-3.5 pt-3 border-t border-[#E3EFE7] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#516459]">
                        <Clock className="w-3.5 h-3.5 text-[#257A54]" />
                        <span className="font-semibold">{staff.schedule.startTime} - {staff.schedule.endTime}</span>
                        <span className="text-[#8AA096]">({staff.schedule.days.join(', ')})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {staff.status === 'pending' ? (
                          <button
                            onClick={() => handleApprove(staff.id)}
                            className="px-3 py-1 rounded-lg bg-[#257A54] text-white font-bold text-xs hover:bg-[#1e6143]"
                          >
                            Approve KYC
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleDutyStatus(staff)}
                            className="px-2.5 py-1 rounded-lg border border-[#E3EFE7] text-[#516459] font-bold text-xs hover:bg-[#FBFDF9]"
                          >
                            {staff.status === 'active' ? 'Set Off Duty' : 'Set Active'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded KYC Details & Remark Logger */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#E3EFE7] space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FBFDF9] p-3.5 rounded-xl border border-[#E3EFE7]">
                          <div>
                            <span className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider block mb-0.5">National ID (NIN)</span>
                            <span className="font-mono font-bold text-[#16241D]">{staff.nin_masked || '*******4810'}</span>
                          </div>
                          <div>
                            <span className="text-[10.5px] font-bold text-[#8AA096] uppercase tracking-wider block mb-0.5">Guarantor / Kin</span>
                            <span className="font-semibold text-[#16241D]">{staff.next_of_kin?.name} ({staff.next_of_kin?.phone})</span>
                          </div>
                        </div>

                        {/* Employer Remark Logger */}
                        <div>
                          <div className="text-[11px] font-bold text-[#16241D] uppercase tracking-wider mb-2">
                            Employer Remarks &amp; Log
                          </div>
                          {staff.employer_remarks && staff.employer_remarks.length > 0 ? (
                            <div className="space-y-1.5 mb-2">
                              {staff.employer_remarks.map((r) => (
                                <div key={r.id} className="p-2 rounded-lg bg-[#FBFDF9] border border-[#E3EFE7] text-xs">
                                  <div className="flex justify-between text-[10.5px] text-[#8AA096] mb-0.5">
                                    <span className="font-bold">{r.author_name}</span>
                                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-[#16241D]">{r.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11.5px] text-[#8AA096] italic mb-2">No remarks logged yet.</p>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add an immutable observation or remark..."
                              value={remarkInputs[staff.id] || ''}
                              onChange={(e) => setRemarkInputs({ ...remarkInputs, [staff.id]: e.target.value })}
                              className="flex-1 h-8 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-lg text-xs"
                            />
                            <button
                              onClick={() => handleAddRemark(staff.id)}
                              disabled={remarkLoading[staff.id]}
                              className="px-3 h-8 bg-[#257A54] text-white font-bold rounded-lg hover:bg-[#1e6143]"
                            >
                              Log
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

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
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
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
          className="w-12 h-11 border-none bg-white/12 text-[#E8C547] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
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

      {/* INVITE STAFF MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="font-['Sora'] font-bold text-[10.5px] uppercase tracking-wider text-[#257A54]">
                Staff KYC
              </span>
              <h2 className="font-['Sora'] font-bold text-xl text-[#16241D] mt-0.5">
                Generate Invite Code
              </h2>
              <p className="text-xs text-[#516459]">
                Share this secure code with your domestic employee to complete onboarding.
              </p>
            </div>

            {newInviteGenerated ? (
              <div className="space-y-4">
                <div className="bg-[#EAF7EE] border border-[#3FAE7A]/30 rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#3FAE7A] text-white flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">Invite Code Ready</h3>
                  <p className="text-xs text-[#257A54] mt-0.5">Role: {newInviteGenerated.role}</p>

                  <div className="font-['Sora'] font-extrabold text-3xl text-[#257A54] tracking-widest my-3 font-mono">
                    {newInviteGenerated.code}
                  </div>

                  <button
                    onClick={() => handleCopyCode(newInviteGenerated.code)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E3EFE7] text-xs font-bold text-[#16241D] shadow-2xs mx-auto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setNewInviteGenerated(null);
                    setShowInviteModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateInvite} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Role Title *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={inviteStartTime}
                      onChange={(e) => setInviteStartTime(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={inviteEndTime}
                      onChange={(e) => setInviteEndTime(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-['Sora'] font-bold text-sm hover:bg-[#DDB63A] active:scale-98 transition-all mt-2"
                >
                  Generate Invite Code
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
