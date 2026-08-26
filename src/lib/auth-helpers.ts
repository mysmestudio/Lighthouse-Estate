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

// Initial demo users - Clean for production
export const INITIAL_DEMO_USERS: AppUser[] = [];

const LOCAL_STORAGE_USERS_KEY = 'lighthouse_app_users_v2';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'lighthouse_current_user_v2';

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
    if (!searchEmail) {
      return { user: null, error: 'Please enter your administrator email.' };
    }
    matchedUser = allUsers.find(
      (u) =>
        (u.role === 'admin' || u.role === 'master_admin' || u.role === 'madrasa_admin') &&
        u.email.toLowerCase() === searchEmail
    );

    if (!matchedUser) {
      return { user: null, error: 'No administrator account found for this email address.' };
    }

    if (matchedUser.status !== 'active') {
      return { user: null, error: `Account is currently ${matchedUser.status}. Please contact estate governance.` };
    }
  } else if (role === 'security') {
    const searchEmail = (params.email || '').toLowerCase().trim();
    const hNum = Number(params.houseNumber);
    matchedUser = allUsers.find(
      (u) => u.role === 'security' && (
        (searchEmail && u.email?.toLowerCase() === searchEmail) || 
        (hNum && u.house_number === hNum)
      )
    );

    if (!matchedUser) {
      return { user: null, error: 'No security officer account found. Please check your credentials.' };
    }

    if (matchedUser.status !== 'active') {
      return { user: null, error: `Security officer account is currently ${matchedUser.status}.` };
    }
  } else if (role === 'staff') {
    const hNum = Number(params.houseNumber);
    const hUnit = params.houseUnit || 'Main House';
    
    if (!hNum) {
      return { user: null, error: 'Please enter a valid house number.' };
    }

    matchedUser = allUsers.find(
      (u) => u.role === 'staff' && u.house_number === hNum && (u.house_unit === hUnit || u.house_unit.toLowerCase() === hUnit.toLowerCase())
    );

    if (!matchedUser) {
      return { user: null, error: `No staff account registered for House ${hNum} (${hUnit}). Please complete onboarding first.` };
    }

    if (matchedUser.status !== 'active') {
      return { user: null, error: `Staff account is currently ${matchedUser.status}. Please contact your resident employer.` };
    }

    if (inputPin) {
      const isPinValid = (matchedUser.pin_hash && verifyPin(inputPin, matchedUser.pin_hash)) || matchedUser.pin === inputPin;
      if (!isPinValid) {
        return { user: null, error: 'Invalid PIN. Please enter your valid staff PIN.' };
      }
    }
  } else {
    // Resident
    const hNum = Number(params.houseNumber);
    const hUnit = params.houseUnit || 'Main House';

    if (!hNum) {
      return { user: null, error: 'Please enter your house number.' };
    }

    matchedUser = allUsers.find(
      (u) => u.role === 'resident' && u.house_number === hNum && (u.house_unit === hUnit || u.house_unit.toLowerCase() === hUnit.toLowerCase())
    );

    if (!matchedUser) {
      return { user: null, error: `No resident account registered for House ${hNum} (${hUnit}). Please submit a registration first.` };
    }

    if (matchedUser.status === 'pending') {
      return { user: null, error: 'Your registration is pending review by the estate office. You will be able to log in once approved.' };
    }

    if (matchedUser.status !== 'active') {
      return { user: null, error: `Your resident account is currently ${matchedUser.status}. Please contact the estate office.` };
    }

    if (inputPin) {
      const isPinValid = (matchedUser.pin_hash && verifyPin(inputPin, matchedUser.pin_hash)) || matchedUser.pin === inputPin;
      if (!isPinValid) {
        return { user: null, error: 'Invalid PIN. Please check your 6-character access PIN.' };
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
    return {
      success: false,
      error: `No registered resident account found for House ${houseNumber} (${houseUnit}). Please submit a registration first.`,
    };
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

