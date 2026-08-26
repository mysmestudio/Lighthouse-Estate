import React, { useState, useEffect, useRef } from 'react';
import { 
  Vote, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Eye, 
  BarChart3, 
  Calendar, 
  X, 
  AlertCircle,
  Bell,
  Check,
  Search,
  ChevronRight
} from 'lucide-react';
import { AppUser, PollWithStats, PollVisibility } from '../types';
import { fetchPollsWithStats, createTownhallPoll, castVote, closeTownhallPoll } from '../lib/community-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface TownhallPollsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const TownhallPollsPage: React.FC<TownhallPollsPageProps> = ({ currentUser, navigate }) => {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  
  // Voting state
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);

  // Admin Create Poll Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [newVisibility, setNewVisibility] = useState<PollVisibility>('after_vote');
  const [newCloseDate, setNewCloseDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';

  const loadPolls = async () => {
    setLoading(true);
    try {
      const data = await fetchPollsWithStats(currentUser?.id);
      setPolls(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, [currentUser?.id]);

  const handleOptionSelect = (pollId: string, optionId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
    setVoteError(null);
  };

  const handleVoteSubmit = async (pollId: string) => {
    if (!currentUser) {
      setVoteError('Please sign in with your resident PIN to cast your vote.');
      return;
    }

    const optionId = selectedOptions[pollId];
    if (!optionId) {
      setVoteError('Please select one option before submitting.');
      return;
    }

    setVotingPollId(pollId);
    setVoteError(null);
    setVoteSuccess(null);

    try {
      const res = await castVote({
        pollId,
        optionId,
        user: currentUser,
      });

      if (res.error) {
        setVoteError(res.error);
      } else {
        setVoteSuccess('Your vote has been recorded securely.');
        await loadPolls();
      }
    } catch (e: any) {
      setVoteError(e?.message || 'Failed to submit vote.');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const validOptions = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      setCreateError('Please provide at least 2 distinct choices.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await createTownhallPoll({
        question: newQuestion,
        description: newDescription,
        options: validOptions,
        results_visibility: newVisibility,
        close_date: newCloseDate || null,
        creator: currentUser,
      });

      if (res.error) {
        setCreateError(res.error);
      } else {
        setShowCreateModal(false);
        setNewQuestion('');
        setNewDescription('');
        setNewOptions(['', '']);
        setNewVisibility('after_vote');
        setNewCloseDate('');
        await loadPolls();
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to publish poll.');
    } finally {
      setCreateLoading(false);
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

  const filteredPolls = polls.filter((p) => {
    if (filter === 'open') return p.status === 'open';
    if (filter === 'closed') return p.status === 'closed';
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
          <pattern id="lattice-polls" width="56" height="56" patternUnits="userSpaceOnUse">
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
              : 'Townhall Polls'}
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
          <rect width="100%" height="100%" fill="url(#lattice-polls)" />
        </svg>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Sora'] font-bold text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                Community Townhall Polls
              </h1>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Participate in verified estate decisions, vote on community infrastructure, and review ballot statistics.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Ballot</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-[#EAF7EE] p-1 rounded-xl border border-[#3FAE7A]/20">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'all' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                All Polls ({polls.length})
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'open' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('closed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'closed' ? 'bg-white text-[#257A54] shadow-xs' : 'text-[#516459]'
                }`}
              >
                Concluded
              </button>
            </div>

            {/* Subnav links */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/fix-it-tickets')}
                className="text-xs font-bold text-[#257A54] hover:underline"
              >
                Fix-It Tickets &rarr;
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {voteError && (
            <div className="p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{voteError}</span>
            </div>
          )}
          {voteSuccess && (
            <div className="p-3 rounded-xl bg-[#EAF7EE] border border-[#3FAE7A]/30 text-[#257A54] text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{voteSuccess}</span>
            </div>
          )}

          {/* Polls List */}
          <div className="space-y-4">
            {filteredPolls.length === 0 ? (
              <div className="bg-white border border-[#E3EFE7] rounded-2xl p-10 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                  <Vote className="w-6 h-6" />
                </div>
                <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">No townhall polls available</h3>
                <p className="text-xs text-[#516459] max-w-sm mx-auto">
                  All community ballot questions will appear here for resident voting.
                </p>
              </div>
            ) : (
              filteredPolls.map((poll) => {
                const isClosed = poll.status === 'closed';
                const hasVoted = Boolean(poll.userVotedOptionId);
                const selectedOptId = selectedOptions[poll.id] || poll.userVotedOptionId;

                return (
                  <div
                    key={poll.id}
                    className="bg-white border border-[#E3EFE7] rounded-2xl p-5 shadow-xs transition-all hover:border-[#3FAE7A]/40"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-['Sora'] font-bold uppercase tracking-wider ${
                        isClosed ? 'bg-[#E3EFE7] text-[#516459]' : 'bg-[#EAF7EE] text-[#257A54]'
                      }`}>
                        {isClosed ? 'Poll Concluded' : 'Open Ballot'}
                      </span>
                      <span className="text-[11px] text-[#8AA096] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {poll.votesCount || 0} votes recorded
                      </span>
                    </div>

                    <h3 className="font-['Sora'] font-bold text-base text-[#16241D] mb-1">
                      {poll.question}
                    </h3>
                    {poll.description && (
                      <p className="text-xs text-[#516459] leading-relaxed mb-4">
                        {poll.description}
                      </p>
                    )}

                    {/* Options / Results */}
                    <div className="space-y-2 mb-4">
                      {poll.options.map((opt) => {
                        const isChosen = selectedOptId === opt.id;
                        const percentage = poll.optionVotePercentages?.[opt.id] ?? 0;
                        const count = poll.optionVoteCounts?.[opt.id] ?? 0;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              if (!hasVoted && !isClosed) handleOptionSelect(poll.id, opt.id);
                            }}
                            className={`p-3 rounded-xl border text-xs font-semibold transition-all relative overflow-hidden ${
                              hasVoted || isClosed ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              isChosen
                                ? 'border-[#257A54] bg-[#EAF7EE]/50 text-[#16241D]'
                                : 'border-[#E3EFE7] bg-[#FBFDF9] text-[#516459] hover:border-[#3FAE7A]/40'
                            }`}
                          >
                            {(hasVoted || isClosed) && (
                              <div
                                className="absolute inset-y-0 left-0 bg-[#3FAE7A]/15 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            )}
                            <div className="relative flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isChosen ? 'border-[#257A54] bg-[#257A54] text-white' : 'border-[#8AA096]'
                                }`}>
                                  {isChosen && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span>{opt.text}</span>
                              </span>
                              {(hasVoted || isClosed) && (
                                <span className="font-mono text-xs font-bold text-[#257A54]">
                                  {percentage}% ({count})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!hasVoted && !isClosed && (
                      <button
                        onClick={() => handleVoteSubmit(poll.id)}
                        disabled={votingPollId === poll.id || !selectedOptions[poll.id]}
                        className="w-full py-2.5 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                      >
                        {votingPollId === poll.id ? 'Submitting Ballot...' : 'Cast Secure Vote'}
                      </button>
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

      {/* CREATE POLL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="font-['Sora'] font-bold text-[10.5px] uppercase tracking-wider text-[#257A54]">
                Exco Governance
              </span>
              <h2 className="font-['Sora'] font-bold text-xl text-[#16241D] mt-0.5">
                New Townhall Ballot
              </h2>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3.5 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-xs font-semibold">
                  {createError}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upgrade estate solar streetlight inverters?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                  Description / Context
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief background on the resolution..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                  Voting Choices (At least 2) *
                </label>
                <div className="space-y-2">
                  {newOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[idx] = e.target.value;
                        setNewOptions(updated);
                      }}
                      className="w-full h-9 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs focus:outline-none focus:border-[#3FAE7A]"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewOptions([...newOptions, ''])}
                  className="mt-2 text-xs font-bold text-[#257A54] hover:underline"
                >
                  + Add another choice
                </button>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-['Sora'] font-bold text-sm hover:bg-[#DDB63A] active:scale-98 transition-all mt-2"
              >
                {createLoading ? 'Publishing...' : 'Publish Townhall Poll'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
