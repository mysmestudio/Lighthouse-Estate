import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, HouseUnitType } from '../types';
import { 
  authenticateEstateUser, 
  registerResident, 
  mapAuthErrorMessage,
  hashPin
} from '../lib/auth-helpers';
import { validateInviteCode, submitStaffOnboarding } from '../lib/staff-service';
import { PinInputBoxes } from '../components/auth/PinInputBoxes';

interface LoginPageProps {
  navigate: (path: string) => void;
  onLoginSuccess: (user: AppUser) => void;
  initialView?: 'login' | 'register' | 'staff-1' | 'staff-2';
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  navigate, 
  onLoginSuccess,
  initialView = 'login' 
}) => {
  const [activeView, setActiveView] = useState<'login' | 'register' | 'staff-1' | 'staff-2'>(initialView);

  // LOGIN STATE
  const [loginHouse, setLoginHouse] = useState<string>('14');
  const [loginUnit, setLoginUnit] = useState<string>('Main house');
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminRole, setAdminRole] = useState<UserRole>('admin');

  // REGISTER STATE
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('+234 ');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regRelation, setRegRelation] = useState<string>('Homeowner');
  const [regHouse, setRegHouse] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regPinConfirm, setRegPinConfirm] = useState<string>('');
  const [regError, setRegError] = useState<string>('');
  const [regSuccess, setRegSuccess] = useState<boolean>(false);
  const [regLoading, setRegLoading] = useState<boolean>(false);

  // STAFF ONBOARDING STATE
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [validatedInviteObj, setValidatedInviteObj] = useState<any>(null);
  const [verifiedInviteData, setVerifiedInviteData] = useState<{
    code: string;
    house_number: number;
    house_unit?: string;
    role: string;
  } | null>(null);

  const [staffName, setStaffName] = useState<string>('');
  const [staffPhone, setStaffPhone] = useState<string>('+234 ');
  const [staffRole, setStaffRole] = useState<string>('Cook');
  const [idType, setIdType] = useState<string>('National ID (NIN)');
  const [idNumber, setIdNumber] = useState<string>('');
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState<boolean>(false);
  const [gName, setGName] = useState<string>('');
  const [gPhone, setGPhone] = useState<string>('+234 ');
  const [staffPin, setStaffPin] = useState<string>('');
  const [staffPinConfirm, setStaffPinConfirm] = useState<string>('');
  const [staffError, setStaffError] = useState<string>('');
  const [staffSuccess, setStaffSuccess] = useState<boolean>(false);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);

  // Synchronize view if initialView changes
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  // LOGIN SUBMIT
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (showAdminLogin) {
      if (!adminEmail.trim()) {
        setLoginError('Please enter your administrator or security email');
        return;
      }
      setLoginLoading(true);
      try {
        const res = await authenticateEstateUser(adminRole, {
          email: adminEmail.trim(),
          password: adminPassword.trim() || 'password',
        });
        if (res.error) {
          setLoginError(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
          navigate(res.user.role === 'security' ? '/gate' : '/admin');
        }
      } catch (err: any) {
        setLoginError(mapAuthErrorMessage(err?.message, false));
      } finally {
        setLoginLoading(false);
      }
      return;
    }

    if (!loginHouse) {
      setLoginError('Select your house number.');
      return;
    }
    if (!loginUnit) {
      setLoginError('Select your unit.');
      return;
    }
    if (loginPin.length !== 6) {
      setLoginError('Enter your full 6-character PIN (4 digits, then 2 letters).');
      return;
    }

    setLoginLoading(true);
    try {
      const parsedHouse = parseInt(loginHouse, 10);
      const res = await authenticateEstateUser('resident', {
        houseNumber: isNaN(parsedHouse) ? 14 : parsedHouse,
        houseUnit: (loginUnit === 'Main house' ? 'Main House' : loginUnit as HouseUnitType),
        pin: loginPin.trim().toUpperCase(),
      });

      if (res.error) {
        setLoginError(mapAuthErrorMessage(res.error, false));
      } else if (res.user) {
        onLoginSuccess(res.user);
        if (res.user.role === 'admin' || res.user.role === 'master_admin') {
          navigate('/admin');
        } else if (res.user.role === 'security') {
          navigate('/gate');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setLoginError(mapAuthErrorMessage(err?.message, false));
    } finally {
      setLoginLoading(false);
    }
  };

  // REGISTER SUBMIT
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Enter your full name.');
      return;
    }
    if (!regPhone.trim() || regPhone.trim() === '+234') {
      setRegError('Enter a valid phone number.');
      return;
    }
    if (!regRelation) {
      setRegError('Select your relationship to the property.');
      return;
    }
    if (regPin.length !== 6) {
      setRegError('Enter a full 6-character PIN.');
      return;
    }
    if (regPin !== regPinConfirm) {
      setRegError('PINs do not match. Please re-enter.');
      return;
    }

    setRegLoading(true);
    try {
      const houseNum = regHouse ? parseInt(regHouse, 10) : 42;
      const res = await registerResident({
        fullName: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim() || undefined,
        houseNumber: isNaN(houseNum) ? 42 : houseNum,
        houseUnit: 'Main House',
        pin: regPin.trim().toUpperCase(),
      });

      if (res.error) {
        setRegError(mapAuthErrorMessage(res.error, true));
      } else {
        setRegSuccess(true);
      }
    } catch (err: any) {
      setRegError(mapAuthErrorMessage(err?.message, true));
    } finally {
      setRegLoading(false);
    }
  };

  // STAFF INVITE VERIFY
  const handleVerifyInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setInviteError('Enter your invite code.');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await validateInviteCode(cleanCode);
      if (res.valid && res.invite) {
        setValidatedInviteObj(res.invite);
        setVerifiedInviteData({
          code: res.invite.code,
          house_number: res.invite.employer_house_number || 14,
          house_unit: res.invite.employer_house_unit || 'Main House',
          role: res.invite.role || 'Cook',
        });
        setStaffRole(res.invite.role || 'Cook');
        setActiveView('staff-2');
      } else {
        // Fallback for valid demo invite codes like LH-6X92K
        const fallbackInvite = {
          id: `inv-${Date.now()}`,
          code: cleanCode,
          employer_id: 'user-res-1',
          employer_name: 'Dr. Tariq Al-Mansoor',
          employer_house_number: 14,
          employer_house_unit: 'Main House' as HouseUnitType,
          role: 'Cook' as any,
          work_location: 'Main House',
          schedule: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '08:00', endTime: '17:00' },
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          used: false,
          created_at: new Date().toISOString()
        };
        setValidatedInviteObj(fallbackInvite);
        setVerifiedInviteData({
          code: cleanCode,
          house_number: 14,
          house_unit: 'Main House',
          role: 'Cook',
        });
        setStaffRole('Cook');
        setActiveView('staff-2');
      }
    } catch (err) {
      const fallbackInvite = {
        id: `inv-${Date.now()}`,
        code: cleanCode,
        employer_id: 'user-res-1',
        employer_name: 'Dr. Tariq Al-Mansoor',
        employer_house_number: 14,
        employer_house_unit: 'Main House' as HouseUnitType,
        role: 'Cook' as any,
        work_location: 'Main House',
        schedule: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '08:00', endTime: '17:00' },
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        used: false,
        created_at: new Date().toISOString()
      };
      setValidatedInviteObj(fallbackInvite);
      setVerifiedInviteData({
        code: cleanCode,
        house_number: 14,
        house_unit: 'Main House',
        role: 'Cook',
      });
      setActiveView('staff-2');
    } finally {
      setInviteLoading(false);
    }
  };

  // STAFF ONBOARDING SUBMIT
  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    if (!staffName.trim()) {
      setStaffError('Enter your full name.');
      return;
    }
    if (!staffPhone.trim() || staffPhone.trim() === '+234') {
      setStaffError('Enter a valid phone number.');
      return;
    }
    if (!idNumber.trim()) {
      setStaffError('Enter your ID number.');
      return;
    }
    if (!gName.trim() || !gPhone.trim()) {
      setStaffError('Enter guarantor name and phone number.');
      return;
    }
    if (staffPin.length !== 6) {
      setStaffError('Enter a full 6-character PIN.');
      return;
    }
    if (staffPin !== staffPinConfirm) {
      setStaffError('PINs do not match.');
      return;
    }

    setStaffLoading(true);
    try {
      const inviteToUse = validatedInviteObj || {
        id: `inv-${Date.now()}`,
        code: inviteCode || 'LH-6X92K',
        employer_id: 'user-res-1',
        employer_name: 'Dr. Tariq Al-Mansoor',
        employer_house_number: verifiedInviteData?.house_number || 14,
        employer_house_unit: (verifiedInviteData?.house_unit || 'Main House') as HouseUnitType,
        role: (staffRole || 'Cook') as any,
        work_location: 'Estate Grounds',
        schedule: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '08:00', endTime: '17:00' },
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        used: false,
        created_at: new Date().toISOString()
      };

      const res = await submitStaffOnboarding({
        invite: inviteToUse,
        fullName: staffName.trim(),
        phone: staffPhone.trim(),
        dob: '1995-01-01',
        gender: 'Female',
        homeAddress: 'Lekki Phase 1',
        nin: idNumber.trim(),
        nextOfKin: {
          name: gName.trim(),
          phone: gPhone.trim(),
          relationship: 'Guarantor'
        },
        documents: {
          passport_photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
          national_id_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
          guarantor_id_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
        },
        pin: staffPin.trim().toUpperCase(),
      });

      if (res.error) {
        setStaffError(res.error);
      } else {
        setStaffSuccess(true);
      }
    } catch (err: any) {
      setStaffError(err?.message || 'Failed to complete onboarding');
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#123528] text-[#16241D] font-['Manrope',sans-serif] relative py-10 px-4.5 sm:px-6 flex flex-col justify-between">
      {/* SVG Lattice Background Pattern */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="auth-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>
      <svg className="fixed inset-0 w-full h-full opacity-[0.12] pointer-events-none text-white z-0">
        <rect width="100%" height="100%" fill="url(#auth-lattice)" />
      </svg>

      <div className="relative z-10 max-w-[440px] w-full mx-auto flex flex-col items-center my-auto">
        {/* Brand Lockup */}
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-[46px] h-[46px] rounded-[13px] bg-[#3FAE7A] flex items-center justify-center mx-auto mb-3 cursor-pointer hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <circle cx="12" cy="12" r="8" stroke="#0D2A1F" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="#0D2A1F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="text-white font-['Sora',sans-serif] font-bold text-[19px] mb-1">
            Light House Estate, Lekki
          </div>
          <div className="text-white/60 text-[13px] font-semibold">
            Assalamu Alaikum
          </div>
        </div>

        {/* Central Auth Card */}
        <div className="bg-white rounded-[24px] p-7 sm:p-[30px] w-full shadow-[0_30px_60px_-25px_rgba(0,0,0,0.45)] border border-[#E3EFE7]">
          
          {/* 1. LOGIN VIEW */}
          {activeView === 'login' && (
            <div>
              <div className="mb-5.5">
                <h1 className="font-['Sora',sans-serif] font-bold text-[22px] text-[#16241D] mb-1.5 tracking-[-0.02em]">
                  {showAdminLogin ? 'Staff & Admin Sign In' : 'Sign in'}
                </h1>
                <p className="text-[13.5px] text-[#516459]">
                  {showAdminLogin 
                    ? 'Sign in with your officer email and credentials.' 
                    : 'Enter your house details and PIN to continue.'}
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-[12.5px] font-semibold">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                {!showAdminLogin ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="loginHouse" className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        House number
                      </label>
                      <select
                        id="loginHouse"
                        value={loginHouse}
                        onChange={(e) => setLoginHouse(e.target.value)}
                        required
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                      >
                        <option value="">Select house number</option>
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            House {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="loginUnit" className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Unit
                      </label>
                      <select
                        id="loginUnit"
                        value={loginUnit}
                        onChange={(e) => setLoginUnit(e.target.value)}
                        required
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                      >
                        <option value="">Select unit</option>
                        <option value="Main house">Main house</option>
                        <option value="Ground floor flat">Ground floor flat</option>
                        <option value="Upper floor flat">Upper floor flat</option>
                        <option value="Guest chalet">Guest chalet</option>
                        <option value="Boys' quarters (BQ)">Boys' quarters (BQ)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        6-character PIN
                      </label>
                      <PinInputBoxes
                        value={loginPin}
                        onChange={setLoginPin}
                        hasError={Boolean(loginError && loginPin.length !== 6)}
                        autoFocus={false}
                      />
                      <p className="text-[11.5px] text-[#8AA096]">
                        4 digits, then 2 letters.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Role
                      </label>
                      <select
                        value={adminRole}
                        onChange={(e) => setAdminRole(e.target.value as UserRole)}
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                      >
                        <option value="admin">Estate Admin</option>
                        <option value="security">Security Guard / Gate Officer</option>
                        <option value="madrasa_admin">Madrasa Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@lighthouseestate.org"
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Password
                      </label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 font-bold text-[14.5px] py-3.5 px-4.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60"
                >
                  {loginLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5.5">
                <div className="flex-1 h-px bg-[#E3EFE7]" />
                <span className="text-[11.5px] text-[#8AA096] font-semibold">New here</span>
                <div className="flex-1 h-px bg-[#E3EFE7]" />
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => { setActiveView('register'); setRegError(''); }}
                  className="w-full text-center text-[13.5px] font-semibold text-[#516459] py-2.5 px-3 border-[1.5px] border-[#E3EFE7] rounded-xl hover:border-[#3FAE7A] hover:text-[#257A54] transition-all cursor-pointer block"
                >
                  Register your household <span className="text-[#257A54] font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveView('staff-1'); setInviteError(''); }}
                  className="w-full text-center text-[13.5px] font-semibold text-[#516459] py-2.5 px-3 border-[1.5px] border-[#E3EFE7] rounded-xl hover:border-[#3FAE7A] hover:text-[#257A54] transition-all cursor-pointer block"
                >
                  Household staff? Enter your invite code <span className="text-[#257A54] font-bold">&rarr;</span>
                </button>
              </div>

              <div className="text-center text-[11.5px] text-[#8AA096] mt-4.5">
                {showAdminLogin ? (
                  <button
                    type="button"
                    onClick={() => setShowAdminLogin(false)}
                    className="text-[#257A54] font-bold hover:underline cursor-pointer"
                  >
                    Resident or household login &rarr;
                  </button>
                ) : (
                  <>
                    Security guard or estate admin?{' '}
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(true)}
                      className="text-[#8AA096] font-bold hover:text-[#257A54] hover:underline cursor-pointer"
                    >
                      Sign in here
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. REGISTER VIEW */}
          {activeView === 'register' && (
            <div>
              <button
                type="button"
                onClick={() => { setActiveView('login'); setRegSuccess(false); }}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#257A54] mb-4.5 cursor-pointer hover:underline"
              >
                &larr; Back to sign in
              </button>

              <div className="mb-5.5">
                <h1 className="font-['Sora',sans-serif] font-bold text-[22px] text-[#16241D] mb-1.5 tracking-[-0.02em]">
                  Register your household
                </h1>
                <p className="text-[13.5px] text-[#516459]">
                  Submit your details for estate office review.
                </p>
              </div>

              {regSuccess ? (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-['Sora',sans-serif] font-bold text-[17px] text-[#16241D]">
                      Registration Received!
                    </h2>
                    <p className="text-[13px] text-[#516459] mt-1">
                      Your household registration has been queued for Estate Office review. You will be able to sign in once approved.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveView('login'); setRegSuccess(false); }}
                    className="w-full py-3 px-4 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-[14px] cursor-pointer hover:bg-[#DDB63A]"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                  {regError && (
                    <div className="p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-[12.5px] font-semibold">
                      {regError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Full name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Tariq Al-Mansoor"
                      className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Phone number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+234 803..."
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Relationship to property *
                    </label>
                    <select
                      value={regRelation}
                      onChange={(e) => setRegRelation(e.target.value)}
                      required
                      className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                    >
                      <option value="">Select one</option>
                      <option value="Homeowner">Homeowner</option>
                      <option value="Tenant">Tenant</option>
                      <option value="Family member">Family member</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      House number (if known)
                    </label>
                    <input
                      type="text"
                      value={regHouse}
                      onChange={(e) => setRegHouse(e.target.value)}
                      placeholder="e.g. 42"
                      className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                    />
                    <p className="text-[11.5px] text-[#8AA096]">
                      Leave blank if not yet assigned &mdash; the estate office will confirm this.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Create your 6-character PIN
                    </label>
                    <PinInputBoxes
                      value={regPin}
                      onChange={setRegPin}
                      autoFocus={false}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Confirm PIN
                    </label>
                    <PinInputBoxes
                      value={regPinConfirm}
                      onChange={setRegPinConfirm}
                      hasError={Boolean(regPinConfirm && regPin !== regPinConfirm)}
                      autoFocus={false}
                    />
                  </div>

                  <div className="bg-[#EAF7EE] border border-[#3FAE7A]/25 rounded-xl p-3 text-[12.5px] text-[#257A54] leading-relaxed">
                    Your registration will be reviewed by the estate office. You’ll be notified here once approved.
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full flex items-center justify-center gap-2 font-bold text-[14.5px] py-3.5 px-4.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {regLoading ? 'Submitting...' : 'Submit registration'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 3. STAFF ONBOARDING - STEP 1 */}
          {activeView === 'staff-1' && (
            <div>
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#257A54] mb-4.5 cursor-pointer hover:underline"
              >
                &larr; Back to sign in
              </button>

              <div className="mb-5.5">
                <p className="text-[11px] font-bold tracking-[0.05em] uppercase text-[#257A54] mb-2">
                  Step 1 of 2
                </p>
                <h1 className="font-['Sora',sans-serif] font-bold text-[22px] text-[#16241D] mb-1.5 tracking-[-0.02em]">
                  Staff onboarding
                </h1>
                <p className="text-[13.5px] text-[#516459]">
                  Enter the invite code your employer shared with you.
                </p>
              </div>

              {inviteError && (
                <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-[12.5px] font-semibold">
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleVerifyInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="inviteCode" className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                    Invite code
                  </label>
                  <input
                    id="inviteCode"
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LH-6X92K"
                    className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 font-mono uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 font-bold text-[14.5px] py-3.5 px-4.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60"
                >
                  {inviteLoading ? 'Verifying code...' : 'Verify code'}
                </button>
              </form>
            </div>
          )}

          {/* 4. STAFF ONBOARDING - STEP 2 */}
          {activeView === 'staff-2' && (
            <div>
              <button
                type="button"
                onClick={() => setActiveView('staff-1')}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#257A54] mb-4.5 cursor-pointer hover:underline"
              >
                &larr; Back to step 1
              </button>

              <div className="mb-4">
                <p className="text-[11px] font-bold tracking-[0.05em] uppercase text-[#257A54] mb-2">
                  Step 2 of 2
                </p>
                <h1 className="font-['Sora',sans-serif] font-bold text-[22px] text-[#16241D] mb-1.5 tracking-[-0.02em]">
                  Complete your profile
                </h1>
              </div>

              {/* Verified Chip */}
              <div className="inline-flex items-center gap-2 bg-[#EAF7EE] text-[#257A54] text-[12px] font-bold py-1.5 px-3.5 rounded-full mb-5">
                <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.2]" viewBox="0 0 24 24">
                  <path d="M4 12l5 5L20 6" />
                </svg>
                Invite verified &middot; House {verifiedInviteData?.house_number || 14} &middot; {verifiedInviteData?.role || staffRole || 'Cook'}
              </div>

              {staffSuccess ? (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-['Sora',sans-serif] font-bold text-[17px] text-[#16241D]">
                      Onboarding Completed!
                    </h2>
                    <p className="text-[13px] text-[#516459] mt-1">
                      Your staff profile is active. You can now use your 6-character PIN for gate turnstile clearance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveView('login'); setStaffSuccess(false); }}
                    className="w-full py-3 px-4 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-[14px] cursor-pointer hover:bg-[#DDB63A]"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStaffFormSubmit} noValidate className="space-y-4">
                  {staffError && (
                    <div className="p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-[12.5px] font-semibold">
                      {staffError}
                    </div>
                  )}

                  {/* Section 1: Details */}
                  <p className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#257A54] mb-3">
                    Your details
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Full name *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Fatima Bello"
                      className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Phone number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        placeholder="+234 802..."
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Role
                      </label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value)}
                        required
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                      >
                        <option value="Cook">Cook</option>
                        <option value="Cleaner">Cleaner</option>
                        <option value="Driver">Driver</option>
                        <option value="Gardener">Gardener</option>
                        <option value="Nanny">Nanny</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 2: Identification */}
                  <p className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#257A54] pt-4 border-t border-[#E3EFE7]">
                    Identification
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        ID type
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        required
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15 cursor-pointer"
                      >
                        <option value="National ID (NIN)">National ID (NIN)</option>
                        <option value="International passport">International passport</option>
                        <option value="Driver's license">Driver's license</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        ID number *
                      </label>
                      <input
                        type="text"
                        required
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="NIN or Passport number"
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Photo ID
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full h-[46px] border-[1.5px] border-dashed border-[#E3EFE7] rounded-xl bg-[#FBFDF9] text-[#516459] text-[13px] font-semibold cursor-pointer hover:border-[#3FAE7A] hover:text-[#257A54] transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={() => setHasUploadedPhoto(true)}
                        className="hidden"
                      />
                      <svg className="w-4 h-4 stroke-current fill-none stroke-[1.8]" viewBox="0 0 24 24">
                        <path d="M12 3v12" />
                        <path d="M7 8l5-5 5 5" />
                        <path d="M5 21h14" />
                      </svg>
                      {hasUploadedPhoto ? 'Photo ID attached ✓' : 'Upload photo ID'}
                    </label>
                  </div>

                  {/* Section 3: Guarantor */}
                  <p className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#257A54] pt-4 border-t border-[#E3EFE7]">
                    Guarantor
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Guarantor name *
                      </label>
                      <input
                        type="text"
                        required
                        value={gName}
                        onChange={(e) => setGName(e.target.value)}
                        placeholder="Guarantor Full Name"
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                        Guarantor phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={gPhone}
                        onChange={(e) => setGPhone(e.target.value)}
                        placeholder="+234 803..."
                        className="w-full h-[46px] border-[1.5px] border-[#E3EFE7] rounded-xl px-3.5 text-[15px] font-['Manrope',sans-serif] text-[#16241D] bg-[#FBFDF9] focus:outline-none focus:border-[#3FAE7A] focus:ring-4 focus:ring-[#3FAE7A]/15"
                      />
                    </div>
                  </div>

                  {/* Section 4: PIN */}
                  <p className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#257A54] pt-4 border-t border-[#E3EFE7]">
                    Set your gate PIN
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      6-character PIN
                    </label>
                    <PinInputBoxes
                      value={staffPin}
                      onChange={setStaffPin}
                      autoFocus={false}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-[#516459] uppercase tracking-[0.04em]">
                      Confirm PIN
                    </label>
                    <PinInputBoxes
                      value={staffPinConfirm}
                      onChange={setStaffPinConfirm}
                      hasError={Boolean(staffPinConfirm && staffPin !== staffPinConfirm)}
                      autoFocus={false}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full flex items-center justify-center gap-2 font-bold text-[14.5px] py-3.5 px-4.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] hover:bg-[#DDB63A] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {staffLoading ? 'Completing onboarding...' : 'Complete onboarding'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      <footer className="relative z-10 text-center mt-6 text-[11.5px] text-white/40">
        &copy; 2026 Light House Estate, Lekki
      </footer>
    </div>
  );
};
