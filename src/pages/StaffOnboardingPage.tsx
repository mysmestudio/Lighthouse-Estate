import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  User, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  FileText, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  Check,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { StaffInviteCode, StaffKYC } from '../types';
import { validateInviteCode, submitStaffOnboarding } from '../lib/staff-service';
import { compressImage, CompressionResult, formatFileSize } from '../lib/image-compressor';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

interface StaffOnboardingPageProps {
  navigate: (path: string) => void;
}

export const StaffOnboardingPage: React.FC<StaffOnboardingPageProps> = ({ navigate }) => {
  // Query param auto-fill
  const getQueryCode = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('code') || '';
    } catch {
      return '';
    }
  };

  // Flow State (Steps 1 to 4 + 5 Success)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Invite Code State
  const [inputCode, setInputCode] = useState(getQueryCode());
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [validatedInvite, setValidatedInvite] = useState<StaffInviteCode | null>(null);

  // Step 2: Personal Identity & Next of Kin
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [homeAddress, setHomeAddress] = useState('');
  const [nin, setNin] = useState('');
  const [ninError, setNinError] = useState('');

  const [kinName, setKinName] = useState('');
  const [kinPhone, setKinPhone] = useState('');
  const [kinRelationship, setKinRelationship] = useState('Brother');

  // Step 3: Compressed Documents
  const [passportDoc, setPassportDoc] = useState<{ url: string; compression?: CompressionResult } | null>(null);
  const [nationalIdDoc, setNationalIdDoc] = useState<{ url: string; compression?: CompressionResult } | null>(null);
  const [guarantorDoc, setGuarantorDoc] = useState<{ url: string; compression?: CompressionResult } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<'passport' | 'national_id' | 'guarantor' | null>(null);

  // Step 4: PIN Setup
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Completion Result
  const [completedKyc, setCompletedKyc] = useState<StaffKYC | null>(null);

  // Auto-validate if code is provided in URL
  useEffect(() => {
    const urlCode = getQueryCode();
    if (urlCode && urlCode.length === 6) {
      handleValidateCode(urlCode);
    }
  }, []);

  const handleValidateCode = async (codeToTest?: string) => {
    const target = codeToTest || inputCode;
    setCodeError('');
    setValidatingCode(true);

    try {
      const res = await validateInviteCode(target);
      if (res.valid && res.invite) {
        setValidatedInvite(res.invite);
        setCurrentStep(2);
      } else {
        setCodeError(res.error || 'Invalid or expired invite code.');
      }
    } finally {
      setValidatingCode(false);
    }
  };

  // Handle Document Upload & Client Compression
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'passport' | 'national_id' | 'guarantor'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(type);
    try {
      // Compress client side: max 1600px long edge, JPEG quality 0.8
      const compressed = await compressImage(file, 1600, 0.8);

      if (type === 'passport') {
        setPassportDoc({ url: compressed.dataUrl, compression: compressed });
      } else if (type === 'national_id') {
        setNationalIdDoc({ url: compressed.dataUrl, compression: compressed });
      } else if (type === 'guarantor') {
        setGuarantorDoc({ url: compressed.dataUrl, compression: compressed });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to compress image file.');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Step 2 Form Validation
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNin = nin.replace(/\D/g, '');
    if (cleanNin.length !== 11) {
      setNinError('National Identity Number (NIN) must be exactly 11 digits.');
      return;
    }
    setNinError('');
    setCurrentStep(3);
  };

  // Step 3 Validation
  const handleProceedToStep4 = () => {
    if (!passportDoc || !nationalIdDoc || !guarantorDoc) {
      alert('Please upload all three required KYC documents to proceed.');
      return;
    }
    setCurrentStep(4);
  };

  // Final Step 4 Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedInvite) return;

    if (pin.length < 4 || pin.length > 6) {
      setPinError('PIN must be 4 to 6 characters.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('Security PINs do not match. Please verify.');
      return;
    }

    setPinError('');
    setSubmitting(true);

    try {
      const res = await submitStaffOnboarding({
        invite: validatedInvite,
        fullName,
        phone,
        email: email || undefined,
        dob,
        gender,
        homeAddress,
        nin,
        nextOfKin: {
          name: kinName,
          phone: kinPhone,
          relationship: kinRelationship,
        },
        documents: {
          passport_photo_url: passportDoc?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
          national_id_url: nationalIdDoc?.url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
          guarantor_id_url: guarantorDoc?.url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        },
        pin,
      });

      if (res.success && res.staffKyc) {
        setCompletedKyc(res.staffKyc);
        setCurrentStep(5);
      } else {
        alert(res.error || 'Failed to submit onboarding KYC application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 sm:py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#0A2F1C] text-white rounded-3xl p-6 sm:p-8 border border-[#C89B3C]/40 shadow-xl text-center relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 text-[#C89B3C]">
            <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
            </svg>
          </div>

          <div className="relative z-10 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-[#E7D19C]/20 text-[#E7D19C] border border-[#C89B3C]/40 inline-block">
              Lighthouse Estate • Automated Gate Clearance
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#FBF8F1]">
              Domestic Staff KYC Onboarding
            </h1>
            <p className="text-xs text-[#E7D19C]/80 max-w-md mx-auto">
              Complete your identity verification to receive your verified estate gate access credentials.
            </p>
          </div>

          {/* 4-Step Indicator (Only shown during steps 1-4) */}
          {currentStep < 5 && (
            <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-[#C89B3C]/20">
              {[
                { num: 1, label: 'Invite' },
                { num: 2, label: 'Identity' },
                { num: 3, label: 'Docs' },
                { num: 4, label: 'PIN' },
              ].map((s) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <div key={s.num} className="text-center space-y-1">
                    <div
                      className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-[#C89B3C] text-[#0A2F1C]'
                          : isActive
                          ? 'bg-white text-[#0A2F1C] ring-2 ring-[#C89B3C]'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 text-[#0A2F1C]" /> : s.num}
                    </div>
                    <span
                      className={`text-[10px] block font-semibold ${
                        isActive ? 'text-[#E7D19C]' : isPassed ? 'text-[#FBF8F1]' : 'text-white/40'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= STEP 1: INVITE CODE VALIDATION ================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl border border-[#E4D9BE] p-6 sm:p-8 shadow-soft space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF7EE] text-[#0F472A] border border-[#E4D9BE] flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6 text-[#C89B3C]" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0A2F1C]">
                Enter Your 6-Digit Invite Code
              </h2>
              <p className="text-xs text-[#10241A]/70 max-w-sm mx-auto">
                Please enter the one-time invitation code provided by your resident employer or estate host.
              </p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.replace(/\D/g, ''));
                    setCodeError('');
                  }}
                  placeholder="e.g. 839201"
                  className="w-full text-center font-mono text-3xl tracking-widest font-black py-3 px-4 rounded-2xl bg-[#FAF7EE] border-2 border-[#E4D9BE] focus:border-[#0F472A] focus:outline-none"
                />
                {codeError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-2 justify-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleValidateCode()}
                disabled={validatingCode || inputCode.length !== 6}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {validatingCode ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E7D19C]" />
                ) : (
                  <>
                    <span>Verify Invite & Continue</span>
                    <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-[#10241A]/50">
                  Need an invite code? Contact your employing resident.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PERSONAL IDENTITY FORM ================= */}
        {currentStep === 2 && validatedInvite && (
          <form onSubmit={handleProceedToStep3} className="bg-white rounded-3xl border border-[#E4D9BE] p-6 sm:p-8 shadow-soft space-y-6">
            {/* Verified Invite Confirmation Banner */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#C89B3C]/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0F472A] text-[#E7D19C] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-[#0A2F1C]">
                  Invited by {validatedInvite.employer_name}
                </div>
                <div className="text-[#10241A]/70">
                  Role: <strong className="text-[#0F472A]">{validatedInvite.role}</strong> • {validatedInvite.work_location}
                </div>
                <div className="text-[11px] text-[#10241A]/60">
                  Schedule: {validatedInvite.schedule.days.join(', ')} ({validatedInvite.schedule.startTime} - {validatedInvite.schedule.endTime})
                </div>
              </div>
            </div>

            <div className="border-b border-[#E4D9BE] pb-2">
              <h2 className="text-lg font-serif font-bold text-[#0A2F1C]">
                1. Personal & National Identity Information
              </h2>
              <p className="text-xs text-[#10241A]/60">
                Please enter your legal information exactly as it appears on your official government ID.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Fatima Suleiman"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 806 555 7890"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A2F1C] mb-1">
                  Home Residential Address *
                </label>
                <input
                  type="text"
                  required
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="e.g. Plot 12, Dawaki Extension, Abuja FCT"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                />
              </div>

              {/* National Identity Number (NIN) */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0A2F1C] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>National Identity Number (NIN) *</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Encrypted via pgcrypto
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={nin}
                  onChange={(e) => {
                    setNin(e.target.value.replace(/\D/g, ''));
                    setNinError('');
                  }}
                  placeholder="11-Digit National ID Number"
                  className="w-full font-mono text-sm tracking-wider px-3.5 py-2 rounded-xl bg-white border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                />
                {ninError ? (
                  <p className="text-[11px] text-rose-600 font-semibold">{ninError}</p>
                ) : (
                  <p className="text-[11px] text-[#10241A]/60">
                    Your NIN is securely encrypted on insert. Only the last 4 digits are visible to gate guards.
                  </p>
                )}
              </div>

              {/* Next of Kin / Emergency Contact */}
              <div className="border-t border-[#E4D9BE] pt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0A2F1C]">
                  <Phone className="w-4 h-4 text-[#C89B3C]" />
                  <span>Next of Kin / Emergency Guarantor</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#10241A]/70 mb-1">
                      Kin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={kinName}
                      onChange={(e) => setKinName(e.target.value)}
                      placeholder="e.g. Salisu Suleiman"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E4D9BE]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#10241A]/70 mb-1">
                      Relationship *
                    </label>
                    <input
                      type="text"
                      required
                      value={kinRelationship}
                      onChange={(e) => setKinRelationship(e.target.value)}
                      placeholder="e.g. Brother, Spouse, Father"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E4D9BE]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#10241A]/70 mb-1">
                      Kin Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={kinPhone}
                      onChange={(e) => setKinPhone(e.target.value)}
                      placeholder="e.g. +234 802 333 9911"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E4D9BE]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E4D9BE]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-bold text-[#10241A]/70 hover:text-[#10241A] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>Continue to Document Upload</span>
                <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: DOCUMENT UPLOADS & CLIENT COMPRESSION ================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl border border-[#E4D9BE] p-6 sm:p-8 shadow-soft space-y-6">
            <div className="border-b border-[#E4D9BE] pb-2">
              <h2 className="text-lg font-serif font-bold text-[#0A2F1C]">
                2. Upload Required KYC Documents
              </h2>
              <p className="text-xs text-[#10241A]/60">
                All photos are compressed automatically on your device (max 1600px, JPEG 0.8) to save data.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. Passport Photograph */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#0F472A]" />
                    <span className="text-xs font-bold text-[#0A2F1C]">1. Passport Photograph *</span>
                  </div>
                  {passportDoc?.compression && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Saved {passportDoc.compression.savingsPercent}% (
                      {formatFileSize(passportDoc.compression.originalSize)} →{' '}
                      {formatFileSize(passportDoc.compression.compressedSize)})
                    </span>
                  )}
                </div>

                {passportDoc ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={passportDoc.url}
                      alt="Passport Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E4D9BE]"
                    />
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Passport photo compressed and ready</span>
                      </div>
                      <label className="text-[11px] text-[#0F472A] hover:underline font-bold cursor-pointer inline-block">
                        Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'passport')}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C89B3C]/50 hover:border-[#0F472A] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-white text-center">
                    <UploadCloud className="w-6 h-6 text-[#C89B3C] mb-1" />
                    <span className="text-xs font-bold text-[#0A2F1C]">
                      {uploadingDoc === 'passport' ? 'Compressing photo...' : 'Click or Drag to Upload Passport Photo'}
                    </span>
                    <span className="text-[10px] text-[#10241A]/50 mt-0.5">
                      Clear headshot with white/plain background
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'passport')}
                    />
                  </label>
                )}
              </div>

              {/* 2. National ID / NIN Slip Photo */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0F472A]" />
                    <span className="text-xs font-bold text-[#0A2F1C]">
                      2. National ID Card or NIN Slip *
                    </span>
                  </div>
                  {nationalIdDoc?.compression && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Saved {nationalIdDoc.compression.savingsPercent}% (
                      {formatFileSize(nationalIdDoc.compression.originalSize)} →{' '}
                      {formatFileSize(nationalIdDoc.compression.compressedSize)})
                    </span>
                  )}
                </div>

                {nationalIdDoc ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={nationalIdDoc.url}
                      alt="National ID Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E4D9BE]"
                    />
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>National ID image verified</span>
                      </div>
                      <label className="text-[11px] text-[#0F472A] hover:underline font-bold cursor-pointer inline-block">
                        Replace Document
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'national_id')}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C89B3C]/50 hover:border-[#0F472A] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-white text-center">
                    <UploadCloud className="w-6 h-6 text-[#C89B3C] mb-1" />
                    <span className="text-xs font-bold text-[#0A2F1C]">
                      {uploadingDoc === 'national_id' ? 'Compressing document...' : 'Upload National ID / NIN Slip'}
                    </span>
                    <span className="text-[10px] text-[#10241A]/50 mt-0.5">
                      Ensure NIN number and full name are clearly legible
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'national_id')}
                    />
                  </label>
                )}
              </div>

              {/* 3. Guarantor ID Photograph */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0F472A]" />
                    <span className="text-xs font-bold text-[#0A2F1C]">
                      3. Guarantor / Next of Kin ID Document *
                    </span>
                  </div>
                  {guarantorDoc?.compression && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Saved {guarantorDoc.compression.savingsPercent}% (
                      {formatFileSize(guarantorDoc.compression.originalSize)} →{' '}
                      {formatFileSize(guarantorDoc.compression.compressedSize)})
                    </span>
                  )}
                </div>

                {guarantorDoc ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={guarantorDoc.url}
                      alt="Guarantor Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E4D9BE]"
                    />
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Guarantor credential attached</span>
                      </div>
                      <label className="text-[11px] text-[#0F472A] hover:underline font-bold cursor-pointer inline-block">
                        Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'guarantor')}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C89B3C]/50 hover:border-[#0F472A] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-white text-center">
                    <UploadCloud className="w-6 h-6 text-[#C89B3C] mb-1" />
                    <span className="text-xs font-bold text-[#0A2F1C]">
                      {uploadingDoc === 'guarantor' ? 'Compressing photo...' : 'Upload Guarantor ID Card Photo'}
                    </span>
                    <span className="text-[10px] text-[#10241A]/50 mt-0.5">
                      Voter card, National ID, or Driver's license
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'guarantor')}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E4D9BE]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-bold text-[#10241A]/70 hover:text-[#10241A] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Identity</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToStep4}
                className="px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>Continue to Security PIN</span>
                <ArrowRight className="w-4 h-4 text-[#E7D19C]" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: SECURITY PIN SETUP & CONFIRMATION ================= */}
        {currentStep === 4 && (
          <form onSubmit={handleFinalSubmit} className="bg-white rounded-3xl border border-[#E4D9BE] p-6 sm:p-8 shadow-soft space-y-6">
            <div className="border-b border-[#E4D9BE] pb-2">
              <h2 className="text-lg font-serif font-bold text-[#0A2F1C]">
                3. Set Your Gate Access PIN & Final Review
              </h2>
              <p className="text-xs text-[#10241A]/60">
                You will use this secret PIN for gate verification and logging into the staff portal.
              </p>
            </div>

            {/* Application Summary Card */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] space-y-2 text-xs">
              <div className="font-bold text-[#0A2F1C] border-b border-[#E4D9BE] pb-1">
                Summary Overview
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#10241A]/60">Full Name:</span>
                  <div className="font-bold text-[#0A2F1C]">{fullName}</div>
                </div>
                <div>
                  <span className="text-[#10241A]/60">Designation / Role:</span>
                  <div className="font-bold text-[#0F472A]">{validatedInvite?.role}</div>
                </div>
                <div>
                  <span className="text-[#10241A]/60">Employer:</span>
                  <div className="font-medium text-[#10241A]">{validatedInvite?.employer_name}</div>
                </div>
                <div>
                  <span className="text-[#10241A]/60">National ID (NIN):</span>
                  <div className="font-mono font-bold text-emerald-800">
                    *******{nin.slice(-4)}
                  </div>
                </div>
              </div>
            </div>

            {/* PIN Inputs */}
            <div className="space-y-4 max-w-sm mx-auto pt-2">
              <div>
                <label className="block text-xs font-bold text-[#0A2F1C] mb-1 text-center">
                  Create 4–6 Digit Security PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center font-mono text-2xl tracking-widest py-2.5 px-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A2F1C] mb-1 text-center">
                  Confirm Security PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center font-mono text-2xl tracking-widest py-2.5 px-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] focus:ring-2 focus:ring-[#0F472A]"
                />
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E4D9BE]">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-xs font-bold text-[#10241A]/70 hover:text-[#10241A] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Documents</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E7D19C]" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#E7D19C]" />
                    <span>Submit KYC Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 5: SUBMISSION COMPLETE SCREEN ================= */}
        {currentStep === 5 && completedKyc && (
          <div className="bg-white rounded-3xl border border-[#E4D9BE] p-8 sm:p-10 shadow-soft text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 inline-block">
                Application Submitted
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#0A2F1C]">
                KYC Verification Complete
              </h2>
              <p className="text-xs text-[#10241A]/70 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{completedKyc.full_name}</strong>. Your domestic staff profile has been created and submitted to <strong>{completedKyc.employer_name}</strong> for final approval.
              </p>
            </div>

            {/* Reference Badge */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] max-w-sm mx-auto text-xs space-y-1">
              <div className="text-[#10241A]/60">Application Reference ID:</div>
              <div className="font-mono font-bold text-sm text-[#0A2F1C]">{completedKyc.id}</div>
              <div className="text-[11px] text-amber-700 font-semibold pt-1">
                Status: Pending Resident Approval
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/directory')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all"
              >
                View Staff Directory
              </button>
              <button
                onClick={() => navigate('/notices')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F2EAD9] text-[#0A2F1C] font-bold text-xs border border-[#E4D9BE]"
              >
                Estate Notice Board
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
