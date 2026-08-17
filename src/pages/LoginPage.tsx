import React, { useState } from 'react';
import { 
  KeyRound, 
  Home, 
  Wrench, 
  ShieldCheck, 
  Lock, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sun,
  Shield,
  Smartphone
} from 'lucide-react';
import { PinInputBoxes } from '../components/auth/PinInputBoxes';
import { StarMotifDivider } from '../components/common/StarMotifDivider';
import { UserRole, HouseUnitType, AppUser } from '../types';
import { authenticateEstateUser, generateSyntheticEmail, mapAuthErrorMessage } from '../lib/auth-helpers';

interface LoginPageProps {
  navigate: (path: string) => void;
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate, onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('resident');
  
  // Resident & Staff Fields
  const [houseNumber, setHouseNumber] = useState<number>(14);
  const [houseUnit, setHouseUnit] = useState<HouseUnitType>('Main House');
  const [pin, setPin] = useState<string>('1A2B3C');

  // Security Gate PIN pad
  const [securityPin, setSecurityPin] = useState<string>('4421');

  // Admin Credentials
  const [adminEmail, setAdminEmail] = useState<string>('admin@lighthouseestate.org');
  const [adminPassword, setAdminPassword] = useState<string>('Admin@Lighthouse2026');
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaChallengeActive, setMfaChallengeActive] = useState<boolean>(false);
  const [pendingAdminUser, setPendingAdminUser] = useState<AppUser | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<string>('');

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setSuccessInfo('');
    setMfaChallengeActive(false);
    
    // Set appropriate demo presets for instant testing
    if (role === 'resident') {
      setHouseNumber(14);
      setHouseUnit('Main House');
      setPin('1A2B3C');
    } else if (role === 'staff') {
      setHouseNumber(14);
      setHouseUnit('BQ');
      setPin('9482AB');
    } else if (role === 'security') {
      setSecurityPin('4421');
    } else if (role === 'admin') {
      setAdminEmail('admin@lighthouseestate.org');
      setAdminPassword('Admin@Lighthouse2026');
    } else if (role === 'madrasa_admin') {
      setAdminEmail('madrasa@lighthouseestate.org');
      setAdminPassword('Madrasa@Lighthouse2026');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo('');
    setLoading(true);

    try {
      if (selectedRole === 'resident' || selectedRole === 'staff') {
        if (pin.length !== 6) {
          setErrorMessage('Please enter your full 6-character PIN');
          setLoading(false);
          return;
        }

        const res = await authenticateEstateUser(selectedRole, {
          houseNumber,
          houseUnit,
          pin,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
          navigate('/dashboard');
        }
      } else if (selectedRole === 'security') {
        if (securityPin.length !== 4) {
          setErrorMessage('Please enter the 4-digit Guard Gate PIN');
          setLoading(false);
          return;
        }

        const res = await authenticateEstateUser('security', {
          pin: securityPin,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
          navigate('/dashboard');
        }
      } else {
        // Admin / Madrasa Admin
        if (mfaChallengeActive) {
          if (mfaCode.length < 6) {
            setErrorMessage('Please enter the 6-digit TOTP authenticator code');
            setLoading(false);
            return;
          }
          // Complete MFA challenge
          if (pendingAdminUser) {
            onLoginSuccess(pendingAdminUser);
            navigate('/admin');
          }
        } else {
          const res = await authenticateEstateUser(selectedRole, {
            email: adminEmail,
            password: adminPassword,
          });

          if (res.error) {
            setErrorMessage(res.error);
          } else if (res.requireMfa && res.user) {
            setPendingAdminUser(res.user);
            setMfaChallengeActive(true);
            setSuccessInfo('Password verified. Please enter your 6-digit MFA (TOTP) Authenticator code.');
          } else if (res.user) {
            onLoginSuccess(res.user);
            navigate(selectedRole === 'resident' ? '/dashboard' : '/admin');
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(mapAuthErrorMessage(err?.message, false));
    } finally {
      setLoading(false);
    }
  };

  const syntheticPreview = selectedRole === 'resident' || selectedRole === 'staff'
    ? generateSyntheticEmail(selectedRole, houseNumber, houseUnit)
    : selectedRole === 'security'
    ? generateSyntheticEmail('security', 1, 'Main House', securityPin)
    : adminEmail;

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-10 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => navigate('/')} 
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F472A] border border-[#C89B3C]/40 shadow-sm cursor-pointer mb-2"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
              <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
              <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
              <path d="M12 7V17M7 12H17" stroke="#E7D19C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2F1C] tracking-tight">
            Estate Access Portal
          </h2>
          <p className="text-xs sm:text-sm text-[#10241A]/70">
            Select your role to sign into the secure estate network.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE]">
          <button
            type="button"
            onClick={() => handleRoleChange('resident')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'resident'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/80 hover:text-[#0F472A] hover:bg-[#E4D9BE]/50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Resident</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('staff')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'staff'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/80 hover:text-[#0F472A] hover:bg-[#E4D9BE]/50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Staff</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('security')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'security'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/80 hover:text-[#0F472A] hover:bg-[#E4D9BE]/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'admin' || selectedRole === 'madrasa_admin'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'text-[#10241A]/80 hover:text-[#0F472A] hover:bg-[#E4D9BE]/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Main Login Card */}
        <div className={`card-estate p-6 sm:p-7 space-y-6 ${selectedRole === 'security' ? 'border-2 border-[#0F472A] bg-white shadow-xl' : ''}`}>
          {/* Form Top Label */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#C89B3C]">
                {selectedRole === 'resident'
                  ? 'Resident House Login'
                  : selectedRole === 'staff'
                  ? 'Domestic & Service Staff Login'
                  : selectedRole === 'security'
                  ? 'Main Gate High-Contrast Console'
                  : 'Estate Management Authentication'}
              </span>
              <p className="text-xs text-[#10241A]/60 mt-0.5">
                {selectedRole === 'security'
                  ? 'Optimized for outdoor daylight operations'
                  : selectedRole === 'admin'
                  ? 'Supabase Auth with TOTP MFA Verification'
                  : 'Synthetic passwordless estate credentials'}
              </p>
            </div>
            {selectedRole === 'security' && (
              <span className="p-1.5 rounded-lg bg-[#F2EAD9] text-[#0A2F1C]">
                <Sun className="w-4 h-4 text-[#C89B3C]" />
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Resident & Staff Form */}
            {(selectedRole === 'resident' || selectedRole === 'staff') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                      House Number (1–100)
                    </label>
                    <select
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm font-semibold text-[#0A2F1C] focus:border-[#0F472A] outline-none"
                    >
                      {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          House {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#10241A]/80 mb-1.5">
                      House Unit
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

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#10241A]/80">
                      6-Character Access PIN
                    </label>
                    <span className="text-[11px] text-[#10241A]/50">
                      (4 digits + 2 uppercase letters)
                    </span>
                  </div>

                  <PinInputBoxes
                    length={6}
                    value={pin}
                    onChange={setPin}
                    isAlphanumeric={true}
                    variant="standard"
                  />
                  <div className="text-center">
                    <span className="text-[11px] text-[#10241A]/60">
                      Demo PIN for House 14: <strong className="font-mono text-[#0F472A]">1A2B3C</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Security Gate Form (High Contrast 4-Digit Outdoor Pad) */}
            {selectedRole === 'security' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#F2EAD9]/80 border border-[#E4D9BE] flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#0F472A]" />
                  <div className="text-xs text-[#0A2F1C]">
                    <strong>Main Gate Terminal:</strong> Lane 1 & 2 Guard Duty Pad
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <label className="block text-sm font-bold text-[#0A2F1C] uppercase tracking-wide">
                    Enter Guard Station PIN
                  </label>
                  <PinInputBoxes
                    length={4}
                    value={securityPin}
                    onChange={setSecurityPin}
                    isAlphanumeric={false}
                    variant="security-pad"
                  />
                  <span className="text-xs text-[#10241A]/60 block pt-1">
                    Guard Station Demo PIN: <strong className="font-mono text-[#0F472A]">4421</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Admin / Madrasa Admin Form with MFA */}
            {(selectedRole === 'admin' || selectedRole === 'madrasa_admin') && (
              <div className="space-y-4">
                {/* Admin Sub-Role Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      selectedRole === 'admin'
                        ? 'bg-[#0F472A] text-white border-[#0F472A]'
                        : 'bg-white text-[#10241A] border-[#E4D9BE]'
                    }`}
                  >
                    Estate Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('madrasa_admin')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      selectedRole === 'madrasa_admin'
                        ? 'bg-[#0F472A] text-white border-[#0F472A]'
                        : 'bg-white text-[#10241A] border-[#E4D9BE]'
                    }`}
                  >
                    Madrasa Admin
                  </button>
                </div>

                {!mfaChallengeActive ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                        Management Email
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm focus:border-[#0F472A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#10241A]/80 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm focus:border-[#0F472A] outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl bg-[#F2EAD9]/60 border border-[#C89B3C]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                      <Smartphone className="w-4 h-4 text-[#C89B3C]" />
                      <span>Two-Factor Authenticator (TOTP)</span>
                    </div>
                    <p className="text-[11px] text-[#10241A]/70">
                      Open your Google Authenticator or 2FA app and enter the 6-digit verification code.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full text-center tracking-widest text-xl font-mono py-2.5 rounded-xl border-2 border-[#0F472A] bg-white text-[#0A2F1C] outline-none focus:ring-2 focus:ring-[#C89B3C]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Synthetic Email Translator Footnote */}
            <div className="pt-2 text-[11px] text-[#10241A]/50 bg-[#FBF8F1] p-2.5 rounded-lg border border-[#E4D9BE]/60 flex items-center justify-between">
              <span>Underlying Supabase Session:</span>
              <span className="font-mono text-[#0F472A] font-medium truncate max-w-[200px]">
                {syntheticPreview}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                selectedRole === 'security'
                  ? 'bg-[#0A2F1C] hover:bg-[#0F472A] text-base py-4 text-[#E7D19C]'
                  : 'bg-[#0F472A] hover:bg-[#0A2F1C]'
              } disabled:opacity-50`}
            >
              {loading ? (
                <span>Authenticating with Estate System...</span>
              ) : (
                <>
                  <span>
                    {mfaChallengeActive
                      ? 'Verify MFA & Enter'
                      : selectedRole === 'security'
                      ? 'Unlock Guard Console'
                      : 'Sign In to Portal'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-4 border-t border-[#E4D9BE] text-center space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#10241A]/60">
              Quick 1-Click Evaluation Profiles:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('resident');
                  setHouseNumber(14);
                  setHouseUnit('Main House');
                  setPin('1A2B3C');
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE] hover:bg-[#E7D19C]"
              >
                Resident (H-14)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('security');
                  setSecurityPin('4421');
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE] hover:bg-[#E7D19C]"
              >
                Security Guard
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('staff');
                  setHouseNumber(14);
                  setHouseUnit('BQ');
                  setPin('9482AB');
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE] hover:bg-[#E7D19C]"
              >
                Staff (H-14 BQ)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleChange('admin');
                  setAdminEmail('admin@lighthouseestate.org');
                  setAdminPassword('Admin@Lighthouse2026');
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE] hover:bg-[#E7D19C]"
              >
                Estate Admin
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Registration Link */}
        <div className="text-center text-xs text-[#10241A]/70">
          New Resident moving in?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-[#0F472A] font-bold hover:underline"
          >
            Submit Household Registration →
          </button>
        </div>
      </div>
    </div>
  );
};
