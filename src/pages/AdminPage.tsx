import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Users,
  ShieldCheck,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Info,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  Send,
  Sparkles,
  Ticket,
  Check,
  Phone,
  Mail,
  Home,
  RefreshCw
} from 'lucide-react';
import { AppUser, EstateNotice, AccessLog, NoticeType, SOSEvent } from '../types';
import { getStoredAppUsers, saveAppUsers } from '../lib/auth-helpers';
import {
  getStoredNotices,
  saveStoredNotices,
  getStoredAccessLogs,
  fetchAdminStats,
  AdminStats,
} from '../lib/estate-data';
import { subscribeToSOSEvents, acknowledgeSOSEvent, clearSOSEvent } from '../lib/sos-service';

interface AdminPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, navigate }) => {
  const [users, setUsers] = useState<AppUser[]>(() => getStoredAppUsers());
  const [notices, setNotices] = useState<EstateNotice[]>(() => getStoredNotices());
  const [accessLogs] = useState<AccessLog[]>(() => getStoredAccessLogs());
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);

  // Dynamic admin statistics
  const [stats, setStats] = useState<AdminStats>({
    pendingApprovals: 0,
    activeResidents: 0,
    activePassesNow: 0,
    passesIssuedToday: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'approvals' | 'sos' | 'post_notice' | 'all_notices' | 'directory' | 'logs'>('approvals');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // New Notice Form State
  const [noticeType, setNoticeType] = useState<NoticeType>('info');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  // Edit Notice Modal State
  const [editingNotice, setEditingNotice] = useState<EstateNotice | null>(null);
  const [editType, setEditType] = useState<NoticeType>('info');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Notification / Alert message for approval actions
  const [actionNotification, setActionNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Refresh stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [users, notices]);

  // Subscribe to real-time SOS events
  useEffect(() => {
    const unsubscribe = subscribeToSOSEvents((events) => {
      setSosEvents(events);
    });
    return () => unsubscribe();
  }, []);

  const activeSosCount = sosEvents.filter(
    (e) => e.status === 'triggered' || e.status === 'acknowledged'
  ).length;

  // Filter pending resident approvals
  const pendingResidents = users.filter(
    (u) => u.status === 'pending' && u.role === 'resident'
  );

  // Handle Resident Approval
  const handleApproveResident = (user: AppUser) => {
    const adminName = currentUser?.full_name || 'Admin Directorate';
    const nowIso = new Date().toISOString();

    const updated = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            status: 'active' as const,
            approved_by: adminName,
            approved_at: nowIso,
          }
        : u
    );

    setUsers(updated);
    saveAppUsers(updated);

    // Trigger Notification simulation
    setActionNotification({
      type: 'success',
      message: `✓ Household House ${user.house_number} (${user.house_unit}) for ${user.full_name} has been APPROVED. In-app activation notification sent!`,
    });
    setTimeout(() => setActionNotification(null), 5000);
  };

  // Handle Resident Rejection
  const handleRejectResident = (user: AppUser) => {
    if (!confirm(`Are you sure you want to reject registration for ${user.full_name} (House ${user.house_number})?`)) {
      return;
    }

    const updated = users.map((u) =>
      u.id === user.id ? { ...u, status: 'rejected' as const } : u
    );

    setUsers(updated);
    saveAppUsers(updated);

    setActionNotification({
      type: 'error',
      message: `Registration for ${user.full_name} has been marked as REJECTED.`,
    });
    setTimeout(() => setActionNotification(null), 4000);
  };

  // Handle Post Notice Form
  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeBody.trim()) return;

    const newNotice: EstateNotice = {
      id: `not-${Date.now()}`,
      title: noticeTitle.trim(),
      type: noticeType,
      category: noticeType,
      priority: noticeType === 'emergency' ? 'emergency' : 'normal',
      content: noticeBody.trim(),
      body: noticeBody.trim(),
      author_name: currentUser?.full_name || 'Estate Administration',
      author_role: currentUser?.role || 'admin',
      created_at: new Date().toISOString(),
    };

    const updated = [newNotice, ...notices];
    setNotices(updated);
    saveStoredNotices(updated);

    // Reset Form
    setNoticeTitle('');
    setNoticeBody('');
    setNoticeType('info');

    setPublishFeedback('✓ Notice published successfully to the Resident Board & Dashboard!');
    setTimeout(() => setPublishFeedback(null), 4000);
    setActiveTab('all_notices');
  };

  // Handle Delete Notice
  const handleDeleteNotice = (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    const updated = notices.filter((n) => n.id !== noticeId);
    setNotices(updated);
    saveStoredNotices(updated);
  };

  // Open Edit Modal
  const openEditModal = (notice: EstateNotice) => {
    setEditingNotice(notice);
    setEditType(notice.type || (notice.category === 'security' || notice.priority === 'urgent' ? 'emergency' : 'info'));
    setEditTitle(notice.title);
    setEditBody(notice.body || notice.content);
  };

  // Save Edited Notice
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editTitle.trim() || !editBody.trim()) return;

    const updated = notices.map((n) =>
      n.id === editingNotice.id
        ? {
            ...n,
            title: editTitle.trim(),
            type: editType,
            category: editType,
            priority: editType === 'emergency' ? ('emergency' as const) : ('normal' as const),
            content: editBody.trim(),
            body: editBody.trim(),
            updated_at: new Date().toISOString(),
          }
        : n
    );

    setNotices(updated);
    saveStoredNotices(updated);
    setEditingNotice(null);
  };

  // Filter Directory Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.house_number).includes(searchTerm);

    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D9BE] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0F472A] text-[#E7D19C] text-[11px] font-bold uppercase tracking-wider">
                Estate Administration
              </span>
              <span className="text-xs text-[#10241A]/70 font-semibold">
                Officer: {currentUser?.full_name || 'Admin'}
              </span>
            </div>
            <h1 className="fraunces text-3xl sm:text-4xl font-bold text-[#0A2F1C]">
              Admin Governance & Clearances
            </h1>
            <p className="text-xs sm:text-sm text-[#10241A]/70 mt-1">
              Verify pending resident registrations, broadcast official gazettes, and inspect real-time security stats.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="p-2.5 rounded-xl border border-[#E4D9BE] bg-white hover:bg-[#F2EAD9] text-[#0A2F1C] transition-colors shadow-2xs"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/gate')}
              className="px-4 py-2.5 rounded-xl bg-[#0F472A] text-white hover:bg-[#0A2F1C] text-xs font-bold shadow-soft flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#E7D19C]" />
              <span>Gate Hub</span>
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionNotification && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in slide-in-from-top duration-200 ${
              actionNotification.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}
          >
            {actionNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{actionNotification.message}</span>
          </div>
        )}

        {/* 4 BASIC STATS CARDS AT TOP (Count Queries) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Approvals */}
          <div className="bg-white p-5 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C89B3C]">
                Approvals Queue
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="fraunces text-3xl font-extrabold text-[#0A2F1C] tabular-nums">
              {stats.pendingApprovals}
            </div>
            <p className="text-[11px] text-[#10241A]/60 font-medium">
              Residents awaiting verification
            </p>
          </div>

          {/* Card 2: Active Residents */}
          <div className="bg-white p-5 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F472A]">
                Active Residents
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="fraunces text-3xl font-extrabold text-[#0A2F1C] tabular-nums">
              {stats.activeResidents}
            </div>
            <p className="text-[11px] text-[#10241A]/60 font-medium">
              Verified household accounts
            </p>
          </div>

          {/* Card 3: Active Passes Right Now */}
          <div className="bg-white p-5 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F472A]">
                Active Passes Now
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="fraunces text-3xl font-extrabold text-[#0A2F1C] tabular-nums">
              {stats.activePassesNow}
            </div>
            <p className="text-[11px] text-[#10241A]/60 font-medium">
              Unexpired guest/delivery codes
            </p>
          </div>

          {/* Card 4: Passes Issued Today */}
          <div className="bg-white p-5 rounded-[14px] border border-[#E4D9BE] shadow-soft space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C89B3C]">
                Issued Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F2EAD9] text-[#0A2F1C] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C89B3C]" />
              </div>
            </div>
            <div className="fraunces text-3xl font-extrabold text-[#0A2F1C] tabular-nums">
              {stats.passesIssuedToday}
            </div>
            <p className="text-[11px] text-[#10241A]/60 font-medium">
              Tokens generated since midnight
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E4D9BE] pb-2">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals ({pendingResidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sos'
                ? 'bg-red-700 text-white shadow-xs'
                : activeSosCount > 0
                ? 'bg-red-50 text-red-700 border-2 border-red-400 font-black animate-pulse'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${activeSosCount > 0 ? 'text-red-500 animate-bounce' : ''}`} />
            <span>SOS Alerts ({sosEvents.length})</span>
            {activeSosCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                {activeSosCount} Active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('post_notice')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'post_notice'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Notice</span>
          </button>

          <button
            onClick={() => setActiveTab('all_notices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all_notices'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>All Notices ({notices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'directory'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/70 hover:bg-[#F2EAD9] bg-white border border-[#E4D9BE]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gate Logs ({accessLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="fraunces text-xl font-bold text-[#0A2F1C]">
                  Resident Registrations Awaiting Verification
                </h2>
                <p className="text-xs text-[#10241A]/70">
                  Review applicant details before approving access credentials.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#F2EAD9] text-[#0A2F1C] px-3 py-1 rounded-full border border-[#E4D9BE]">
                {pendingResidents.length} Pending Requests
              </span>
            </div>

            {pendingResidents.length === 0 ? (
              <div className="card-estate p-12 text-center bg-white border-[#E4D9BE] shadow-soft space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                  All Household Registrations Cleared
                </h3>
                <p className="text-xs text-[#10241A]/70 max-w-sm mx-auto">
                  No resident accounts are currently awaiting administrative review. New signups will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingResidents.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-[14px] border-2 border-amber-300 p-6 shadow-soft space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          Pending Approval
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0F472A] bg-[#F2EAD9] px-2.5 py-1 rounded-md">
                          House {user.house_number} • {user.house_unit}
                        </span>
                      </div>

                      <div>
                        <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                          {user.full_name}
                        </h3>
                        <div className="text-xs text-[#10241A]/80 space-y-1.5 mt-2 bg-[#FBF8F1] p-3 rounded-xl border border-[#E4D9BE]">
                          <div className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 text-[#C89B3C]" />
                            <span>
                              Designation: <strong>House {user.house_number} ({user.house_unit})</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-[#C89B3C]" />
                            <span>Phone: {user.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-[#C89B3C]" />
                            <span>Email: {user.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#10241A]/60 pt-1 border-t border-[#E4D9BE]/60">
                            <Clock className="w-3 h-3" />
                            <span>
                              Registered on {new Date(user.created_at).toLocaleDateString()} at{' '}
                              {new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E4D9BE] flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleRejectResident(user)}
                        className="px-4 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveResident(user)}
                        className="flex-1 px-5 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#E7D19C]" />
                        <span>Approve & Activate Resident</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SOS EMERGENCY ALERTS MONITOR */}
        {activeTab === 'sos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300">
                    Emergency Command
                  </span>
                  {activeSosCount > 0 && (
                    <span className="text-xs text-red-600 font-bold animate-pulse">
                      🚨 {activeSosCount} Distress Signal{activeSosCount > 1 ? 's' : ''} Active
                    </span>
                  )}
                </div>
                <h2 className="fraunces text-2xl font-bold text-[#0A2F1C] mt-1">
                  Estate Distress Signals & Audit Log
                </h2>
                <p className="text-xs text-[#10241A]/70">
                  Instant real-time synchronization with resident panic triggers and gatehouse response teams.
                </p>
              </div>

              <button
                onClick={() => navigate('/gate')}
                className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Open Gate SOS Monitor</span>
              </button>
            </div>

            {sosEvents.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E4D9BE] p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-bold text-[#0A2F1C]">
                  All Clear — No SOS Distress Signals
                </h3>
                <p className="text-xs text-[#10241A]/60 max-w-sm mx-auto">
                  No emergency distress signals have been triggered. All resident units are in normal operational status.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sosEvents.map((ev) => {
                  const isTriggered = ev.status === 'triggered';
                  const isAcknowledged = ev.status === 'acknowledged';
                  const isCleared = ev.status === 'cleared';

                  return (
                    <div
                      key={ev.id}
                      className={`bg-white rounded-2xl border p-5 shadow-soft transition-all space-y-4 ${
                        isTriggered
                          ? 'border-red-400 ring-2 ring-red-400/50 bg-red-50/40'
                          : isAcknowledged
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-[#E4D9BE]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4D9BE]/70 pb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isTriggered
                                ? 'bg-red-600 text-white animate-pulse'
                                : isAcknowledged
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-700 text-white'
                            }`}
                          >
                            {isTriggered
                              ? '🚨 Active Distress Signal'
                              : isAcknowledged
                              ? '⏳ Patrol Dispatched'
                              : '✓ Cleared & Resolved'}
                          </span>
                          <span className="text-sm font-bold text-[#0A2F1C]">
                            House {ev.house_number} ({ev.house_unit})
                          </span>
                        </div>

                        <span className="text-xs text-[#10241A]/60 font-mono">
                          Triggered at{' '}
                          {new Date(ev.triggered_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE]/60">
                          <div className="text-[#10241A]/60 text-[11px]">Resident Name</div>
                          <div className="font-bold text-[#0A2F1C] text-sm mt-0.5">
                            {ev.resident_name}
                          </div>
                          {ev.resident_phone && (
                            <div className="text-[#10241A]/70 text-[11px] mt-0.5">
                              {ev.resident_phone}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE]/60">
                          <div className="text-[#10241A]/60 text-[11px]">Gatehouse Acknowledgment</div>
                          <div className="font-bold text-[#0A2F1C] mt-0.5">
                            {ev.acknowledged_by || 'Awaiting Guard Response'}
                          </div>
                          {ev.acknowledged_at && (
                            <div className="text-[11px] text-[#10241A]/60 mt-0.5">
                              At{' '}
                              {new Date(ev.acknowledged_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4D9BE]/60">
                          <div className="text-[#10241A]/60 text-[11px]">Admin Alert Dispatched</div>
                          <div className="font-bold text-emerald-800 mt-0.5">
                            ✓ Edge Function Triggered
                          </div>
                          <div className="text-[10px] text-[#10241A]/50 truncate mt-0.5">
                            {(ev.notified_admin_emails || ['admin@lighthouse.estate']).join(', ')}
                          </div>
                        </div>
                      </div>

                      {ev.resolution_notes && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#0F472A]">
                          <span className="font-bold">Incident Resolution: </span>
                          <span>{ev.resolution_notes}</span>
                          {ev.cleared_by && (
                            <span className="text-[11px] text-emerald-800/70 ml-2">
                              (Cleared by {ev.cleared_by})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Admin Quick Acknowledge / Clear buttons if active */}
                      {(isTriggered || isAcknowledged) && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E4D9BE]/60">
                          {isTriggered && (
                            <button
                              onClick={() => acknowledgeSOSEvent(ev.id, currentUser?.full_name || 'Admin')}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-xs"
                            >
                              Acknowledge Distress Signal
                            </button>
                          )}
                          <button
                            onClick={() =>
                              clearSOSEvent(
                                ev.id,
                                currentUser?.full_name || 'Admin',
                                'Resolved & verified by Administration Directorate'
                              )
                            }
                            className="px-4 py-2 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-xs"
                          >
                            Mark Resolved & Clear
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POST A NOTICE FORM */}
        {activeTab === 'post_notice' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[16px] p-6 sm:p-8 border border-[#E4D9BE] shadow-soft space-y-6">
            <div className="pb-3 border-b border-[#E4D9BE]">
              <h2 className="fraunces text-2xl font-bold text-[#0A2F1C]">
                Post an Official Estate Notice
              </h2>
              <p className="text-xs text-[#10241A]/70 mt-1">
                Announcements appear on all resident dashboards and the public Notice Board immediately.
              </p>
            </div>

            {publishFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                {publishFeedback}
              </div>
            )}

            <form onSubmit={handlePostNotice} className="space-y-5">
              {/* Notice Type Selector (Emergency / Event / Info with distinct styling) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0A2F1C] mb-2">
                  Notice Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Emergency */}
                  <button
                    type="button"
                    onClick={() => setNoticeType('emergency')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      noticeType === 'emergency'
                        ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-2 ring-rose-400'
                        : 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ShieldAlert className="w-5 h-5 text-rose-300" />
                      {noticeType === 'emergency' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">Emergency</div>
                      <div className={`text-[10px] ${noticeType === 'emergency' ? 'text-rose-200' : 'text-rose-700'}`}>
                        Red alert, pinned to top
                      </div>
                    </div>
                  </button>

                  {/* Event */}
                  <button
                    type="button"
                    onClick={() => setNoticeType('event')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      noticeType === 'event'
                        ? 'bg-[#C89B3C] text-white border-[#C89B3C] shadow-md ring-2 ring-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Calendar className="w-5 h-5 text-[#FBF8F1]" />
                      {noticeType === 'event' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">Community Event</div>
                      <div className={`text-[10px] ${noticeType === 'event' ? 'text-amber-100' : 'text-amber-800'}`}>
                        Gatherings, madrasa, sports
                      </div>
                    </div>
                  </button>

                  {/* Info */}
                  <button
                    type="button"
                    onClick={() => setNoticeType('info')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      noticeType === 'info'
                        ? 'bg-[#0F472A] text-white border-[#0F472A] shadow-md ring-2 ring-emerald-400'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Info className="w-5 h-5 text-[#E7D19C]" />
                      {noticeType === 'info' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">General Info</div>
                      <div className={`text-[10px] ${noticeType === 'info' ? 'text-emerald-200' : 'text-emerald-800'}`}>
                        Routine updates & utilities
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Generator Overhaul & Solar Maintenance"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none bg-[#FBF8F1]/60"
                />
              </div>

              {/* Body (Plain text with line breaks preserved) */}
              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                  Notice Body / Content * (Plain text, line breaks preserved)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter complete notice details. Line breaks and paragraphs will be displayed cleanly..."
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none bg-[#FBF8F1]/60 font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white text-xs font-bold shadow-soft flex items-center gap-2"
                >
                  <Send className="w-4 h-4 text-[#E7D19C]" />
                  <span>Publish Notice Immediately</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ALL NOTICES MANAGEMENT (Edit / Delete) */}
        {activeTab === 'all_notices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="fraunces text-xl font-bold text-[#0A2F1C]">
                  All Published Notices & Bulletins
                </h2>
                <p className="text-xs text-[#10241A]/70">
                  Edit content, change priority levels, or delete past gazettes.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('post_notice')}
                className="px-4 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-xs hover:bg-[#0A2F1C] shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#E7D19C]" />
                <span>+ Post New</span>
              </button>
            </div>

            {notices.length === 0 ? (
              <div className="card-estate p-12 text-center bg-white border-[#E4D9BE] space-y-2">
                <Bell className="w-10 h-10 text-[#C89B3C] mx-auto opacity-50" />
                <h3 className="fraunces text-lg font-bold text-[#0A2F1C]">No Notices Found</h3>
                <p className="text-xs text-[#10241A]/70">Click "+ Post New" to broadcast an announcement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => {
                  const type = notice.type || (notice.priority === 'urgent' || notice.category === 'security' ? 'emergency' : 'info');
                  const isEmergency = type === 'emergency';
                  const isEvent = type === 'event';

                  return (
                    <div
                      key={notice.id}
                      className={`bg-white rounded-[14px] p-5 sm:p-6 border shadow-soft transition-all space-y-3 ${
                        isEmergency
                          ? 'border-2 border-red-500 bg-rose-50/20'
                          : isEvent
                          ? 'border-[#C89B3C]'
                          : 'border-[#E4D9BE]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4D9BE]/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                              isEmergency
                                ? 'bg-red-100 text-red-900 border-red-300'
                                : isEvent
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {isEmergency ? 'EMERGENCY ALERT' : isEvent ? 'COMMUNITY EVENT' : 'INFO BULLETIN'}
                          </span>

                          <span className="text-[11px] text-[#10241A]/60 font-medium">
                            By {notice.author_name} ({notice.author_role})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(notice)}
                            className="p-1.5 rounded-lg border border-[#E4D9BE] bg-white hover:bg-[#F2EAD9] text-[#0A2F1C] text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Edit Notice"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#0F472A]" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                          {notice.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#10241A]/85 mt-2 whitespace-pre-wrap leading-relaxed">
                          {notice.body || notice.content}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-[#10241A]/50">
                        <span>
                          Published: {new Date(notice.created_at).toLocaleDateString()} at{' '}
                          {new Date(notice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {notice.updated_at && (
                          <span className="italic">
                            Edited: {new Date(notice.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ESTATE DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#10241A]/40 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search directory by resident name or house number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E4D9BE] bg-white text-xs outline-none focus:border-[#0F472A]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E4D9BE] bg-white text-xs font-semibold text-[#0A2F1C] outline-none"
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="resident">Residents</option>
                  <option value="staff">Staff</option>
                  <option value="security">Security</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#E4D9BE] shadow-soft overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F2EAD9] text-[#0A2F1C] font-serif uppercase tracking-wider text-[11px] border-b border-[#E4D9BE]">
                  <tr>
                    <th className="py-3.5 px-4">House & Unit</th>
                    <th className="py-3.5 px-4">Resident / User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4D9BE]/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FBF8F1]/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F472A]">
                        H-{u.house_number} ({u.house_unit})
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0A2F1C]">{u.full_name}</div>
                        <div className="text-[11px] text-[#10241A]/60">{u.email} • {u.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-semibold">{u.role.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-[11px] text-[#10241A]/50">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: GATE AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-[14px] border border-[#E4D9BE] p-6 shadow-soft space-y-4">
            <h2 className="fraunces text-lg font-bold text-[#0A2F1C]">
              24/7 Gatehouse Access Clearance Audit Stream
            </h2>
            <div className="divide-y divide-[#E4D9BE] text-xs">
              {accessLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-bold px-2.5 py-1 rounded text-xs ${
                        log.direction === 'in'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {log.direction.toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-[#0A2F1C]">
                        {log.visitor_name}
                      </div>
                      <div className="text-[#10241A]/60">
                        {log.house_info} • Code: {log.pass_code}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-[#0F472A] font-semibold">
                      {log.vehicle_plate || 'Pedestrian'}
                    </div>
                    <div className="text-[#10241A]/50 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDIT NOTICE MODAL */}
        {editingNotice && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl border border-[#E4D9BE]">
              <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-3">
                <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                  Edit Estate Notice
                </h3>
                <button
                  onClick={() => setEditingNotice(null)}
                  className="w-8 h-8 rounded-full bg-[#F2EAD9] text-[#10241A] flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    Notice Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as NoticeType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none"
                  >
                    <option value="emergency">Emergency (Red Alert, Pinned)</option>
                    <option value="event">Community Event (Amber)</option>
                    <option value="info">General Info (Green)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    Content / Body *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNotice(null)}
                    className="px-4 py-2 rounded-xl border border-[#E4D9BE] text-xs font-bold text-[#10241A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
