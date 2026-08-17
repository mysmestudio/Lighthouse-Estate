import React, { useState, useEffect } from 'react';
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
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Phone, 
  MapPin, 
  History, 
  Lock, 
  Eye, 
  Sparkles,
  AlertTriangle,
  Send,
  Edit3,
  PowerOff,
  Search,
  Filter,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  AppUser, 
  StaffKYC, 
  StaffInviteCode, 
  StaffRole, 
  StaffSchedule, 
  EmployerRemark, 
  StaffChangeHistoryItem 
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
  isStaffScheduledToday,
  isStaffOnDutyNow,
  getStoredInviteCodes
} from '../lib/staff-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface HouseholdHubPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STAFF_ROLES: StaffRole[] = ['Cleaner', 'Driver', 'Nanny', 'Gardener', 'Cook', 'Security Guard', 'Housekeeper', 'Other'];

export const HouseholdHubPage: React.FC<HouseholdHubPageProps> = ({ currentUser, navigate }) => {
  const employerId = currentUser?.id || 'user-res-1';
  const employerName = currentUser?.full_name || 'Dr. Tariq Al-Mansoor';

  // Data States
  const [staffList, setStaffList] = useState<StaffKYC[]>([]);
  const [inviteCodes, setInviteCodes] = useState<StaffInviteCode[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'off_duty' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInviteGenerated, setNewInviteGenerated] = useState<StaffInviteCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const [scheduleModalStaff, setScheduleModalStaff] = useState<StaffKYC | null>(null);
  const [historyModalStaff, setHistoryModalStaff] = useState<StaffKYC | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<{ title: string; url: string } | null>(null);
  const [rejectModalStaff, setRejectModalStaff] = useState<StaffKYC | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Remark Input state by staff id
  const [remarkInputs, setRemarkInputs] = useState<{ [key: string]: string }>({});
  const [remarkLoading, setRemarkLoading] = useState<{ [key: string]: boolean }>({});

  // Invite Form State
  const [inviteRole, setInviteRole] = useState<StaffRole>('Cleaner');
  const [inviteLocation, setInviteLocation] = useState(
    currentUser ? `House ${currentUser.house_number} (${currentUser.house_unit})` : 'House 14 (Main House)'
  );
  const [inviteDays, setInviteDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [inviteStartTime, setInviteStartTime] = useState('08:00');
  const [inviteEndTime, setInviteEndTime] = useState('17:00');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Schedule Edit Modal State
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('17:00');

  // Load Data
  const refreshData = () => {
    const all = getStoredStaffKYC();
    const myStaff = all.filter((s) => s.employer_id === employerId || s.employer_id === 'user-res-1');
    setStaffList(myStaff);

    const allInvites = getStoredInviteCodes();
    const myInvites = allInvites.filter((i) => i.employer_id === employerId || i.employer_id === 'user-res-1');
    setInviteCodes(myInvites);
  };

  useEffect(() => {
    refreshData();
  }, [employerId]);

  // Handle Invite Form Submission
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteDays.length === 0) {
      alert('Please select at least one working day for the weekly schedule.');
      return;
    }

    setSubmittingInvite(true);
    try {
      const activeEmployer: AppUser = currentUser || {
        id: 'user-res-1',
        auth_user_id: 'auth-res-1',
        role: 'resident',
        full_name: 'Dr. Tariq Al-Mansoor',
        phone: '+234 803 123 4567',
        email: 'tariq.mansoor@example.com',
        house_number: 14,
        house_unit: 'Main House',
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const result = await createStaffInvite({
        employer: activeEmployer,
        role: inviteRole,
        workLocation: inviteLocation,
        schedule: {
          days: inviteDays,
          startTime: inviteStartTime,
          endTime: inviteEndTime,
        },
      });

      if (result.success && result.invite) {
        setNewInviteGenerated(result.invite);
        refreshData();
      } else {
        alert(result.error || 'Failed to create staff invite code.');
      }
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Quick Preset Handlers
  const handlePresetDays = (type: 'weekdays' | 'all' | 'weekend') => {
    if (type === 'weekdays') setInviteDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    if (type === 'all') setInviteDays(ALL_DAYS);
    if (type === 'weekend') setInviteDays(['Saturday', 'Sunday']);
  };

  const handleEditPresetDays = (type: 'weekdays' | 'all' | 'weekend') => {
    if (type === 'weekdays') setEditDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    if (type === 'all') setEditDays(ALL_DAYS);
    if (type === 'weekend') setEditDays(['Saturday', 'Sunday']);
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = (invite: StaffInviteCode) => {
    const origin = window.location.origin;
    const link = `${origin}/staff-onboarding?code=${invite.code}`;
    const scheduleStr = `${invite.schedule.days.join(', ')} (${invite.schedule.startTime} - ${invite.schedule.endTime})`;

    return (
      `*Lighthouse Estate — Domestic Staff Onboarding Invitation*\n\n` +
      `Hello, you have been invited by *${employerName}* (${invite.work_location}) to complete your domestic staff identity verification as *${invite.role}*.\n\n` +
      `🕒 *Weekly Schedule:* ${scheduleStr}\n` +
      `🔑 *One-Time Invite Code:* *${invite.code}*\n` +
      `⏳ *Validity:* 7 Days\n\n` +
      `Please open the link below to complete your KYC onboarding and set your gate access PIN:\n` +
      `${link}\n\n` +
      `_Lighthouse Estate Automated Access Control_`
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  // Approval / Rejection Handlers
  const handleApprove = async (staffId: string) => {
    const res = await approveStaff(staffId, employerName);
    if (res.success) {
      refreshData();
    } else {
      alert(res.error || 'Approval failed.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalStaff) return;
    const res = await rejectStaff(rejectModalStaff.id, employerName, rejectReason);
    if (res.success) {
      setRejectModalStaff(null);
      setRejectReason('');
      refreshData();
    } else {
      alert(res.error || 'Rejection failed.');
    }
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

  // Append Remark Handler (Append-only)
  const handleAddRemark = async (staffId: string) => {
    const text = remarkInputs[staffId];
    if (!text || !text.trim()) return;

    setRemarkLoading((prev) => ({ ...prev, [staffId]: true }));
    try {
      const res = await appendEmployerRemark(staffId, text, employerName);
      if (res.success) {
        setRemarkInputs((prev) => ({ ...prev, [staffId]: '' }));
        refreshData();
      } else {
        alert(res.error || 'Failed to append remark.');
      }
    } finally {
      setRemarkLoading((prev) => ({ ...prev, [staffId]: false }));
    }
  };

  // Open Edit Schedule Modal
  const openEditSchedule = (staff: StaffKYC) => {
    setScheduleModalStaff(staff);
    setEditDays(staff.schedule.days);
    setEditStartTime(staff.schedule.startTime);
    setEditEndTime(staff.schedule.endTime);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalStaff) return;
    if (editDays.length === 0) {
      alert('Please select at least one working day.');
      return;
    }

    const res = await updateStaffSchedule(
      scheduleModalStaff.id,
      {
        days: editDays,
        startTime: editStartTime,
        endTime: editEndTime,
      },
      employerName
    );

    if (res.success) {
      setScheduleModalStaff(null);
      refreshData();
    } else {
      alert(res.error || 'Failed to update schedule.');
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    if (activeTab !== 'all' && s.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchRole = s.role.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      const matchLoc = s.work_location.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchPhone && !matchLoc) return false;
    }
    return true;
  });

  const pendingCount = staffList.filter((s) => s.status === 'pending').length;
  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const offDutyCount = staffList.filter((s) => s.status === 'off_duty').length;
  const rejectedCount = staffList.filter((s) => s.status === 'rejected').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-[#0A2F1C] text-white rounded-3xl p-6 sm:p-10 border border-[#C89B3C]/40 shadow-xl relative overflow-hidden">
        {/* Background glow & star motif */}
        <div className="absolute right-[-30px] top-[-30px] opacity-10 text-[#C89B3C] pointer-events-none">
          <svg width="220" height="220" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#E7D19C]/20 text-[#E7D19C] border border-[#C89B3C]/40">
                Resident Domestic Portal
              </span>
              <span className="text-[11px] text-[#E7D19C]/80 font-medium">
                House {currentUser?.house_number || 14} ({currentUser?.house_unit || 'Main House'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#FBF8F1] tracking-tight">
              Household Hub & Staff KYC
            </h1>
            <p className="text-sm text-[#E7D19C]/80 mt-2 max-w-2xl leading-relaxed">
              Issue 6-digit onboarding invites, review encrypted national identity credentials, maintain append-only remark logs, and manage work duty schedules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setNewInviteGenerated(null);
                setShowInviteModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-[#C89B3C] hover:bg-[#b58b34] text-[#0A2F1C] font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <UserPlus className="w-4 h-4 text-[#0A2F1C]" />
              <span>Invite New Staff</span>
            </button>

            <button
              onClick={() => navigate('/directory')}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-[#FBF8F1] font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-[#E7D19C]" />
              <span>Global Directory</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-[#C89B3C]/20">
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-[#E7D19C]/80 font-medium">Active Staff</div>
            <div className="text-2xl font-serif font-bold text-[#FBF8F1] mt-0.5">{activeCount}</div>
          </div>
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-amber-300 font-medium">Pending Review</div>
            <div className="text-2xl font-serif font-bold text-amber-300 mt-0.5">{pendingCount}</div>
          </div>
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-slate-300 font-medium">Off Duty (Leave)</div>
            <div className="text-2xl font-serif font-bold text-slate-200 mt-0.5">{offDutyCount}</div>
          </div>
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-[#E7D19C]/80 font-medium">Active Invite Codes</div>
            <div className="text-2xl font-serif font-bold text-[#E7D19C] mt-0.5">
              {inviteCodes.filter((i) => !i.used && new Date(i.expires_at).getTime() > Date.now()).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Household Staff Management Section */}
      <div className="bg-white rounded-3xl border border-[#E4D9BE] shadow-soft overflow-hidden">
        {/* Filter Bar & Tabs */}
        <div className="p-4 sm:p-6 border-b border-[#E4D9BE] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#FAF7EE]">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-[#0F472A] text-white shadow-2xs'
                  : 'bg-white text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span>All Staff</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {staffList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span>Pending Approval</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('off_duty')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                activeTab === 'off_duty'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-white text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span>Off Duty</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {offDutyCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                activeTab === 'rejected'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {rejectedCount}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#10241A]/40" />
            <input
              type="text"
              placeholder="Search by name, role or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:outline-none focus:ring-2 focus:ring-[#0F472A]"
            />
          </div>
        </div>

        {/* Staff List / Rows */}
        <div className="divide-y divide-[#E4D9BE]">
          {filteredStaff.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F2EAD9] text-[#0F472A] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#0A2F1C]">No domestic staff records found</h3>
              <p className="text-xs text-[#10241A]/60 max-w-sm mx-auto">
                {activeTab !== 'all'
                  ? `There are currently no staff members in the "${activeTab}" category.`
                  : 'You have not onboarded any domestic staff yet. Click "Invite New Staff" to generate a 6-digit code.'}
              </p>
              {activeTab === 'all' && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold shadow-2xs hover:bg-[#0A2F1C]"
                >
                  Generate First Invite
                </button>
              )}
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const isExpanded = expandedStaffId === staff.id;
              const scheduledToday = isStaffScheduledToday(staff.schedule);
              const onDutyNow = isStaffOnDutyNow(staff.schedule);

              return (
                <div key={staff.id} className="transition-colors hover:bg-[#FAF7EE]/50">
                  {/* Collapsed Header Bar */}
                  <div
                    onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Photo / Avatar */}
                      <div className="relative">
                        <img
                          src={staff.documents.passport_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                          alt={staff.full_name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-[#E4D9BE] shadow-2xs"
                        />
                        {staff.status === 'active' && onDutyNow && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="On Duty Right Now" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-base sm:text-lg text-[#0A2F1C]">
                            {staff.full_name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F2EAD9] text-[#0F472A] border border-[#E4D9BE]">
                            {staff.role}
                          </span>
                          {staff.status === 'pending' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {staff.status === 'active' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Active</span>
                            </span>
                          )}
                          {staff.status === 'off_duty' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <PowerOff className="w-2.5 h-2.5 text-slate-500" />
                              <span>Off Duty</span>
                            </span>
                          )}
                          {staff.status === 'rejected' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#10241A]/70 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#C89B3C]" />
                            <span>{staff.phone}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#C89B3C]" />
                            <span>{staff.work_location}</span>
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-[#FAF7EE] px-1.5 py-0.5 rounded border border-[#E4D9BE]">
                            <Lock className="w-2.5 h-2.5 text-emerald-700" />
                            <span>NIN: {staff.nin_masked}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Snippet & Expand Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E4D9BE]">
                      <div className="text-left sm:text-right text-xs">
                        <div className="font-semibold text-[#0A2F1C] flex items-center gap-1 sm:justify-end">
                          <Clock className="w-3 h-3 text-[#C89B3C]" />
                          <span>{staff.schedule.startTime} - {staff.schedule.endTime}</span>
                        </div>
                        <div className="text-[11px] text-[#10241A]/60">
                          {scheduledToday ? (
                            <span className="text-emerald-700 font-semibold">Scheduled Today</span>
                          ) : (
                            <span>{staff.schedule.days.length} days/week</span>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE] flex items-center justify-center text-[#0A2F1C]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="p-5 sm:p-7 bg-[#FAF7EE] border-t border-[#E4D9BE] space-y-6 animate-in fade-in duration-200">
                      {/* Top Action Bar for Pending or Status Changes */}
                      <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] shadow-2xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0A2F1C]">Status Actions:</span>
                          {staff.status === 'pending' && (
                            <span className="text-xs text-amber-700">Awaiting your approval to activate gate pass</span>
                          )}
                          {staff.status === 'active' && (
                            <span className="text-xs text-emerald-700">Currently authorized for estate gatehouse clearance</span>
                          )}
                          {staff.status === 'off_duty' && (
                            <span className="text-xs text-slate-600">Access temporarily paused. Click "Restore Active" when ready.</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {staff.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(staff.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve Staff</span>
                              </button>
                              <button
                                onClick={() => setRejectModalStaff(staff)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {staff.status === 'active' && (
                            <button
                              onClick={() => handleToggleDutyStatus(staff)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
                            >
                              <PowerOff className="w-3 h-3 text-slate-600" />
                              <span>Mark Off Duty</span>
                            </button>
                          )}

                          {staff.status === 'off_duty' && (
                            <button
                              onClick={() => handleToggleDutyStatus(staff)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Restore to Active Duty</span>
                            </button>
                          )}

                          <button
                            onClick={() => openEditSchedule(staff)}
                            className="px-3 py-1.5 rounded-xl bg-[#F2EAD9] hover:bg-[#e8dec7] text-[#0A2F1C] font-bold text-xs border border-[#C89B3C]/40 transition-colors flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3 h-3 text-[#C89B3C]" />
                            <span>Edit Schedule</span>
                          </button>

                          <button
                            onClick={() => setHistoryModalStaff(staff)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2EAD9] text-[#10241A]/80 font-bold text-xs border border-[#E4D9BE] transition-colors flex items-center gap-1.5"
                          >
                            <History className="w-3 h-3 text-[#0F472A]" />
                            <span>Change History</span>
                          </button>
                        </div>
                      </div>

                      {/* 3-Column KYC Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Identity & Personal Details */}
                        <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] space-y-3">
                          <div className="flex items-center gap-2 border-b border-[#E4D9BE] pb-2 text-xs font-bold text-[#0A2F1C]">
                            <ShieldCheck className="w-4 h-4 text-[#0F472A]" />
                            <span>Identity Verification (KYC)</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Date of Birth:</span>
                              <span className="font-medium text-[#10241A]">{staff.dob || '1994-06-15'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Gender:</span>
                              <span className="font-medium text-[#10241A]">{staff.gender}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#10241A]/60">National ID (NIN):</span>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {staff.nin_masked}
                              </span>
                            </div>
                            <div className="pt-1">
                              <span className="text-[#10241A]/60 block mb-0.5">Residential Address:</span>
                              <p className="text-[11px] text-[#10241A] bg-[#FAF7EE] p-2 rounded-lg border border-[#E4D9BE]/60">
                                {staff.home_address}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 2. Next of Kin & Emergency */}
                        <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] space-y-3">
                          <div className="flex items-center gap-2 border-b border-[#E4D9BE] pb-2 text-xs font-bold text-[#0A2F1C]">
                            <Phone className="w-4 h-4 text-[#C89B3C]" />
                            <span>Next of Kin / Guarantor</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Full Name:</span>
                              <span className="font-bold text-[#0A2F1C]">{staff.next_of_kin.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Relationship:</span>
                              <span className="font-medium text-[#10241A]">{staff.next_of_kin.relationship}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Contact Phone:</span>
                              <a
                                href={`tel:${staff.next_of_kin.phone}`}
                                className="font-semibold text-[#0F472A] hover:underline flex items-center gap-1"
                              >
                                <span>{staff.next_of_kin.phone}</span>
                              </a>
                            </div>
                            <div className="mt-3 p-2 rounded-lg bg-[#FAF7EE] border border-[#E4D9BE]/60 text-[11px] text-[#10241A]/70 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#C89B3C] shrink-0" />
                              <span>Guarantor verified during onboarding.</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Work Schedule & Gate Timing */}
                        <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                              <Calendar className="w-4 h-4 text-[#0F472A]" />
                              <span>Weekly Duty Schedule</span>
                            </div>
                            <button
                              onClick={() => openEditSchedule(staff)}
                              className="text-[11px] text-[#C89B3C] hover:underline font-bold"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#10241A]/60">Shift Hours:</span>
                              <span className="font-bold text-[#0A2F1C]">
                                {staff.schedule.startTime} – {staff.schedule.endTime}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#10241A]/60 block mb-1.5">Authorized Days:</span>
                              <div className="flex flex-wrap gap-1">
                                {ALL_DAYS.map((day) => {
                                  const active = staff.schedule.days.includes(day);
                                  return (
                                    <span
                                      key={day}
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        active
                                          ? 'bg-[#0F472A] text-white'
                                          : 'bg-gray-100 text-gray-400'
                                      }`}
                                    >
                                      {day.slice(0, 3)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Verification Gallery */}
                      <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                            <FileText className="w-4 h-4 text-[#0F472A]" />
                            <span>Uploaded KYC Documents (Supabase Storage: staff-documents)</span>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            RLS Restricted: Employer & Admins
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {/* 1. Passport Photo */}
                          <div
                            onClick={() =>
                              setPreviewDocUrl({
                                title: `${staff.full_name} — Passport Photograph`,
                                url: staff.documents.passport_photo_url,
                              })
                            }
                            className="group p-3 rounded-xl border border-[#E4D9BE] bg-[#FAF7EE] hover:bg-[#F2EAD9] transition-all cursor-pointer flex items-center gap-3"
                          >
                            <img
                              src={staff.documents.passport_photo_url}
                              alt="Passport"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover border border-[#E4D9BE]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[#0A2F1C] truncate">Passport Photo</div>
                              <div className="text-[10px] text-[#10241A]/60 flex items-center gap-1 mt-0.5">
                                <Eye className="w-3 h-3 text-[#0F472A]" />
                                <span>Click to inspect</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. National ID / NIN Slip */}
                          <div
                            onClick={() =>
                              setPreviewDocUrl({
                                title: `${staff.full_name} — National ID / NIN Slip`,
                                url: staff.documents.national_id_url,
                              })
                            }
                            className="group p-3 rounded-xl border border-[#E4D9BE] bg-[#FAF7EE] hover:bg-[#F2EAD9] transition-all cursor-pointer flex items-center gap-3"
                          >
                            <img
                              src={staff.documents.national_id_url}
                              alt="National ID"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover border border-[#E4D9BE]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[#0A2F1C] truncate">National ID / NIN</div>
                              <div className="text-[10px] text-[#10241A]/60 flex items-center gap-1 mt-0.5">
                                <Eye className="w-3 h-3 text-[#0F472A]" />
                                <span>Click to inspect</span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Guarantor ID */}
                          <div
                            onClick={() =>
                              setPreviewDocUrl({
                                title: `${staff.full_name} — Guarantor ID Document`,
                                url: staff.documents.guarantor_id_url,
                              })
                            }
                            className="group p-3 rounded-xl border border-[#E4D9BE] bg-[#FAF7EE] hover:bg-[#F2EAD9] transition-all cursor-pointer flex items-center gap-3"
                          >
                            <img
                              src={staff.documents.guarantor_id_url}
                              alt="Guarantor ID"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover border border-[#E4D9BE]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[#0A2F1C] truncate">Guarantor ID Photo</div>
                              <div className="text-[10px] text-[#10241A]/60 flex items-center gap-1 mt-0.5">
                                <Eye className="w-3 h-3 text-[#0F472A]" />
                                <span>Click to inspect</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Employer Remarks Section (Append-Only Log) */}
                      <div className="p-5 rounded-2xl bg-white border border-[#E4D9BE] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                            <MessageSquare className="w-4 h-4 text-[#C89B3C]" />
                            <span>Employer Remarks & Incident Notes (Append-Only Log)</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#10241A]/50">
                            Immutable audit trail
                          </span>
                        </div>

                        {/* List of past remarks */}
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {staff.employer_remarks.length === 0 ? (
                            <p className="text-xs text-[#10241A]/50 italic py-2">
                              No remarks logged yet. You can append notes regarding conduct, special duties, or leave records below.
                            </p>
                          ) : (
                            staff.employer_remarks.map((rem) => (
                              <div
                                key={rem.id}
                                className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE]/70 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px] text-[#10241A]/60">
                                  <span className="font-bold text-[#0A2F1C]">{rem.author_name}</span>
                                  <span>{new Date(rem.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-[#10241A] text-xs leading-relaxed">{rem.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Remark Form */}
                        <div className="pt-2 flex gap-2">
                          <input
                            type="text"
                            placeholder="Add timestamped remark or conduct note..."
                            value={remarkInputs[staff.id] || ''}
                            onChange={(e) =>
                              setRemarkInputs((prev) => ({ ...prev, [staff.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddRemark(staff.id);
                            }}
                            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#FAF7EE] border border-[#E4D9BE] focus:outline-none focus:ring-2 focus:ring-[#0F472A]"
                          />
                          <button
                            onClick={() => handleAddRemark(staff.id)}
                            disabled={remarkLoading[staff.id] || !remarkInputs[staff.id]?.trim()}
                            className="px-4 py-2 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3 text-[#E7D19C]" />
                            <span>{remarkLoading[staff.id] ? 'Logging...' : 'Log Note'}</span>
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

      {/* MODAL: Invite Staff Form & WhatsApp Generator */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0A2F1C] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F472A] border border-[#C89B3C]/50 flex items-center justify-center text-[#E7D19C]">
                  <UserPlus className="w-5 h-5 text-[#E7D19C]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C89B3C]">
                    Domestic Staff Pass
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#FBF8F1]">
                    {newInviteGenerated ? 'Invite Generated Successfully' : 'Create Staff Onboarding Invite'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setNewInviteGenerated(null);
                }}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {newInviteGenerated ? (
                /* Generated Invite View + WhatsApp Share */
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif text-lg font-bold text-emerald-900">
                      One-Time Invite Code Created
                    </h4>
                    <p className="text-xs text-emerald-800 max-w-sm mx-auto leading-relaxed">
                      Share this 6-digit code with your prospective staff member. They will enter it at the onboarding portal to complete their identity verification.
                    </p>

                    {/* Big 6-Digit Display */}
                    <div className="py-4 my-2">
                      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border-2 border-emerald-500 shadow-md">
                        <span className="font-mono text-3xl sm:text-4xl font-black text-[#0A2F1C] tracking-widest">
                          {newInviteGenerated.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(newInviteGenerated.code)}
                          className="p-2 rounded-xl bg-[#F2EAD9] hover:bg-[#e4d9be] text-[#0A2F1C] transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="text-[11px] text-[#10241A]/60 mt-1.5">
                        Valid for 7 days (Expires {new Date(newInviteGenerated.expires_at).toLocaleDateString()})
                      </div>
                    </div>
                  </div>

                  {/* Shareable WhatsApp Message Box */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E4D9BE] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                        <Share2 className="w-4 h-4 text-emerald-600" />
                        <span>Pre-formatted WhatsApp Invitation</span>
                      </div>
                      <button
                        onClick={() => handleCopyMessage(generateWhatsAppMessage(newInviteGenerated))}
                        className="text-xs font-bold text-[#0F472A] hover:underline flex items-center gap-1"
                      >
                        {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMsg ? 'Copied' : 'Copy Message'}</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE] font-sans text-xs text-[#10241A] whitespace-pre-wrap leading-relaxed">
                      {generateWhatsAppMessage(newInviteGenerated)}
                    </div>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        generateWhatsAppMessage(newInviteGenerated)
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Directly via WhatsApp</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setNewInviteGenerated(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white font-bold text-xs hover:bg-[#0A2F1C]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Invite Generation Form */
                <form onSubmit={handleCreateInvite} className="space-y-5">
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#0A2F1C] mb-1.5">
                      Staff Role / Designation *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STAFF_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setInviteRole(role)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                            inviteRole === role
                              ? 'bg-[#0F472A] text-white border-[#0F472A] shadow-2xs'
                              : 'bg-white text-[#10241A] border-[#E4D9BE] hover:bg-[#F2EAD9]'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Work Location / Unit */}
                  <div>
                    <label className="block text-xs font-bold text-[#0A2F1C] mb-1.5">
                      Work Location / Assigned House Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteLocation}
                      onChange={(e) => setInviteLocation(e.target.value)}
                      placeholder="e.g. House 14 (Main House & Kitchen), BQ Flat 2"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                    />
                  </div>

                  {/* Weekly Duty Days & Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0A2F1C]">
                        Authorized Work Days *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePresetDays('weekdays')}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#F2EAD9] text-[#0F472A] font-bold hover:bg-[#e4d9be]"
                        >
                          Mon-Fri
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetDays('all')}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#F2EAD9] text-[#0F472A] font-bold hover:bg-[#e4d9be]"
                        >
                          All 7 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetDays('weekend')}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#F2EAD9] text-[#0F472A] font-bold hover:bg-[#e4d9be]"
                        >
                          Weekend
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ALL_DAYS.map((day) => {
                        const isSelected = inviteDays.includes(day);
                        return (
                          <label
                            key={day}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                              isSelected
                                ? 'bg-[#0F472A]/10 border-[#0F472A] text-[#0A2F1C] font-bold'
                                : 'bg-white border-[#E4D9BE] text-[#10241A]/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInviteDays([...inviteDays, day]);
                                } else {
                                  setInviteDays(inviteDays.filter((d) => d !== day));
                                }
                              }}
                              className="rounded text-[#0F472A] focus:ring-[#0F472A]"
                            />
                            <span>{day}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duty Shift Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A2F1C] mb-1.5">
                        Shift Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={inviteStartTime}
                        onChange={(e) => setInviteStartTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0A2F1C] mb-1.5">
                        Shift End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={inviteEndTime}
                        onChange={(e) => setInviteEndTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-[#E4D9BE] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E4D9BE] text-xs font-bold text-[#10241A]/70 hover:bg-[#F2EAD9]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingInvite}
                      className="px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E7D19C]" />
                      <span>{submittingInvite ? 'Generating Code...' : 'Generate 6-Digit Invite Code'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Schedule */}
      {scheduleModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#0A2F1C] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#FBF8F1]">Edit Staff Schedule</h3>
                <p className="text-xs text-[#E7D19C]">
                  {scheduleModalStaff.full_name} ({scheduleModalStaff.role})
                </p>
              </div>
              <button
                onClick={() => setScheduleModalStaff(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0A2F1C]">Working Days</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditPresetDays('weekdays')}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F2EAD9] text-[#0F472A] font-bold"
                    >
                      Mon-Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditPresetDays('all')}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F2EAD9] text-[#0F472A] font-bold"
                    >
                      All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const isChecked = editDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                          isChecked ? 'bg-[#0F472A]/10 border-[#0F472A] font-bold' : 'bg-white border-[#E4D9BE]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setEditDays([...editDays, day]);
                            else setEditDays(editDays.filter((d) => d !== day));
                          }}
                        />
                        <span>{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalStaff(null)}
                  className="px-4 py-2 rounded-xl border border-[#E4D9BE] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C]"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change History Audit Timeline */}
      {historyModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0A2F1C] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#E7D19C]" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#FBF8F1]">Audit & Change History</h3>
                  <p className="text-xs text-[#E7D19C]">
                    {historyModalStaff.full_name} • {historyModalStaff.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalStaff(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#C89B3C]/40">
                {historyModalStaff.change_history.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-[#0F472A] border-2 border-[#C89B3C]" />
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E4D9BE] text-xs flex-1 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0A2F1C]">{item.action}</span>
                        <span className="text-[#10241A]/50">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[#10241A]/80">{item.details}</p>
                      <div className="text-[10px] text-[#C89B3C] font-semibold">
                        Logged by: {item.author}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#FAF7EE] border-t border-[#E4D9BE] text-right shrink-0">
              <button
                onClick={() => setHistoryModalStaff(null)}
                className="px-5 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C]"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Staff Confirmation */}
      {rejectModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif text-lg font-bold">Reject Application</h3>
            </div>
            <p className="text-xs text-[#10241A]/80 leading-relaxed">
              Are you sure you want to reject <strong>{rejectModalStaff.full_name}</strong>'s domestic staff application? Please state the reason for estate records.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete guarantor references, wrong work availability hours..."
                className="w-full p-3 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalStaff(null)}
                className="px-4 py-2 rounded-xl border border-[#E4D9BE] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Document Zoom / Inspection */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#FBF8F1] border border-[#E4D9BE] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#0A2F1C] text-white p-4 flex items-center justify-between">
              <h4 className="font-serif font-bold text-sm text-[#FBF8F1]">{previewDocUrl.title}</h4>
              <button
                onClick={() => setPreviewDocUrl(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black/90 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewDocUrl.url}
                alt="Document Preview"
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-2xl"
              />
            </div>
            <div className="p-3.5 bg-[#FAF7EE] border-t border-[#E4D9BE] flex items-center justify-between text-xs">
              <span className="text-[#10241A]/60 text-[11px]">
                Supabase Bucket: <code className="text-[#0F472A] font-mono">staff-documents</code>
              </span>
              <button
                onClick={() => setPreviewDocUrl(null)}
                className="px-4 py-1.5 rounded-xl bg-[#0F472A] text-white font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
