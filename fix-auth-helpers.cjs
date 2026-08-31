const fs = require('fs');
let code = fs.readFileSync('src/lib/auth-helpers.ts', 'utf8');

// We are going to replace authenticateEstateUser and updateAppUserStatus 
// to ONLY use Supabase.

const authenticateReplacement = `export async function authenticateEstateUser(
  role: UserRole,
  params: {
    houseNumber?: number;
    houseUnit?: HouseUnitType;
    pin?: string;
    email?: string;
    password?: string;
  }
): Promise<{ user: AppUser | null; error?: string; requireMfa?: boolean }> {
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

    if (error) {
      return { user: null, error: mapAuthErrorMessage(error.message, true) };
    }

    if (data?.user) {
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      if (userError || !userData) {
        return { user: null, error: 'User profile not found or access denied.' };
      }

      if (userData.status !== 'active') {
        return {
          user: null,
          error: \`Your account is currently \${userData.status}. Please contact the estate office.\`,
        };
      }

      if (role === 'admin' || role === 'master_admin' || role === 'madrasa_admin') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors && factors.totp && factors.totp.length > 0) {
          return { user: userData as AppUser, requireMfa: true };
        }
      }

      setStoredCurrentUser(userData as AppUser);
      return { user: userData as AppUser };
    }
    
    return { user: null, error: 'Authentication failed.' };
  } catch (err: any) {
    return { user: null, error: mapAuthErrorMessage(err?.message, true) };
  }
}`;

code = code.replace(/export async function authenticateEstateUser[\s\S]*?export async function registerResident/, authenticateReplacement + '\n\nexport async function registerResident');

const updateAppUserStatusReplacement = `export async function updateAppUserStatus(userId: string, newStatus: 'active' | 'suspended' | 'pending'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_users')
      .update({ status: newStatus })
      .eq('id', userId);
      
    if (error) {
      console.error('Failed to update status in Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception updating status in Supabase:', e);
    return false;
  }
}`;

code = code.replace(/export async function updateAppUserStatus[\s\S]*?export function getStoredCurrentUser/, updateAppUserStatusReplacement + '\n\nexport function getStoredCurrentUser');

// Also update registerResident to purely use Supabase without local fallback
const registerResidentReplacement = `export async function registerResident(data: {
  fullName: string;
  phone: string;
  email: string;
  houseNumber: number;
  houseUnit: HouseUnitType;
  pin: string;
  nokName?: string;
  nokPhone?: string;
  nokRelation?: string;
  madrasa?: boolean;
  mosque?: boolean;
  volunteer?: boolean;
}): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const pinCheck = validateResidentPin(data.pin);
  if (!pinCheck.isValid) {
    return { success: false, error: pinCheck.message };
  }

  const syntheticEmail = generateSyntheticEmail('resident', data.houseNumber, data.houseUnit);

  try {
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

    const pinHash = hashPin(data.pin);
    const newAppUser: Partial<AppUser> = {
      auth_user_id: authData.user?.id,
      role: 'resident',
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      house_number: data.houseNumber,
      house_unit: data.houseUnit,
      pin_hash: pinHash,
      status: 'pending',
      dues_status: 'unpaid',
      emergency_contact_name: data.nokName,
      emergency_contact_phone: data.nokPhone,
      emergency_relationship: data.nokRelation,
      madrasa_enrolment: data.madrasa,
      mosque_notices: data.mosque,
      volunteer_committee: data.volunteer,
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
      return { success: false, error: dbError.message };
    }

    return { success: true, user: dbData as AppUser };
  } catch (err: any) {
    console.warn('Supabase registration error:', err);
    return { success: false, error: mapAuthErrorMessage(err?.message, true) };
  }
}`;

code = code.replace(/export async function registerResident[\s\S]*?export async function registerStaff/, registerResidentReplacement + '\n\nexport async function registerStaff');

// Get all app users should just query supabase.
const getAppUsersReplacement = `export async function getAppUsers(): Promise<AppUser[]> {
  try {
    const { data, error } = await supabase.from('app_users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as AppUser[];
  } catch (e) {
    console.error('Error:', e);
    return [];
  }
}`;

code = code.replace(/export function getStoredAppUsers[\s\S]*?export function saveAppUsers[\s\S]*?}/, getAppUsersReplacement);

fs.writeFileSync('src/lib/auth-helpers.ts', code);
