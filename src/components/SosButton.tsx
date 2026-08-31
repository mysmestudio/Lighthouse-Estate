import React, { useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getStoredCurrentUser } from '../lib/auth-helpers';

interface SosButtonProps {
  onTrigger?: () => void;
  isGuard?: boolean;
}

export const SosButton: React.FC<SosButtonProps> = ({ onTrigger, isGuard }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Hold to send SOS');
  const [isFired, setIsFired] = useState(false);
  
  const ringRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const t0Ref = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);

  const fire = async () => {
    if (btnRef.current) btnRef.current.style.background = '#17A05E';
    setToastMsg('SOS sent — gate security & admin notified');
    setShowToast(true);
    setIsFired(true);
    
    if (navigator.vibrate) {
      navigator.vibrate([90, 60, 90]);
    }
    
    // Actually log to Supabase
    try {
      const user = getStoredCurrentUser();
      if (isSupabaseConfigured && user) {
        await supabase.from('sos_events').insert({
          user_id: user.id,
          house_number: user.house_number,
          house_unit: user.house_unit,
          status: 'active'
        });
      }
    } catch (e) {}

    if (onTrigger) onTrigger();

    setTimeout(() => {
      reset();
    }, 2600);
  };

  const frame = () => {
    const p = Math.min(100, (Date.now() - t0Ref.current) / 50);
    if (ringRef.current) {
      ringRef.current.style.setProperty('--p', p.toString());
    }
    if (p >= 100 && !doneRef.current) {
      doneRef.current = true;
      fire();
    } else if (!doneRef.current) {
      rafRef.current = requestAnimationFrame(frame);
    }
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    if (doneRef.current) return;
    t0Ref.current = Date.now();
    setToastMsg('Hold to send SOS…');
    setShowToast(true);
    rafRef.current = requestAnimationFrame(frame);
  };

  const stop = () => {
    if (doneRef.current) return;
    cancelAnimationFrame(rafRef.current);
    if (ringRef.current) ringRef.current.style.setProperty('--p', '0');
    setShowToast(false);
  };

  const reset = () => {
    doneRef.current = false;
    setIsFired(false);
    if (btnRef.current) btnRef.current.style.background = '';
    if (ringRef.current) ringRef.current.style.setProperty('--p', '0');
    setShowToast(false);
  };

  if (isGuard) {
    return (
      <button 
        ref={btnRef}
        className="btn btn-danger btn-sm" 
        style={{ minHeight: 44, position: 'relative', overflow: 'hidden' }}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <span ref={ringRef} className="ring" style={{
           position: 'absolute', inset: '-5px', borderRadius: '50%', background: 'conic-gradient(var(--gold) calc(var(--p,0)*1%), transparent 0)',
           WebkitMask: 'radial-gradient(circle, transparent 60%, #000 61%)',
           mask: 'radial-gradient(circle, transparent 60%, #000 61%)'
        }}></span>
        <span style={{ position: 'relative', zIndex: 2 }}>{isFired ? '✓ Guard SOS sent' : '⚠ Guard SOS'}</span>
      </button>
    );
  }

  return (
    <>
      <button 
        ref={btnRef}
        className="sos" 
        aria-label="Hold five seconds to send emergency SOS"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <span ref={ringRef} className="ring"></span>
        <span>&#9888;<br/>SOS</span>
      </button>
      <div className={`sos-toast ${showToast ? 'show' : ''}`}>{toastMsg}</div>
    </>
  );
};
