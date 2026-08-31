import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { SosButton } from '../components/SosButton';
import { BottomNav } from '../components/BottomNav';
import { getAppUsers, updateAppUserStatus } from '../lib/auth-helpers';
import { getStoredAccessLogs } from '../lib/estate-data';
import { getStoredStaffKYC, approveStaff, rejectStaff } from '../lib/staff-service';
import { getDailyHadith } from '../lib/hadith-utils';

interface AdminPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
  onLogout: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, navigate, onLogout }) => {
  const [pendingResidents, setPendingResidents] = useState<AppUser[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const users = await getAppUsers();
    setPendingResidents(users.filter(u => u.status === 'pending'));
    
    // We will keep staff local mock if they are, but for now just fix residents.
    const staff = getStoredStaffKYC().filter(s => s.status === 'pending');
    setPendingStaff(staff);
  };

  const handleApproveResident = async (id: string) => {
    await updateAppUserStatus(id, 'active');
    loadPending();
  };

  const handleDeclineResident = async (id: string) => {
    await updateAppUserStatus(id, 'suspended');
    loadPending();
  };

  const handleApproveStaff = async (id: string) => {
    await approveStaff(id, currentUser?.full_name || 'Admin');
    loadPending();
  };

  const handleDeclineStaff = async (id: string) => {
    await rejectStaff(id, currentUser?.full_name || 'Admin', 'Rejected by admin');
    loadPending();
  };

  if (!currentUser) return null;

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Estate Administration</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="icon-btn" onClick={onLogout}>&#9788;</button>
            <span className="avatar">EA</span>
          </div>
        </div>
        <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} &#183; {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
        <h2 style={{ marginTop: 8 }}>{pendingResidents.length + pendingStaff.length} approvals and 0 alerts<br/>need you today.</h2>
        <p className="muted tiny" style={{ marginTop: 8 }}>Both gates online &#183; 61 residents active this week.</p>
      </div>

      <div className="sheet">
        <div className="stat-row">
          <div className="stat"><div className="n gold">{pendingResidents.length + pendingStaff.length}</div><div className="k">Pending approvals</div></div>
          <div className="stat"><div className="n">87</div><div className="k">Occupied homes</div></div>
          <div className="stat"><div className="n mint">78%</div><div className="k">Dues collected</div></div>
          <div className="stat"><div className="n red">0</div><div className="k">Active alerts</div></div>
        </div>

        <div className="pad">
          <div className="section">
            <div className="tiles">
              <button className="tile" onClick={() => { document.getElementById('sec-approvals')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico">&#10003;</span><span className="n">Approvals</span><span className="d">Residents &amp; staff</span></button>
              <button className="tile" onClick={() => { document.getElementById('sec-dues')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico gold">&#8358;</span><span className="n">Reconcile dues</span><span className="d">Levies &amp; exemptions</span></button>
              <button className="tile" onClick={() => { document.getElementById('sec-audit')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico">&#8801;</span><span className="n">Audit logs</span><span className="d">Gate history</span></button>
              <button className="tile" onClick={() => navigate('/notices')}><span className="ico">&#2691;</span><span className="n">Post notice</span><span className="d">Broadcast</span></button>
              <button className="tile" onClick={() => navigate('/gate/alerts')}><span className="ico red">&#9888;</span><span className="n">Alerts</span><span className="d">SOS &amp; overstay</span></button>
              <button className="tile" onClick={() => alert('Guard Accounts management coming soon. Guards are currently pre-populated.')}><span className="ico">&#9919;</span><span className="n">Guard accounts</span><span className="d">Issue gate PINs</span></button>
            </div>
          </div>

          <div className="section" id="sec-approvals">
            <div className="section-head"><h3>Pending approvals</h3><a className="link" href="#">All {pendingResidents.length + pendingStaff.length} &#8594;</a></div>
            
            {pendingResidents.map(r => (
              <div className="row" key={r.id}>
                <span className="sq gold">{r.full_name?.substring(0,2).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{r.full_name}</div>
                  <div className="s">House {r.house_number} &#183; {r.house_unit || 'Main'}</div>
                  {r.emergency_contact_name && <div className="s" style={{ fontSize: 10 }}>Next of kin: {r.emergency_contact_name} ({r.emergency_contact_phone})</div>}
                </div>
                <button className="act ok" onClick={() => handleApproveResident(r.id)}>&#10003;</button>
                <button className="act no" onClick={() => handleDeclineResident(r.id)}>&#10005;</button>
              </div>
            ))}
            
            {pendingStaff.map(s => (
              <div className="row" key={s.id}>
                <span className="sq grey">{s.full_name?.substring(0,2).toUpperCase()}</span>
                <div className="grow">
                  <div className="t">{s.full_name} &#183; {s.role}</div>
                  <div className="s">KYC + guarantor submitted &#183; House {s.house_number}</div>
                </div>
                <button className="act ok" onClick={() => handleApproveStaff(s.id)}>&#10003;</button>
                <button className="act no" onClick={() => handleDeclineStaff(s.id)}>&#10005;</button>
              </div>
            ))}
            
            {pendingResidents.length === 0 && pendingStaff.length === 0 && (
              <p className="tiny muted text-center mt-4">No pending approvals.</p>
            )}
          </div>

          <div className="section" id="sec-audit">
            <div className="section-head"><h3>Estate-wide gate activity</h3><a className="link" href="#">Audit &#8594;</a></div>
            
            <div className="card dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4>Both gates</h4><span className="pill pill-live"><i className="dot"></i>Live</span>
              </div>
              <p className="tiny muted">142 movements logged today</p>
              
              {(() => {
                const logs = getStoredAccessLogs().slice(0, 3);
                if (logs.length === 0) {
                  return (
                    <>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 12 }}>
                        <span className="sq" style={{ background: 'rgba(232,197,71,.18)', color: 'var(--gold)' }}>&#9790;</span>
                        <div className="grow">
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Night access &middot; 01:12 AM</div>
                          <p className="tiny muted">House 23 resident PIN &middot; Gate 1 &middot; flagged for the log only</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.09)' }}>
                        <span className="sq" style={{ background: 'rgba(214,69,60,.2)', color: '#FF9A93' }}>&#10005;</span>
                        <div className="grow">
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Denied code &middot; 11:04 AM</div>
                          <p className="tiny muted">Expired delivery pass &middot; Gate 2</p>
                        </div>
                      </div>
                    </>
                  );
                }

                return logs.map((log: any, idx: number) => {
                  const hr = new Date(log.timestamp).getHours();
                  const isNight = hr >= 22 || hr < 5;
                  const isDenied = log.status === 'denied' || log.status === 'expired';
                  
                  let sqClass = 'sq';
                  let sqStyle: any = {};
                  let icon = '→';
                  let title = log.direction === 'in' ? 'Check in' : 'Check out';
                  
                  if (isNight) {
                    sqStyle = { background: 'rgba(232,197,71,.18)', color: 'var(--gold)' };
                    icon = '☾';
                    title = 'Night access';
                  } else if (isDenied) {
                    sqStyle = { background: 'rgba(214,69,60,.2)', color: '#FF9A93' };
                    icon = '✕';
                    title = 'Denied code';
                  } else {
                    sqStyle = { background: 'rgba(255,255,255,.1)', color: '#fff' };
                    icon = log.direction === 'in' ? '↓' : '↑';
                  }

                  const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  let subStr = `${log.visitor_name} &middot; ${log.guard_name}`;
                  if (isNight) subStr += ' &middot; flagged for the log only';

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: idx > 0 || logs.length > 0 ? '1px solid rgba(255,255,255,.09)' : 'none', marginTop: idx === 0 ? 12 : 0 }}>
                      <span className={sqClass} style={sqStyle}>{icon}</span>
                      <div className="grow">
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{title} &middot; {timeStr}</div>
                        <p className="tiny muted" dangerouslySetInnerHTML={{ __html: subStr }}></p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>          <div className="section" id="sec-dues">
            <div className="section-head"><h3>Dues &amp; levies</h3><a className="link" href="#">Exemptions &#8594;</a></div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div><h3>&#8358;9.4m</h3><p className="tiny muted" style={{ marginTop: 4 }}>collected of &#8358;12.1m assessed</p></div>
                <span className="pill pill-gold">19 outstanding</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: '#EEF2EE', marginTop: 14, overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg,var(--mint),var(--gold))' }}></div>
              </div>
              <p className="tiny muted" style={{ marginTop: 10 }}>Billing cycle: quarterly &#183; Q3 closes 30 September</p>
            </div>
          </div>

          <div className="section">
            <div className="hadith">
              <p className="q" style={{ fontSize: 15 }}>{getDailyHadith().quote}</p>
              <p className="src">{getDailyHadith().source}</p>
            </div>
          </div>

          <p className="footer-note">Estate Admin console &#183; every action here is written to the audit log</p>
        </div>
        <div className="nav-space"></div>
      </div>

      <BottomNav role="admin" navigate={navigate} />
      <SosButton />
    </div>
  );
};
