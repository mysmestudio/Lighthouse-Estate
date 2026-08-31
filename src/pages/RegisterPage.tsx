import React, { useState } from 'react';
import { HouseUnitType } from '../types';
import { registerResident } from '../lib/auth-helpers';
import { PinPad } from '../components/PinPad';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [unit, setUnit] = useState<HouseUnitType>('Main House');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupancy, setOccupancy] = useState('Owner');
  const [adults, setAdults] = useState('1');

  const [nokName, setNokName] = useState('');
  const [nokPhone, setNokPhone] = useState('');
  const [nokRelation, setNokRelation] = useState('Spouse');

  // Preferences
  const [madrasa, setMadrasa] = useState(true);
  const [mosque, setMosque] = useState(true);
  const [volunteer, setVolunteer] = useState(false);

  const handleNext = () => {
    if (!fullName.trim() || !houseNumber.trim() || !phone.trim() || !email.trim()) {
      setErrorMsg('Please fill in all required fields (Name, House Number, Phone, Email)');
      return;
    }
    setErrorMsg('');
    setStep(2); // PIN step
  };

  const [isSuccess, setIsSuccess] = useState(false);
  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await registerResident({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        houseNumber: parseInt(houseNumber, 10),
        houseUnit: unit,
        pin: pin,
        nokName: nokName.trim(),
        nokPhone: nokPhone.trim(),
        nokRelation: nokRelation.trim(),
        madrasa,
        mosque,
        volunteer
      });
      
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMsg(res.error || 'Failed to register');
        setStep(1); // Go back so they can see error
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during registration');
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '40px 20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--deep)', color: '#fff' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, color: '#fff' }}>
          ✓
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Registration submitted</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 15, color: 'rgba(255,255,255,.7)' }}>
          Your profile is being reviewed by Estate Admin and will be approved within 24 hours. You will be able to log in once approved.
        </p>
        <button className="btn btn-ghost-light" style={{ borderColor: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="hero" style={{ paddingBottom: 38 }}>
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate('/')}>&#8592;</button>
          <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Household registration</div>
          <span style={{ width: 44 }}></span>
        </div>
        <div className="steps">
          <i className="on"></i>
          <i className={step === 2 ? 'on' : ''}></i>
          <i></i>
          <i></i>
        </div>
        <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>Step {step} of 4</p>
        <h2 style={{ marginTop: 8 }}>{step === 1 ? 'Tell us about\nyour household.' : 'Set your gate PIN.'}</h2>
        <p className="muted tiny" style={{ marginTop: 8 }}>Estate Admin verifies every registration before a PIN is issued — usually within 24 hours.</p>
      </div>

      <div className="sheet pad">
        {errorMsg && (
          <div style={{ background: 'var(--danger-100)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <span className="ico">&#9737;</span>
                <div className="grow">
                  <h4>Primary resident</h4>
                  <p className="tiny muted" style={{ marginTop: 3 }}>The name gate security will see</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Full name *</label><input className="input" placeholder="Adekunle Ebrahim Durosimi" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                <div className="duo">
                  <div className="field"><label>House number *</label><input className="input" inputMode="numeric" placeholder="99" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} /></div>
                  <div className="field"><label>Unit *</label><select className="input" value={unit} onChange={e => setUnit(e.target.value as HouseUnitType)}><option value="Main House">Main house</option><option value="BQ">BQ</option><option value="Flat A">Flat A</option><option value="Flat B">Flat B</option></select></div>
                </div>
                <div className="field"><label>Phone (WhatsApp active) *</label><input className="input" inputMode="tel" placeholder="+234 801 000 0001" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <div className="field"><label>Email *</label><input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="duo">
                  <div className="field"><label>Occupancy *</label><select className="input" value={occupancy} onChange={e => setOccupancy(e.target.value)}><option>Owner</option><option>Tenant</option><option>Caretaker</option></select></div>
                  <div className="field"><label>Adults in home</label><input className="input" inputMode="numeric" placeholder="4" value={adults} onChange={e => setAdults(e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <span className="ico red">&#9829;</span>
                <div className="grow">
                  <h4>Next of kin</h4>
                  <p className="tiny muted" style={{ marginTop: 3 }}>Contacted during an SOS dispatch</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Contact name</label><input className="input" placeholder="Dr. Amina Al-Mansoor" value={nokName} onChange={e => setNokName(e.target.value)} /></div>
                <div className="duo">
                  <div className="field"><label>Phone</label><input className="input" inputMode="tel" placeholder="+234 802 987 6543" value={nokPhone} onChange={e => setNokPhone(e.target.value)} /></div>
                  <div className="field"><label>Relationship</label><select className="input" value={nokRelation} onChange={e => setNokRelation(e.target.value)}><option>Spouse</option><option>Sibling</option><option>Parent</option><option>Child</option></select></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <span className="ico gold">&#9781;</span>
                <div className="grow">
                  <h4>Madrasa &amp; community</h4>
                  <p className="tiny muted" style={{ marginTop: 3 }}>Optional — you can change this later</p>
                </div>
              </div>
              <div className="stack" style={{ marginTop: 16 }}>
                <label className="check"><input type="checkbox" checked={madrasa} onChange={e => setMadrasa(e.target.checked)} /><span><b style={{ fontSize: 14 }}>Enrol children in the Madrasa</b><br/>
                  <span className="tiny muted">Qur&rsquo;an and Islamic studies, 4:30–6:00 PM weekdays</span></span></label>
                <label className="check"><input type="checkbox" checked={mosque} onChange={e => setMosque(e.target.checked)} /><span><b style={{ fontSize: 14 }}>Jumu&rsquo;ah &amp; mosque notices</b><br/>
                  <span className="tiny muted">Khutbah timing changes and hall announcements</span></span></label>
                <label className="check"><input type="checkbox" checked={volunteer} onChange={e => setVolunteer(e.target.checked)} /><span><b style={{ fontSize: 14 }}>Volunteer for estate committees</b><br/>
                  <span className="tiny muted">Security watch, welfare, Madrasa parents&rsquo; forum</span></span></label>
              </div>
            </div>

            <div className="card flat" style={{ background: 'var(--mint-50)', borderColor: 'var(--mint)', marginBottom: 16 }}>
              <p className="tiny" style={{ fontWeight: 700, color: 'var(--mint-600)' }}>Next: set your secure gate PIN.</p>
            </div>

            <button className="btn btn-primary" onClick={handleNext}>Continue to PIN</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/login')}>I already have a PIN</button>
            <p className="footer-note">Your details are visible only to Estate Admin and gate security.</p>
            <div className="nav-space" style={{ height: 40 }}></div>
          </>
        )}

        {step === 2 && (
          <div className="card dark" style={{ padding: '24px 20px' }}>
             <p className="label" style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center', margin: '0 0 10px' }}>Security PIN &#183; 4 digits + 2 letters</p>
             {isLoading ? (
               <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gold)' }}>Submitting Registration...</div>
             ) : (
               <PinPad onComplete={handlePinComplete} />
             )}
          </div>
        )}
      </div>
    </div>
  );
};
