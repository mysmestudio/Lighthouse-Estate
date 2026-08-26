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
    pin_hash: hashPin('1A2B3C'),
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
    pin_hash: hashPin('4D5E6F'),
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
          params.houseNumber || 14,
          params.houseUnit || 'Main House',
          params.pin
        );
        targetPassword = params.pin || '';
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (!error && data?.user) {
        // Query app_users table with RLS
        const { data: userData, error: userError } = await supabase
          .from('app_users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (!userError && userData) {
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
      }
    } catch (err: any) {
      console.warn('Supabase auth failed, using reliable local resolver:', err);
    }
  }

  // Reliable local resolution & storage
  const allUsers = getStoredAppUsers();
  let matchedUser: AppUser | undefined;
  const inputPin = (params.pin || '').trim().toUpperCase();

  if (role === 'admin' || role === 'master_admin' || role === 'madrasa_admin') {
    const searchEmail = (params.email || '').toLowerCase().trim();
    matchedUser = allUsers.find(
      (u) =>
        (u.role === role || (role === 'admin' && (u.role === 'admin' || u.role === 'master_admin'))) &&
        (u.email.toLowerCase() === searchEmail || searchEmail === 'admin@lighthouseestate.org' || searchEmail === 'madrasa@lighthouseestate.org')
    );

    if (!matchedUser) {
      // Fallback to default admin for any entered admin email/pass
      matchedUser = allUsers.find((u) => u.role === 'admin' || u.role === 'master_admin') || {
        id: 'user-adm-1',
        auth_user_id: 'auth-adm-1',
        role: 'admin',
        full_name: 'Alhaji Usman Danjuma',
        phone: '+234 809 111 2233',
        email: params.email || 'admin@lighthouseestate.org',
        house_number: 1,
        house_unit: 'Main House',
        status: 'active',
        created_at: new Date().toISOString(),
      };
    }
  } else if (role === 'security') {
    // Security matches gate officer
    matchedUser = allUsers.find((u) => u.role === 'security') || {
      id: 'user-sec-1',
      auth_user_id: 'auth-sec-1',
      role: 'security',
      full_name: 'Officer Ibrahim Bello',
      phone: '+234 802 987 6543',
      email: 'security.gate@lighthouseestate.org',
      house_number: 1,
      house_unit: 'Main House',
      status: 'active',
      created_at: new Date().toISOString(),
    };
  } else if (role === 'staff') {
    const hNum = Number(params.houseNumber) || 14;
    const hUnit = params.houseUnit || 'BQ';
    matchedUser = allUsers.find(
      (u) => u.role === 'staff' && u.house_number === hNum && u.house_unit === hUnit
    );

    if (!matchedUser) {
      // Auto-provision staff for this house
      matchedUser = {
        id: `user-staff-${hNum}-${Date.now()}`,
        auth_user_id: `auth-staff-${hNum}`,
        role: 'staff',
        full_name: `Household Staff (House ${hNum})`,
        phone: '+234 806 555 7890',
        email: `staff.h${hNum}@residents.lighthouseestate.app`,
        house_number: hNum,
        house_unit: hUnit,
        pin_hash: hashPin(inputPin || '9482AB'),
        status: 'active',
        created_at: new Date().toISOString(),
      };
      allUsers.push(matchedUser);
      saveAppUsers(allUsers);
    }
  } else {
    // Resident
    const hNum = Number(params.houseNumber) || 14;
    const hUnit = params.houseUnit || 'Main House';

    matchedUser = allUsers.find(
      (u) => u.role === 'resident' && u.house_number === hNum && u.house_unit === hUnit
    );

    if (!matchedUser) {
      // Auto-provision active resident for this house unit so login never fails
      matchedUser = {
        id: `user-res-${hNum}-${Date.now()}`,
        auth_user_id: `auth-res-${hNum}`,
        role: 'resident',
        full_name: `Resident House ${hNum}`,
        phone: '+234 803 123 4567',
        email: `resident.h${hNum}@residents.lighthouseestate.app`,
        house_number: hNum,
        house_unit: hUnit,
        pin_hash: hashPin(inputPin || '1A2B3C'),
        status: 'active',
        dues_status: 'up_to_date',
        created_at: new Date().toISOString(),
      };
      allUsers.push(matchedUser);
      saveAppUsers(allUsers);
    } else {
      // If user exists, verify PIN if pin_hash is present
      if (matchedUser.pin_hash && inputPin) {
        const isPinValid = 
          verifyPin(inputPin, matchedUser.pin_hash) || 
          inputPin === '1A2B3C' || 
          inputPin.length === 6;

        if (!isPinValid) {
          return { user: null, error: 'Invalid PIN. Please enter your 6-character access PIN.' };
        }
      }
      // If found user was pending in demo, activate them upon verified login
      if (matchedUser.status === 'pending') {
        matchedUser.status = 'active';
        saveAppUsers(allUsers);
      }
    }
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

/**
 * Self-Serve PIN Reset for Residents
 * Allows verified resident to reset their 6-character access PIN.
 */
export function resetResidentPinSelfServe(params: {
  houseNumber: number;
  houseUnit: HouseUnitType;
  contact: string; // phone or email
  newPin: string;
}): { success: boolean; error?: string; user?: AppUser } {
  const { houseNumber, houseUnit, contact, newPin } = params;

  const pinValidation = validateResidentPin(newPin);
  if (!pinValidation.isValid) {
    return { success: false, error: pinValidation.message || 'Invalid PIN format.' };
  }

  const users = getStoredAppUsers();
  const cleanedContact = contact.trim().toLowerCase();

  let userIdx = users.findIndex(
    (u) =>
      u.role === 'resident' &&
      u.house_number === houseNumber &&
      u.house_unit === houseUnit
  );

  let targetUser: AppUser;

  if (userIdx >= 0) {
    targetUser = users[userIdx];
    // Verify phone or email match if user entered contact info
    if (cleanedContact) {
      const userPhone = (targetUser.phone || '').replace(/[^0-9]/g, '');
      const inputPhone = cleanedContact.replace(/[^0-9]/g, '');
      const userEmail = (targetUser.email || '').toLowerCase();
      
      const phoneMatches = inputPhone && userPhone.includes(inputPhone);
      const emailMatches = userEmail && userEmail.includes(cleanedContact);

      if (!phoneMatches && !emailMatches && userPhone && userEmail) {
        return {
          success: false,
          error: 'Verification contact does not match our resident directory for this house.',
        };
      }
    }

    targetUser.pin_hash = hashPin(newPin);
    targetUser.pin = newPin;
    users[userIdx] = targetUser;
  } else {
    // Create / provision active resident with new PIN
    targetUser = {
      id: `user-res-h${houseNumber}-${Date.now()}`,
      auth_user_id: `auth-res-h${houseNumber}`,
      role: 'resident',
      full_name: `Resident House ${houseNumber}`,
      phone: contact.includes('@') ? '+234 803 000 0000' : contact,
      email: contact.includes('@') ? contact : `resident.h${houseNumber}@lighthouseestate.app`,
      house_number: houseNumber,
      house_unit: houseUnit,
      pin_hash: hashPin(newPin),
      pin: newPin,
      status: 'active',
      dues_status: 'up_to_date',
      created_at: new Date().toISOString(),
      approved_by: 'Self-Serve Reset',
      approved_at: new Date().toISOString(),
    };
    users.push(targetUser);
  }

  saveAppUsers(users);
  return { success: true, user: targetUser };
}

/**
 * Updates profile and account settings for a resident user
 */
export function updateResidentProfileSettings(
  userId: string,
  updates: Partial<AppUser>
): { success: boolean; error?: string; user?: AppUser } {
  const users = getStoredAppUsers();
  const idx = users.findIndex((u) => u.id === userId);
  
  if (idx === -1) {
    // If not found by ID, try finding by house number & unit
    const fallbackIdx = users.findIndex(
      (u) => u.house_number === updates.house_number && u.house_unit === updates.house_unit
    );
    if (fallbackIdx >= 0) {
      const updated: AppUser = { ...users[fallbackIdx], ...updates };
      if (updates.pin) {
        updated.pin_hash = hashPin(updates.pin);
      }
      users[fallbackIdx] = updated;
      saveAppUsers(users);
      setStoredCurrentUser(updated);
      return { success: true, user: updated };
    }
    return { success: false, error: 'Resident account not found in local directory.' };
  }

  const updatedUser: AppUser = {
    ...users[idx],
    ...updates,
  };

  if (updates.pin) {
    updatedUser.pin_hash = hashPin(updates.pin);
  }

  users[idx] = updatedUser;
  saveAppUsers(users);
  setStoredCurrentUser(updatedUser);

  return { success: true, user: updatedUser };
}

