import { EstateAlert, VisitorPass, AccessLog } from '../types';
import { getStoredPasses, saveStoredPasses, getStoredAccessLogs, saveStoredAccessLogs } from './estate-data';

const ALERTS_KEY = 'lighthouse_estate_alerts_v1';

export const INITIAL_ALERTS: EstateAlert[] = [
  {
    id: 'alert-initial-1',
    type: 'security',
    title: 'Perimeter Gate 1 Sensor Inspection',
    message: 'Routine calibration scheduled for outer vehicle boom gate sensors at 18:00.',
    target_role: 'admin',
    severity: 'info',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    read: false,
  }
];

export function getStoredAlerts(): EstateAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read alerts from localStorage:', e);
  }
  localStorage.setItem(ALERTS_KEY, JSON.stringify(INITIAL_ALERTS));
  return INITIAL_ALERTS;
}

export function saveStoredAlerts(alerts: EstateAlert[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Failed to save alerts to localStorage:', e);
  }
}

/**
 * Creates synchronous escalation alerts for both the resident employer and Estate Admin on artisan overstay.
 */
export function createOverstayAlert(
  pass: VisitorPass,
  triggerType: 'live_detection' | 'checkout_detection' = 'live_detection'
): { residentAlert: EstateAlert; adminAlert: EstateAlert } {
  const existingAlerts = getStoredAlerts();
  const now = new Date();
  const nowIso = now.toISOString();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const scheduledEndTime = pass.end_time || '17:00';
  const scheduledDate = pass.artisan_date || new Date().toISOString().split('T')[0];

  const triggerNote = triggerType === 'checkout_detection' 
    ? `Departed gate late at ${timeFormatted}` 
    : `Still on estate grounds past ${scheduledEndTime}`;

  // 1. Alert for Resident (Host / Employer)
  const residentAlert: EstateAlert = {
    id: `alert-res-overstay-${pass.id}-${Date.now()}`,
    type: 'overstay_alert',
    title: '⚠️ Artisan Overstay Alert',
    message: `Your artisan/contractor ${pass.guest_name} (Code: ${pass.pass_code}) has exceeded authorized hours (${scheduledEndTime} on ${scheduledDate}). ${triggerNote}.`,
    target_role: 'resident',
    target_user_id: pass.resident_id,
    target_house_number: pass.house_number,
    pass_id: pass.id,
    pass_code: pass.pass_code,
    visitor_name: pass.guest_name,
    severity: 'warning',
    created_at: nowIso,
    read: false,
    resolved: false,
  };

  // 2. Alert for Estate Administration Command
  const adminAlert: EstateAlert = {
    id: `alert-adm-overstay-${pass.id}-${Date.now()}`,
    type: 'overstay_alert',
    title: '🚨 Artisan Overstay Escalation',
    message: `Artisan ${pass.guest_name} (House ${pass.house_number} - ${pass.house_unit}, Host: ${pass.resident_name}) exceeded permitted window (${pass.start_time || '08:00'} - ${scheduledEndTime}). ${triggerNote}.`,
    target_role: 'admin',
    target_house_number: pass.house_number,
    pass_id: pass.id,
    pass_code: pass.pass_code,
    visitor_name: pass.guest_name,
    severity: 'critical',
    created_at: nowIso,
    read: false,
    resolved: false,
  };

  const updatedAlerts = [adminAlert, residentAlert, ...existingAlerts];
  saveStoredAlerts(updatedAlerts);

  // Also record an audit entry in gate logs so it surfaces in gate audit feeds
  try {
    const logs = getStoredAccessLogs();
    const overstayLog: AccessLog = {
      id: `log-overstay-${Date.now()}`,
      pass_id: pass.id,
      pass_code: pass.pass_code,
      visitor_name: `${pass.guest_name} (OVERSTAY ESCALATED)`,
      house_info: `House ${pass.house_number} (${pass.house_unit})`,
      direction: triggerType === 'checkout_detection' ? 'out' : 'in',
      guard_name: 'Overstay Watchdog Engine',
      timestamp: nowIso,
      vehicle_plate: pass.guest_plate_number,
      verified_method: 'manual',
      notes: `⚠️ OVERSTAY FLAGGED: Exceeded authorized artisan window (${pass.start_time || '08:00'} - ${scheduledEndTime}). Alerts dispatched to Host (${pass.resident_name}) and Estate Admin.`,
    };
    saveStoredAccessLogs([overstayLog, ...logs]);
  } catch (err) {
    console.error('Failed to log overstay in access logs:', err);
  }

  return { residentAlert, adminAlert };
}

/**
 * Live background / on-mount check:
 * Flags any artisan pass where End Time on Date has passed and the most recent gate_logs entry
 * for that pass is a check-in with no matching check-out.
 */
export function checkAndEscalateOverstays(): { overstayedCount: number; newAlertsCount: number } {
  const passes = getStoredPasses();
  const logs = getStoredAccessLogs();
  const now = new Date();
  let hasPassChanges = false;
  let newAlertsCount = 0;
  let totalOverstayed = 0;

  const updatedPasses = passes.map((pass) => {
    // Only check contractor/artisan passes (or passes with artisan_date / end_time)
    if (pass.pass_type !== 'contractor' && !pass.artisan_date && !pass.end_time) {
      return pass;
    }

    // Determine pass window end time
    let endTimestamp: Date | null = null;
    if (pass.artisan_date && pass.end_time) {
      const [hours, minutes] = pass.end_time.split(':').map(Number);
      const d = new Date(pass.artisan_date);
      if (!isNaN(d.getTime())) {
        d.setHours(hours || 17, minutes || 0, 0, 0);
        endTimestamp = d;
      }
    }
    if (!endTimestamp && pass.valid_until) {
      endTimestamp = new Date(pass.valid_until);
    }

    if (!endTimestamp || isNaN(endTimestamp.getTime())) {
      return pass;
    }

    // Check gate log history for this pass
    const passLogs = logs.filter((l) => l.pass_code === pass.pass_code || (pass.id && l.pass_id === pass.id));
    const sortedLogs = [...passLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestLog = sortedLogs[0];

    // Checked in if pass.status === 'used' OR latest log is 'in' (and hasn't checked out)
    const isCurrentlyCheckedIn = (pass.status === 'used' || (latestLog && latestLog.direction === 'in')) && pass.status !== 'out';

    // If current time is past the end timestamp and the artisan is still inside
    if (now.getTime() > endTimestamp.getTime() && isCurrentlyCheckedIn) {
      totalOverstayed++;
      if (!pass.overstayed || !pass.overstay_alerted) {
        hasPassChanges = true;
        if (!pass.overstay_alerted) {
          createOverstayAlert(pass, 'live_detection');
          newAlertsCount++;
        }
        return {
          ...pass,
          overstayed: true,
          overstay_alerted: true,
          overstay_time: pass.overstay_time || now.toISOString(),
        };
      }
    }

    return pass;
  });

  if (hasPassChanges) {
    saveStoredPasses(updatedPasses);
  }

  return {
    overstayedCount: totalOverstayed,
    newAlertsCount,
  };
}

/**
 * Get active alerts count for admin or specific resident.
 */
export function getActiveAlertsCount(role?: string, houseNumber?: number, userId?: string): number {
  const alerts = getStoredAlerts();
  if (role === 'admin' || role === 'master_admin') {
    return alerts.filter((a) => a.target_role === 'admin' || a.target_role === 'all').length;
  }
  if (role === 'resident') {
    return alerts.filter(
      (a) =>
        a.target_role === 'all' ||
        (a.target_role === 'resident' &&
          (a.target_house_number === houseNumber || (userId && a.target_user_id === userId)))
    ).length;
  }
  return alerts.length;
}

/**
 * Filter alerts for a specific user.
 */
export function getAlertsForUser(role?: string, houseNumber?: number, userId?: string): EstateAlert[] {
  const alerts = getStoredAlerts();
  if (role === 'admin' || role === 'master_admin') {
    return alerts.filter((a) => a.target_role === 'admin' || a.target_role === 'all');
  }
  if (role === 'resident') {
    return alerts.filter(
      (a) =>
        a.target_role === 'all' ||
        (a.target_role === 'resident' &&
          (a.target_house_number === houseNumber || (userId && a.target_user_id === userId)))
    );
  }
  return alerts;
}

export function dismissAlert(alertId: string): void {
  const alerts = getStoredAlerts();
  const updated = alerts.filter((a) => a.id !== alertId);
  saveStoredAlerts(updated);
}
