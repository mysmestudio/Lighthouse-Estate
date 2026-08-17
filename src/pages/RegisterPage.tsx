import React, { useState } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Home, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Info,
  PhoneCall
} from 'lucide-react';
import { HouseUnitType, AppUser } from '../types';
import { validateResidentPin, registerResident, mapAuthErrorMessage } from '../lib/auth-helpers';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 ');
  const [houseNumber, setHouseNumber] = useState<number>(24);
  const [houseUnit, setHouseUnit] = useState<HouseUnitType>('Main House');
  const [pin, setPin] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedUser, setSubmittedUser] = useState<AppUser | null>(null);

  // Real-time PIN validation
  const pinValidation = validateResidentPin(pin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!pinValidation.isValid) {
      setErrorMessage(pinValidation.message || 'PIN does not meet required format.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must accept the Estate Community By-Laws and security protocol.');
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${surname.trim()}`;
      const res = await registerResident({
        fullName,
        email: email.trim(),
        phone: phone.trim(),
        houseNumber,
        houseUnit,
        pin: pin.trim().toUpperCase(),
      });

      if (res.error) {
        setErrorMessage(mapAuthErrorMessage(res.error, true));
      } else if (res.user) {
        setSubmittedUser(res.user);
      }
    } catch (err: any) {
      setErrorMessage(mapAuthErrorMessage(err?.message, true));
    } finally {
      setLoading(false);
    }
  };

  // If successfully submitted, show the Pending Admin Approval Screen
  if (submittedUser) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="w-full max-w-lg card-estate p-8 sm:p-10 space-y-6 text-center border-[#C89B3C] shadow-xl bg-white">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F2EAD9] border-2 border-[#C89B3C] flex items-center justify-center text-[#0F472A]">
            <Clock className="w-8 h-8 text-[#C89B3C] animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Status: Pending Admin Approval
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2F1C] pt-2">
              Registration Submitted!
            </h2>
            <p className="text-sm text-[#10241A]/70 max-w-md mx-auto">
              Your household record for <strong>House {submittedUser.house_number} ({submittedUser.house_unit})</strong> has been received by the Estate Management Office.
            </p>
          </div>

          {/* Reference Card */}
          <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E4D9BE]/60">
              <span className="text-[#10241A]/60">Resident Name:</span>
              <span className="font-semibold text-[#0A2F1C]">{submittedUser.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4D9BE]/60">
              <span className="text-[#10241A]/60">Assigned Unit:</span>
              <span className="font-semibold text-[#0F472A]">
                House {submittedUser.house_number}, {submittedUser.house_unit}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4D9BE]/60">
              <span className="text-[#10241A]/60">Application Reference ID:</span>
              <span className="font-mono font-bold text-[#C89B3C]">{submittedUser.id}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#10241A]/60">Security Gate PIN:</span>
              <span className="font-mono font-bold text-emerald-700">6-Character Hash Stored</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2EAD9]/80 border border-[#E4D9BE] text-left flex items-start gap-2.5 text-xs text-[#0A2F1C]">
            <Info className="w-4 h-4 text-[#C89B3C] shrink-0 mt-0.5" />
            <p>
              You'll be able to sign in once an estate admin approves your registration.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 rounded-xl border border-[#0F472A] text-[#0F472A] font-semibold text-xs hover:bg-[#F2EAD9] transition-colors"
            >
              Return to Home
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0F472A] text-white font-semibold text-xs hover:bg-[#0A2F1C] transition-colors shadow-xs"
            >
              Go to Portal Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F472A] border border-[#C89B3C]/40 shadow-xs cursor-pointer mb-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
              <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
              <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
              <circle cx="12" cy="12" r="2" fill="#E7D19C"/>
            </svg>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2F1C] tracking-tight">
            Resident Household Registration
          </h1>
          <p className="text-xs sm:text-sm text-[#10241A]/70 max-w-md mx-auto">
            Enroll your household to generate gate passes, receive security alerts, and access Al-Noor Community facilities.
          </p>
        </div>

        {/* Registration Form Card */}
        <div className="card-estate p-6 sm:p-9 space-y-6 bg-white shadow-lg">
          <div className="pb-3 border-b border-[#E4D9BE] flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-[#0F472A]">
              Household Verification Form
            </span>
            <span className="text-[11px] text-[#10241A]/60 font-medium">
              Residents Only
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name & Surname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                  First / Given Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] focus:ring-1 focus:ring-[#0F472A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                  Surname / Family Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Mansoor"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] focus:ring-1 focus:ring-[#0F472A] outline-none"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                  Contact Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="resident@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] focus:ring-1 focus:ring-[#0F472A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+234 803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] text-sm focus:border-[#0F472A] focus:ring-1 focus:ring-[#0F472A] outline-none font-mono"
                />
              </div>
            </div>

            {/* House Unit Allocation */}
            <div className="p-4 rounded-xl bg-[#F2EAD9]/60 border border-[#E4D9BE] space-y-3">
              <div className="text-xs font-bold text-[#0A2F1C] uppercase tracking-wider">
                Estate Location Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    House Number (1–100) *
                  </label>
                  <select
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm font-semibold text-[#0A2F1C] focus:border-[#0F472A] outline-none"
                  >
                    {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        House Number {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                    House Unit Type *
                  </label>
                  <select
                    value={houseUnit}
                    onChange={(e) => setHouseUnit(e.target.value as HouseUnitType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm font-semibold text-[#0A2F1C] focus:border-[#0F472A] outline-none"
                  >
                    <option value="Main House">Main House</option>
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="First Floor">First Floor</option>
                    <option value="BQ">BQ (Boys Quarters)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Self-Chosen 6-Character PIN with Real-Time Validation */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0A2F1C] uppercase tracking-wide">
                  Create 6-Character Access PIN *
                </label>
                <span className="text-[11px] text-[#C89B3C] font-semibold">
                  Required: 4 Digits + 2 Uppercase Letters
                </span>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 1A2B3C or 9482EF"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E4D9BE] focus:border-[#0F472A] bg-white text-lg font-mono tracking-widest text-[#0A2F1C] uppercase outline-none"
              />

              {/* Real-time Checklist */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] text-[11px]">
                <div className={`flex items-center gap-1.5 ${pinValidation.lengthOk ? 'text-emerald-700 font-bold' : 'text-[#10241A]/60'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${pinValidation.lengthOk ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>6 Characters ({pin.length}/6)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pinValidation.digitsOk ? 'text-emerald-700 font-bold' : 'text-[#10241A]/60'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${pinValidation.digitsOk ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>4 Digits ({pinValidation.digitCount}/4)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pinValidation.upperOk ? 'text-emerald-700 font-bold' : 'text-[#10241A]/60'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${pinValidation.upperOk ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>2 Letters ({pinValidation.upperCount}/2)</span>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0F472A] rounded border-[#E4D9BE] focus:ring-[#0F472A]"
              />
              <label htmlFor="terms" className="text-xs text-[#10241A]/80 leading-relaxed cursor-pointer">
                I certify that I am a bonafide resident or authorized occupant of Lighthouse Estate, and agree to uphold all estate security and community guidelines.
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !pinValidation.isValid}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Submitting Registration to Estate Office...</span>
              ) : (
                <>
                  <span>Submit Household Registration</span>
                  <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing account footer */}
        <div className="text-center text-xs text-[#10241A]/70">
          Already registered?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-[#0F472A] font-bold hover:underline"
          >
            Sign in with House PIN →
          </button>
        </div>
      </div>
    </div>
  );
};
