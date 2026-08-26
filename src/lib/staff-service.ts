import { 
  StaffKYC, 
  StaffInviteCode, 
  StaffRole, 
  StaffSchedule, 
  EmployerRemark, 
  StaffChangeHistoryItem,
  AppUser,
  HouseUnitType 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredAppUsers, saveAppUsers, generateSyntheticEmail } from './auth-helpers';

const INVITE_CODES_KEY = 'lighthouse_invite_codes_v2';
const STAFF_KYC_KEY = 'lighthouse_staff_kyc_v2';

// Seed initial demo invite codes - Clean for production
export const INITIAL_INVITE_CODES: StaffInviteCode[] = [];

// Seed initial demo staff KYC records
export const INITIAL_STAFF_KYC: StaffKYC[] = [];

// Helper to mask NIN: '12345678901' -> '*******8901'
export function maskNIN(nin: string): string {
  const cleaned = nin.replace(/\D/g, '');
  if (cleaned.length <= 4) return '*******' + cleaned;
  return '*******' + cleaned.slice(-4);
}

// Client encryption stub simulating Postgres pgcrypto function: pgp_sym_encrypt(nin, 'estate_master_key')
export function simulatePgcryptoEncrypt(nin: string): string {
  const clean = nin.trim();
  const b64 = btoa(`pgcrypto_pgp_sym_encrypt::${clean}::ts_${Date.now()}`);
  return `pgp_sym_enc::${b64}`;
}

export function getStoredInviteCodes(): StaffInviteCode[] {
  try {
    const data = localStorage.getItem(INVITE_CODES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(INVITE_CODES_KEY, JSON.stringify(INITIAL_INVITE_CODES));
  return INITIAL_INVITE_CODES;
}

export function saveStoredInviteCodes(codes: StaffInviteCode[]) {
  try {
    localStorage.setItem(INVITE_CODES_KEY, JSON.stringify(codes));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredStaffKYC(): StaffKYC[] {
  try {
    const data = localStorage.getItem(STAFF_KYC_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STAFF_KYC_KEY, JSON.stringify(INITIAL_STAFF_KYC));
  return INITIAL_STAFF_KYC;
}

export function saveStoredStaffKYC(records: StaffKYC[]) {
  try {
    localStorage.setItem(STAFF_KYC_KEY, JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Generates a unique 6-digit numeric invite code.
 */
export function generate6DigitInviteCode(): string {
  const existing = getStoredInviteCodes();
  let code = '';
  let unique = false;
  while (!unique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    if (!existing.some((inv) => inv.code === code && !inv.used)) {
      unique = true;
    }
  }
  return code;
}

/**
 * Creates a new staff invite code for an employer.
 */
export async function createStaffInvite(params: {
  employer: AppUser;
  role: StaffRole;
  workLocation: string;
  schedule: StaffSchedule;
}): Promise<{ success: boolean; invite?: StaffInviteCode; error?: string }> {
  const code = generate6DigitInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const newInvite: StaffInviteCode = {
    id: `inv-${Date.now()}`,
    code,
    employer_id: params.employer.id,
    employer_name: params.employer.full_name,
    employer_house_number: params.employer.house_number,
    employer_house_unit: params.employer.house_unit,
    role: params.role,
    work_location: params.workLocation,
    schedule: params.schedule,
    expires_at: expiresAt,
    used: false,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .insert([newInvite])
        .select()
        .single();

      if (!error && data) {
        // Also sync local
        const codes = getStoredInviteCodes();
        codes.unshift(data as StaffInviteCode);
        saveStoredInviteCodes(codes);
        return { success: true, invite: data as StaffInviteCode };
      }
    } catch (e) {
      console.warn('Supabase create invite fallback:', e);
    }
  }

  // Local fallback
  const codes = getStoredInviteCodes();
  codes.unshift(newInvite);
  saveStoredInviteCodes(codes);
  return { success: true, invite: newInvite };
}

/**
 * Validates a 6-digit invite code for staff onboarding.
 */
export async function validateInviteCode(
  rawCode: string
): Promise<{
  valid: boolean;
  invite?: StaffInviteCode;
  error?: string;
}> {
  const cleaned = rawCode.trim().replace(/\D/g, '');
  if (cleaned.length !== 6) {
    return { valid: false, error: 'Invite code must be exactly 6 digits.' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', cleaned)
        .single();

      if (!error && data) {
        const invite = data as StaffInviteCode;
        if (invite.used) {
          return { valid: false, error: 'This invite code has already been used and redeemed.' };
        }
        if (new Date(invite.expires_at).getTime() < Date.now()) {
          return { valid: false, error: 'This invite code has expired. Please request a new invite from your employer.' };
        }
        return { valid: true, invite };
      }
    } catch (e) {
      console.warn('Supabase validate invite fallback:', e);
    }
  }

  // Local store validation
  const codes = getStoredInviteCodes();
  const matched = codes.find((c) => c.code === cleaned);

  if (!matched) {
    return { valid: false, error: 'Invalid invite code. Please check the 6-digit number and try again.' };
  }

  if (matched.used) {
    return { valid: false, error: 'This invite code has already been redeemed.' };
  }

  if (new Date(matched.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'This invite code has expired (7 days validity). Please request a fresh invite from your employer.' };
  }

  return { valid: true, invite: matched };
}

/**
 * Submits the completed 4-step staff onboarding KYC.
 */
export async function submitStaffOnboarding(params: {
  invite: StaffInviteCode;
  fullName: string;
  phone: string;
  email?: string;
  dob: string;
  gender: 'Male' | 'Female';
  homeAddress: string;
  nin: string;
  nextOfKin: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents: {
    passport_photo_url: string;
    national_id_url: string;
    guarantor_id_url: string;
  };
  pin: string;
}): Promise<{ success: boolean; staffKyc?: StaffKYC; error?: string }> {
  const staffUserId = `user-staff-${Date.now()}`;
  const kycId = `kyc-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const fallbackAuthId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : '00000000-0000-0000-0000-000000000000';

  const maskedNin = maskNIN(params.nin);
  const encryptedNin = simulatePgcryptoEncrypt(params.nin);

  // 1. Create app_user record
  const newStaffUser: AppUser = {
    id: staffUserId,
    auth_user_id: fallbackAuthId,
    role: 'staff',
    full_name: params.fullName,
    phone: params.phone,
    email: params.email || generateSyntheticEmail(
      'staff', 
      params.invite.employer_house_number || 14, 
      params.invite.employer_house_unit || 'Main House'
    ),
    house_number: params.invite.employer_house_number || 14,
    house_unit: params.invite.employer_house_unit || 'Main House',
    status: 'pending',
    employer_id: params.invite.employer_id,
    created_at: nowIso,
  };

  // 2. Create staff_kyc record
  const newStaffKyc: StaffKYC = {
    id: kycId,
    user_id: staffUserId,
    employer_id: params.invite.employer_id,
    employer_name: params.invite.employer_name,
    employer_house_number: params.invite.employer_house_number,
    employer_house_unit: params.invite.employer_house_unit,
    full_name: params.fullName,
    phone: params.phone,
    email: params.email,
    role: params.invite.role,
    work_location: params.invite.work_location,
    schedule: params.invite.schedule,
    dob: params.dob,
    gender: params.gender,
    home_address: params.homeAddress,
    nin_encrypted: encryptedNin,
    nin_masked: maskedNin,
    next_of_kin: params.nextOfKin,
    documents: params.documents,
    employer_remarks: [],
    change_history: [
      {
        id: `ch-${Date.now()}-1`,
        timestamp: nowIso,
        action: 'Onboarding Submitted',
        details: `Staff completed KYC identity verification using invite code ${params.invite.code}`,
        author: params.fullName,
      }
    ],
    status: 'pending',
    created_at: nowIso,
  };

  if (isSupabaseConfigured) {
    try {
      // 1. Upload to Supabase / Auth signUp
      const syntheticEmail = generateSyntheticEmail(
        'staff', 
        params.invite.employer_house_number || 14, 
        params.invite.employer_house_unit || 'Main House'
      );

      await supabase.auth.signUp({
        email: syntheticEmail,
        password: params.pin,
        options: {
          data: {
            full_name: params.fullName,
            role: 'staff',
            employer_id: params.invite.employer_id,
          },
        },
      });

      // 2. Insert into app_users
      await supabase.from('app_users').insert([newStaffUser]);

      // 3. Insert into staff_kyc (pgcrypto encrypted nin)
      await supabase.from('staff_kyc').insert([newStaffKyc]);

      // 4. Mark invite code as used
      await supabase
        .from('invite_codes')
        .update({ used: true, used_at: nowIso })
        .eq('id', params.invite.id);
    } catch (e) {
      console.warn('Supabase onboarding sync warning:', e);
    }
  }

  // Local persistence update
  const allUsers = getStoredAppUsers();
  allUsers.push(newStaffUser);
  saveAppUsers(allUsers);

  const allKyc = getStoredStaffKYC();
  allKyc.unshift(newStaffKyc);
  saveStoredStaffKYC(allKyc);

  const allInvites = getStoredInviteCodes();
  const inviteIdx = allInvites.findIndex((i) => i.id === params.invite.id);
  if (inviteIdx >= 0) {
    allInvites[inviteIdx].used = true;
    allInvites[inviteIdx].used_at = nowIso;
    saveStoredInviteCodes(allInvites);
  }

  return { success: true, staffKyc: newStaffKyc };
}

/**
 * Gets all staff for a specific resident/employer.
 */
export function getStaffForEmployer(employerId: string): StaffKYC[] {
  const allKyc = getStoredStaffKYC();
  return allKyc.filter((s) => s.employer_id === employerId);
}

/**
 * Gets all active staff across the entire estate for Global Staff Directory.
 * Security Note: Strictly filters to status='active' and strips sensitive documents / encrypted NIN.
 */
export function getAllActiveStaffForDirectory(): Array<Omit<StaffKYC, 'nin_encrypted' | 'documents'>> {
  const allKyc = getStoredStaffKYC();
  return allKyc
    .filter((s) => s.status === 'active')
    .map((s) => ({
      id: s.id,
      user_id: s.user_id,
      employer_id: s.employer_id,
      employer_name: s.employer_name,
      employer_house_number: s.employer_house_number,
      employer_house_unit: s.employer_house_unit,
      full_name: s.full_name,
      phone: s.phone,
      email: s.email,
      role: s.role,
      work_location: s.work_location,
      schedule: s.schedule,
      dob: s.dob,
      gender: s.gender,
      home_address: s.home_address,
      nin_masked: s.nin_masked,
      next_of_kin: s.next_of_kin,
      employer_remarks: s.employer_remarks,
      change_history: s.change_history,
      status: s.status,
      created_at: s.created_at,
      approved_at: s.approved_at,
      approved_by: s.approved_by,
    }));
}

/**
 * Approves a pending staff member.
 */
export async function approveStaff(
  staffId: string,
  approverName: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const nowIso = new Date().toISOString();
  staff.status = 'active';
  staff.approved_at = nowIso;
  staff.approved_by = approverName;
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Approved',
    details: `Staff approved and granted active estate pass authorization by ${approverName}`,
    author: approverName,
  });

  saveStoredStaffKYC(allKyc);

  // Sync app_users status
  const allUsers = getStoredAppUsers();
  const user = allUsers.find((u) => u.id === staff.user_id);
  if (user) {
    user.status = 'active';
    user.approved_at = nowIso;
    user.approved_by = approverName;
    saveAppUsers(allUsers);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('staff_kyc').update({
        status: 'active',
        approved_at: nowIso,
        approved_by: approverName,
        change_history: staff.change_history,
      }).eq('id', staffId);

      await supabase.from('app_users').update({
        status: 'active',
        approved_at: nowIso,
        approved_by: approverName,
      }).eq('id', staff.user_id);
    } catch (e) {
      console.warn('Supabase approve sync:', e);
    }
  }

  return { success: true, staff };
}

/**
 * Rejects a pending staff member.
 */
export async function rejectStaff(
  staffId: string,
  rejectorName: string,
  reason: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const nowIso = new Date().toISOString();
  staff.status = 'rejected';
  staff.rejection_reason = reason;
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Application Rejected',
    details: `Staff application rejected by ${rejectorName}. Reason: ${reason || 'Incomplete credentials'}`,
    author: rejectorName,
  });

  saveStoredStaffKYC(allKyc);

  // Sync app_users
  const allUsers = getStoredAppUsers();
  const user = allUsers.find((u) => u.id === staff.user_id);
  if (user) {
    user.status = 'rejected';
    saveAppUsers(allUsers);
  }

  return { success: true, staff };
}

/**
 * Updates staff schedule and logs in change history.
 */
export async function updateStaffSchedule(
  staffId: string,
  newSchedule: StaffSchedule,
  updaterName: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const prevDays = staff.schedule.days.join(', ');
  const newDays = newSchedule.days.join(', ');
  const nowIso = new Date().toISOString();

  staff.schedule = newSchedule;
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Schedule Updated',
    details: `Schedule updated from [${prevDays} (${staff.schedule.startTime}-${staff.schedule.endTime})] to [${newDays} (${newSchedule.startTime}-${newSchedule.endTime})]`,
    author: updaterName,
  });

  saveStoredStaffKYC(allKyc);
  return { success: true, staff };
}

/**
 * Appends a new remark to employer_remarks. Strictly append-only!
 */
export async function appendEmployerRemark(
  staffId: string,
  text: string,
  authorName: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const clean = text.trim();
  if (!clean) return { success: false, error: 'Remark text cannot be empty.' };

  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const nowIso = new Date().toISOString();
  const newRemark: EmployerRemark = {
    id: `rem-${Date.now()}`,
    text: clean,
    created_at: nowIso,
    author_name: authorName,
  };

  // Strictly append to array (past remarks are immutable)
  staff.employer_remarks.push(newRemark);
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Remark Added',
    details: `New employer remark logged: "${clean.slice(0, 50)}${clean.length > 50 ? '...' : ''}"`,
    author: authorName,
  });

  saveStoredStaffKYC(allKyc);
  return { success: true, staff };
}

/**
 * Sets staff status to 'off_duty' (status change only, row & history preserved).
 */
export async function markStaffOffDuty(
  staffId: string,
  authorName: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const nowIso = new Date().toISOString();
  staff.status = 'off_duty';
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Marked Off Duty',
    details: `Staff status temporarily set to Off Duty by ${authorName}. Access suspended at gate until reactivated.`,
    author: authorName,
  });

  saveStoredStaffKYC(allKyc);

  // Sync app_users
  const allUsers = getStoredAppUsers();
  const user = allUsers.find((u) => u.id === staff.user_id);
  if (user) {
    user.status = 'off_duty';
    saveAppUsers(allUsers);
  }

  return { success: true, staff };
}

/**
 * Restores staff status to 'active'.
 */
export async function setStaffActive(
  staffId: string,
  authorName: string
): Promise<{ success: boolean; staff?: StaffKYC; error?: string }> {
  const allKyc = getStoredStaffKYC();
  const staff = allKyc.find((s) => s.id === staffId);
  if (!staff) return { success: false, error: 'Staff record not found.' };

  const nowIso = new Date().toISOString();
  staff.status = 'active';
  staff.updated_at = nowIso;

  staff.change_history.unshift({
    id: `ch-${Date.now()}`,
    timestamp: nowIso,
    action: 'Reactivated to Active Duty',
    details: `Staff restored to Active status by ${authorName}. Gate clearance active.`,
    author: authorName,
  });

  saveStoredStaffKYC(allKyc);

  // Sync app_users
  const allUsers = getStoredAppUsers();
  const user = allUsers.find((u) => u.id === staff.user_id);
  if (user) {
    user.status = 'active';
    saveAppUsers(allUsers);
  }

  return { success: true, staff };
}

/**
 * Checks if a staff member is scheduled to work today.
 */
export function isStaffScheduledToday(schedule: StaffSchedule): boolean {
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysMap[new Date().getDay()];
  return schedule.days.includes(todayName);
}

/**
 * Checks if a staff member is currently within their shift hours today.
 */
export function isStaffOnDutyNow(schedule: StaffSchedule): boolean {
  if (!isStaffScheduledToday(schedule)) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
