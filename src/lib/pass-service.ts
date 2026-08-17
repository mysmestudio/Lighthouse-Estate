import QRCode from 'qrcode';
import { VisitorPass, PassType, PassVerificationAttempt, VerificationResult, AppUser, AccessLog } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredPasses, saveStoredPasses, getStoredAccessLogs, saveStoredAccessLogs } from './estate-data';

const ATTEMPTS_KEY = 'lighthouse_pass_verification_attempts_v1';

/**
 * Generate a random 6-digit numeric code and ensure it does not collide with active passes.
 */
export function generateUnique6DigitCode(existingActiveCodes: string[] = []): string {
  const activeSet = new Set(existingActiveCodes.map((c) => c.trim()));
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(100000 + Math.random() * 900000);
    const code = num.toString();
    if (!activeSet.has(code)) {
      return code;
    }
    attempts++;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate expiry date based on Pass Type specification:
 * - guest: 30 minutes
 * - delivery: 15 minutes
 * - long_stay: until custom selected date/time (or default 7 days)
 * - exit: 2 hours
 * - group: 4 hours
 */
export function calculatePassExpiry(
  passType: PassType,
  customLongStayDate?: string
): { validFrom: string; validUntil: string } {
  const now = new Date();
  const validFrom = now.toISOString();
  let expiryDate = new Date(now.getTime());

  switch (passType) {
    case 'guest':
    case 'one_time':
      expiryDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins
      break;
    case 'delivery':
      expiryDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins
      break;
    case 'long_stay':
    case 'recurring':
      if (customLongStayDate) {
        const parsed = new Date(customLongStayDate);
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
        } else {
          expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else {
        expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;
    case 'exit':
      expiryDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      break;
    case 'group':
      expiryDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      break;
    default:
      expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
  }

  return {
    validFrom,
    validUntil: expiryDate.toISOString(),
  };
}

/**
 * Generate high quality QR code data URL client-side using `qrcode` library.
 */
export async function generatePassQRCode(passId: string, passCode: string): Promise<string> {
  const payload = JSON.stringify({
    app: 'lighthouse_estate',
    pass_id: passId,
    code: passCode,
    created_at: new Date().toISOString(),
  });

  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0A2F1C', // Deep forest green
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    // Fallback simple QR
    return await QRCode.toDataURL(passId);
  }
}

/**
 * Format the official Lighthouse Estate WhatsApp invitation message.
 */
export function buildWhatsAppShareMessage(pass: VisitorPass): string {
  const expiryDate = new Date(pass.valid_until || pass.expires_at || '');
  const expiryFormatted = !isNaN(expiryDate.getTime())
    ? expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Valid for current visit';

  const residentPhone = pass.resident_phone || '+234 800 000 0000';

  return `Your access code for Lighthouse Estate is: ${pass.pass_code}
⏱️ Valid until ${expiryFormatted}
Please show this to estate security at the gate (or let them scan the QR).
📞 Host: ${pass.resident_name}, ${residentPhone}, House ${pass.house_number} - ${pass.house_unit}
🕌 Lighthouse Estate is a Muslim Residential Community. Visitors are expected to respect community values.`;
}

/**
 * Get stored verification attempts
 */
export function getStoredVerificationAttempts(): PassVerificationAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading verification attempts:', e);
  }
  return [];
}

/**
 * Save verification attempt to local registry
 */
export function recordVerificationAttempt(attempt: PassVerificationAttempt) {
  const existing = getStoredVerificationAttempts();
  const updated = [attempt, ...existing].slice(0, 200); // keep last 200
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(updated));
}

/**
 * Security Gate Verification Processor.
 * Invokes Supabase Edge Function `verify-gate-pass` if configured,
 * or runs the exact server-grade validation & rate-limiting logic locally.
 */
export async function verifyGatePassAtGatehouse(params: {
  code?: string;
  pass_id?: string;
  guard_name?: string;
  method?: 'pin' | 'qr';
}): Promise<VerificationResult> {
  const { code, pass_id, guard_name = 'Gate 1 Officer', method = 'pin' } = params;
  const rawCode = (code || '').trim();
  const passId = (pass_id || '').trim();

  // Try invoking Supabase Edge Function first if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-gate-pass', {
        body: {
          code: rawCode,
          pass_id: passId,
          guard_name,
          method,
        },
      });

      if (!error && data) {
        // Also sync local access logs if returned
        if (data.success && data.pass) {
          const allLogs = getStoredAccessLogs();
          const newLog: AccessLog = {
            id: `log-${Date.now()}`,
            pass_code: data.code,
            visitor_name: data.pass.guest_name,
            house_info: `House ${data.pass.house_number} (${data.pass.house_unit})`,
            direction: data.actionTaken === 'granted_exit' ? 'out' : 'in',
            guard_name,
            timestamp: new Date().toISOString(),
            vehicle_plate: data.pass.guest_plate_number,
            verified_method: method,
            notes: data.message,
          };
          saveStoredAccessLogs([newLog, ...allLogs]);
        }
        return data as VerificationResult;
      }
    } catch (e) {
      console.warn('Edge function invoke error, using resilient verification engine:', e);
    }
  }

  // Resilient Local Verification Engine (Deno Edge Function equivalent)
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).getTime();
  const attempts = getStoredVerificationAttempts();

  // 1. RATE LIMIT CHECK: 5+ failed attempts for same code in last 10 minutes
  if (rawCode) {
    const recentFailures = attempts.filter((a) => {
      const attemptTime = new Date(a.attempted_at).getTime();
      return (
        a.pass_code === rawCode &&
        a.status === 'failed' &&
        attemptTime >= tenMinutesAgo
      );
    });

    if (recentFailures.length >= 5) {
      const rateLimitAttempt: PassVerificationAttempt = {
        id: `att-${Date.now()}`,
        pass_code: rawCode,
        attempted_at: now.toISOString(),
        status: 'failed',
        reason: 'rate_limited',
        guard_name,
        verified_method: method,
      };
      recordVerificationAttempt(rateLimitAttempt);

      return {
        success: false,
        code: rawCode,
        status: 'rate_limited',
        reason: 'rate_limited',
        actionTaken: 'denied',
        message: 'SECURITY LOCKOUT: 5+ failed attempts in the last 10 minutes. Code temporarily blocked.',
        timestamp: now.toISOString(),
      };
    }
  }

  // 2. FIND PASS
  const allPasses = getStoredPasses();
  const passIndex = allPasses.findIndex((p) => {
    if (passId) return p.id === passId;
    return p.pass_code === rawCode;
  });

  if (passIndex === -1) {
    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_code: rawCode || passId,
      attempted_at: now.toISOString(),
      status: 'failed',
      reason: 'not_found',
      guard_name,
      verified_method: method,
    });

    return {
      success: false,
      code: rawCode,
      status: 'not_found',
      reason: 'not_found',
      actionTaken: 'denied',
      message: 'Access pass code not found in Lighthouse Estate security directory.',
      timestamp: now.toISOString(),
    };
  }

  const pass = allPasses[passIndex];
  const expiryDate = new Date(pass.expires_at || pass.valid_until);

  // 3. CHECK REVOKED
  if (pass.status === 'revoked') {
    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'failed',
      reason: 'revoked',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    return {
      success: false,
      code: pass.pass_code,
      status: 'revoked',
      reason: 'revoked',
      actionTaken: 'denied',
      message: 'Pass has been REVOKED by the resident host or Estate Security Command.',
      timestamp: now.toISOString(),
      pass: {
        id: pass.id,
        guest_name: pass.guest_name,
        pass_type: pass.pass_type,
        guest_count: pass.guest_count || 1,
        guest_phone: pass.guest_phone,
        guest_plate_number: pass.guest_plate_number,
        house_number: pass.house_number,
        house_unit: pass.house_unit,
        resident_name: pass.resident_name,
        resident_phone: pass.resident_phone,
        valid_until: pass.valid_until,
        status: pass.status,
      },
    };
  }

  // 4. CHECK EXPIRY
  if (expiryDate.getTime() < now.getTime() || pass.status === 'expired') {
    pass.status = 'expired';
    allPasses[passIndex] = pass;
    saveStoredPasses(allPasses);

    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'failed',
      reason: 'expired',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    return {
      success: false,
      code: pass.pass_code,
      status: 'expired',
      reason: 'expired',
      actionTaken: 'denied',
      message: `Pass EXPIRED on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      timestamp: now.toISOString(),
      pass: {
        id: pass.id,
        guest_name: pass.guest_name,
        pass_type: pass.pass_type,
        guest_count: pass.guest_count || 1,
        guest_phone: pass.guest_phone,
        guest_plate_number: pass.guest_plate_number,
        house_number: pass.house_number,
        house_unit: pass.house_unit,
        resident_name: pass.resident_name,
        resident_phone: pass.resident_phone,
        valid_until: pass.valid_until,
        status: 'expired',
      },
    };
  }

  // 5. STATE MACHINE
  // Case A: Fresh ACTIVE Pass -> Mark USED (Entry Granted)
  if (pass.status === 'active') {
    pass.status = 'used';
    pass.verified_at = now.toISOString();
    pass.verified_by = guard_name;
    allPasses[passIndex] = pass;
    saveStoredPasses(allPasses);

    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'success',
      reason: 'success',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    const allLogs = getStoredAccessLogs();
    const newLog: AccessLog = {
      id: `log-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction: 'in',
      guard_name,
      timestamp: now.toISOString(),
      vehicle_plate: pass.guest_plate_number,
      verified_method: method,
      notes: `Inbound visitor entry cleared. Type: ${pass.pass_type}`,
    };
    saveStoredAccessLogs([newLog, ...allLogs]);

    return {
      success: true,
      code: pass.pass_code,
      status: 'used',
      actionTaken: 'granted_entry',
      reason: 'success',
      message: 'ACCESS GRANTED: Inbound visitor clearance approved.',
      pass: {
        id: pass.id,
        guest_name: pass.guest_name,
        pass_type: pass.pass_type,
        guest_count: pass.guest_count || 1,
        guest_phone: pass.guest_phone,
        guest_plate_number: pass.guest_plate_number,
        house_number: pass.house_number,
        house_unit: pass.house_unit,
        resident_name: pass.resident_name,
        resident_phone: pass.resident_phone,
        valid_until: pass.valid_until,
        status: 'used',
      },
      timestamp: now.toISOString(),
    };
  }

  // Case B: Already USED pass OR Exit-type pass -> Mark OUT (Exit Departure Granted)
  if (pass.status === 'used' || pass.pass_type === 'exit') {
    pass.status = 'out';
    pass.checked_out_at = now.toISOString();
    allPasses[passIndex] = pass;
    saveStoredPasses(allPasses);

    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'success',
      reason: 'checked_out',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    const allLogs = getStoredAccessLogs();
    const newLog: AccessLog = {
      id: `log-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction: 'out',
      guard_name,
      timestamp: now.toISOString(),
      vehicle_plate: pass.guest_plate_number,
      verified_method: method,
      notes: `Outbound exit clearance completed.`,
    };
    saveStoredAccessLogs([newLog, ...allLogs]);

    return {
      success: true,
      code: pass.pass_code,
      status: 'out',
      actionTaken: 'granted_exit',
      reason: 'checked_out',
      message: 'EXIT CLEARANCE GRANTED: Outbound departure registered.',
      pass: {
        id: pass.id,
        guest_name: pass.guest_name,
        pass_type: pass.pass_type,
        guest_count: pass.guest_count || 1,
        guest_phone: pass.guest_phone,
        guest_plate_number: pass.guest_plate_number,
        house_number: pass.house_number,
        house_unit: pass.house_unit,
        resident_name: pass.resident_name,
        resident_phone: pass.resident_phone,
        valid_until: pass.valid_until,
        status: 'out',
      },
      timestamp: now.toISOString(),
    };
  }

  // Case C: Pass is already marked OUT
  if (pass.status === 'out') {
    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'failed',
      reason: 'already_used',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    return {
      success: false,
      code: pass.pass_code,
      status: 'out',
      reason: 'already_used',
      actionTaken: 'denied',
      message: 'ALREADY USED: Visitor has already departed and checked out with this pass.',
      timestamp: now.toISOString(),
      pass: {
        id: pass.id,
        guest_name: pass.guest_name,
        pass_type: pass.pass_type,
        guest_count: pass.guest_count || 1,
        guest_phone: pass.guest_phone,
        guest_plate_number: pass.guest_plate_number,
        house_number: pass.house_number,
        house_unit: pass.house_unit,
        resident_name: pass.resident_name,
        resident_phone: pass.resident_phone,
        valid_until: pass.valid_until,
        status: 'out',
      },
    };
  }

  return {
    success: false,
    code: pass.pass_code,
    status: pass.status,
    reason: 'revoked',
    actionTaken: 'denied',
    message: `Pass state is ${pass.status}. Access denied.`,
    timestamp: now.toISOString(),
  };
}
