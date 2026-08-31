import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { getStoredFixItTickets, saveStoredFixItTickets } from '../lib/estate-data';

interface FixItTicketsPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const CATEGORIES = [
  { id: 'Electrical', label: 'Electrical', ico: '⚡', className: '' },
  { id: 'Plumbing', label: 'Plumbing', ico: '💧', className: 'gold' },
  { id: 'Security', label: 'Security', ico: '🛡️', className: 'red' },
  { id: 'Other', label: 'Other', ico: '🔧', className: '' }
];

export const FixItTicketsPage: React.FC<FixItTicketsPageProps> = ({ currentUser, navigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('Electrical');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Routine — fix within the week');
  const [showToast, setShowToast] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    setTickets(getStoredFixItTickets());
  }, []);

  const handleSubmitTicket = () => {
    if (!description.trim()) return;

    const newTicket = {
      id: Math.random().toString(36).substr(2, 9),
      resident_id: currentUser?.id || 'res1',
      resident_name: currentUser?.full_name || 'Resident',
      category: selectedCategory,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
      urgency
    };

    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    saveStoredFixItTickets(updatedTickets);

    setDescription('');
    setUrgency('Routine — fix within the week');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  };

  const myTickets = tickets.filter(t => t.resident_id === currentUser?.id);

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
          <button onClick={() => navigate('/dashboard')} className="icon-btn">&#8592;</button>
        </div>
        <h1>Fix-it tickets</h1>
        <p className="muted" style={{ marginTop: 8 }}>Report a fault, track it through to resolved.</p>
      </div>

      <div className="sheet pad">
        <div className="section-head" style={{ marginTop: 4 }}><h3>What's the issue?</h3></div>
        <div className="tiles-4" id="catTiles">
          {CATEGORIES.map(cat => (
            <div 
              key={cat.id} 
              className={`tile-4 ${selectedCategory === cat.id ? 'on' : ''}`} 
              onClick={() => setSelectedCategory(cat.id)}
            >
              <div className={`ico ${cat.className}`}>{cat.ico}</div>
              <span className="n">{cat.label}</span>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="card">
            <div className="field">
              <label htmlFor="tDesc">Describe the issue</label>
              <textarea 
                className="input" 
                id="tDesc" 
                placeholder="e.g. Streetlight outside House 42 has been off for two nights"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="tUrgency">Urgency</label>
              <select className="input" id="tUrgency" value={urgency} onChange={e => setUrgency(e.target.value)}>
                <option>Routine — fix within the week</option>
                <option>Urgent — affects safety or access</option>
              </select>
            </div>
            <button className="btn btn-primary" id="submitTicket" onClick={handleSubmitTicket} disabled={!description.trim()}>Submit ticket</button>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><h3>My tickets</h3></div>
          
          {myTickets.length === 0 && (
            <p className="tiny muted">No tickets reported yet.</p>
          )}

          {myTickets.map(t => {
            const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[3];
            // Format time ago
            const daysAgo = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);
            const timeStr = daysAgo === 0 ? 'Reported today' : `Reported ${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
            
            // Stepper logic: 0: pending, 1: assigned, 2: in_progress, 3: resolved
            let step = 1;
            let pillClass = 'pill-grey';
            let statusText = 'Reported';
            if (t.status === 'assigned') { step = 2; pillClass = 'pill-gold'; statusText = 'Assigned'; }
            else if (t.status === 'in_progress') { step = 3; pillClass = 'pill-gold'; statusText = 'In progress'; }
            else if (t.status === 'resolved') { step = 4; pillClass = 'pill-mint'; statusText = 'Resolved'; }

            // Using exactly the CSS classes provided from fixit-tickets.html
            // e.g. <span class="sq red">&#9889;</span>
            let sqClass = '';
            if (t.category === 'Security') sqClass = 'red';
            else if (t.category === 'Plumbing' || t.category === 'Other') sqClass = 'gold';

            return (
              <div className="row" key={t.id}>
                <span className={`sq ${sqClass}`}>{cat.ico}</span>
                <div className="grow">
                  <div className="t">{t.description}</div>
                  <div className="s">{timeStr}</div>
                  <div className="stepper">
                    <i className={step >= 1 ? 'on' : ''}></i>
                    <i className={step >= 2 ? 'on' : ''}></i>
                    <i className={step >= 3 ? 'on' : ''}></i>
                    <i className={step >= 4 ? 'on' : ''}></i>
                  </div>
                </div>
                <span className={`pill ${pillClass}`}>{statusText}</span>
              </div>
            );
          })}
        </div>

        <p className="footer-note">Urgent tickets are routed directly to Estate Admin.</p>
      </div>
      <div className={`toast ${showToast ? 'show' : ''}`}>Ticket submitted</div>
    </div>
  );
};
