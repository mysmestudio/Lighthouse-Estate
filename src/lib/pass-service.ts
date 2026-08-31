import QRCode from 'qrcode';
import { VisitorPass, PassType, PassVerificationAttempt, VerificationResult, AppUser, AccessLog } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredPasses, saveStoredPasses, getStoredAccessLogs, saveStoredAccessLogs } from './estate-data';
import { createOverstayAlert, checkAndEscalateOverstays } from './alert-service';

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
 * - guest: 30 minutes (single entry)
 * - delivery: 15 minutes (single entry)
 * - contractor: window on artisan date (e.g. 08:00 - 17:00)
 * - long_stay: multi-entry until valid_to date (23:59:59)
 * - exit: 2 hours (single entry)
 * - group: 4 hours (multi/group)
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
        const parsed = new Date(customLongStayDate + 'T23:59:59');
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
        } else {
          expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else {
        expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;
    case 'contractor':
      expiryDate = new Date(now.getTime() + 12 * 60 * 60 * 1000); // end of work day
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
 * Format the official Light House Estate, Lekki WhatsApp invitation message.
 */
export function buildWhatsAppShareMessage(pass: VisitorPass): string {
  let timeDetail = '';
  if (pass.pass_type === 'contractor' && pass.artisan_date) {
    timeDetail = `📅 Work Date: ${pass.artisan_date}\n⏰ Authorized Window: ${pass.start_time || '08:00'} - ${pass.end_time || '17:00'}`;
  } else if (pass.pass_type === 'long_stay' && pass.valid_to) {
    timeDetail = `📅 Valid Period: ${pass.valid_from ? pass.valid_from.split('T')[0] : 'Today'} to ${pass.valid_to} (Multi-Entry)`;
  } else {
    const expiryDate = new Date(pass.valid_until || pass.expires_at || '');
    const expiryFormatted = !isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Valid for current visit';
    timeDetail = `⏱️ Valid until ${expiryFormatted}`;
  }

  const residentPhone = pass.resident_phone || '+234 800 000 0000';

  return `Your access code for Light House Estate, Lekki is: ${pass.pass_code}
${timeDetail}
Please show this to estate security at the gate (or let them scan the QR).
📞 Host: ${pass.resident_name}, ${residentPhone}, House ${pass.house_number} - ${pass.house_unit}
🕌 Light House Estate is a Muslim Residential Community. Visitors are expected to respect community values.`;
}

export function logAccessAndNotify(
  partialLog: Omit<AccessLog, 'id' | 'timestamp' | 'is_late_access'>,
  allLogs: AccessLog[]
): AccessLog {
  const timestamp = new Date().toISOString();
  const hours = new Date(timestamp).getHours();
  const is_late_access = hours >= 22 || hours < 5;

  const newLog: AccessLog = {
    ...partialLog,
    id: `log-${Date.now()}`,
    timestamp,
    is_late_access,
  };

  saveStoredAccessLogs([newLog, ...allLogs]);

  // Household-wide access email notification (Simulated)
  console.log(`[EMAIL DISPATCH] To Household ${partialLog.house_info} Email:
Subject: Gate Access Alert
Body: Pass/PIN ${partialLog.pass_code || '[Hidden]'} was used for ${partialLog.direction.toUpperCase()} at ${partialLog.guard_name} on ${new Date(timestamp).toLocaleString()}. 
Visitor/Pass info: ${partialLog.visitor_name}`);

  return newLog;
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

  // Trigger background check for overstays to keep alert store synchronized
  try {
    checkAndEscalateOverstays();
  } catch (e) {
    console.error('Background overstay check error:', e);
  }

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
          logAccessAndNotify({
            pass_code: data.code,
            visitor_name: data.pass.guest_name,
            house_info: `House ${data.pass.house_number} (${data.pass.house_unit})`,
            direction: data.actionTaken === 'granted_exit' ? 'out' : 'in',
            guard_name,
            vehicle_plate: data.pass.guest_plate_number,
            verified_method: method,
            notes: data.message,
          }, allLogs);
        }
        return data as VerificationResult;
      }
    } catch (e) {
      console.warn('Edge function invoke error, using resilient verification engine:', e);
    }
  }

  // Resilient Local Verification Engine
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
      message: 'Access pass code not found in Light House Estate security directory.',
      timestamp: now.toISOString(),
    };
  }

  const pass = allPasses[passIndex];
  const isMultiEntry = pass.entry_type === 'multi' || pass.pass_type === 'long_stay';

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

  // 4. MULTI-ENTRY (LONG STAY VISITOR) LOGIC & AUTO-EXPIRY
  if (isMultiEntry) {
    // Compare current date against valid_to / valid_until live at scan time
    let expiryTimestamp: Date;
    if (pass.valid_to) {
      expiryTimestamp = new Date(`${pass.valid_to}T23:59:59`);
    } else if (pass.valid_until) {
      expiryTimestamp = new Date(pass.valid_until);
    } else {
      expiryTimestamp = new Date(Date.now() + 7 * 24 * 3600000);
    }

    if (now.getTime() > expiryTimestamp.getTime() || pass.status === 'expired') {
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
        message: `This pass has expired. Validity ended on ${pass.valid_to || expiryTimestamp.toLocaleDateString()}.`,
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

    // Check valid_from start date
    if (pass.valid_from) {
      const fromDate = new Date(`${pass.valid_from.split('T')[0]}T00:00:00`);
      if (now.getTime() < fromDate.getTime()) {
        return {
          success: false,
          code: pass.pass_code,
          status: 'active',
          reason: 'expired',
          actionTaken: 'denied',
          message: `Pass is not yet active. Valid from ${pass.valid_from.split('T')[0]}.`,
          timestamp: now.toISOString(),
        };
      }
    }

    // Determine direction for multi-entry from recent access logs
    const allLogs = getStoredAccessLogs();
    const passLogs = allLogs.filter((l) => l.pass_code === pass.pass_code || l.pass_id === pass.id);
    const sortedLogs = [...passLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const isCurrentlyInside = sortedLogs.length > 0 && sortedLogs[0].direction === 'in';

    const direction: 'in' | 'out' = isCurrentlyInside ? 'out' : 'in';
    const actionTaken = direction === 'in' ? 'granted_entry' : 'granted_exit';
    const msg = direction === 'in' 
      ? `ACCESS GRANTED: Multi-entry guest arrival cleared. Valid through ${pass.valid_to || expiryTimestamp.toLocaleDateString()}.` 
      : `EXIT CLEARANCE GRANTED: Multi-entry guest departure logged.`;

    // Keep pass status active (multi-entry allows repeated scans)
    pass.status = 'active';
    if (direction === 'in') {
      pass.verified_at = now.toISOString();
      pass.verified_by = guard_name;
    } else {
      pass.checked_out_at = now.toISOString();
    }
    allPasses[passIndex] = pass;
    saveStoredPasses(allPasses);

    recordVerificationAttempt({
      id: `att-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      attempted_at: now.toISOString(),
      status: 'success',
      reason: direction === 'in' ? 'success' : 'checked_out',
      guard_name,
      verified_method: method,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
    });

    logAccessAndNotify({
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction,
      guard_name,
      vehicle_plate: pass.guest_plate_number,
      verified_method: method,
      notes: `Multi-entry pass scan (${direction.toUpperCase()}). Valid to: ${pass.valid_to || 'Date'}`,
    }, allLogs);

    return {
      success: true,
      code: pass.pass_code,
      status: 'active',
      actionTaken,
      reason: 'success',
      message: msg,
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
        status: 'active',
      },
      timestamp: now.toISOString(),
    };
  }

  // 5. ARTISAN / CONTRACTOR TIME WINDOW VALIDATION
  if (pass.pass_type === 'contractor' || (pass.artisan_date && pass.start_time && pass.end_time)) {
    const todayDateStr = now.toISOString().split('T')[0];
    const passDateStr = pass.artisan_date || todayDateStr;

    // Check scheduled date & time window for entry
    const [startH, startM] = (pass.start_time || '08:00').split(':').map(Number);
    const [endH, endM] = (pass.end_time || '17:00').split(':').map(Number);

    const windowStart = new Date(passDateStr);
    windowStart.setHours(startH || 8, startM || 0, 0, 0);

    const windowEnd = new Date(passDateStr);
    windowEnd.setHours(endH || 17, endM || 0, 0, 0);

    // If attempting fresh ENTRY outside authorized window
    if (pass.status === 'active') {
      const isOutsideWindow = 
        todayDateStr !== passDateStr || 
        now.getTime() < windowStart.getTime() || 
        now.getTime() > windowEnd.getTime();

      if (isOutsideWindow) {
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

        const detailMsg = todayDateStr !== passDateStr
          ? `Outside authorized date. Pass is only valid on ${passDateStr} between ${pass.start_time || '08:00'} and ${pass.end_time || '17:00'}.`
          : `Outside authorized hours. Contractor entry is only permitted between ${pass.start_time || '08:00'} and ${pass.end_time || '17:00'}.`;

        return {
          success: false,
          code: pass.pass_code,
          status: 'active',
          reason: 'expired',
          actionTaken: 'denied',
          message: `ACCESS DENIED: ${detailMsg}`,
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
    }

    // If checking OUT (Exit scan) after End Time -> flag overstay & escalate to Resident and Admin, but still grant exit!
    if (pass.status === 'used') {
      const isOverstaying = now.getTime() > windowEnd.getTime();
      if (isOverstaying) {
        pass.overstayed = true;
        createOverstayAlert(pass, 'checkout_detection');
      }

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
      logAccessAndNotify({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
        direction: 'out',
        guard_name,
        vehicle_plate: pass.guest_plate_number,
        verified_method: method,
        notes: isOverstaying 
          ? `Outbound contractor exit. ⚠️ Overstay logged: departed past ${pass.end_time || '17:00'}. Escalate to Resident & Admin.` 
          : `Outbound contractor exit clearance completed.`,
      }, allLogs);

      return {
        success: true,
        code: pass.pass_code,
        status: 'out',
        actionTaken: 'granted_exit',
        reason: 'checked_out',
        message: isOverstaying
          ? `EXIT CLEARANCE GRANTED: Outbound departure registered (⚠️ Late departure past ${pass.end_time || '17:00'} flagged to Resident & Admin).`
          : 'EXIT CLEARANCE GRANTED: Outbound contractor departure registered.',
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
  }

  // 6. STANDARD SINGLE-ENTRY EXPIRY CHECK (Guest, Delivery, Exit)
  const expiryDate = new Date(pass.expires_at || pass.valid_until);
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

  // 7. STANDARD SINGLE-ENTRY STATE MACHINE
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
    logAccessAndNotify({
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction: 'in',
      guard_name,
      vehicle_plate: pass.guest_plate_number,
      verified_method: method,
      notes: `Inbound visitor entry cleared. Type: ${pass.pass_type}`,
    }, allLogs);

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
    logAccessAndNotify({
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: pass.guest_name,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction: 'out',
      guard_name,
      vehicle_plate: pass.guest_plate_number,
      verified_method: method,
      notes: `Outbound exit clearance completed.`,
    }, allLogs);

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

export async function createGatePass(params: any): Promise<{ success: boolean; pass?: VisitorPass; error?: string }> {
  try {
    const allPasses = getStoredPasses();
    const passCode = generateUnique6DigitCode(allPasses.filter(p => p.status === 'active').map(p => p.pass_code));
    
    // Quick validation
    if (!params.visitorName && params.passType !== 'jumuah' && params.passType !== 'offline') {
       return { success: false, error: 'Visitor name is required' };
    }

    const { validFrom, validUntil } = calculatePassExpiry(params.passType as PassType, params.validUntil);
    
    const newPass: VisitorPass = {
      id: `pass-${Date.now()}`,
      pass_code: passCode,
      pin: passCode,
      guest_name: params.visitorName,
      visitor_name: params.visitorName, // added compat
      pass_type: params.passType as PassType,
      guest_phone: params.visitorPhone,
      guest_plate_number: params.vehiclePlate,
      guest_count: params.guestCount || 1,
      house_number: params.houseNumber,
      house_unit: params.houseUnit,
      status: 'active',
      valid_from: params.validFrom ? new Date(params.validFrom).toISOString() : validFrom,
      valid_to: params.validUntil ? new Date(params.validUntil).toISOString() : validUntil,
      valid_until: params.validUntil ? new Date(params.validUntil).toISOString() : validUntil,
      created_at: new Date().toISOString(),
      notes: params.notes,
      // custom fields
      artisan_date: new Date().toISOString().split('T')[0],
      start_time: params.arrives,
      end_time: params.mustExitTime,
      trade_company: params.tradeCompany
    } as any;

    const updated = [newPass, ...allPasses];
    saveStoredPasses(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('passes').insert({
          pass_code: newPass.pass_code,
          guest_name: newPass.guest_name,
          pass_type: newPass.pass_type,
          house_number: newPass.house_number,
          house_unit: newPass.house_unit,
          valid_from: newPass.valid_from,
          valid_to: newPass.valid_to,
          status: newPass.status
        });
      } catch (e) {
        console.warn('Could not sync pass to Supabase');
      }
    }

    // SIMULATED EMAIL DISPATCH
    console.log(`[EMAIL DISPATCH] To Household ${params.houseNumber} Email:
Subject: New Gate Pass Created
Body: A ${params.passType} pass was issued for ${params.visitorName} with PIN ${passCode}.`);

    return { success: true, pass: newPass };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
