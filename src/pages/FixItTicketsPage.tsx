import React, { useState, useEffect } from 'react';
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
  Vote
} from 'lucide-react';
import { AppUser, FixItTicket, TicketCategory, TicketStatus } from '../types';
import { fetchFixItTickets, submitFixItTicket, updateTicketStatusAndResolution } from '../lib/community-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface FixItTicketsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

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
        setSubmitSuccess('Fix-It ticket submitted. Estate maintenance team has been notified.');
        await loadTickets();
        setTimeout(() => setSubmitSuccess(null), 5000);
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to submit ticket.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser) return;

    setUpdateLoading(true);
    try {
      await updateTicketStatusAndResolution({
        ticketId: selectedTicket.id,
        status: adminStatus,
        resolutionNotes: adminNotes,
        adminName: currentUser.full_name || 'Estate Admin',
      });
      setSelectedTicket(null);
      await loadTickets();
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
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'Plumbing':
        return <Droplet className="w-4 h-4 text-blue-600" />;
      case 'Security':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      default:
        return <Wrench className="w-4 h-4 text-purple-600" />;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Pending</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-sky-700" />
            <span>In Progress</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>Resolved</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 sm:py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb & Community Sub-nav */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E4D9BE]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#10241A]/60">
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#0F472A]">Dashboard</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0F472A] font-bold">Fix-It Maintenance Tickets</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE] text-xs font-semibold">
            <button
              onClick={() => navigate('/community/polls')}
              className="px-3 py-1.5 rounded-lg text-[#10241A]/70 hover:text-[#0F472A] hover:bg-white/60 transition-colors flex items-center gap-1.5"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Townhall Polls</span>
            </button>
            <button
              onClick={() => navigate('/community/tickets')}
              className="px-3 py-1.5 rounded-lg bg-[#0F472A] text-white shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fix-It Tickets</span>
            </button>
            <button
              onClick={() => navigate('/community/marketplace')}
              className="px-3 py-1.5 rounded-lg text-[#10241A]/70 hover:text-[#0F472A] hover:bg-white/60 transition-colors flex items-center gap-1.5"
            >
              <span>Marketplace</span>
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7D19C]/40 border border-[#C89B3C]/30 text-[#0A2F1C] text-xs font-bold uppercase tracking-wider mb-2">
              <Wrench className="w-3.5 h-3.5 text-[#C89B3C]" />
              <span>Estate Maintenance Desk</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2F1C] tracking-tight">
              Fix-It Tickets
            </h1>
            <p className="text-sm sm:text-base text-[#10241A]/70 mt-1 max-w-2xl">
              {isAdmin 
                ? 'Review and manage all estate maintenance requests across Sector A, B, and C.' 
                : 'Report household maintenance issues, street lighting faults, plumbing defects, or security concerns.'}
            </p>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all shadow-soft flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#E7D19C]" />
            <span>Submit Fix-It Ticket</span>
          </button>
        </div>

        <StarMotifDivider className="py-2" />

        {/* Success Banner */}
        {submitSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-medium flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-estate p-4 bg-white border border-[#E4D9BE]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#10241A]/60">Total Tickets</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2F1C] mt-1">{tickets.length}</p>
          </div>
          <div className="card-estate p-4 bg-white border border-[#E4D9BE]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Review</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 mt-1">
              {tickets.filter((t) => t.status === 'pending').length}
            </p>
          </div>
          <div className="card-estate p-4 bg-white border border-[#E4D9BE]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">In Progress</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-sky-700 mt-1">
              {tickets.filter((t) => t.status === 'in_progress').length}
            </p>
          </div>
          <div className="card-estate p-4 bg-white border border-[#E4D9BE]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Resolved</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
              {tickets.filter((t) => t.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E4D9BE] shadow-2xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F2EAD9]/60 p-1 rounded-lg border border-[#E4D9BE] text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-[#0F472A] text-white shadow-xs' : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'pending' ? 'bg-[#0F472A] text-white shadow-xs' : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'in_progress' ? 'bg-[#0F472A] text-white shadow-xs' : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'resolved' ? 'bg-[#0F472A] text-white shadow-xs' : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#C89B3C]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E4D9BE] bg-[#FBF8F1] text-xs font-medium text-[#10241A] focus:ring-1 focus:ring-[#0F472A] focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Security">Security</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Tickets Listing */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 mx-auto border-3 border-[#0F472A] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#10241A]/60">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="card-estate p-12 text-center space-y-3 bg-white">
            <Wrench className="w-10 h-10 mx-auto text-[#C89B3C]/70" />
            <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">No Tickets Found</h3>
            <p className="text-xs text-[#10241A]/60 max-w-md mx-auto">
              {isAdmin 
                ? 'No maintenance tickets match the selected filters.' 
                : 'You have not submitted any maintenance tickets yet. Click "Submit Fix-It Ticket" above to report an issue.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className="card-estate p-5 sm:p-6 bg-white border border-[#E4D9BE] hover:border-[#C89B3C] shadow-soft transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4D9BE]/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F2EAD9] border border-[#E4D9BE]">
                      {getCategoryIcon(ticket.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0A2F1C]">
                          {ticket.category} Issue
                        </span>
                        <span className="text-xs text-[#10241A]/40 font-mono">
                          #{ticket.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-[#10241A]/60 flex items-center gap-1.5 mt-0.5">
                        <Home className="w-3 h-3 text-[#C89B3C]" />
                        <span>House {ticket.house_number} ({ticket.house_unit})</span>
                        <span>•</span>
                        <span>Submitted by {ticket.resident_name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs text-[#10241A]/50">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Description Body */}
                <div className="text-sm text-[#10241A] leading-relaxed">
                  {ticket.description}
                </div>

                {/* Photo Attachment if available */}
                {ticket.photo_url && (
                  <div className="p-2 rounded-lg bg-[#FBF8F1] border border-[#E4D9BE] inline-flex items-center gap-2 text-xs text-[#0F472A]">
                    <Camera className="w-4 h-4 text-[#C89B3C]" />
                    <span>Photo attached by resident</span>
                  </div>
                )}

                {/* Resolution Notes Box if provided */}
                {ticket.resolution_notes && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Resolution Update ({ticket.resolved_by || 'Maintenance'}):</span>
                    </div>
                    <p className="leading-relaxed pl-5">{ticket.resolution_notes}</p>
                  </div>
                )}

                {/* Admin Management Action */}
                {isAdmin && (
                  <div className="pt-2 flex justify-end border-t border-[#E4D9BE]/40">
                    <button
                      type="button"
                      onClick={() => openAdminModal(ticket)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#F2EAD9] hover:bg-[#E7D19C] text-[#0A2F1C] border border-[#E4D9BE] text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5 text-[#0F472A]" />
                      <span>Update Status & Notes</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resident Submit Ticket Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#C89B3C] shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#0F472A]" />
                <h3 className="font-serif text-xl font-bold text-[#0A2F1C]">
                  Submit Fix-It Ticket
                </h3>
              </div>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                >
                  <option value="Electrical">⚡ Electrical (Streetlights, Inverter line, Phase fault)</option>
                  <option value="Plumbing">💧 Plumbing (Water pressure, Drainage, Leakage)</option>
                  <option value="Security">🛡️ Security (Perimeter fence, Gates, CCTV, Sensor)</option>
                  <option value="Other">🔧 Other Maintenance Request</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Description of Issue *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the exact location and symptoms (e.g. Streetlight pole #14 facing driveway flickers at night)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Photo Link / Reference (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#C89B3C] shrink-0" />
                  <input
                    type="text"
                    placeholder="https://... or photo description"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE] text-xs text-[#10241A]/70">
                <span className="font-bold text-[#0A2F1C]">Submitting for: </span>
                <span>House {currentUser?.house_number || 14} ({currentUser?.house_unit || 'Main House'}), {currentUser?.full_name}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4D9BE]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-6 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#E7D19C]" />
                  )}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Update Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#C89B3C] shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#0F472A]" />
                <h3 className="font-serif text-xl font-bold text-[#0A2F1C]">
                  Update Ticket #{selectedTicket.id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Ticket Status *
                </label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value as TicketStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                >
                  <option value="pending">⏳ Pending (Awaiting Assignment)</option>
                  <option value="in_progress">⚙️ In Progress (Technician Assigned)</option>
                  <option value="resolved">✅ Resolved (Work Completed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Resolution Notes / Work Update
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Technician dispatched, inverter ballast replaced, verified working..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4D9BE]">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-6 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {updateLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#E7D19C]" />
                  )}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
