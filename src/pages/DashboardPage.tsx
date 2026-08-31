import React, { useState, useEffect } from 'react';
import { AppUser, VisitorPass, AccessLog, EstateNotice } from '../types';
import { SosButton } from '../components/SosButton';
import { BottomNav } from '../components/BottomNav';
import { getStoredNotices } from '../lib/estate-data';
import { getDailyHadith } from '../lib/hadith-utils';
import { createGatePass } from '../lib/pass-service';
import { getStoredPasses } from '../lib/estate-data';

interface DashboardPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, navigate, onLogout }) => {
  const [showPassModal, setShowPassModal] = useState(false);
  const [passType, setPassType] = useState('guest');
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]); // This would be fetched from gate_logs scoped to household
  const [notices, setNotices] = useState<EstateNotice[]>([]);
  
  // Modal Fields
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [purpose, setPurpose] = useState('');
  
  // Artisan
  const [trade, setTrade] = useState('');
  const [arrives, setArrives] = useState('09:00');
  const [mustExit, setMustExit] = useState('13:00');
  const [gracePeriod, setGracePeriod] = useState('30 minutes');
  
  // Long-stay
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [untilDate, setUntilDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [overnight, setOvernight] = useState(true);

  // Group
  const [guestCount, setGuestCount] = useState('8');
  const [vehicleCount, setVehicleCount] = useState('2');
  const [occasion, setOccasion] = useState('');

  // Exit
  const [itemsLeaving, setItemsLeaving] = useState('');

  // Preview Pin
  const [previewPin, setPreviewPin] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const allPasses = getStoredPasses();
    const myPasses = allPasses.filter(p => p.house_number === currentUser.house_number && p.status === 'active');
    setPasses(myPasses);
    setNotices(getStoredNotices().slice(0, 3));
    
    // Auto-generate preview pin just for UI flair
    setPreviewPin(Math.floor(100000 + Math.random() * 900000).toString());
  }, [currentUser, showPassModal]);

  const togglePassModal = () => {
    setShowPassModal(prev => {
      const isOpening = !prev;
      document.body.style.overflow = isOpening ? 'hidden' : '';
      return isOpening;
    });
  };

  const handleCreatePass = () => {
    if (!currentUser) return;
    if (passType !== 'jumuah' && passType !== 'offline' && !visitorName.trim()) {
      alert('Please provide the visitor name');
      return;
    }

    createGatePass({
      visitorName: passType === 'jumuah' ? 'Jumuah Guest' : passType === 'offline' ? 'Offline Guest' : visitorName,
      visitorPhone: visitorPhone,
      vehiclePlate: vehiclePlate,
      passType: passType as any,
      houseNumber: currentUser.house_number,
      houseUnit: currentUser.house_unit,
      expiresAt: undefined, // Let service handle default expiry
      mustExitTime: passType === 'contractor' ? mustExit : undefined,
      gracePeriod: passType === 'contractor' ? gracePeriod : undefined,
      tradeCompany: passType === 'contractor' ? trade : undefined,
      validFrom: passType === 'longstay' ? fromDate : undefined,
      validUntil: passType === 'longstay' ? untilDate : undefined,
      overnightApproved: passType === 'longstay' ? overnight : undefined,
      guestCount: passType === 'group' ? parseInt(guestCount, 10) : undefined,
      vehicleCount: passType === 'group' ? parseInt(vehicleCount, 10) : undefined,
      occasion: passType === 'group' ? occasion : undefined,
      itemsLeaving: passType === 'exit' ? itemsLeaving : undefined,
      notes: purpose
    }).then(res => {
      if (res.success) {
        alert(`Pass created! Code: ${res.pass?.pass_code}`);
        togglePassModal();
        setVisitorName('');
        setPasses([res.pass!, ...passes]);
      } else {
        alert('Failed: ' + res.error);
      }
    });
  };

  const notes: Record<string, string> = {
    guest: 'A single-entry pass for one guest, valid for 12 hours from now.',
    delivery: 'Short-window pass for a rider or courier. Auto-expires after 2 hours.',
    contractor: 'Contractor pass bound to a strict time window with overstay escalation.',
    longstay: 'Date-range pass with unlimited entries and exits until it auto-expires.',
    exit: 'Authorises property leaving the estate. Gate records the item list.',
    jumuah: 'Friday prayer pass for guests attending Jumu’ah at the estate mosque.',
    offline: 'Works when the gate tablet has no network — verified against a cached code.',
    group: 'One code for a group arriving together — event, family visit or convoy.'
  };

  if (!currentUser) return null;

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>House {currentUser.house_number} &#183; {currentUser.house_unit || 'Main'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="icon-btn" onClick={onLogout}>&#9788;</button>
            <span className="avatar">{currentUser.full_name?.substring(0,2).toUpperCase()}</span>
          </div>
        </div>
        <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>&#1575;&#1604;&#1587;&#1617;&#1604;&#1575;&#1605; &#1593;&#1604;&#1610;&#1603;&#1605; &#183; Assalam Alaekum Waramotullahi Wabarakatu</p>
        <h2 style={{ marginTop: 8 }}>{currentUser.full_name?.split(' ')[0]},<br/>your household is clear.</h2>
        <p className="muted tiny" style={{ marginTop: 8 }}>{passes.length} active passes &#183; dues paid through Q3 &#183; no open alerts.</p>
        <div className="hadith" style={{ marginTop: 20 }}>
          <p className="q" style={{ fontSize: 15 }}>{getDailyHadith().quote}</p>
          <p className="src">{getDailyHadith().source}</p>
        </div>
      </div>

      <div className="sheet">
        <div className="stat-row">
          <div className="stat"><div className="n mint">{passes.length}</div><div className="k">Active passes</div></div>
          <div className="stat"><div className="n">0</div><div className="k">Passes today</div></div>
          <div className="stat"><div className="n gold">&#8358;0</div><div className="k">Outstanding levy</div></div>
          <div className="stat"><div className="n">0</div><div className="k">Household staff</div></div>
        </div>

        <div className="pad">
          <div className="section">
            <button className="btn btn-primary" onClick={togglePassModal}>&#43; Issue a visitor pass</button>
          </div>

          <div className="section">
            <div className="section-head"><h3>Estate services</h3></div>
            <div className="tiles">
              <button className="tile" onClick={togglePassModal}><span className="ico">&#9919;</span><span className="n">Issue pass</span><span className="d">Visitor codes</span></button>
              <button className="tile"><span className="ico gold">&#9635;</span><span className="n">Book facility</span><span className="d">Hall, pitch, kitchen</span></button>
              <button className="tile"><span className="ico">&#9874;</span><span className="n">Fix-it</span><span className="d">Maintenance</span></button>
              <button className="tile" onClick={() => navigate('/staff-onboarding')}><span className="ico">&#263A;</span><span className="n">Domestic staff</span><span className="d">Invite &amp; KYC</span></button>
              <button className="tile"><span className="ico gold">&#9781;</span><span className="n">Madrasa</span><span className="d">Class &amp; pickup</span></button>
              <button className="tile"><span className="ico">&#2691;</span><span className="n">Notices</span><span className="d">Estate board</span></button>
            </div>
          </div>

          <div className="section">
            <div className="section-head"><h3>Active passes</h3><a className="link" href="#">All passes &#8594;</a></div>
            {passes.slice(0,3).map(p => (
              <div className="row" key={p.id}>
                <span className="sq" style={{ backgroundColor: p.pass_type === 'contractor' ? 'var(--gold-100)' : '', color: p.pass_type === 'contractor' ? 'var(--gold-700)' : '' }}>{p.guest_name?.substring(0,2).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{p.guest_name} &#183; {p.pass_type}</div>
                  <div className="s">{p.pass_type === 'long_stay' ? 'Multi-entry' : 'Single entry'} &#183; until {new Date(p.expires_at).toLocaleTimeString()}</div>
                </div>
                <span className={`pill ${p.pass_type === 'contractor' ? 'pill-gold' : 'pill-mint'}`}>{p.pass_code}</span>
              </div>
            ))}
            {passes.length === 0 && (
              <p className="tiny muted text-center mt-4">No active passes.</p>
            )}
          </div>

          <div className="section">
            <div className="section-head"><h3>Gate activity</h3><a className="link" href="#">Full log &#8594;</a></div>
            <div className="card dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4>Your household today</h4><span className="pill pill-live"><i className="dot"></i>Live</span>
              </div>
              <p className="tiny muted text-center">Simulated log data.</p>
            </div>
          </div>

          <div className="section">
            <div className="section-head"><h3>Community</h3></div>
            <div className="carousel">
              <div className="card"><span className="pill pill-gold">Jumu&rsquo;ah</span>
                <h4 style={{ marginTop: 12 }}>Khutbah at 1:05 PM</h4>
                <p className="tiny muted" style={{ marginTop: 6 }}>Mosque hall. Overflow parking opens 12:30 PM at Gate 2.</p></div>
              <div className="card"><span className="pill pill-mint">Madrasa</span>
                <h4 style={{ marginTop: 12 }}>Term 2 begins Monday</h4>
                <p className="tiny muted" style={{ marginTop: 6 }}>Qur&rsquo;an classes 4:30–6:00 PM. Pickup requires a guardian PIN.</p></div>
              <div className="card"><span className="pill pill-grey">Notice</span>
                <h4 style={{ marginTop: 12 }}>Water tank service</h4>
                <p className="tiny muted" style={{ marginTop: 6 }}>Supply pauses Tuesday 10 AM – 2 PM across Phase 1.</p></div>
            </div>
          </div>

          <div className="section">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div><p className="label">Q3 levy</p><h3 style={{ marginTop: 6 }}>Paid in full</h3>
                  <p className="tiny muted" style={{ marginTop: 4 }}>Next cycle opens 1 October</p></div>
                <span className="pill pill-mint"><i className="dot"></i>Cleared</span>
              </div>
            </div>
          </div>

          <p className="footer-note">Lighthouse Estate, Lekki &#183; resident-only portal</p>
        </div>
        <div className="nav-space"></div>
      </div>

      <BottomNav role="resident" navigate={navigate} />
      <SosButton />

      {/* Modal Scrim & Body */}
      <div className={`scrim ${showPassModal ? 'open' : ''}`} onClick={togglePassModal}></div>
      <div className={`modal ${showPassModal ? 'open' : ''}`} role="dialog" aria-label="Issue visitor pass">
        <div className="grabber"></div>
        <div className="modal-head">
          <span className="ico">&#43;</span><h3>Issue a visitor pass</h3>
          <button className="close" onClick={togglePassModal}>&#10005;</button>
        </div>

        <p className="label" style={{ marginBottom: 9 }}>Pass type</p>
        <div className="seg" id="seg">
          <button className={passType === 'guest' ? 'on' : ''} onClick={() => setPassType('guest')}>Guest</button>
          <button className={passType === 'delivery' ? 'on' : ''} onClick={() => setPassType('delivery')}>Delivery</button>
          <button className={passType === 'contractor' ? 'on' : ''} onClick={() => setPassType('contractor')}>Artisan</button>
          <button className={passType === 'longstay' ? 'on' : ''} onClick={() => setPassType('longstay')}>Long-stay</button>
          <button className={passType === 'exit' ? 'on' : ''} onClick={() => setPassType('exit')}>Exit</button>
          <button className={passType === 'jumuah' ? 'on' : ''} onClick={() => setPassType('jumuah')}>Jumu&rsquo;ah</button>
          <button className={passType === 'offline' ? 'on' : ''} onClick={() => setPassType('offline')}>Offline</button>
          <button className={passType === 'group' ? 'on' : ''} onClick={() => setPassType('group')}>Group</button>
        </div>

        <div className="card flat" style={{ marginBottom: 14 }}>
          <p className="tiny muted">{notes[passType]}</p>
        </div>

        {passType !== 'jumuah' && passType !== 'offline' && (
          <>
            <div className="field">
              <label>Visitor full name *</label>
              <input className="input" placeholder="e.g. Engr. Yusuf Belgore" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
            </div>
            <div className="duo">
              <div className="field">
                <label>Phone number</label>
                <input className="input" inputMode="tel" placeholder="+234 803&hellip;" value={visitorPhone} onChange={e => setVisitorPhone(e.target.value)} />
              </div>
              <div className="field">
                <label>Vehicle plate</label>
                <input className="input" placeholder="ABJ-882-LK" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {passType === 'contractor' && (
          <div className="cond show">
            <div className="card flat" style={{ borderColor: 'var(--gold)', background: 'var(--gold-100)', marginBottom: 14 }}>
              <p className="tiny" style={{ fontWeight: 700, color: 'var(--gold-700)' }}>Overstay is reported to you and escalated to Estate Admin.</p>
            </div>
            <div className="field"><label>Trade / company</label><input className="input" placeholder="AC servicing · CoolAir Ltd" value={trade} onChange={e => setTrade(e.target.value)} /></div>
            <div className="duo">
              <div className="field"><label>Arrives</label><input className="input" type="time" value={arrives} onChange={e => setArrives(e.target.value)} /></div>
              <div className="field"><label>Must exit by</label><input className="input" type="time" value={mustExit} onChange={e => setMustExit(e.target.value)} /></div>
            </div>
            <div className="field"><label>Grace before escalation</label>
              <select className="input" value={gracePeriod} onChange={e => setGracePeriod(e.target.value)}>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
          </div>
        )}

        {passType === 'longstay' && (
          <div className="cond show">
            <div className="card flat" style={{ borderColor: 'var(--mint)', background: 'var(--mint-50)', marginBottom: 14 }}>
              <p className="tiny" style={{ fontWeight: 700, color: 'var(--mint-600)' }}>Multi-entry: your guest comes and goes freely, then the pass auto-expires.</p>
            </div>
            <div className="duo">
              <div className="field"><label>From</label><input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
              <div className="field"><label>Until</label><input className="input" type="date" value={untilDate} onChange={e => setUntilDate(e.target.value)} /></div>
            </div>
            <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" checked={overnight} onChange={e => setOvernight(e.target.checked)} />
              <span><b style={{ fontSize: 14 }}>Overnight stay approved</b><br/><span className="tiny muted">Guest sleeps in the household during this range</span></span></label>
          </div>
        )}

        {passType === 'group' && (
          <div className="cond show">
            <div className="duo">
              <div className="field"><label>Number of guests</label><input className="input" inputMode="numeric" value={guestCount} onChange={e => setGuestCount(e.target.value)} /></div>
              <div className="field"><label>Vehicles</label><input className="input" inputMode="numeric" value={vehicleCount} onChange={e => setVehicleCount(e.target.value)} /></div>
            </div>
            <div className="field"><label>Occasion</label><input className="input" placeholder="Aqiqah · Saturday afternoon" value={occasion} onChange={e => setOccasion(e.target.value)} /></div>
          </div>
        )}

        {passType === 'jumuah' && (
          <div className="cond show">
            <div className="card flat" style={{ marginBottom: 14 }}><p className="tiny">Valid Friday 11:30 AM – 3:00 PM only. Direct guests to Gate 2 overflow parking.</p></div>
          </div>
        )}

        {passType === 'offline' && (
          <div className="cond show">
            <div className="card flat" style={{ marginBottom: 14 }}><p className="tiny">Generates a code that works even if the gate tablet loses network. Read it out to your guest.</p></div>
          </div>
        )}

        {passType === 'exit' && (
          <div className="cond show">
            <div className="field"><label>Items leaving the estate</label><textarea className="input" placeholder="2 wardrobes, 1 generator — moving out of BQ" value={itemsLeaving} onChange={e => setItemsLeaving(e.target.value)}></textarea></div>
          </div>
        )}

        <div className="field"><label>Visit purpose / note to the gate</label>
          <input className="input" placeholder="e.g. Lunch delivery, repair inspection" value={purpose} onChange={e => setPurpose(e.target.value)} /></div>

        <div className="card dark" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><p className="tiny muted">Pass preview</p>
              <p style={{ fontFamily: 'var(--ff-d)', fontSize: 26, fontWeight: 800, letterSpacing: '.14em', color: 'var(--gold)', marginTop: 4 }}>
                {previewPin.split('').join(' ')}
              </p>
            </div>
            <span className="pill pill-live"><i className="dot"></i>House {currentUser.house_number}</span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleCreatePass}>Generate pass</button>
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={togglePassModal}>Cancel</button>
      </div>

    </div>
  );
};
