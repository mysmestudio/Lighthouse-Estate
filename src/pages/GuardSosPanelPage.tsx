import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { getStoredSosEvents, saveStoredSosEvents } from '../lib/estate-data';

interface GuardSosPanelPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const GuardSosPanelPage: React.FC<GuardSosPanelPageProps> = ({ currentUser, navigate }) => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    setEvents(getStoredSosEvents());
    const interval = setInterval(() => {
      setEvents(getStoredSosEvents());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = () => {
    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      resident_name: 'Dr. Tariq Al-Mansoor',
      house_number: 14,
      resident_phone: '0803 555 0142',
      triggered_at: new Date().toISOString(),
      status: 'triggered'
    };
    const updated = [newEvent, ...events];
    setEvents(updated);
    saveStoredSosEvents(updated);

    if (navigator.vibrate) navigator.vibrate([200,100,200,100,200]);
  };

  const handleAcknowledge = (id: string) => {
    const updated = events.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'acknowledged',
          acknowledged_by: currentUser?.full_name || 'Guard',
          notes: `acknowledged by ${currentUser?.full_name || 'you'}`
        };
      }
      return e;
    });
    setEvents(updated);
    saveStoredSosEvents(updated);
  };

  const handleResolve = (id: string) => {
    const updated = events.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'resolved',
          notes: 'resolved, confirmed safe'
        };
      }
      return e;
    });
    setEvents(updated);
    saveStoredSosEvents(updated);
  };

  const activeEvent = events.find(e => e.status === 'triggered');
  const pastEvents = events.filter(e => e.status !== 'triggered');

  const formatTimeAgo = (isoString: string) => {
    const d = new Date(isoString);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr`;
    return 'Yesterday';
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="shell" style={{ backgroundColor: "var(--deep-800)", color: "#fff", minHeight: "100vh" }}>
      <div className="topbar">
        <div>
          <div className="gatelabel" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => navigate('/gate')} style={{ background: 'transparent', border: 'none', color: 'white', padding: 0, cursor: 'pointer', fontSize: 16 }}>&#8592;</button>
            SOS Monitor
          </div>
          <div className="officertag">Officer: {currentUser?.full_name || 'Chinedu A.'} &middot; Gate 1</div>
        </div>
        <span className="pill-live"><i className="dot"></i>Live</span>
      </div>

      <div className={`banner ${activeEvent ? 'show' : ''}`} id="banner">
        {activeEvent && (
          <div className="banner-inner">
            <div className="tag">Active emergency</div>
            <h3>{activeEvent.is_guard ? 'Guard' : `House ${activeEvent.house_number}`} &middot; {activeEvent.resident_name}</h3>
            <p className="sub">SOS triggered {formatTimeAgo(activeEvent.triggered_at)} ago &middot; {activeEvent.is_guard ? 'Gate' : 'Main house'} &middot; {activeEvent.resident_phone || ''}</p>
            <div className="actions">
              {activeEvent.resident_phone && (
                <button className="actbtn-call" onClick={() => window.location.href = `tel:${activeEvent.resident_phone}`}>&#128222; Call resident</button>
              )}
              <button className="actbtn-ack" onClick={() => handleAcknowledge(activeEvent.id)}>Acknowledge</button>
            </div>
          </div>
        )}
      </div>

      <div className="pad section">
        <div className="section-head"><h3>Today</h3></div>
        
        {pastEvents.length === 0 && (
          <p className="tiny muted">No recent SOS events.</p>
        )}

        {pastEvents.map(e => (
          <div className={`arow ${e.status === 'acknowledged' ? 'ack' : 'resolved'}`} key={e.id}>
            <span className="sq">&#9888;</span>
            <div className="grow">
              <div className="t">{e.is_guard ? 'Guard' : `House ${e.house_number}`} &middot; {e.resident_name}</div>
              <div className="s">{formatTime(e.triggered_at)} &middot; {e.notes}</div>
            </div>
            {e.status === 'acknowledged' ? (
              <button onClick={() => handleResolve(e.id)} className="apill ack" style={{ cursor: 'pointer', border: 'none' }}>Mark Resolved</button>
            ) : (
              <span className="apill resolved">Resolved</span>
            )}
          </div>
        ))}
      </div>

      <div className="demo">
        <button id="simBtn" onClick={handleSimulate}>Simulate incoming SOS</button>
      </div>
      <p className="footer-note">Every SOS is logged here whether acknowledged, resolved or false alarm.</p>
    </div>
  );
};
