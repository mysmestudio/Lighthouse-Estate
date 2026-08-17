import { supabase, isSupabaseConfigured } from './supabase';
import { AppUser, UserRole, HouseUnitType } from '../types';
import bcrypt from 'bcryptjs';

/**
 * Hashes a 6-character estate PIN with bcrypt for secure, fast local and gate-level validation.
 */
export function hashPin(pin: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(pin.trim().toUpperCase(), salt);
}

/**
 * Compares an entered PIN against a stored bcrypt hash.
 */
export function verifyPin(pin: string, hash: string): boolean {
  if (!pin || !hash) return false;
  try {
    return bcrypt.compareSync(pin.trim().toUpperCase(), hash);
  } catch (e) {
    return false;
  }
}

export function formatUnitSlug(unit: HouseUnitType): string {
  return unit.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Converts natural estate credentials (house number, unit, PIN) into synthetic emails for Supabase Auth.
 */
export function generateSyntheticEmail(
  role: UserRole,
  houseNumber: number,
  houseUnit: HouseUnitType,
  securityPin?: string
): string {
  const unitSlug = formatUnitSlug(houseUnit);
  if (role === 'resident') {
    return `house${houseNumber}-${unitSlug}@residents.lighthouseestate.app`;
  }
  if (role === 'staff') {
    return `staff-house${houseNumber}-${unitSlug}@residents.lighthouseestate.app`;
  }
  if (role === 'security') {
    const pinPad = securityPin ? securityPin.slice(0, 4) : '0000';
    return `guard-${pinPad}@residents.lighthouseestate.app`;
  }
  return `user@residents.lighthouseestate.app`;
}

/**
 * Wraps raw Supabase Auth and database error messages into plain, user-friendly
 * estate terminology without leaking internal email formats, technical constraints, or stack details.
 */
export function mapAuthErrorMessage(errorMsg?: string, isRegistration: boolean = true): string {
  if (!errorMsg) {
    return isRegistration
      ? 'Something went wrong creating your account. Please try again.'
      : 'Authentication failed. Please check your credentials and try again.';
  }

  const lower = errorMsg.toLowerCase();

  // Duplicate or already existing resident / house / account
  if (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already exists') ||
    lower.includes('duplicate') ||
    lower.includes('unique constraint') ||
    lower.includes('identity already exists') ||
    lower.includes('user with this email') ||
    lower.includes('already in use') ||
    lower.includes('23505')
  ) {
    return 'This house unit is already registered.';
  }

  // Invalid credentials during login
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed') ||
    lower.includes('wrong password') ||
    lower.includes('invalid pin')
  ) {
    return 'Invalid PIN or house credentials. Please verify your details.';
  }

  // Registration fallback: never show raw email or syntax errors
  if (isRegistration) {
    return 'Something went wrong creating your account. Please try again.';
  }

  // General auth fallback
  return 'Authentication failed. Please check your credentials and try again.';
}

/**
 * Real-time format validation for Resident 6-character PIN:
 * Exactly 4 digits and 2 uppercase letters (e.g. 1A2B3C, 4928AB).
 */
export function validateResidentPin(pin: string): {
  isValid: boolean;
  lengthOk: boolean;
  digitCount: number;
  upperCount: number;
  digitsOk: boolean;
  upperOk: boolean;
  message?: string;
} {
  const cleaned = pin.trim();
  const lengthOk = cleaned.length === 6;
  const digits = (cleaned.match(/[0-9]/g) || []).length;
  const uppers = (cleaned.match(/[A-Z]/g) || []).length;

  const digitsOk = digits === 4;
  const upperOk = uppers === 2;
  const isValid = lengthOk && digitsOk && upperOk;

  let message = '';
  if (!lengthOk) {
    message = `Must be exactly 6 characters (currently ${cleaned.length}/6)`;
  } else if (!digitsOk || !upperOk) {
    message = `Requires 4 digits & 2 uppercase letters (Found: ${digits} digits, ${uppers} letters)`;
  }

  return {
    isValid,
    lengthOk,
    digitCount: digits,
    upperCount: uppers,
    digitsOk,
    upperOk,
    message,
  };
}

// Initial demo users for instant preview and testing
export const INITIAL_DEMO_USERS: AppUser[] = [
  {
    id: 'user-res-1',
    auth_user_id: 'auth-res-1',
    role: 'resident',
    full_name: 'Dr. Tariq Al-Mansoor',
    phone: '+234 803 123 4567',
    email: 'tariq.mansoor@example.com',
    house_number: 14,
    house_unit: 'Main House',
    status: 'active',
    dues_status: 'up_to_date',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    approved_by: 'Admin Office',
    approved_at: new Date(Date.now() - 29 * 86400000).toISOString(),
  },
  {
    id: 'user-sec-1',
    auth_user_id: 'auth-sec-1',
    role: 'security',
    full_name: 'Officer Ibrahim Bello',
    phone: '+234 802 987 6543',
    email: 'security.gate@lighthouseestate.org',
    house_number: 1,
    house_unit: 'Main House',
    status: 'active',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'user-staff-1',
    auth_user_id: 'auth-staff-1',
    role: 'staff',
    full_name: 'Fatima Suleiman',
    phone: '+234 806 555 7890',
    email: 'fatima.s@example.com',
    house_number: 14,
    house_unit: 'BQ',
    status: 'active',
    employer_id: 'user-res-1',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'user-adm-1',
    auth_user_id: 'auth-adm-1',
    role: 'admin',
    full_name: 'Alhaji Usman Danjuma',
    phone: '+234 809 111 2233',
    email: 'admin@lighthouseestate.org',
    house_number: 1,
    house_unit: 'Main House',
    status: 'active',
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
  },
  {
    id: 'user-madr-1',
    auth_user_id: 'auth-madr-1',
    role: 'madrasa_admin',
    full_name: 'Ustadh Zayd Harun',
    phone: '+234 805 444 3322',
    email: 'madrasa@lighthouseestate.org',
    house_number: 5,
    house_unit: 'Ground Floor',
    status: 'active',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'user-pending-1',
    auth_user_id: 'auth-pending-1',
    role: 'resident',
    full_name: 'Hajiya Maryam Sadiq',
    phone: '+234 807 888 9900',
    email: 'maryam.sadiq@example.com',
    house_number: 28,
    house_unit: 'First Floor',
    status: 'pending',
    dues_status: 'exempt',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
];

const LOCAL_STORAGE_USERS_KEY = 'lighthouse_app_users_v1';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'lighthouse_current_user_v1';

export function getStoredAppUsers(): AppUser[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(INITIAL_DEMO_USERS));
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_USERS;
}

export function saveAppUsers(users: AppUser[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getStoredCurrentUser(): AppUser | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function setStoredCurrentUser(user: AppUser | null) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Signs in user with synthetic email or email+password.
 */
export async function authenticateEstateUser(
  role: UserRole,
  params: {
    houseNumber?: number;
    houseUnit?: HouseUnitType;
    pin?: string;
    email?: string;
    password?: string;
  }
): Promise<{ user: AppUser | null; error?: string; requireMfa?: boolean }> {
  if (isSupabaseConfigured) {
    try {
      let targetEmail = '';
      let targetPassword = '';

      if (role === 'admin' || role === 'master_admin' || role === 'madrasa_admin') {
        targetEmail = params.email || '';
        targetPassword = params.password || '';
      } else {
        targetEmail = generateSyntheticEmail(
          role,
          params.houseNumber || 1,
          params.houseUnit || 'Main House',
          params.pin
        );
        targetPassword = params.pin || '';
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (error) {
        return { user: null, error: mapAuthErrorMessage(error.message, false) };
      }

      if (data.user) {
        // Query app_users table with RLS
        const { data: userData, error: userError } = await supabase
          .from('app_users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (userError || !userData) {
          return { user: null, error: 'User profile not found in estate directory.' };
        }

        if (userData.status !== 'active') {
          return {
            user: null,
            error: `Your account is currently ${userData.status}. Please contact the estate office.`,
          };
        }

        // Check for Admin MFA requirement
        if (role === 'admin' || role === 'master_admin' || role === 'madrasa_admin') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          if (factors && factors.totp && factors.totp.length > 0) {
            return { user: userData as AppUser, requireMfa: true };
          }
        }

        setStoredCurrentUser(userData as AppUser);
        return { user: userData as AppUser };
      }
    } catch (err: any) {
      console.warn('Supabase auth failed, trying local fallback:', err);
    }
  }

  // Local demo fallback if Supabase not configured or for fast preview
  const allUsers = getStoredAppUsers();
  let matchedUser: AppUser | undefined;

  if (role === 'admin' || role === 'master_admin' || role === 'madrasa_admin') {
    const searchEmail = (params.email || '').toLowerCase().trim();
    matchedUser = allUsers.find(
      (u) => (u.role === role || (role === 'admin' && (u.role === 'admin' || u.role === 'master_admin'))) &&
        (u.email.toLowerCase() === searchEmail || searchEmail === 'admin@lighthouseestate.org' || searchEmail === 'madrasa@lighthouseestate.org')
    );
  } else if (role === 'security') {
    // Security matches any active security role or PIN
    matchedUser = allUsers.find((u) => u.role === 'security');
  } else {
    // Resident or Staff
    matchedUser = allUsers.find(
      (u) =>
        u.role === role &&
        u.house_number === Number(params.houseNumber) &&
        u.house_unit === params.houseUnit
    );
    if (!matchedUser && role === 'resident') {
      // Fallback matching default sample house
      matchedUser = allUsers.find((u) => u.role === 'resident' && u.house_number === 14);
    }
  }

  if (!matchedUser) {
    return {
      user: null,
      error: `No ${role} record found for House ${params.houseNumber || ''} (${params.houseUnit || ''}). Please check credentials or register.`,
    };
  }

  if (matchedUser.status !== 'active') {
    return {
      user: null,
      error: `Your account is currently ${matchedUser.status}. Please contact the estate office.`,
    };
  }

  setStoredCurrentUser(matchedUser);
  return { user: matchedUser };
}

/**
 * Registers a new resident in Supabase Auth & app_users with status 'pending'.
 */
export async function registerResident(data: {
  fullName: string;
  phone: string;
  email: string;
  houseNumber: number;
  houseUnit: HouseUnitType;
  pin: string;
}): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const pinCheck = validateResidentPin(data.pin);
  if (!pinCheck.isValid) {
    return { success: false, error: pinCheck.message };
  }

  const syntheticEmail = generateSyntheticEmail('resident', data.houseNumber, data.houseUnit);

  if (isSupabaseConfigured) {
    try {
      // 1. Create shadow Supabase Auth account with updated synthetic email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: data.pin,
        options: {
          data: {
            full_name: data.fullName,
            real_email: data.email,
            phone: data.phone,
            house_number: data.houseNumber,
            house_unit: data.houseUnit,
            role: 'resident',
          },
        },
      });

      if (authError) {
        return { success: false, error: mapAuthErrorMessage(authError.message, true) };
      }

      // 2. Insert into app_users table with status = 'pending' and bcrypt pin_hash
      const fallbackUuid = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : '00000000-0000-0000-0000-000000000000';

      const pinHash = hashPin(data.pin);

      const newAppUser: Partial<AppUser> = {
        auth_user_id: authData.user?.id || fallbackUuid,
        role: 'resident',
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        house_number: data.houseNumber,
        house_unit: data.houseUnit,
        pin_hash: pinHash,
        status: 'pending',
        dues_status: 'unpaid',
        created_at: new Date().toISOString(),
      };

      const { data: dbData, error: dbError } = await supabase
        .from('app_users')
        .insert([newAppUser])
        .select()
        .single();

      if (dbError) {
        console.warn('Supabase DB insert warning:', dbError);
        const lower = (dbError.message || '').toLowerCase();
        if (dbError.code === '23505' || lower.includes('duplicate') || lower.includes('unique')) {
          return { success: false, error: 'This house unit is already registered.' };
        }
      }

      const createdUser = (dbData || newAppUser) as AppUser;

      // Sync with local memory cache so directory and admin views immediately reflect the registration
      const currentUsers = getStoredAppUsers();
      const existingIdx = currentUsers.findIndex(
        (u) => u.house_number === data.houseNumber && u.house_unit === data.houseUnit && u.role === 'resident'
      );
      if (existingIdx >= 0) {
        currentUsers[existingIdx] = createdUser;
      } else {
        currentUsers.push(createdUser);
      }
      saveAppUsers(currentUsers);

      return {
        success: true,
        user: createdUser,
      };
    } catch (err: any) {
      console.warn('Supabase registration error:', err);
      return { success: false, error: mapAuthErrorMessage(err?.message, true) };
    }
  }

  // Local fallback persistence for demo/preview
  const users = getStoredAppUsers();
  
  // Check if house unit is already registered
  const existingActive = users.find(
    (u) => u.role === 'resident' && u.house_number === data.houseNumber && u.house_unit === data.houseUnit && u.status === 'active'
  );
  if (existingActive) {
    return { success: false, error: 'This house unit is already registered.' };
  }

  const pinHash = hashPin(data.pin);

  const newUser: AppUser = {
    id: `user-res-${Date.now()}`,
    auth_user_id: `auth-res-${Date.now()}`,
    role: 'resident',
    full_name: data.fullName,
    phone: data.phone,
    email: data.email,
    house_number: data.houseNumber,
    house_unit: data.houseUnit,
    pin_hash: pinHash,
    status: 'pending',
    dues_status: 'exempt',
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveAppUsers(users);

  return { success: true, user: newUser };
}
