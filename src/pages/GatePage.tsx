import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  XCircle,
  Delete,
  RotateCcw,
  Clock,
  Car,
  User,
  Phone,
  Home,
  AlertOctagon,
  ArrowLeft,
  Search,
  Filter,
  Check,
  LogOut,
  Sparkles,
  Layers,
  Volume2
} from 'lucide-react';
import { AppUser, PassVerificationAttempt, VerificationResult, PassType } from '../types';
import {
  verifyGatePassAtGatehouse,
  getStoredVerificationAttempts,
} from '../lib/pass-service';
import { getStoredAccessLogs } from '../lib/estate-data';
import { QRCameraScannerModal } from '../components/gate/QRCameraScannerModal';
import { ActiveSOSMonitorPanel } from '../components/gate/ActiveSOSMonitorPanel';

interface GatePageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

export const GatePage: React.FC<GatePageProps> = ({ currentUser, navigate }) => {
  // Input 6-digit code state
  const [codeDigits, setCodeDigits] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Result state (Full-screen overlay)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Verification attempts log
  const [attemptsLog, setAttemptsLog] = useState<PassVerificationAttempt[]>(() =>
    getStoredVerificationAttempts()
  );

  // Guard info
  const guardDisplayName = currentUser?.full_name || 'Officer On Duty (Gate 1)';

  // Refresh logs periodically
  const refreshLogs = () => {
    setAttemptsLog(getStoredVerificationAttempts());
  };

  // Handle keypad number press
  const handleDigitPress = (digit: string) => {
    if (codeDigits.length < 6) {
      const next = codeDigits + digit;
      setCodeDigits(next);
      if (next.length === 6) {
        // Auto-verify on 6th digit
        triggerVerification(next, undefined, 'pin');
      }
    }
  };

  const handleBackspace = () => {
    setCodeDigits((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCodeDigits('');
  };

  // Trigger verification pipeline
  const triggerVerification = async (
    codeToVerify?: string,
    passIdToVerify?: string,
    method: 'pin' | 'qr' = 'pin'
  ) => {
    const code = codeToVerify || codeDigits;
    if (!code && !passIdToVerify) return;

    setIsVerifying(true);
    try {
      const result = await verifyGatePassAtGatehouse({
        code: code || undefined,
        pass_id: passIdToVerify,
        guard_name: guardDisplayName,
        method,
      });

      setVerificationResult(result);
      refreshLogs();

      // Clear input digits
      setCodeDigits('');
    } catch (err: any) {
      setVerificationResult({
        success: false,
        code: code || '',
        status: 'not_found',
        reason: 'not_found',
        actionTaken: 'denied',
        message: err.message || 'System verification communication failed.',
        timestamp: new Date().toISOString(),
      });
      refreshLogs();
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle QR scanner success
  const handleQRScanned = (scannedPayload: string) => {
    setIsScannerOpen(false);

    try {
      // Try parsing JSON payload if structured
      const parsed = JSON.parse(scannedPayload);
      if (parsed.code) {
        triggerVerification(parsed.code, parsed.pass_id, 'qr');
        return;
      }
      if (parsed.pass_id) {
        triggerVerification(undefined, parsed.pass_id, 'qr');
        return;
      }
    } catch (e) {
      // If plain text (e.g. raw 6-digit code or pass-id)
      const clean = scannedPayload.trim();
      if (/^\d{6}$/.test(clean)) {
        triggerVerification(clean, undefined, 'qr');
      } else {
        triggerVerification(undefined, clean, 'qr');
      }
    }
  };

  // Filter today's attempts
  const todayAttempts = useMemo(() => {
    const todayStr = new Date().toDateString();
    return attemptsLog.filter((a) => {
      return new Date(a.attempted_at).toDateString() === todayStr;
    });
  }, [attemptsLog]);

  return (
    <div className="min-h-screen bg-[#10241A] text-white flex flex-col font-sans select-none pb-12">
      {/* SVG Lattice Background Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="gate-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Top Header Bar for Outdoor Daylight Visibility with Lattice Pattern */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0A2F1C] border-b border-[#C89B3C]/40 px-4 py-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#gate-lattice)" />
        </svg>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#E7D19C] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="fraunces text-lg sm:text-xl font-bold tracking-wide text-white">
                Gate Hub • Security Console
              </h1>
            </div>
            <p className="text-[11px] text-[#E7D19C]/90 font-medium">
              Light House Outer Command • {guardDisplayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => navigate('/passes')}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#E7D19C] border border-white/15"
          >
            Passes Directory
          </button>
        </div>
      </div>

      {/* Permanent, Unmissable Active SOS Monitor at the Top of Gate Hub */}
      <ActiveSOSMonitorPanel currentUser={currentUser} />

      {/* Main High-Contrast Outdoor Workspace */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-8 flex flex-col justify-start">
        {/* Verification Display Slot & Scanner Trigger */}
        <div className="bg-[#0F472A] rounded-2xl p-5 sm:p-6 border-2 border-[#C89B3C]/50 shadow-soft-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest font-bold text-[#E7D19C] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C89B3C]" />
              <span>Enter 6-Digit Guest Token or Scan QR</span>
            </span>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C89B3C] hover:bg-[#b28a35] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Camera Scan QR</span>
            </button>
          </div>

          {/* 6 Digit Input Display */}
          <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-white/15 flex items-center justify-center">
            <div className="flex gap-2 sm:gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = codeDigits[index] || '';
                const isCurrent = index === codeDigits.length;

                return (
                  <div
                    key={index}
                    className={`w-11 h-14 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center font-mono text-2xl sm:text-3xl font-extrabold tracking-wider transition-all ${
                      digit
                        ? 'bg-white text-[#0A2F1C] border-2 border-[#C89B3C] shadow-md'
                        : isCurrent
                        ? 'bg-white/15 text-white border-2 border-emerald-400 animate-pulse'
                        : 'bg-white/5 text-white/40 border border-white/10'
                    }`}
                  >
                    {digit || '•'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tactile Keypad (One-Handed Operation Optimized) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto w-full">
          {[
            ['1', ''],
            ['2', 'ABC'],
            ['3', 'DEF'],
            ['4', 'GHI'],
            ['5', 'JKL'],
            ['6', 'MNO'],
            ['7', 'PQRS'],
            ['8', 'TUV'],
            ['9', 'WXYZ'],
          ].map(([num, sub]) => (
            <button
              key={num}
              onClick={() => handleDigitPress(num)}
              disabled={isVerifying}
              className="h-16 sm:h-18 rounded-2xl bg-[#1D3E2F] hover:bg-[#25523E] active:bg-[#0A2F1C] border border-[#C89B3C]/30 text-white font-mono text-2xl font-bold flex flex-col items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{num}</span>
              {sub && <span className="text-[9px] font-sans text-[#E7D19C]/70 tracking-widest">{sub}</span>}
            </button>
          ))}

          {/* Clear Button */}
          <button
            onClick={handleClear}
            disabled={isVerifying || codeDigits.length === 0}
            className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/20 text-[#E7D19C] text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all disabled:opacity-30"
          >
            Clear
          </button>

          {/* 0 Button */}
          <button
            onClick={() => handleDigitPress('0')}
            disabled={isVerifying}
            className="h-16 sm:h-18 rounded-2xl bg-[#1D3E2F] hover:bg-[#25523E] active:bg-[#0A2F1C] border border-[#C89B3C]/30 text-white font-mono text-2xl font-bold flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            onClick={handleBackspace}
            disabled={isVerifying || codeDigits.length === 0}
            className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/20 text-red-300 flex items-center justify-center transition-all disabled:opacity-30"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Manual Verify Submit Action */}
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={() => triggerVerification()}
            disabled={isVerifying || codeDigits.length < 6}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-bold text-base uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            {isVerifying ? (
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 animate-spin" />
                <span>Checking Edge Database...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Verify Gate Code</span>
              </div>
            )}
          </button>
        </div>

        {/* Today's Verifications Log */}
        <div className="bg-[#0A2F1C] rounded-2xl border border-[#E4D9BE]/20 p-5 sm:p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C89B3C]" />
              <h2 className="fraunces text-base sm:text-lg font-bold text-white">
                Today's Verification Attempts & Logs
              </h2>
            </div>
            <span className="text-xs font-mono text-[#E7D19C]">
              {todayAttempts.length} Total Today
            </span>
          </div>

          {todayAttempts.length === 0 ? (
            <div className="p-8 text-center text-white/50 text-xs">
              No verification attempts recorded today yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                    attempt.status === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold ${
                        attempt.status === 'success'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {attempt.status === 'success' ? '✓' : '✕'}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white">
                        Code: <span className="font-mono tracking-wider">{attempt.pass_code}</span>{' '}
                        {attempt.visitor_name && `• ${attempt.visitor_name}`}
                      </div>
                      <div className="text-[11px] opacity-80 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>Method: {attempt.verified_method.toUpperCase()}</span>
                        {attempt.house_info && <span>• {attempt.house_info}</span>}
                        {attempt.reason && (
                          <span className="uppercase font-semibold">
                            • Reason: {attempt.reason.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[11px] opacity-75 sm:shrink-0">
                    {new Date(attempt.attempted_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FULL SCREEN UNMISTAKABLE RESULT STATE (ACCESS GRANTED / ACCESS DENIED) */}
      {verificationResult && (
        <div
          className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 animate-in fade-in zoom-in duration-200 ${
            verificationResult.success
              ? 'bg-emerald-900 text-white'
              : 'bg-rose-950 text-white'
          }`}
        >
          {/* Top Result Banner */}
          <div className="flex items-center justify-between border-b border-white/20 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm uppercase tracking-widest font-extrabold bg-white/20 px-3 py-1 rounded-full">
                Light House Security Clearance
              </span>
              <span className="font-mono text-sm opacity-80">
                Code: {verificationResult.code}
              </span>
            </div>

            <button
              onClick={() => setVerificationResult(null)}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors"
            >
              ✕ Dismiss (Esc)
            </button>
          </div>

          {/* Main Huge Status Banner */}
          <div className="my-auto text-center max-w-2xl mx-auto space-y-6">
            {verificationResult.success ? (
              <div className="space-y-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-emerald-800 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                  <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>

                <div>
                  <h1 className="fraunces text-4xl sm:text-6xl font-extrabold tracking-tight">
                    {verificationResult.actionTaken === 'granted_exit'
                      ? 'EXIT CLEARANCE'
                      : 'ACCESS GRANTED'}
                  </h1>
                  <p className="text-lg sm:text-xl text-emerald-200 mt-2 font-medium">
                    {verificationResult.message}
                  </p>
                </div>

                {/* Safe Sanitized Resident & Guest Information */}
                {verificationResult.pass && (
                  <div className="bg-black/35 backdrop-blur-md rounded-2xl p-6 border border-white/25 text-left space-y-4 shadow-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold block">
                          Visitor Name
                        </span>
                        <span className="fraunces text-xl font-bold text-white">
                          {verificationResult.pass.guest_name}
                        </span>
                        {verificationResult.pass.guest_count && verificationResult.pass.guest_count > 1 && (
                          <span className="text-xs text-emerald-300 block">
                            Group size: {verificationResult.pass.guest_count} persons
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold block">
                          Vehicle Plate
                        </span>
                        <span className="font-mono text-xl font-bold text-amber-300">
                          {verificationResult.pass.guest_plate_number || 'Pedestrian / None'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold block">
                          Destination House
                        </span>
                        <span className="fraunces text-lg font-bold text-white">
                          House {verificationResult.pass.house_number} ({verificationResult.pass.house_unit})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold block">
                          Host Resident
                        </span>
                        <span className="text-sm font-bold text-white">
                          {verificationResult.pass.resident_name} ({verificationResult.pass.resident_phone || 'Resident'})
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200">
                      <span>Pass Type: <strong>{verificationResult.pass.pass_type.toUpperCase()}</strong></span>
                      <span>Gate Logged: <strong>{new Date().toLocaleTimeString()}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white text-red-800 flex items-center justify-center mx-auto shadow-2xl">
                  <XCircle className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>

                <div>
                  <h1 className="fraunces text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                    ACCESS DENIED
                  </h1>
                  <p className="text-lg sm:text-2xl text-red-200 mt-2 font-bold max-w-xl mx-auto">
                    {verificationResult.message}
                  </p>
                </div>

                {verificationResult.reason && (
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/20 inline-block text-xs font-mono uppercase tracking-wider text-amber-300">
                    Security Rejection Code: {verificationResult.reason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Next Visitor Action */}
          <div className="text-center pt-4">
            <button
              onClick={() => setVerificationResult(null)}
              className="w-full max-w-md py-4 rounded-2xl bg-white text-black font-extrabold text-base uppercase tracking-wider hover:bg-white/90 shadow-2xl transition-all"
            >
              Dismiss / Next Visitor →
            </button>
          </div>
        </div>
      )}

      {/* QR Camera Scanner Modal */}
      <QRCameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQRScanned}
      />
    </div>
  );
};
