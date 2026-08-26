import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Droplet, 
  ShieldCheck, 
  FileText, 
  Camera, 
  X, 
  AlertCircle,
  ChevronRight,
  Filter,
  User,
  Home,
  MessageSquare,
  Bell,
  Sparkles,
  Search
} from 'lucide-react';
import { AppUser, FixItTicket, TicketCategory, TicketStatus } from '../types';
import { fetchFixItTickets, submitFixItTicket, updateTicketStatusAndResolution } from '../lib/community-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface FixItTicketsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const FixItTicketsPage: React.FC<FixItTicketsPageProps> = ({ currentUser, navigate }) => {
  const [tickets, setTickets] = useState<FixItTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Submit Ticket Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [category, setCategory] = useState<TicketCategory>('Electrical');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Admin Update Status Modal
  const [selectedTicket, setSelectedTicket] = useState<FixItTicket | null>(null);
  const [adminStatus, setAdminStatus] = useState<TicketStatus>('in_progress');
  const [adminNotes, setAdminNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin' || currentUser?.role === 'security';

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchFixItTickets(currentUser);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentUser?.id, currentUser?.role]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!currentUser) {
      setSubmitError('Please sign in to submit a maintenance ticket.');
      return;
    }

    if (!description.trim()) {
      setSubmitError('Please enter a description of the issue.');
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await submitFixItTicket({
        resident: currentUser,
        category,
        description,
        photoUrl: photoUrl.trim() || undefined,
      });

      if (res.error) {
        setSubmitError(res.error);
      } else {
        setShowSubmitModal(false);
        setDescription('');
        setPhotoUrl('');
        setCategory('Electrical');
        setSubmitSuccess('Ticket submitted! Estate maintenance team has been notified.');
        loadTickets();
        setTimeout(() => setSubmitSuccess(null), 4000);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit ticket');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setUpdateLoading(true);
    try {
      const res = await updateTicketStatusAndResolution({
        ticketId: selectedTicket.id,
        status: adminStatus,
        resolutionNotes: adminNotes.trim() || undefined,
        adminName: currentUser?.full_name || 'Admin',
      });

      if (res.success) {
        setSelectedTicket(null);
        loadTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openAdminModal = (ticket: FixItTicket) => {
    setSelectedTicket(ticket);
    setAdminStatus(ticket.status);
    setAdminNotes(ticket.resolution_notes || '');
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const getCategoryIcon = (cat: TicketCategory) => {
    switch (cat) {
      case 'Electrical':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Plumbing':
        return <Droplet className="w-4 h-4 text-sky-500" />;
      case 'Security':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      default:
        return <Wrench className="w-4 h-4 text-[#257A54]" />;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FBF3D9] text-[#8C6D1F] border border-[#E8C547]/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#B4922C]" />
            <span>Pending Review</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F1FC] text-[#1E5692] border border-[#B3D4FC] flex items-center gap-1">
            <Wrench className="w-3 h-3 text-[#1E5692]" />
            <span>In Progress</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF7EE] text-[#257A54] border border-[#3FAE7A]/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#3FAE7A]" />
            <span>Resolved</span>
          </span>
        );
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
          <pattern id="lattice-tickets" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Pillbar Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident'
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : 'Maintenance Hub'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs hover:opacity-90 transition-opacity"
            title="Account Settings"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Header with SVG Lattice Pattern */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice-tickets)" />
        </svg>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-[#3FAE7A]/25 text-[#76dfa8] text-[10.5px] font-['Sora'] font-bold uppercase tracking-wider border border-[#3FAE7A]/30">
                  Estate Services
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[10.5px] font-bold">
                  {tickets.length} Active Tickets
                </span>
              </div>
              <h1 className="font-['Sora'] font-bold text-xl sm:text-2xl tracking-tight text-white">
                Fix-It Maintenance Tickets
              </h1>
              <p className="text-xs text-white/70">
                Log repairs, report electrical/plumbing issues, and track facility maintenance
              </p>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rounded Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Success Toast */}
          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-[#EAF7EE] border border-[#3FAE7A]/30 text-[#257A54] text-xs font-semibold flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E3EFE7] shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['all', 'pending', 'in_progress', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-['Sora'] font-bold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#123528] text-white shadow-xs'
                      : 'bg-[#FBFDF9] text-[#516459] hover:bg-[#EAF7EE] hover:text-[#123528]'
                  }`}
                >
                  {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
            >
              <option value="all">All Categories</option>
              <option value="Electrical">⚡ Electrical</option>
              <option value="Plumbing">💧 Plumbing</option>
              <option value="Security">🛡️ Security</option>
              <option value="Carpentry">🪚 Carpentry</option>
              <option value="HVAC">❄️ AC / HVAC</option>
              <option value="Other">🔧 Other</option>
            </select>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="py-16 text-center text-xs font-semibold text-[#8AA096]">
              Loading maintenance tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white border border-[#E3EFE7] rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="font-['Sora'] font-bold text-sm text-[#16241D]">No tickets found</h3>
              <p className="text-xs text-[#8AA096] max-w-sm mx-auto">
                {statusFilter === 'all' && categoryFilter === 'all'
                  ? 'All estate facilities and household services are running normally.'
                  : 'No maintenance requests match your selected filters.'}
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123528] text-white font-['Sora'] font-bold text-xs hover:bg-[#0D2A1F] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E8C547]" />
                <span>Submit New Ticket</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-[#E3EFE7] hover:border-[#3FAE7A]/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FBFDF9] border border-[#E3EFE7] text-xs font-bold text-[#16241D] flex items-center gap-1.5">
                        {getCategoryIcon(ticket.category)}
                        <span>{ticket.category}</span>
                      </span>
                      {getStatusBadge(ticket.status)}
                      <span className="text-[11px] text-[#8AA096] font-medium">
                        House {ticket.house_number} ({ticket.house_unit || 'Main House'})
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#16241D] leading-relaxed">
                      {ticket.description}
                    </p>

                    {ticket.photo_url && (
                      <div className="pt-1">
                        <a
                          href={ticket.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#257A54] hover:underline"
                        >
                          <Camera className="w-3 h-3" />
                          <span>View Attached Photo</span>
                        </a>
                      </div>
                    )}

                    {ticket.resolution_notes && (
                      <div className="p-2.5 rounded-xl bg-[#EAF7EE]/60 border border-[#3FAE7A]/20 text-[11.5px] text-[#257A54]">
                        <strong>Resolution Note:</strong> {ticket.resolution_notes}
                        {ticket.resolved_by && ` (by ${ticket.resolved_by})`}
                      </div>
                    )}

                    <div className="text-[10.5px] text-[#8AA096] flex items-center gap-2">
                      <span>Submitted by {ticket.resident_name}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => openAdminModal(ticket)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#EAF7EE] hover:bg-[#3FAE7A] hover:text-white text-[#257A54] font-['Sora'] font-bold text-xs border border-[#3FAE7A]/30 transition-colors shrink-0 self-start sm:self-center"
                    >
                      Update Status
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* SUBMIT TICKET MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-[#E3EFE7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EFE7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">
                  Submit Maintenance Ticket
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-full bg-[#FBFDF9] hover:bg-[#EAF7EE] text-[#516459] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-[#FCEBEB] text-[#A32D2D] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                >
                  <option value="Electrical">⚡ Electrical (Power, Breaker, Outlets)</option>
                  <option value="Plumbing">💧 Plumbing (Leaks, Water Pressure, Drain)</option>
                  <option value="Security">🛡️ Security (Gate, Access, Intercom)</option>
                  <option value="Carpentry">🪚 Carpentry (Doors, Locks, Cabinets)</option>
                  <option value="HVAC">❄️ HVAC / Air Conditioning</option>
                  <option value="Other">🔧 Other Estate Facility Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Description of Issue *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe the issue, exact location in your house or compound, and any urgency details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Photo URL / Evidence (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] font-['Sora'] font-bold text-xs text-[#516459] hover:bg-[#EAF7EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-3 rounded-xl bg-[#123528] text-white font-['Sora'] font-bold text-xs hover:bg-[#0D2A1F] transition-colors disabled:opacity-50"
                >
                  {submitLoading ? 'Submitting...' : 'Dispatch Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN UPDATE MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-[#E3EFE7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EFE7]">
              <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">
                Update Ticket Status
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-[#FBFDF9] text-[#516459] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Ticket Status
                </label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value as TicketStatus)}
                  className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress / Dispatched</option>
                  <option value="resolved">Resolved / Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Resolution Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Technician dispatched, parts replaced, work order notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] font-['Sora'] font-bold text-xs text-[#516459]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="flex-1 py-3 rounded-xl bg-[#123528] text-white font-['Sora'] font-bold text-xs hover:bg-[#0D2A1F]"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};
