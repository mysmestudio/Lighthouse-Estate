import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { getStoredPolls, getStoredPollVotes, saveStoredPollVotes } from '../lib/estate-data';

interface TownhallPollsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const TownhallPollsPage: React.FC<TownhallPollsPageProps> = ({ currentUser, navigate }) => {
  const [polls, setPolls] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setPolls(getStoredPolls());
    setVotes(getStoredPollVotes());
  }, []);

  const handleVote = (pollId: string, optionId: string, optionLabel: string) => {
    const houseNumber = currentUser?.house_number;
    
    // Check if household already voted
    const alreadyVoted = votes.some(v => v.poll_id === pollId && v.house_number === houseNumber);
    if (alreadyVoted) return;

    const newVote = {
      id: Math.random().toString(36).substr(2, 9),
      poll_id: pollId,
      option_id: optionId,
      house_number: houseNumber,
      voter_id: currentUser?.id,
      timestamp: new Date().toISOString()
    };

    const updatedVotes = [...votes, newVote];
    setVotes(updatedVotes);
    saveStoredPollVotes(updatedVotes);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const getPollStats = (poll: any) => {
    const pollVotes = votes.filter(v => v.poll_id === poll.id);
    const totalVotes = pollVotes.length;
    
    // Fallback to mock turnout/pct if no real votes exist yet
    const hasRealVotes = totalVotes > 0;
    
    const optionStats = (poll.options || []).map((opt: any) => {
      if (!hasRealVotes) return { ...opt }; // use mock pct
      const optVotes = pollVotes.filter(v => v.option_id === opt.id).length;
      return {
        ...opt,
        pct: Math.round((optVotes / totalVotes) * 100)
      };
    });

    const houseNumber = currentUser?.house_number;
    const myVote = votes.find(v => v.poll_id === poll.id && v.house_number === houseNumber);
    
    return {
      totalVotes,
      hasRealVotes,
      optionStats,
      hasVoted: !!myVote,
      myVoteLabel: myVote ? (poll.options || []).find((o: any) => o.id === myVote.option_id)?.label : null
    };
  };

  const openPolls = polls.filter(p => p.status === 'open');
  const closedPolls = polls.filter(p => p.status === 'closed');

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
          <button onClick={() => navigate('/dashboard')} className="icon-btn">&#8592;</button>
        </div>
        <h1>Townhall polls</h1>
        <p className="muted" style={{ marginTop: 8 }}>Your household gets one vote per poll.</p>
      </div>

      <div className="sheet pad">
        <div className="section-head" style={{ marginTop: 4 }}><h3>Open now</h3></div>

        {openPolls.map(poll => {
          const stats = getPollStats(poll);
          
          return (
            <div className="card" style={{ marginBottom: 14 }} key={poll.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <h4>{poll.title}</h4><span className="pill pill-gold">{poll.closesIn}</span>
              </div>
              <p className="tiny muted" style={{ marginTop: 8 }}>{poll.description}</p>
              <div style={{ marginTop: 16 }}>
                {stats.optionStats.map((opt: any) => {
                  const isMyVote = stats.myVoteLabel === opt.label;
                  return (
                    <div 
                      key={opt.id}
                      className={`voteopt ${stats.hasVoted ? 'voted' : ''} ${isMyVote ? 'on' : ''}`}
                      onClick={() => handleVote(poll.id, opt.id, opt.label)}
                    >
                      <div className="fill" style={{ width: stats.hasVoted ? `${opt.pct}%` : '0%' }}></div>
                      <div className="voteopt-inner">
                        <span className="label">{opt.label}</span>
                        <span className="pct">{opt.pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pollmeta">
                <span>{stats.hasRealVotes ? `${stats.totalVotes} households voted` : `${poll.turnout}% of households voted`}</span>
                <span>{stats.hasVoted ? `You voted: ${stats.myVoteLabel}` : 'Tap an option to vote'}</span>
              </div>
            </div>
          );
        })}

        <div className="section">
          <div className="section-head"><h3>Closed polls</h3></div>
          {closedPolls.map(poll => (
            <div className="row" key={poll.id}>
              <div className="grow">
                <div className="t">{poll.title}</div>
                <div className="s">{poll.turnout}% turnout &middot; {poll.closesIn}</div>
              </div>
              <span className={`pill ${poll.passed ? 'pill-mint' : 'pill-red'}`}>{poll.passed ? 'Passed' : 'Rejected'}</span>
            </div>
          ))}
        </div>

        <p className="footer-note">Results are visible to all residents once you've cast your vote.</p>
      </div>
      <div className={`toast ${showToast ? 'show' : ''}`}>Vote recorded</div>
    </div>
  );
};
