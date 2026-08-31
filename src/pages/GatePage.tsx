import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { verifyGatePassAtGatehouse } from '../lib/pass-service';
import { PinPad } from '../components/PinPad';
import { SosButton } from '../components/SosButton';
import { authenticateEstateUser, getStoredCurrentUser, setStoredCurrentUser } from '../lib/auth-helpers';

interface GatePageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const GatePage: React.FC<GatePageProps> = ({ currentUser, navigate }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(currentUser?.role === 'security');
  const [activeGuard, setActiveGuard] = useState<AppUser | null>(currentUser?.role === 'security' ? currentUser : null);
  
  const [verdict, setVerdict] = useState<'ok' | 'no' | 'exp' | null>(null);
  const [vTitle, setVTitle] = useState('');
  const [vSub, setVSub] = useState('');
  const [vMeta, setVMeta] = useState('');

  useEffect(() => {
    const isSec = currentUser?.role === 'security';
    setIsLoggedIn(isSec);
    if (isSec) setActiveGuard(currentUser);
  }, [currentUser]);

  const showVerdict = (type: 'ok' | 'no' | 'exp', title: string, sub: string, meta: string) => {
    setVerdict(type);
    setVTitle(title);
    setVSub(sub);
    setVMeta(meta);
    if (navigator.vibrate) {
      navigator.vibrate(type === 'ok' ? 60 : [70, 60, 70]);
    }
    
    // Auto dismiss
    setTimeout(() => {
      setVerdict(null);
    }, 3500);
  };

  const handlePinComplete = async (code: string) => {
    if (!isLoggedIn) {
      const res = await authenticateEstateUser('security', { pin: code });
      if (res.user && res.user.role === 'security') {
        setStoredCurrentUser(res.user);
        setActiveGuard(res.user);
        setIsLoggedIn(true);
      } else {
        showVerdict('no', 'DENIED', 'Invalid Guard PIN', 'Do not open the barrier. Direct to guard post.');
      }
      return;
    }

    // Verify Pass
    const guardName = activeGuard?.full_name || 'Guard';
    const verifyRes = await verifyGatePassAtGatehouse({ code, method: 'pin', guard_name: guardName });
    
    // Check if it's a resident PIN entry triggering night access log
    const hr = new Date().getHours();
    if (verifyRes.success && (hr >= 22 || hr < 5) && (verifyRes.pass?.pass_type as string) === 'resident') {
      // It's a night access, just a note (flagged for log only is handled in pass-service basically)
    }

    if (verifyRes.success) {
      const pass = verifyRes.pass!;
      const houseStr = pass.house_number ? `House ${pass.house_number}` : '';
      const unitStr = pass.house_unit || 'Main';
      let metaStr = `${houseStr} · ${unitStr}`;
      if (pass.pass_type === 'long_stay') metaStr += ' · multi-entry';
      else if (pass.pass_type === 'contractor') metaStr += ` · must exit by ${pass.end_time || ''}`;
      
      showVerdict('ok', 'ACCESS', `${pass.guest_name || 'Resident'} · ${pass.pass_type.replace('_', ' ')}`, metaStr);
    } else {
      if (verifyRes.status === 'expired' || verifyRes.message.toLowerCase().includes('expire')) {
        showVerdict('exp', 'EXPIRED', 'Pass has expired', 'Call the resident before admitting.');
      } else {
        showVerdict('no', 'DENIED', 'Code not recognised', 'Do not open the barrier. Direct the visitor to the guard post.');
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="kiosk">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="brand" style={{ color: '#fff' }}><span className="mark">&#9737;</span>Lighthouse Lekki</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '26px' }}>
          <p className="label" style={{ color: 'rgba(255,255,255,.5)' }}>Security Officer Login</p>
          <p className="tiny" style={{ color: 'rgba(255,255,255,.45)', marginTop: '10px' }}>Enter your 6-digit guard PIN to launch kiosk</p>
        </div>
        <div style={{ marginTop: '26px' }}>
          <PinPad onComplete={handlePinComplete} hintText="Enter guard PIN" isKiosk={true} />
        </div>
        
        {verdict && (
          <div className={`verdict v-${verdict} show`} onClick={() => setVerdict(null)}>
            <div className="big">{vTitle}</div>
            <p className="sub">{vSub}</p>
            <p className="meta">{vMeta}</p>
            <p className="meta" style={{ marginTop: 22, fontSize: 13 }}>Tap anywhere to continue</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kiosk">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="brand" style={{ color: '#fff' }}>
          <span className="mark">&#9737;</span>{(activeGuard as any)?.gate_name || 'Gate 1'} &middot; Main entrance
        </div>
        <span className="pill pill-live"><i className="dot"></i>Offline ready</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: '26px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p className="label" style={{ color: 'rgba(255,255,255,.5)' }}>Enter 6-digit access code</p>
        
        <PinPad onComplete={handlePinComplete} isKiosk={true} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="tiny" style={{ color: 'rgba(255,255,255,.4)' }}>Guard: {activeGuard?.full_name}</p>
        <SosButton isGuard={true} />
      </div>

      {verdict && (
        <div className={`verdict v-${verdict} show`} onClick={() => setVerdict(null)}>
          <div className="big">{vTitle}</div>
          <p className="sub">{vSub}</p>
          <p className="meta">{vMeta}</p>
          <p className="meta" style={{ marginTop: 22, fontSize: 13 }}>Tap anywhere to continue</p>
        </div>
      )}
    </div>
  );
};
