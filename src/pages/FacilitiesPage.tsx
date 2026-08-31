import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { getStoredFacilityBookings, saveStoredFacilityBookings } from '../lib/estate-data';

interface FacilitiesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ALL_SLOTS = [
  { id: '8-10', label: '8–10am' },
  { id: '10-12', label: '10–12pm' },
  { id: '12-2', label: '12–2pm' },
  { id: '2-4', label: '2–4pm' },
  { id: '4-6', label: '4–6pm' },
  { id: '6-8', label: '6–8pm' }
];

export const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ currentUser, navigate }) => {
  const [selectedFacility, setSelectedFacility] = useState('pitch');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    setBookings(getStoredFacilityBookings());
  }, []);

  const facilityDetails: Record<string, { name: string; fee: string; ico: string; className?: string }> = {
    pitch: { name: 'Football Pitch', fee: '₦5,000 + ₦10,000 deposit', ico: '⚽' },
    mosque: { name: 'Mosque Hall', fee: 'Free for residents', ico: '🕌', className: 'gold' },
    kitchen: { name: 'Community Kitchen', fee: '₦8,000 + ₦15,000 deposit', ico: '🍲' },
    clubhouse: { name: 'Clubhouse', fee: '₦12,000 + ₦20,000 deposit', ico: '🏆', className: 'gold' }
  };

  const currentDetails = facilityDetails[selectedFacility];

  const handleRequestBooking = () => {
    if (!selectedSlot) return;
    
    const newBooking = {
      id: Math.random().toString(36).substr(2, 9),
      facility_id: selectedFacility,
      facility_name: currentDetails.name,
      resident_id: currentUser?.id || 'res1',
      resident_name: currentUser?.full_name || 'Resident',
      booking_date: selectedDate,
      time_slot: selectedSlot,
      status: 'pending'
    };
    
    const updatedBookings = [...bookings, newBooking];
    setBookings(updatedBookings);
    saveStoredFacilityBookings(updatedBookings);
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
    setSelectedSlot(null);
  };

  const myBookings = bookings.filter(b => b.resident_id === currentUser?.id);
  
  // Confirmed or pending bookings for this facility/date mean slot is taken
  const takenSlots = bookings
    .filter(b => b.facility_id === selectedFacility && b.booking_date === selectedDate && (b.status === 'confirmed' || b.status === 'pending'))
    .map(b => b.time_slot);

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
          <button onClick={() => navigate('/dashboard')} className="icon-btn">&#8592;</button>
        </div>
        <h1>Book a facility</h1>
        <p className="muted" style={{ marginTop: 8 }}>Reserve shared spaces across the estate.</p>
      </div>

      <div className="sheet pad">
        <div className="section-head" style={{ marginTop: 4 }}><h3>Choose a facility</h3></div>
        <div className="carousel" id="facCarousel">
          <div className={`card ${selectedFacility === 'pitch' ? 'on' : ''}`} onClick={() => { setSelectedFacility('pitch'); setSelectedSlot(null); }}>
            <div className="ico">&#9917;</div><h4 style={{ marginTop: 12 }}>Football Pitch</h4>
            <p className="tiny muted" style={{ marginTop: 6 }}>2-hour slots · refundable deposit</p>
          </div>
          <div className={`card ${selectedFacility === 'mosque' ? 'on' : ''}`} onClick={() => { setSelectedFacility('mosque'); setSelectedSlot(null); }}>
            <div className="ico gold">&#9781;</div><h4 style={{ marginTop: 12 }}>Mosque Hall</h4>
            <p className="tiny muted" style={{ marginTop: 6 }}>Jumu&rsquo;ah &amp; community events</p>
          </div>
          <div className={`card ${selectedFacility === 'kitchen' ? 'on' : ''}`} onClick={() => { setSelectedFacility('kitchen'); setSelectedSlot(null); }}>
            <div className="ico">&#127859;</div><h4 style={{ marginTop: 12 }}>Community Kitchen</h4>
            <p className="tiny muted" style={{ marginTop: 6 }}>Half-day or full-day booking</p>
          </div>
          <div className={`card ${selectedFacility === 'clubhouse' ? 'on' : ''}`} onClick={() => { setSelectedFacility('clubhouse'); setSelectedSlot(null); }}>
            <div className="ico gold">&#127942;</div><h4 style={{ marginTop: 12 }}>Clubhouse</h4>
            <p className="tiny muted" style={{ marginTop: 6 }}>Parties &amp; private functions</p>
          </div>
        </div>

        <div className="section">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{currentDetails.name}</h4><span className="pill pill-mint">{currentDetails.fee}</span>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="bookDate">Date</label>
              <input className="input" type="date" id="bookDate" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }} />
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '.04em', color: 'var(--ink-2)', marginBottom: 9 }}>Available slots</label>
            <div className="slots" id="slotGrid">
              {ALL_SLOTS.map(slot => {
                const isTaken = takenSlots.includes(slot.id);
                return (
                  <button 
                    key={slot.id}
                    className={`slot ${isTaken ? 'taken' : ''} ${selectedSlot === slot.id ? 'on' : ''}`}
                    disabled={isTaken}
                    onClick={() => setSelectedSlot(slot.id)}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            <p className="tiny muted" style={{ marginTop: 12 }}>Deposits are refunded within 48 hours of the facility being returned in good condition.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleRequestBooking} disabled={!selectedSlot}>Request booking</button>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><h3>My bookings</h3></div>
          
          {myBookings.length === 0 && (
            <p className="tiny muted">No bookings yet.</p>
          )}

          {myBookings.map(b => {
             const fac = facilityDetails[b.facility_id];
             const slotLabel = ALL_SLOTS.find(s => s.id === b.time_slot)?.label || b.time_slot;
             return (
              <div className="row" key={b.id}>
                <span className={`sq ${fac.className || ''}`}>{fac.ico}</span>
                <div className="grow">
                  <div className="t">{b.facility_name}</div>
                  <div className="s">{b.booking_date}, {slotLabel}</div>
                </div>
                <span className={`pill ${b.status === 'confirmed' ? 'pill-mint' : (b.status === 'pending' ? 'pill-gold' : 'pill-grey')}`}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
              </div>
             );
          })}
        </div>

        <p className="footer-note">Bookings are subject to Estate Admin confirmation &amp; conflict checks.</p>
      </div>
      <div className={`toast ${showToast ? 'show' : ''}`}>Booking request sent — pending confirmation</div>
    </div>
  );
};
