import { VisitorPass, EstateNotice, AccessLog, AppUser } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredAppUsers } from './auth-helpers';

export const INITIAL_PASSES: VisitorPass[] = [];

export const INITIAL_NOTICES: EstateNotice[] = [];

export const INITIAL_ACCESS_LOGS: AccessLog[] = [];

const PASSES_KEY = 'lighthouse_passes_v3';
const NOTICES_KEY = 'lighthouse_notices_v3';
const LOGS_KEY = 'lighthouse_logs_v3';

export function getStoredPasses(): VisitorPass[] {
  try {
    const data = localStorage.getItem(PASSES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(PASSES_KEY, JSON.stringify(INITIAL_PASSES));
  return INITIAL_PASSES;
}

export function saveStoredPasses(passes: VisitorPass[]) {
  try {
    localStorage.setItem(PASSES_KEY, JSON.stringify(passes));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredNotices(): EstateNotice[] {
  try {
    const data = localStorage.getItem(NOTICES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(NOTICES_KEY, JSON.stringify(INITIAL_NOTICES));
  return INITIAL_NOTICES;
}

export function saveStoredNotices(notices: EstateNotice[]) {
  try {
    localStorage.setItem(NOTICES_KEY, JSON.stringify(notices));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredAccessLogs(): AccessLog[] {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_ACCESS_LOGS));
  return INITIAL_ACCESS_LOGS;
}

export function saveStoredAccessLogs(logs: AccessLog[]) {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error(e);
  }
}

export function generatePassCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return String(digits);
}

export interface AdminStats {
  pendingApprovals: number;
  activeResidents: number;
  activePassesNow: number;
  passesIssuedToday: number;
}

/**
 * Queries stats efficiently using Supabase head/count queries or local storage fallback.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      // 1. Pending resident approvals count
      const { count: pendingCount, error: err1 } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('role', 'resident');

      // 2. Active residents count
      const { count: activeResCount, error: err2 } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('role', 'resident');

      // 3. Active passes right now
      const { count: activePassesCount, error: err3 } = await supabase
        .from('access_passes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('valid_until', nowIso);

      // 4. Passes issued today
      const { count: passesTodayCount, error: err4 } = await supabase
        .from('access_passes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayIso);

      if (!err1 && !err2 && !err3 && !err4) {
        return {
          pendingApprovals: pendingCount || 0,
          activeResidents: activeResCount || 0,
          activePassesNow: activePassesCount || 0,
          passesIssuedToday: passesTodayCount || 0,
        };
      }
    } catch (e) {
      console.warn('Supabase count query fallback to local:', e);
    }
  }

  // Local fallback calculation
  const users = getStoredAppUsers();
  const passes = getStoredPasses();

  const pendingApprovals = users.filter(
    (u) => u.status === 'pending' && u.role === 'resident'
  ).length;

  const activeResidents = users.filter(
    (u) => u.status === 'active' && u.role === 'resident'
  ).length;

  const nowTime = Date.now();
  const activePassesNow = passes.filter((p) => {
    const exp = new Date(p.valid_until || p.expires_at || '').getTime();
    return p.status === 'active' && exp > nowTime;
  }).length;

  const todayTime = todayStart.getTime();
  const passesIssuedToday = passes.filter((p) => {
    return new Date(p.created_at).getTime() >= todayTime;
  }).length;

  return {
    pendingApprovals,
    activeResidents,
    activePassesNow,
    passesIssuedToday,
  };
}
