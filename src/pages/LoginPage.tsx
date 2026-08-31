import React, { useState } from 'react';
import { PinPad } from '../components/PinPad';
import { authenticateEstateUser } from '../lib/auth-helpers';
import { HouseUnitType, AppUser } from '../types';

interface LoginPageProps {
  navigate: (path: string) => void;
  onLoginSuccess?: (user: AppUser) => void;
  initialView?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate, onLoginSuccess }) => {
  const [view, setView] = useState<'resident' | 'admin'>('resident');
  
  const [houseNumber, setHouseNumber] = useState('');
  const [unit, setUnit] = useState<HouseUnitType>('Main House');
  
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      // Local fallback for quick preview:
      if (!adminEmail.includes('@')) {
        const users = getStoredAppUsers();
        const adminUser = users.find(u => u.role === 'admin' || u.role === 'master_admin');
        if (adminUser) {
           if (onLoginSuccess) onLoginSuccess(adminUser);
           else navigate('/admin');
           return;
        }
      }

      const res = await authenticateEstateUser('admin', {
        email: adminEmail,
        password: adminPassword
      });
      if (res.user) {
        if (onLoginSuccess) onLoginSuccess(res.user);
        else navigate('/admin');
      } else {
        setErrorMsg(res.error || 'Invalid admin credentials');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (!houseNumber.trim()) {
      setErrorMsg('Please enter your house number first');
      return;
    }
    
    setErrorMsg('');
    setIsLoading(true);
    
    try {
      const res = await authenticateEstateUser('resident', {
        houseNumber: parseInt(houseNumber, 10),
        houseUnit: unit,
        pin: pin
      });
      
      if (res.user) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorMsg(res.error || 'Invalid credentials');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shell" style={{ background: 'var(--deep)', minHeight: '100vh' }}>
      <div className="hero" style={{ minHeight: '100vh', paddingBottom: 34, display: 'flex', flexDirection: 'column' }}>
        
        <div className="topbar">
          <button className="icon-btn" onClick={() => {
            if (view === 'admin') setView('resident');
            else navigate('/');
          }}>&#8592;</button>
          <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Lighthouse Lekki</div>
          <span style={{ width: 44 }}></span>
        </div>

        <div style={{ position: 'relative', zIndex: 3, marginTop: 12 }}>
          <h2 style={{ fontSize: 28 }}>{view === 'admin' ? 'Estate Admin Login.' : 'Welcome home.'}</h2>
          <p className="muted tiny" style={{ marginTop: 8 }}>
            {view === 'admin' ? 'Enter your administrator credentials.' : 'Enter your house details, then your 6-character PIN.'}
          </p>

          {view === 'resident' ? (
            <>
              <div className="duo" style={{ marginTop: 22 }}>
                <div className="field">
                  <label style={{ color: 'rgba(255,255,255,.7)' }}>House number</label>
                  <input 
                    className="input" 
                    inputMode="numeric" 
                    placeholder="99" 
                    value={houseNumber}
                    onChange={e => setHouseNumber(e.target.value)}
                    style={{ background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }} 
                  />
                </div>
                <div className="field">
                  <label style={{ color: 'rgba(255,255,255,.7)' }}>Unit</label>
                  <select 
                    className="input" 
                    value={unit}
                    onChange={e => setUnit(e.target.value as HouseUnitType)}
                    style={{ backgroundColor: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }}
                  >
                    <option value="Main House">Main house</option>
                    <option value="BQ">BQ</option>
                    <option value="Flat A">Flat A</option>
                    <option value="Flat B">Flat B</option>
                  </select>
                </div>
              </div>
              
              {errorMsg && (
                <div style={{ background: 'var(--danger-100)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                  {errorMsg}
                </div>
              )}
              
              {isLoading && (
                <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--gold)' }}>
                  Authenticating...
                </div>
              )}

              <p className="label" style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center', margin: '18px 0 10px' }}>Security PIN &#183; 4 digits + 2 letters</p>
              
              {!isLoading && (
                 <PinPad onComplete={handlePinComplete} />
              )}
            </>
          ) : (
            <form onSubmit={handleAdminLogin} style={{ marginTop: 22 }}>
              <div className="field">
                <label style={{ color: 'rgba(255,255,255,.7)' }}>Admin Email</label>
                <input 
                  className="input" 
                  type="email"
                  placeholder="admin@lighthouseestate.org" 
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  style={{ background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }} 
                />
              </div>
              <div className="field">
                <label style={{ color: 'rgba(255,255,255,.7)' }}>Password</label>
                <input 
                  className="input" 
                  type="password"
                  placeholder="••••••••" 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  style={{ background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }} 
                />
              </div>
              
              {errorMsg && (
                <div style={{ background: 'var(--danger-100)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="btn btn-gold" style={{ marginTop: 10 }} disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Login as Admin'}
              </button>
              
              <p className="tiny" style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', marginTop: 16 }}>
                Tip: Leave blank and click Login to auto-login as demo admin
              </p>
            </form>
          )}

        </div>

        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 3 }}>
          <div className="btn-row" style={{ marginTop: 10 }}>
            {view === 'resident' && (
               <button className="btn btn-ghost-light btn-sm" style={{ flex: 1 }} onClick={() => setView('admin')}>Admin Login</button>
            )}
            <button className="btn btn-ghost-light btn-sm" style={{ flex: 1 }} onClick={() => navigate('/gate')}>Gate Kiosk</button>
          </div>
          {view === 'resident' && (
            <p className="tiny" style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', marginTop: 16 }}>
              Forgot your PIN? Estate Admin can reset it at the office.<br/>
              New resident? <button onClick={() => navigate('/register')} style={{ color: 'var(--gold)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Register your household</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
