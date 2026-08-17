import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  QrCode, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  PhoneCall, 
  Clock, 
  FileText, 
  ChevronRight,
  Sun,
  ShieldAlert,
  MoonStar
} from 'lucide-react';
import { StarMotifDivider } from '../components/common/StarMotifDivider';
import { AppUser } from '../types';

interface LandingPageProps {
  navigate: (path: string) => void;
  currentUser: AppUser | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate, currentUser }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [testPassCode, setTestPassCode] = useState('');
  const [testResult, setTestResult] = useState<{ status: 'valid' | 'invalid' | null; message: string }>({
    status: null,
    message: '',
  });

  const handleVerifySimulator = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testPassCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'LH-8291' || code === 'LH-4410' || code === 'LH-9052') {
      setTestResult({
        status: 'valid',
        message: `✓ Valid Access Pass: ${code} for House 14 (Main House) — Granted Entry`,
      });
    } else if (code.startsWith('LH-') && code.length === 7) {
      setTestResult({
        status: 'valid',
        message: `✓ Valid Verified Pass (${code}) — Resident Authorization Confirmed`,
      });
    } else {
      setTestResult({
        status: 'invalid',
        message: `✗ Invalid Pass Code (${code}). Ensure format is LH-XXXX.`,
      });
    }
  };

  const faqs = [
    {
      q: 'How does the PIN-based login work for residents?',
      a: 'Residents log in simply by selecting their House Number (1–100), Unit (Main House, Ground Floor, etc.), and their 6-character PIN (4 digits + 2 uppercase letters). Under the hood, this securely generates a synthetic session with Supabase Auth, completely eliminating the need to remember long email addresses.',
    },
    {
      q: 'How do I generate a visitor pass for guests or delivery drivers?',
      a: 'Once logged in, open the Visitor Passes tab and click "Generate Pass". Enter your guest’s name, phone number, and vehicle registration. The portal instantly creates a 4-digit code (e.g. LH-8291) and a scannable QR code that you can send directly over WhatsApp or SMS.',
    },
    {
      q: 'What happens after I submit the Resident Registration form?',
      a: 'Your registration is submitted directly to the Estate Management queue with a "Pending" status. The estate office verifies your tenancy or ownership records, and once approved, your PIN is activated for instant gate and portal access.',
    },
    {
      q: 'Can security guards check passes without internet or in bright sunlight?',
      a: 'Yes! The Security Gate Console is built with high-contrast, large tactile buttons specifically engineered for outdoor sunlight legibility, with instant pass-code lookup and quick QR camera verification.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#10241A] font-sans">
      {/* Top Notification Bar */}
      <div className="bg-[#0F472A] text-[#FBF8F1] text-xs py-2 px-4 border-b border-[#C89B3C]/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium">
              Estate Main Gate: <strong>Active & 24/7 Manned</strong>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[#E7D19C]">
            <span>Al-Noor Madrasa: Weekend Tajweed Enrollment Open</span>
            <span>•</span>
            <span className="font-mono">Security Hotline: Ext. 100</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Subtle geometric background overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#0F472A_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Refined Estate Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2EAD9] border border-[#E4D9BE] text-[#0F472A] text-xs font-semibold tracking-wide shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#C89B3C]" />
                <span>Lighthouse Estate Security & Community Ecosystem</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-[#0A2F1C] tracking-tight leading-[1.15]">
                Graceful Living, <br />
                <span className="text-[#C89B3C] italic font-normal">Uncompromising</span> Security.
              </h1>

              <p className="text-base sm:text-lg text-[#10241A]/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Welcome to the official resident portal and access-control gateway for Lighthouse Estate. Experience streamlined gate clearance, seamless visitor passes, and unified community services.
              </p>

              {/* Call to Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                {currentUser ? (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0F472A] text-white font-semibold hover:bg-[#0A2F1C] transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    <span>Open My Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0F472A] text-white font-semibold hover:bg-[#0A2F1C] transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <KeyRound className="w-4 h-4 text-[#E7D19C]" />
                      <span>Resident & Staff Login</span>
                    </button>
                    <button
                      onClick={() => navigate('/register')}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-[#0F472A] text-[#0F472A] font-semibold hover:bg-[#F2EAD9] transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <span>Register New Household</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate('/notices')}
                  className="w-full sm:w-auto px-4 py-3.5 rounded-xl text-sm font-medium text-[#10241A]/80 hover:text-[#0F472A] hover:bg-[#F2EAD9]/50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-[#C89B3C]" />
                  <span>Public Notices</span>
                </button>
              </div>

              {/* Live Estate Highlights */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-[#E4D9BE] text-left">
                <div className="p-3 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE]">
                  <div className="font-serif text-lg font-bold text-[#0F472A]">100</div>
                  <div className="text-[11px] text-[#10241A]/70 font-medium">Residential Units</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE]">
                  <div className="font-serif text-lg font-bold text-[#C89B3C]">24 / 7</div>
                  <div className="text-[11px] text-[#10241A]/70 font-medium">Solar Guard Gate</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE]">
                  <div className="font-serif text-lg font-bold text-[#0F472A]">&lt; 15s</div>
                  <div className="text-[11px] text-[#10241A]/70 font-medium">Visitor Pass Check</div>
                </div>
              </div>
            </div>

            {/* Right Card: Interactive Pass & Gate Preview */}
            <div className="lg:col-span-5">
              <div className="card-estate p-6 sm:p-7 space-y-5 border-[#C89B3C]/30 shadow-lg relative bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="font-serif font-bold text-[#0A2F1C] text-sm">
                      Gate 1 Access Verifier
                    </span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#F2EAD9] text-[#0F472A]">
                    Live Simulator
                  </span>
                </div>

                {/* Sample Digital Pass Card */}
                <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#10241A]/60">Authorized Resident:</span>
                    <span className="font-semibold text-[#0F472A]">House 14 (Main House)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#10241A]/60">Active Demo Code</div>
                      <div className="font-mono text-xl font-bold tracking-wider text-[#0A2F1C]">
                        LH-8291
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-white border border-[#E4D9BE] flex items-center justify-center p-1">
                      <QrCode className="w-10 h-10 text-[#0F472A]" />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#10241A]/70 flex items-center justify-between">
                    <span>Guest: Engr. Kamaldeen Yusuf</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                </div>

                {/* Quick Simulator Form */}
                <form onSubmit={handleVerifySimulator} className="space-y-3">
                  <label className="block text-xs font-semibold text-[#10241A]/80">
                    Test Gate Clearance Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. LH-8291"
                      value={testPassCode}
                      onChange={(e) => setTestPassCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#E4D9BE] focus:border-[#0F472A] focus:ring-1 focus:ring-[#0F472A] outline-none font-mono uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0F472A] text-white hover:bg-[#0A2F1C] transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </form>

                {testResult.message && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      testResult.status === 'valid'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-xs text-[#10241A]/60">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-[#C89B3C]" />
                    Outdoor Daylight Mode Ready
                  </span>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-[#0F472A] font-semibold hover:underline"
                  >
                    Guard PIN Pad →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StarMotifDivider variant="gold" label="Estate Amenities & Governance" />

      {/* 4 Core Pillars Section */}
      <section className="py-12 bg-[#F2EAD9]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2F1C]">
              Integrated Estate Architecture
            </h2>
            <p className="text-sm sm:text-base text-[#10241A]/70">
              Purpose-built systems ensuring security, transparent governance, and communal tranquility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="card-estate p-6 space-y-4 hover:border-[#C89B3C] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0F472A] text-[#E7D19C] flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">
                Seamless House PIN
              </h3>
              <p className="text-xs text-[#10241A]/75 leading-relaxed">
                Log in using your house unit and a self-chosen 6-character PIN. No cumbersome email passwords needed for residents or domestic staff.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="card-estate p-6 space-y-4 hover:border-[#C89B3C] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#C89B3C] text-[#0A2F1C] flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">
                Instant Visitor Passes
              </h3>
              <p className="text-xs text-[#10241A]/75 leading-relaxed">
                Pre-register delivery drivers, contractors, and guests with a 4-digit token or QR pass sent straight to their phones.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="card-estate p-6 space-y-4 hover:border-[#C89B3C] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0F472A] text-[#E7D19C] flex items-center justify-center">
                <MoonStar className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">
                Al-Noor Community Hub
              </h3>
              <p className="text-xs text-[#10241A]/75 leading-relaxed">
                Central prayer pavilion schedules, weekend Madrasa Quranic education updates, and community welfare announcements.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="card-estate p-6 space-y-4 hover:border-[#C89B3C] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0A2F1C] text-[#E7D19C] flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">
                24/7 Monitored Access
              </h3>
              <p className="text-xs text-[#10241A]/75 leading-relaxed">
                Full digital audit trail of gate entries and exits, vehicle plate verification, and direct guard intercom connectivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community By-Laws & Guidelines Banner */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[14px] bg-[#0F472A] text-[#FBF8F1] p-8 sm:p-12 border border-[#C89B3C]/40 relative overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-3">
              <span className="text-xs uppercase tracking-widest text-[#E7D19C] font-semibold font-sans">
                Resident Community Accord
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#FBF8F1]">
                Preserving Serenity & Architectural Elegance
              </h3>
              <p className="text-xs sm:text-sm text-[#E7D19C]/90 leading-relaxed max-w-2xl">
                Estate quiet hours commence at 10:00 PM. Heavy construction and contractor deliveries are permitted Monday through Saturday between 08:00 AM and 06:00 PM only.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-3 rounded-xl bg-[#C89B3C] text-[#0A2F1C] font-bold text-xs uppercase tracking-wider hover:bg-[#E7D19C] transition-colors text-center shadow-sm"
              >
                Resident Registration
              </button>
              <button
                onClick={() => navigate('/notices')}
                className="px-5 py-3 rounded-xl bg-transparent border border-[#E7D19C] text-[#FBF8F1] font-semibold text-xs text-center hover:bg-[#0A2F1C] transition-colors"
              >
                Read Estate Notices
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 space-y-2">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2F1C]">
            Frequently Asked Questions
          </h3>
          <p className="text-xs sm:text-sm text-[#10241A]/70">
            Everything you need to know about estate access, registration, and gate rules.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="card-estate overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-[#0A2F1C]"
              >
                <span>{faq.q}</span>
                <ChevronRight
                  className={`w-4 h-4 text-[#C89B3C] transition-transform duration-200 ${
                    activeFaq === idx ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-4 pt-1 text-xs text-[#10241A]/80 border-t border-[#E4D9BE]/50 leading-relaxed bg-[#FBF8F1]/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
