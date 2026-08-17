import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
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
  Check
} from 'lucide-react';
import { AppUser, VisitorPass, PassType, PassStatus } from '../types';
import { getStoredPasses, saveStoredPasses } from '../lib/estate-data';
import {
  generateUnique6DigitCode,
  calculatePassExpiry,
  generatePassQRCode,
  buildWhatsAppShareMessage,
} from '../lib/pass-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface PassesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const PassesPage: React.FC<PassesPageProps> = ({ currentUser, navigate }) => {
  const [passes, setPasses] = useState<VisitorPass[]>(() => getStoredPasses());
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prominentPass, setProminentPass] = useState<VisitorPass | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Pagination state
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Live clock state for real-time countdown recalculation every second
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

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
  const [guestCount, setGuestCount] = useState<number>(2);
  const [longStayDate, setLongStayDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // Whenever a pass is selected for prominent display, generate its QR code
  useEffect(() => {
    if (prominentPass) {
      generatePassQRCode(prominentPass.id, prominentPass.pass_code).then((url) => {
        setQrDataUrl(url);
      });
    } else {
      setQrDataUrl(null);
    }
  }, [prominentPass]);

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

  // Filter passes relevant to user
  const userPasses = useMemo(() => {
    return passes.filter((p) => {
      if (currentUser?.role === 'resident') {
        return (
          p.resident_id === currentUser.id ||
          (p.house_number === currentUser.house_number && p.house_unit === currentUser.house_unit)
        );
      }
      return true;
    });
  }, [passes, currentUser]);

  // Split into Active and History
  const activePasses = useMemo(() => {
    return userPasses
      .filter((p) => {
        const exp = new Date(p.valid_until || p.expires_at || '').getTime();
        return p.status === 'active' && exp > currentTime;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [userPasses, currentTime]);

  const historyPasses = useMemo(() => {
    return userPasses
      .filter((p) => {
        const exp = new Date(p.valid_until || p.expires_at || '').getTime();
        return p.status !== 'active' || exp <= currentTime;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [userPasses, currentTime]);

  // Pagination slicing
  const paginatedActivePasses = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return activePasses.slice(start, start + ITEMS_PER_PAGE);
  }, [activePasses, activePage]);

  const paginatedHistoryPasses = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return historyPasses.slice(start, start + ITEMS_PER_PAGE);
  }, [historyPasses, historyPage]);

  const totalActivePages = Math.ceil(activePasses.length / ITEMS_PER_PAGE) || 1;
  const totalHistoryPages = Math.ceil(historyPasses.length / ITEMS_PER_PAGE) || 1;

  // Handle Form Submit
  const handleGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !currentUser) return;

    // 1. Generate unique 6-digit numeric code
    const existingActiveCodes = activePasses.map((p) => p.pass_code);
    const unique6DigitCode = generateUnique6DigitCode(existingActiveCodes);

    // 2. Compute expiry window
    const { validFrom, validUntil } = calculatePassExpiry(passType, longStayDate);

    const newPass: VisitorPass = {
      id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      resident_id: currentUser.id,
      resident_name: currentUser.full_name,
      resident_phone: currentUser.phone,
      house_number: currentUser.house_number,
      house_unit: currentUser.house_unit,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim() || undefined,
      guest_plate_number: guestPlate.trim().toUpperCase() || undefined,
      pass_type: passType,
      guest_count: passType === 'group' ? Math.max(1, guestCount) : undefined,
      pass_code: unique6DigitCode,
      valid_from: validFrom,
      valid_until: validUntil,
      expires_at: validUntil,
      status: 'active',
      created_at: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    const updated = [newPass, ...passes];
    setPasses(updated);
    saveStoredPasses(updated);

    // Reset Form
    setGuestName('');
    setGuestPhone('');
    setGuestPlate('');
    setGuestCount(2);
    setNotes('');
    setIsCreateModalOpen(false);

    // Show prominently
    setProminentPass(newPass);
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
    if (prominentPass?.id === passId) {
      setProminentPass((prev) => (prev ? { ...prev, status: 'revoked' } : null));
    }
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

  // Helper for pass badge styles
  const getPassTypeBadge = (type: PassType, count?: number) => {
    switch (type) {
      case 'guest':
      case 'one_time':
        return { label: 'Guest (30m)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'delivery':
        return { label: 'Delivery (15m)', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'long_stay':
      case 'recurring':
        return { label: 'Long-Stay', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      case 'exit':
        return { label: 'Exit Pass', color: 'bg-rose-100 text-rose-900 border-rose-200' };
      case 'group':
        return { label: `Group (${count || 2} pax)`, color: 'bg-purple-100 text-purple-900 border-purple-200' };
      default:
        return { label: type, color: 'bg-[#F2EAD9] text-[#0A2F1C] border-[#E4D9BE]' };
    }
  };

  const getStatusBadge = (status: PassStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'out':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'expired':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E4D9BE] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0F472A] text-[#E7D19C] text-[11px] font-bold uppercase tracking-wider">
                Gate Pass Module
              </span>
              {currentUser && (
                <span className="text-xs font-semibold text-[#10241A]/70">
                  House {currentUser.house_number} • {currentUser.house_unit}
                </span>
              )}
            </div>
            <h1 className="fraunces text-3xl sm:text-4xl font-bold text-[#0A2F1C]">
              Access & Visitor Passes
            </h1>
            <p className="text-xs sm:text-sm text-[#10241A]/70 mt-1 max-w-2xl">
              Create and manage encrypted 6-digit numeric access codes and QR passes for guests, deliveries, contractors, and group visits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/gate')}
              className="px-4 py-2.5 rounded-xl border border-[#0F472A] text-[#0F472A] hover:bg-[#F2EAD9] font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-[#C89B3C]" />
              <span>Gate Hub Scanner</span>
            </button>
            <button
              onClick={() => {
                if (!currentUser) {
                  navigate('/login');
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white hover:bg-[#0A2F1C] font-bold text-xs shadow-soft hover:shadow-soft-lg flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-[#E7D19C]" />
              <span>+ New Pass</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D9BE] pb-3">
          <div className="flex items-center gap-2 bg-[#F2EAD9] p-1 rounded-xl border border-[#E4D9BE]">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-[#0F472A] text-white shadow-xs'
                  : 'text-[#10241A]/70 hover:text-[#10241A]'
              }`}
            >
              <span>Active Passes</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'active' ? 'bg-[#C89B3C] text-white' : 'bg-white/70 text-[#0F472A]'
                }`}
              >
                {activePasses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-[#0F472A] text-white shadow-xs'
                  : 'text-[#10241A]/70 hover:text-[#10241A]'
              }`}
            >
              <span>Pass History</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'history' ? 'bg-[#C89B3C] text-white' : 'bg-white/70 text-[#0F472A]'
                }`}
              >
                {historyPasses.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-[#10241A]/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Gate System Synchronized (20 per page)</span>
          </div>
        </div>

        {/* TAB 1: ACTIVE PASSES */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {paginatedActivePasses.length === 0 ? (
              <div className="card-estate p-12 text-center bg-white border-[#E4D9BE] shadow-soft space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F2EAD9] text-[#C89B3C] flex items-center justify-center mx-auto">
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                    No Active Visitor Passes
                  </h3>
                  <p className="text-xs text-[#10241A]/70 max-w-md mx-auto mt-1">
                    You currently have no unexpired guest or delivery tokens. Click below to issue a 6-digit access code.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C] shadow-xs"
                >
                  Generate First Pass
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedActivePasses.map((pass) => {
                  const badgeInfo = getPassTypeBadge(pass.pass_type, pass.guest_count);
                  const countdown = formatCountdown(pass.valid_until || pass.expires_at || '');

                  return (
                    <div
                      key={pass.id}
                      className="bg-white rounded-[14px] border border-[#E4D9BE] hover:border-[#C89B3C] p-6 shadow-soft transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Header Badge Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeInfo.color}`}
                          >
                            {badgeInfo.label}
                          </span>

                          <div
                            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              countdown.isUrgent
                                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono tabular-nums">{countdown.label}</span>
                          </div>
                        </div>

                        {/* Guest Details */}
                        <div>
                          <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                            {pass.guest_name}
                          </h3>
                          <div className="text-xs text-[#10241A]/70 flex flex-wrap items-center gap-2 mt-1">
                            {pass.guest_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#C89B3C]" />
                                {pass.guest_phone}
                              </span>
                            )}
                            {pass.guest_plate_number && (
                              <span className="flex items-center gap-1 font-mono font-bold text-[#0F472A] bg-[#F2EAD9] px-2 py-0.5 rounded">
                                <Car className="w-3 h-3" />
                                {pass.guest_plate_number}
                              </span>
                            )}
                          </div>
                          {pass.notes && (
                            <p className="text-[11px] text-[#10241A]/60 italic mt-1.5">
                              "{pass.notes}"
                            </p>
                          )}
                        </div>

                        {/* Large 6-Digit Numeric Token Box */}
                        <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#10241A]/60 block uppercase font-bold tracking-wider">
                              6-Digit Access Code
                            </span>
                            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest tabular-nums text-[#0F472A]">
                              {pass.pass_code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setProminentPass(pass)}
                              className="p-2.5 rounded-xl bg-white border border-[#E4D9BE] hover:border-[#0F472A] text-[#0A2F1C] hover:bg-[#F2EAD9] transition-all shadow-2xs"
                              title="Show Large QR Code"
                            >
                              <QrCode className="w-5 h-5 text-[#0F472A]" />
                            </button>
                            <button
                              onClick={() => handleCopyToClipboard(pass)}
                              className="p-2.5 rounded-xl bg-white border border-[#E4D9BE] hover:border-[#0F472A] text-[#0A2F1C] hover:bg-[#F2EAD9] transition-all shadow-2xs"
                              title="Copy Full Pass Details"
                            >
                              {copyFeedback === pass.pass_code ? (
                                <Check className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Copy className="w-5 h-5 text-[#0F472A]" />
                              )}
                            </button>
                          </div>
                        </div>

                        {copyFeedback === pass.pass_code && (
                          <p className="text-[11px] text-emerald-700 font-bold text-center">
                            ✓ Copied WhatsApp message template!
                          </p>
                        )}
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-3 border-t border-[#E4D9BE]/60 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleShareWhatsApp(pass)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Share WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleRevokePass(pass.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
                        >
                          Revoke Pass
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls for Active */}
            {totalActivePages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E4D9BE] pt-4">
                <span className="text-xs text-[#10241A]/70">
                  Showing {(activePage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(activePage * ITEMS_PER_PAGE, activePasses.length)} of {activePasses.length} active passes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setActivePage((p) => p - 1)}
                    className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-[#0A2F1C]">
                    Page {activePage} of {totalActivePages}
                  </span>
                  <button
                    disabled={activePage === totalActivePages}
                    onClick={() => setActivePage((p) => p + 1)}
                    className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PASS HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {paginatedHistoryPasses.length === 0 ? (
              <div className="card-estate p-12 text-center bg-white border-[#E4D9BE] shadow-soft space-y-3">
                <Ticket className="w-12 h-12 text-[#C89B3C] mx-auto opacity-50" />
                <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                  No Pass History Yet
                </h3>
                <p className="text-xs text-[#10241A]/70 max-w-sm mx-auto">
                  Past, used, and expired visitor passes will appear here in chronological order.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-[14px] border border-[#E4D9BE] shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F2EAD9] border-b border-[#E4D9BE] text-[#0A2F1C] text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Visitor & Vehicle</th>
                        <th className="py-3.5 px-4">Pass Type</th>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Issued At</th>
                        <th className="py-3.5 px-4">Expiry / Used Time</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4D9BE]/60 text-xs">
                      {paginatedHistoryPasses.map((pass) => {
                        const badge = getPassTypeBadge(pass.pass_type, pass.guest_count);
                        const statusClass = getStatusBadge(pass.status);

                        return (
                          <tr key={pass.id} className="hover:bg-[#FBF8F1]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#0A2F1C] text-sm">
                                {pass.guest_name}
                              </div>
                              <div className="text-[11px] text-[#10241A]/60 flex items-center gap-1.5 mt-0.5">
                                {pass.guest_phone && <span>{pass.guest_phone}</span>}
                                {pass.guest_plate_number && (
                                  <span className="font-mono font-bold text-[#0F472A]">
                                    • {pass.guest_plate_number}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-sm tracking-wider text-[#0F472A]">
                              {pass.pass_code}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusClass}`}
                              >
                                {pass.status.toUpperCase()}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-[#10241A]/70">
                              {new Date(pass.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {new Date(pass.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>

                            <td className="py-3.5 px-4 text-[#10241A]/70">
                              {pass.verified_at ? (
                                <span className="text-blue-800 font-semibold">
                                  Verified:{' '}
                                  {new Date(pass.verified_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              ) : pass.checked_out_at ? (
                                <span className="text-purple-800 font-semibold">
                                  Out:{' '}
                                  {new Date(pass.checked_out_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              ) : (
                                <span>
                                  Exp:{' '}
                                  {new Date(pass.valid_until || pass.expires_at || '').toLocaleTimeString(
                                    [],
                                    { hour: '2-digit', minute: '2-digit' }
                                  )}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setProminentPass(pass)}
                                className="px-3 py-1 rounded-lg border border-[#E4D9BE] bg-white hover:bg-[#F2EAD9] font-bold text-[#0F472A] transition-colors inline-flex items-center gap-1"
                              >
                                <QrCode className="w-3.5 h-3.5 text-[#C89B3C]" />
                                <span>View QR</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls for History */}
            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E4D9BE] pt-4">
                <span className="text-xs text-[#10241A]/70">
                  Showing {(historyPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(historyPage * ITEMS_PER_PAGE, historyPasses.length)} of {historyPasses.length} total passes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                    className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-[#0A2F1C]">
                    Page {historyPage} of {totalHistoryPages}
                  </span>
                  <button
                    disabled={historyPage === totalHistoryPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROMINENT PASS DISPLAY MODAL (Large Code, Scannable QR, Countdown, Share Buttons) */}
        {prominentPass && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] w-full max-w-md p-6 sm:p-7 space-y-6 shadow-2xl border border-[#E4D9BE] relative max-h-[92vh] overflow-y-auto">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C89B3C]"></span>
                  <h3 className="fraunces text-lg font-bold text-[#0A2F1C]">
                    Gate Access Clearance Pass
                  </h3>
                </div>
                <button
                  onClick={() => setProminentPass(null)}
                  className="w-8 h-8 rounded-full bg-[#F2EAD9] text-[#10241A] hover:bg-[#E4D9BE] flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Guest & House Info */}
              <div className="text-center space-y-1">
                <span
                  className={`inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-1 ${
                    getPassTypeBadge(prominentPass.pass_type, prominentPass.guest_count).color
                  }`}
                >
                  {getPassTypeBadge(prominentPass.pass_type, prominentPass.guest_count).label}
                </span>
                <h2 className="fraunces text-2xl font-bold text-[#0A2F1C]">
                  {prominentPass.guest_name}
                </h2>
                <p className="text-xs text-[#10241A]/70 font-medium">
                  Destination: House {prominentPass.house_number} ({prominentPass.house_unit}) • Host: {prominentPass.resident_name}
                </p>
                {prominentPass.guest_plate_number && (
                  <p className="text-xs font-mono font-bold text-[#0F472A]">
                    Vehicle Plate: {prominentPass.guest_plate_number}
                  </p>
                )}
              </div>

              {/* 6-Digit Numeric Code Display (Prominent & Tabular) */}
              <div className="bg-[#0F472A] rounded-2xl p-5 text-center text-white space-y-1 shadow-soft relative overflow-hidden">
                <div className="text-[11px] uppercase tracking-widest text-[#E7D19C] font-bold">
                  6-Digit Gate Clearance Code
                </div>
                <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-widest tabular-nums text-white my-1 selection:bg-[#C89B3C]">
                  {prominentPass.pass_code}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#E7D19C] font-semibold pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Expires in: {formatCountdown(prominentPass.valid_until || prominentPass.expires_at || '').label}
                  </span>
                </div>
              </div>

              {/* High-Resolution QR Code Canvas */}
              <div className="bg-[#FBF8F1] p-4 rounded-2xl border-2 border-dashed border-[#C89B3C] flex flex-col items-center justify-center space-y-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Gate QR Code"
                    className="w-48 h-48 rounded-xl shadow-xs bg-white p-2 border border-[#E4D9BE]"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-[#C89B3C] animate-pulse" />
                  </div>
                )}
                <p className="text-[11px] text-[#10241A]/70 text-center font-medium">
                  Show code to gate security or hold QR in front of the Gate Hub camera.
                </p>
              </div>

              {/* Community Values Note */}
              <div className="p-3 bg-[#F2EAD9] rounded-xl text-[11px] text-[#0A2F1C] border border-[#E4D9BE] leading-relaxed">
                🕌 <strong>Lighthouse Estate Community:</strong> Visitors are expected to observe estate speed limits (20 km/h) and Islamic community decorum.
              </div>

              {/* Action Buttons: WhatsApp & Copy */}
              <div className="space-y-2.5">
                <button
                  onClick={() => handleShareWhatsApp(prominentPass)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Share on WhatsApp (Pre-Filled)</span>
                </button>

                <button
                  onClick={() => handleCopyToClipboard(prominentPass)}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  {copyFeedback === prominentPass.pass_code ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#E7D19C]" />
                      <span>Copy Invitation Message</span>
                    </>
                  )}
                </button>

                {prominentPass.status === 'active' && (
                  <button
                    onClick={() => handleRevokePass(prominentPass.id)}
                    className="w-full py-2 text-xs font-bold text-red-600 hover:text-red-800 hover:underline text-center"
                  >
                    Revoke Pass
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CREATE PASS MODAL ("New Pass" flow with all types) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl border border-[#E4D9BE] max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-3">
                <div>
                  <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                    Issue New Gate Access Pass
                  </h3>
                  <p className="text-xs text-[#10241A]/70 mt-0.5">
                    Generate an instant 6-digit passcode & QR payload for your guest.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#F2EAD9] text-[#10241A] hover:bg-[#E4D9BE] flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGeneratePass} className="space-y-4">
                {/* 1. Pass Type Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0A2F1C] mb-2">
                    Select Pass Type *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { type: 'guest', label: 'Guest (30 min)', desc: 'Standard visiting' },
                      { type: 'delivery', label: 'Delivery (15 min)', desc: 'Dispatch / couriers' },
                      { type: 'long_stay', label: 'Long-Stay', desc: 'Family / extended' },
                      { type: 'exit', label: 'Exit Pass', desc: 'Departure token' },
                      { type: 'group', label: 'Group Visit', desc: 'Multiple guests' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.type}
                        onClick={() => setPassType(item.type as PassType)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          passType === item.type
                            ? 'bg-[#0F472A] text-white border-[#0F472A] shadow-xs'
                            : 'bg-[#FBF8F1] border-[#E4D9BE] text-[#10241A] hover:bg-[#F2EAD9]'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div
                          className={`text-[10px] ${
                            passType === item.type ? 'text-[#E7D19C]' : 'text-[#10241A]/60'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields: Group Guest Count */}
                {passType === 'group' && (
                  <div className="p-3.5 rounded-xl bg-[#F2EAD9]/80 border border-[#C89B3C] space-y-2">
                    <label className="block text-xs font-bold text-[#0A2F1C]">
                      Expected Number of Guests *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={guestCount}
                        onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                        className="w-28 px-3 py-2 rounded-xl border border-[#E4D9BE] text-sm bg-white font-mono font-bold focus:border-[#0F472A] outline-none"
                      />
                      <span className="text-xs text-[#10241A]/70">
                        Valid for {guestCount} visitors entering under one delegation token.
                      </span>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Long-Stay Date Picker */}
                {passType === 'long_stay' && (
                  <div className="p-3.5 rounded-xl bg-[#F2EAD9]/80 border border-[#C89B3C] space-y-2">
                    <label className="block text-xs font-bold text-[#0A2F1C]">
                      Valid Until (Expiry Date) *
                    </label>
                    <input
                      type="date"
                      required
                      value={longStayDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setLongStayDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] text-sm bg-white focus:border-[#0F472A] outline-none font-medium"
                    />
                  </div>
                )}

                {/* Visitor Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    Visitor / Artisan Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Kabir Bello or DHL Dispatch"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none bg-[#FBF8F1]/50"
                  />
                </div>

                {/* Phone & Vehicle Plate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none font-mono bg-[#FBF8F1]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                      Vehicle Plate (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABJ-492-XY"
                      value={guestPlate}
                      onChange={(e) => setGuestPlate(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none font-mono uppercase bg-[#FBF8F1]/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    Entry Purpose / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Routine plumbing inspection, Friday prayer visitor"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] outline-none bg-[#FBF8F1]/50"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-3 border-t border-[#E4D9BE] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E4D9BE] text-xs font-bold text-[#10241A] hover:bg-[#F2EAD9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white text-xs font-bold shadow-soft flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#E7D19C]" />
                    <span>Generate & Activate Pass</span>
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
