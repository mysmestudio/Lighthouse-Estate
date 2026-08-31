import React, { useState, useEffect } from 'react';
import { AppUser, EstateNotice } from '../types';
import { getStoredNotices } from '../lib/estate-data';

interface NoticesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'info', label: 'Info' },
  { id: 'maintenance', label: 'Maintenance' }
];

export const NoticesPage: React.FC<NoticesPageProps> = ({ currentUser, navigate }) => {
  const [notices, setNotices] = useState<EstateNotice[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setNotices(getStoredNotices());
  }, []);

  const filteredNotices = notices.filter(n => filter === 'all' || n.category === filter);

  const getPillData = (category: string | undefined) => {
    if (category === 'emergency') return { className: 'pill-red', label: 'Emergency' };
    if (category === 'maintenance') return { className: 'pill-gold', label: 'Maintenance' };
    return { className: 'pill-mint', label: 'Info' }; // defaults to info/announcement
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
          <button onClick={() => navigate('/dashboard')} className="icon-btn">&#8592;</button>
        </div>
        <h1>Notice board</h1>
        <p className="muted" style={{ marginTop: 8 }}>Estate gazettes &amp; announcements.</p>
      </div>

      <div className="sheet pad">
        <div className="chips" id="filterChips">
          {CHIPS.map(chip => (
            <button 
              key={chip.id} 
              className={`chip ${filter === chip.id ? 'on' : ''}`}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {filteredNotices.map(notice => {
          const pill = getPillData(notice.category);
          return (
            <div className="notice card" key={notice.id}>
              <span className={`pill ${pill.className}`}>{pill.label}</span>
              <h4>{notice.title}</h4>
              <p className="body">{notice.body || notice.content}</p>
              <p className="date">{formatDate(notice.created_at)}</p>
            </div>
          );
        })}

        {filteredNotices.length === 0 && (
          <p className="tiny muted">No notices found.</p>
        )}

        <p className="footer-note">Posted by Estate Admin &amp; Madrasa Admin.</p>
      </div>
    </div>
  );
};
