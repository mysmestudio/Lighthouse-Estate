const fs = require('fs');
let code = fs.readFileSync('src/lib/auth-helpers.ts', 'utf8');

const oldSignature = `export async function registerResident(data: {
  fullName: string;
  phone: string;
  email: string;
  houseNumber: number;
  houseUnit: HouseUnitType;
  pin: string;
})`;

const newSignature = `export async function registerResident(data: {
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
})`;

code = code.replace(oldSignature, newSignature);

const oldNewAppUser = `      const newAppUser: Partial<AppUser> = {
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
      };`;

const newNewAppUser = `      const newAppUser: Partial<AppUser> = {
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
        emergency_contact_name: data.nokName,
        emergency_contact_phone: data.nokPhone,
        emergency_relationship: data.nokRelation,
        madrasa_enrolment: data.madrasa,
        mosque_notices: data.mosque,
        volunteer_committee: data.volunteer,
        created_at: new Date().toISOString(),
      };`;

code = code.replace(oldNewAppUser, newNewAppUser);

const oldFallbackUser = `  const newUser: AppUser = {
    id: \`user-res-\${Date.now()}\`,
    auth_user_id: \`auth-res-\${Date.now()}\`,
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
  };`;

const newFallbackUser = `  const newUser: AppUser = {
    id: \`user-res-\${Date.now()}\`,
    auth_user_id: \`auth-res-\${Date.now()}\`,
    role: 'resident',
    full_name: data.fullName,
    phone: data.phone,
    email: data.email,
    house_number: data.houseNumber,
    house_unit: data.houseUnit,
    pin_hash: pinHash,
    status: 'pending',
    dues_status: 'exempt',
    emergency_contact_name: data.nokName,
    emergency_contact_phone: data.nokPhone,
    emergency_relationship: data.nokRelation,
    madrasa_enrolment: data.madrasa,
    mosque_notices: data.mosque,
    volunteer_committee: data.volunteer,
    created_at: new Date().toISOString(),
  };`;

code = code.replace(oldFallbackUser, newFallbackUser);

fs.writeFileSync('src/lib/auth-helpers.ts', code);
