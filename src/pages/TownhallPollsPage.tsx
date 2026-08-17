import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { AppUser, PollWithStats, PollVisibility } from '../types';
import { fetchPollsWithStats, createTownhallPoll, castVote, closeTownhallPoll } from '../lib/community-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface TownhallPollsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

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

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin';

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
        setTimeout(() => setVoteSuccess(null), 4000);
      }
    } catch (e: any) {
      setVoteError(e?.message || 'Failed to record vote. Please try again.');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to close this poll? Voting will end immediately.')) return;
    await closeTownhallPoll(pollId);
    await loadPolls();
  };

  // Option input manipulation for Admin modal
  const handleAddOptionField = () => {
    if (newOptions.length < 4) {
      setNewOptions([...newOptions, '']);
    }
  };

  const handleRemoveOptionField = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionTextChange = (index: number, val: string) => {
    const updated = [...newOptions];
    updated[index] = val;
    setNewOptions(updated);
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!currentUser) return;

    if (!newQuestion.trim()) {
      setCreateError('Please enter a poll question.');
      return;
    }

    const validOptions = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      setCreateError('Please provide at least 2 non-empty options.');
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

  const filteredPolls = polls.filter((p) => {
    if (filter === 'open') return p.status === 'open';
    if (filter === 'closed') return p.status === 'closed';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 sm:py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb / Community Sub-nav */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E4D9BE]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#10241A]/60">
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#0F472A]">Dashboard</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0F472A] font-bold">Community Townhall Polls</span>
          </div>

          {/* Quick Tabs to other community features */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE] text-xs font-semibold">
            <button
              onClick={() => navigate('/community/polls')}
              className="px-3 py-1.5 rounded-lg bg-[#0F472A] text-white shadow-2xs flex items-center gap-1.5"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Townhall Polls</span>
            </button>
            <button
              onClick={() => navigate('/community/tickets')}
              className="px-3 py-1.5 rounded-lg text-[#10241A]/70 hover:text-[#0F472A] hover:bg-white/60 transition-colors flex items-center gap-1.5"
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
              <Vote className="w-3.5 h-3.5 text-[#C89B3C]" />
              <span>Estate Governance & Consensus</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2F1C] tracking-tight">
              Townhall Polls
            </h1>
            <p className="text-sm sm:text-base text-[#10241A]/70 mt-1 max-w-2xl">
              Vote on community initiatives, infrastructure upgrades, and estate decisions. Residents vote once per verified household unit.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all shadow-soft flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#E7D19C]" />
              <span>Create New Poll</span>
            </button>
          )}
        </div>

        <StarMotifDivider className="py-2" />

        {/* Status Banners */}
        {voteSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-medium flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{voteSuccess}</span>
          </div>
        )}
        {voteError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm font-medium flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{voteError}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E4D9BE] text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-[#0F472A] text-white'
                  : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              All Polls ({polls.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'open'
                  ? 'bg-[#0F472A] text-white'
                  : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              Active ({polls.filter((p) => p.status === 'open').length})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'closed'
                  ? 'bg-[#0F472A] text-white'
                  : 'text-[#10241A]/70 hover:bg-[#F2EAD9]'
              }`}
            >
              Closed ({polls.filter((p) => p.status === 'closed').length})
            </button>
          </div>

          <span className="text-xs text-[#10241A]/60 font-medium">
            {currentUser?.role === 'resident' ? `Voting as: House ${currentUser.house_number}` : '1 vote per household unit'}
          </span>
        </div>

        {/* Polls List */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 mx-auto border-3 border-[#0F472A] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#10241A]/60">Loading estate townhall polls...</p>
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="card-estate p-12 text-center space-y-3 bg-white">
            <Vote className="w-10 h-10 mx-auto text-[#C89B3C]/70" />
            <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">No Polls Found</h3>
            <p className="text-xs text-[#10241A]/60 max-w-md mx-auto">
              There are currently no polls matching your selected filter. Check back soon or contact Estate Management.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredPolls.map((poll) => {
              const hasVoted = Boolean(poll.userVotedOptionId);
              const isClosed = poll.status === 'closed';

              return (
                <div 
                  key={poll.id} 
                  className={`card-estate p-6 sm:p-8 bg-white border transition-all ${
                    isClosed ? 'border-[#E4D9BE]/60 bg-[#FBF8F1]/50' : 'border-[#E4D9BE] hover:border-[#C89B3C]/80 shadow-soft'
                  }`}
                >
                  {/* Card Top Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E4D9BE]/60">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isClosed 
                          ? 'bg-neutral-100 text-neutral-600 border border-neutral-300' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {isClosed ? 'Poll Closed' : 'Open for Voting'}
                      </span>

                      {hasVoted && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-700" />
                          <span>You Voted</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#10241A]/60">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5 text-[#C89B3C]" />
                        <strong>{poll.votesCount}</strong> {poll.votesCount === 1 ? 'vote' : 'votes'}
                      </span>
                      {poll.close_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#10241A]/40" />
                          <span>{isClosed ? 'Closed' : 'Closes'}: {new Date(poll.close_date).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question & Description */}
                  <div className="py-4 space-y-2">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0A2F1C]">
                      {poll.question}
                    </h3>
                    {poll.description && (
                      <p className="text-sm text-[#10241A]/70 leading-relaxed">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  {/* Options & Results Area */}
                  <div className="space-y-3 pt-2">
                    {poll.options.map((option) => {
                      const percentage = poll.optionVotePercentages[option.id] || 0;
                      const count = poll.optionVoteCounts[option.id] || 0;
                      const isUserSelected = poll.userVotedOptionId === option.id;
                      const isRadioSelected = selectedOptions[poll.id] === option.id;

                      // Display Results Mode (horizontal bar)
                      if (poll.canViewResults) {
                        return (
                          <div 
                            key={option.id}
                            className={`p-3.5 rounded-xl border relative overflow-hidden transition-all ${
                              isUserSelected 
                                ? 'border-[#0F472A] bg-[#F2EAD9]/40 ring-1 ring-[#0F472A]' 
                                : 'border-[#E4D9BE] bg-[#FBF8F1]/40'
                            }`}
                          >
                            {/* Horizontal Percentage Fill Bar */}
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-[#E7D19C]/35 transition-all duration-500 rounded-l-xl"
                              style={{ width: `${percentage}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                {isUserSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-[#0F472A] shrink-0" />
                                )}
                                <span className={`text-sm font-semibold ${isUserSelected ? 'text-[#0A2F1C] font-bold' : 'text-[#10241A]'}`}>
                                  {option.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-medium text-[#10241A]/60">
                                  {count} {count === 1 ? 'vote' : 'votes'}
                                </span>
                                <span className="font-mono font-bold text-sm text-[#0F472A] min-w-[3rem] text-right">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Interactive Voting Options Mode (when results are hidden until voted/closed)
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isRadioSelected
                              ? 'border-[#0F472A] bg-[#F2EAD9]/60 shadow-xs'
                              : 'border-[#E4D9BE] hover:border-[#C89B3C] bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`poll-${poll.id}`}
                            value={option.id}
                            checked={isRadioSelected}
                            onChange={() => handleOptionSelect(poll.id, option.id)}
                            disabled={isClosed || hasVoted}
                            className="w-4 h-4 text-[#0F472A] focus:ring-[#0F472A] border-[#C89B3C]"
                          />
                          <span className="text-sm font-medium text-[#10241A]">
                            {option.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-4 border-t border-[#E4D9BE]/60">
                    <div className="text-xs text-[#10241A]/60 flex items-center gap-1.5">
                      <span className="font-semibold text-[#0A2F1C]">Created by:</span>
                      <span>{poll.creator_name}</span>
                      <span className="text-[#C89B3C]">•</span>
                      <span>
                        {poll.results_visibility === 'after_vote' 
                          ? 'Results visible after voting' 
                          : poll.results_visibility === 'after_close'
                          ? 'Results visible after poll closes'
                          : 'Live public results'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasVoted && !isClosed && (
                        <button
                          type="button"
                          onClick={() => handleVoteSubmit(poll.id)}
                          disabled={votingPollId === poll.id || !selectedOptions[poll.id]}
                          className="px-5 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-xs hover:bg-[#0A2F1C] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft flex items-center gap-1.5"
                        >
                          {votingPollId === poll.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Vote className="w-3.5 h-3.5 text-[#E7D19C]" />
                          )}
                          <span>Submit Vote</span>
                        </button>
                      )}

                      {isAdmin && !isClosed && (
                        <button
                          type="button"
                          onClick={() => handleClosePoll(poll.id)}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 text-xs font-semibold transition-colors"
                        >
                          Close Poll Early
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#C89B3C] shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-[#0F472A]" />
                <h3 className="font-serif text-xl font-bold text-[#0A2F1C]">
                  Create Townhall Poll
                </h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePollSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Poll Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solar perimeter lighting vs playground equipment priority"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Context / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide background context or budget estimates for residents..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              {/* Options (2 to 4) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Voting Options (2 to 4) *
                  </label>
                  {newOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-xs font-bold text-[#0F472A] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-mono font-bold text-[#C89B3C]">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1} text`}
                        value={opt}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="p-2 text-neutral-400 hover:text-red-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visibility and Close Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Results Visibility
                  </label>
                  <select
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(e.target.value as PollVisibility)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  >
                    <option value="after_vote">Visible after user votes (Recommended)</option>
                    <option value="after_close">Visible only after poll closes</option>
                    <option value="always">Always visible to everyone</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Optional Close Date
                  </label>
                  <input
                    type="date"
                    value={newCloseDate}
                    onChange={(e) => setNewCloseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4D9BE]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#E7D19C]" />
                  )}
                  <span>Publish Poll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
