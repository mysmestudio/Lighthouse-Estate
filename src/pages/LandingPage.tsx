import React from 'react';
import { getDailyHadith } from '../lib/hadith-utils';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="shell">
     <div className="hero" style={{ paddingBottom: 34 }}>
      <div className="topbar">
        <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
        <button onClick={() => navigate('/login')} className="btn btn-gold btn-sm">Login</button>
      </div>
      <p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '.06em' }}>
        &#1575;&#1604;&#1587;&#1617;&#1604;&#1575;&#1605; &#1593;&#1604;&#1610;&#1603;&#1605; &#183; Assalam Alaekum Waramotullahi Wabarakatu</p>
      <h1 style={{ marginTop: 12, fontSize: 40 }}>This is your<br/>estate, <span style={{ color: 'var(--gold)' }}>online</span>.</h1>
      <p className="muted" style={{ marginTop: 14, fontSize: 15.5, maxWidth: 330 }}>
        Your gate, your passes, your dues, your Madrasa and your neighbours — all in one place.
        Built for the 100 homes of Lighthouse Estate, Lekki.</p>
      <div className="stack" style={{ marginTop: 24 }}>
        <button onClick={() => navigate('/login')} className="btn btn-gold">Enter the portal &#8594;</button>
        <button className="btn btn-ghost-light">Install the app</button>
      </div>
      <div className="hadith" style={{ marginTop: 26 }}>
        <p className="q">{getDailyHadith().quote}</p>
        <p className="src">{getDailyHadith().source}</p>
      </div>
     </div>

     <div className="sheet pad">
      <div className="section-head" style={{ marginTop: 4 }}><h3>What lives inside</h3></div>
      <div className="carousel">
        <div className="card"><div className="ico">&#9919;</div><h4 style={{ marginTop: 12 }}>Passwordless PIN</h4>
          <p className="tiny muted" style={{ marginTop: 6 }}>House number, unit and your 6-character PIN. No passwords, no queue at the gate.</p></div>
        <div className="card"><div className="ico gold">&#9635;</div><h4 style={{ marginTop: 12 }}>Visitor passes</h4>
          <p className="tiny muted" style={{ marginTop: 6 }}>Guest, delivery, artisan windows, long-stay ranges and Jumu&rsquo;ah passes in seconds.</p></div>
        <div className="card"><div className="ico red">&#9888;</div><h4 style={{ marginTop: 12 }}>Emergency SOS</h4>
          <p className="tiny muted" style={{ marginTop: 6 }}>Hold five seconds anywhere in the app and both gates get your house number.</p></div>
        <div className="card"><div className="ico">&#9781;</div><h4 style={{ marginTop: 12 }}>Madrasa &amp; community</h4>
          <p className="tiny muted" style={{ marginTop: 6 }}>Class attendance, mosque hall bookings, Jumu&rsquo;ah notices and estate announcements.</p></div>
      </div>

      <div className="section">
        <div className="card dark">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>This Friday</h4><span className="pill pill-live"><i className="dot"></i>Jumu&rsquo;ah</span></div>
          <p style={{ marginTop: 12, fontSize: 15 }}>Khutbah begins <b style={{ color: 'var(--gold)' }}>1:05 PM</b> at the estate mosque hall.</p>
          <p className="tiny muted" style={{ marginTop: 6 }}>Overflow parking opens at Gate 2 from 12:30 PM. Jumu&rsquo;ah visitor passes are free to issue.</p>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h3>New to the estate?</h3></div>
        <div className="row"><span className="sq">1</span><div className="grow"><div className="t">Register your household</div>
          <div className="s">Admin verifies you within 24 hours</div></div></div>
        <div className="row"><span className="sq gold">2</span><div className="grow"><div className="t">Collect your 6-character PIN</div>
          <div className="s">4 digits + 2 letters, yours alone</div></div></div>
        <div className="row"><span className="sq grey">3</span><div className="grow"><div className="t">Onboard your domestic staff</div>
          <div className="s">Invite code, KYC, their own gate PIN</div></div></div>
        <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ marginTop: 16 }}>Register my household</button>
      </div>

      <p className="footer-note">Resident-only portal &#183; Lighthouse Estate, Lekki, Lagos<br/>&copy; 2026 Estate Residents&rsquo; Association</p>
      <div className="nav-space"></div>
     </div>
    </div>
  );
};
