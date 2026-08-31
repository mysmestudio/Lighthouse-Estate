import React, { useState, useEffect } from 'react';

interface PinPadProps {
  onComplete: (pin: string) => void;
  hintText?: string;
  isKiosk?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onComplete, hintText, isKiosk = false }) => {
  const [val, setVal] = useState<string[]>([]);
  const [showLetters, setShowLetters] = useState(false);

  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

  const renderVal = (index: number) => {
    if (!val[index]) return '';
    return index < 4 ? (isKiosk ? val[index] : '•') : val[index];
  };

  const handleKeyClick = (action: string | 'del' | 'clear' | 'letters') => {
    if (action === 'del') {
      setVal(prev => prev.slice(0, -1));
    } else if (action === 'clear') {
      setVal([]);
    } else if (action === 'letters') {
      setShowLetters(prev => !prev);
    } else {
      if (val.length < 6) {
        const newVal = [...val, action];
        setVal(newVal);
        if (newVal.length === 6) {
          setTimeout(() => onComplete(newVal.join('')), 100);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9A-Z]$/i.test(e.key) && val.length < 6) {
        // Enforce digits first 4, letters last 2 if not kiosk
        if (!isKiosk) {
           if (val.length < 4 && !/^[0-9]$/.test(e.key)) return;
           if (val.length >= 4 && !/^[a-zA-Z]$/.test(e.key)) return;
        } else {
           if (!/^[0-9]$/.test(e.key)) return; // kiosk is digits only
        }

        const newVal = [...val, e.key.toUpperCase()];
        setVal(newVal);
        if (newVal.length === 6) {
          setTimeout(() => onComplete(newVal.join('')), 100);
        }
      }
      if (e.key === 'Backspace') {
        setVal(prev => prev.slice(0, -1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [val, onComplete, isKiosk]);

  if (isKiosk) {
    return (
      <>
        <div className="code-boxes" id="boxes">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <b key={i} className={val[i] ? 'on' : ''}>{renderVal(i)}</b>
          ))}
        </div>
        <p className="tiny" style={{ color: 'rgba(255,255,255,.45)' }}>
          {val.length === 6 ? 'Press verify' : hintText || 'Ask the visitor to read out their code'}
        </p>

        <div className="keypad" id="kpad" style={{ marginTop: 'auto' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
            <button key={k} className="key" onClick={() => handleKeyClick(k)}>{k}</button>
          ))}
          <button className="key alt" onClick={() => handleKeyClick('clear')}>Clear</button>
          <button className="key" onClick={() => handleKeyClick('0')}>0</button>
          <button className="key alt" onClick={() => handleKeyClick('del')}>&#9003;</button>
        </div>
      </>
    );
  }

  // Resident / Login pin pad
  return (
    <>
      <div className="pin">
        {[0, 1, 2, 3].map(i => (
          <b key={i} className={val[i] ? 'on' : ''}>{renderVal(i)}</b>
        ))}
        {[4, 5].map(i => (
          <b key={i} className={`alpha ${val[i] ? 'on' : ''}`}>{renderVal(i)}</b>
        ))}
      </div>
      <p className="tiny" style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', marginTop: 10 }}>
        {val.length < 4 ? 'Enter 4 digits' : (val.length < 6 ? 'Now 2 letters' : 'PIN complete')}
      </p>

      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
          <button key={k} className="key" onClick={() => handleKeyClick(k)}>{k}</button>
        ))}
        <button className="key alt" onClick={() => handleKeyClick('letters')}>ABC</button>
        <button className="key" onClick={() => handleKeyClick('0')}>0</button>
        <button className="key alt" onClick={() => handleKeyClick('del')}>&#9003;</button>
      </div>
      
      {showLetters && (
        <div style={{ marginTop: 11, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
          {letters.map(c => (
            <button key={c} className="key alt" style={{ height: 46, fontSize: 15, border: '1.5px solid rgba(255,255,255,.14)' }} onClick={() => handleKeyClick(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
