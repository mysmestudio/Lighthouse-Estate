const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

const additionalTypes = `
// Madrasa Types
export interface MadrasaStudent {
  id: string;
  full_name: string;
  house_id: string; // 'House 100' for external
  house_number?: number;
  class_level: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  enrolled_since: string;
  status: 'pending' | 'active' | 'inactive';
}

export interface MadrasaAttendance {
  id: string;
  student_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'present' | 'absent';
}

export interface MadrasaStaff {
  id: string;
  full_name: string;
  role: string;
  class_assigned: string;
  status: 'active' | 'inactive';
  check_in_time?: string;
}
`;

if (!code.includes('MadrasaStudent')) {
  code += '\\n' + additionalTypes;
  fs.writeFileSync('src/types/index.ts', code);
}
