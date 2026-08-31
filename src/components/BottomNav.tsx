import React, { useEffect, useState } from 'react';

interface BottomNavProps {
  role: 'resident' | 'admin';
  navigate: (path: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, navigate }) => {
  const [loc, setLoc] = useState(window.location.pathname || '/');

  useEffect(() => {
    const handlePop = () => setLoc(window.location.pathname || '/');
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);
  
  if (role === 'admin') {
    return (
      <nav className="nav">
        <a className={loc === '/admin' ? 'on' : ''} onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}><i>⌂</i>Home</a>
        <a className={loc === '/approvals' ? 'on' : ''} onClick={() => document.getElementById('sec-approvals')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>✓</i>Approvals</a>
        <a className={loc === '/dues' ? 'on' : ''} onClick={() => document.getElementById('sec-dues')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>₦</i>Dues</a>
        <a className={loc === '/logs' ? 'on' : ''} onClick={() => document.getElementById('sec-audit')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>≡</i>Logs</a>
        <a className={loc === '/notices' ? 'on' : ''} onClick={() => navigate('/notices')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>
      </nav>
    );
  }
  
  return (
    <nav className="nav">
      <a className={loc === '/dashboard' ? 'on' : ''} onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><i>⌂</i>Home</a>
      <a className={loc === '/passes' ? 'on' : ''} onClick={() => document.getElementById('sec-passes')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>▤</i>Passes</a>
      <a className={loc === '/facilities' ? 'on' : ''} onClick={() => navigate('/facilities')} style={{ cursor: 'pointer' }}><i>▦</i>Facilities</a>
      <a className={loc === '/staff' ? 'on' : ''} onClick={() => navigate('/staff-onboarding')} style={{ cursor: 'pointer' }}><i>☺</i>Staff</a>
      <a className={loc === '/notices' ? 'on' : ''} onClick={() => navigate('/notices')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>
    </nav>
  );
};
