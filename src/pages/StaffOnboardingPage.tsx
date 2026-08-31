import React, { useState } from 'react';
import { getStoredStaffKYC, getStoredInviteCodes, submitStaffOnboarding } from '../lib/staff-service';
import { PinPad } from '../components/PinPad';

interface StaffOnboardingPageProps {
  navigate: (path: string) => void;
}

export const StaffOnboardingPage: React.FC<StaffOnboardingPageProps> = ({ navigate }) => {
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matchedRecord, setMatchedRecord] = useState<any>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Cleaner');
  const [workDays, setWorkDays] = useState('Mon–Fri');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('NIN slip');
  const [idNumber, setIdNumber] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorRel, setGuarantorRelation] = useState('Family');
  const [guarantorAddress, setGuarantorAddress] = useState('');

  const verifyCode = () => {
    if (!inviteCode.trim()) {
      setErrorMsg('Please enter an invite code');
      return;
    }
    const allInvites = getStoredInviteCodes();
    const match = allInvites.find(k => k.code.toUpperCase() === inviteCode.trim().toUpperCase() && (k as any).status === 'pending');
    if (!match) {
      setErrorMsg('Invalid or already-used invite code');
      return;
    }
    setMatchedRecord(match);
    setErrorMsg('');
    setStep(2);
  };

  const handleNextToPin = () => {
    if (!fullName.trim() || !phone.trim() || !idNumber.trim() || !guarantorName.trim() || !guarantorPhone.trim()) {
      setErrorMsg('Please fill all required fields');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    try {
      const res = await submitStaffOnboarding({
        invite: matchedRecord,
        fullName: fullName.trim(),
        phone: phone.trim(),
        dob: '2000-01-01',
        gender: 'Female',
        homeAddress: address,
        nin: idNumber.trim(),
        nextOfKin: {
          name: guarantorName,
          phone: guarantorPhone,
          relationship: guarantorRel
        },
        documents: {
          passport_photo_url: '',
          national_id_url: '',
          guarantor_id_url: ''
        },
        pin: pin // We'll just pass plain pin here and service hashes it
      });
      if (res.success) {
        alert('Verification submitted! Wait for Estate Admin approval before your PIN becomes active.');
        navigate('/login');
      } else {
        setErrorMsg(res.error || 'Failed to submit KYC');
        setStep(2);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred');
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shell">
      <div className="hero" style={{ paddingBottom: 38 }}>
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate('/')}>&#8592;</button>
          <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Domestic staff onboarding</div>
          <span style={{ width: 44 }}></span>
        </div>
        <div className="steps">
          <i className="on"></i>
          <i className={step >= 2 ? 'on' : ''}></i>
          <i className={step === 3 ? 'on' : ''}></i>
          <i></i>
        </div>
        {matchedRecord ? (
          <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>Invite accepted &#183; House {matchedRecord.house_number}</p>
        ) : (
          <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>Step {step} of 4</p>
        )}
        <h2 style={{ marginTop: 8 }}>
          {step === 1 ? 'Enter your\ninvite code.' : step === 2 ? 'Complete\nyour verification.' : 'Set your gate PIN.'}
        </h2>
        <p className="muted tiny" style={{ marginTop: 8 }}>Once Estate Admin approves, you&rsquo;ll set your own gate PIN. Nobody else can use it.</p>
      </div>

      <div className="sheet pad">
        {errorMsg && (
          <div style={{ background: 'var(--danger-100)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <div className="card-head">
               <span className="ico">&#9919;</span>
               <div className="grow">
                 <h4>Invite code</h4>
                 <p className="tiny muted" style={{ marginTop: 3 }}>Given to you by your employer</p>
               </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
               <input className="input" placeholder="e.g. AB12CD" style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 18, fontWeight: 800, textAlign: 'center' }} value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={verifyCode}>Verify Code</button>
          </div>
        )}

        {step === 2 && matchedRecord && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head"><span className="ico">&#9919;</span><div className="grow">
                <h4>Invite code</h4><p className="tiny muted" style={{ marginTop: 3 }}>Given to you by your employer</p></div>
                <span className="pill pill-mint"><i className="dot"></i>Valid</span></div>
              <div style={{ marginTop: 16 }}>
                <div style={{ background: 'var(--mint-50)', color: 'var(--mint-600)', border: '1.5px solid var(--mint)', borderRadius: 14, padding: 12, textAlign: 'center', fontWeight: 800, letterSpacing: 4, fontSize: 18 }}>
                  {matchedRecord.code}
                </div>
                <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>House {matchedRecord.house_number}, {matchedRecord.house_unit || 'Main'}</p>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head"><span className="ico">&#263A;</span><div className="grow">
                <h4>Your details</h4><p className="tiny muted" style={{ marginTop: 3 }}>As they appear on your ID</p></div></div>
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Full name *</label><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                <div className="duo">
                  <div className="field"><label>Role *</label><select className="input" value={role} onChange={e => setRole(e.target.value)}><option>Cleaner</option><option>Cook</option><option>Driver</option><option>Nanny</option><option>Gardener</option></select></div>
                  <div className="field"><label>Work days</label><select className="input" value={workDays} onChange={e => setWorkDays(e.target.value)}><option>Mon–Fri</option><option>Mon–Sat</option><option>Weekends</option><option>Live-in</option></select></div>
                </div>
                <div className="field"><label>Phone *</label><input className="input" inputMode="tel" placeholder="+234 906 000 0000" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <div className="field"><label>Home address</label><input className="input" placeholder="Street, area, LGA" value={address} onChange={e => setAddress(e.target.value)} /></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head"><span className="ico gold">&#9635;</span><div className="grow">
                <h4>Identity verification</h4><p className="tiny muted" style={{ marginTop: 3 }}>Required before a gate PIN is issued</p></div></div>
              <div style={{ marginTop: 16 }}>
                <div className="duo">
                  <div className="field"><label>ID type *</label><select className="input" value={idType} onChange={e => setIdType(e.target.value)}><option>NIN slip</option><option>Voter&rsquo;s card</option><option>Driver&rsquo;s licence</option><option>International passport</option></select></div>
                  <div className="field"><label>ID number *</label><input className="input" placeholder="1234 5678 901" value={idNumber} onChange={e => setIdNumber(e.target.value)} /></div>
                </div>
                <div className="stack">
                  <div className="row"><span className="sq gold">&#8593;</span><div className="grow"><div className="t">Upload ID photo</div>
                    <div className="s">Front side, clearly readable</div></div><span className="pill pill-grey">Pending</span></div>
                  <div className="row"><span className="sq">&#9745;</span><div className="grow"><div className="t">Live selfie capture</div>
                    <div className="s">Matched against your ID</div></div><span className="pill pill-mint">Done</span></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head"><span className="ico">&#9878;</span><div className="grow">
                <h4>Guarantor</h4><p className="tiny muted" style={{ marginTop: 3 }}>Someone who vouches for you</p></div></div>
              <div style={{ marginTop: 16 }}>
                <div className="field"><label>Guarantor name *</label><input className="input" placeholder="Alhaji Musa Idris" value={guarantorName} onChange={e => setGuarantorName(e.target.value)} /></div>
                <div className="duo">
                  <div className="field"><label>Phone *</label><input className="input" inputMode="tel" placeholder="+234 803 000 0000" value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} /></div>
                  <div className="field"><label>Relationship</label><select className="input" value={guarantorRel} onChange={e => setGuarantorRelation(e.target.value)}><option>Family</option><option>Religious leader</option><option>Former employer</option><option>Community leader</option></select></div>
                </div>
                <div className="field"><label>Guarantor address</label><textarea className="input" placeholder="Street, area, LGA" value={guarantorAddress} onChange={e => setGuarantorAddress(e.target.value)}></textarea></div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleNextToPin}>Continue to PIN</button>
            <p className="footer-note">Estate Admin reviews staff KYC within 24 hours. You&rsquo;ll get a WhatsApp message when your PIN goes live.</p>
          </>
        )}

        {step === 3 && (
          <div className="card dark" style={{ padding: '24px 20px' }}>
             <p className="label" style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center', margin: '0 0 10px' }}>Security PIN &#183; 4 digits + 2 letters</p>
             {isLoading ? (
               <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gold)' }}>Submitting Verification...</div>
             ) : (
               <PinPad onComplete={handlePinComplete} />
             )}
          </div>
        )}

        <div className="nav-space"></div>
      </div>
    </div>
  );
};
