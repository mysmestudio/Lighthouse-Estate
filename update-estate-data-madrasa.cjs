const fs = require('fs');
let code = fs.readFileSync('src/lib/estate-data.ts', 'utf8');

const additionalData = `
const MADRASA_STUDENTS_KEY = 'lighthouse_madrasa_students_v3';
export function getStoredMadrasaStudents(): any[] {
  try {
    const data = localStorage.getItem(MADRASA_STUDENTS_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {}
  return [
    {
      id: 'ms1',
      full_name: 'Yusuf Belgore Jr.',
      house_number: 14,
      class_level: 'Class 1',
      next_of_kin_name: 'Engr. Yusuf Belgore',
      emergency_contact_phone: '0803 555 0142',
      enrolled_since: 'Jan 2026',
      status: 'active'
    },
    {
      id: 'ms2',
      full_name: 'Amina Sadiq',
      house_number: 61,
      class_level: 'Class 2',
      next_of_kin_name: 'Amina Sadiq (mother)',
      emergency_contact_phone: '0805 220 9931',
      enrolled_since: 'Feb 2026',
      status: 'active'
    },
    {
      id: 'ms3',
      full_name: 'David Okonkwo Jr.',
      house_number: 23,
      class_level: 'Class 1',
      next_of_kin_name: 'David Okonkwo',
      emergency_contact_phone: '0701 884 2210',
      enrolled_since: 'Mar 2026',
      status: 'active'
    },
    {
      id: 'ms4',
      full_name: 'Tunde Kazeem',
      house_number: 100,
      class_level: 'Class 3',
      next_of_kin_name: 'Bimbo Kazeem',
      emergency_contact_phone: '0813 442 7765',
      enrolled_since: 'Apr 2026',
      status: 'active'
    },
    {
      id: 'ms5',
      full_name: 'Hauwa Abdullahi',
      house_number: 42,
      class_level: 'Class 1',
      next_of_kin_name: 'Abdullahi',
      emergency_contact_phone: '0801 111 2222',
      enrolled_since: 'pending',
      status: 'pending'
    },
    {
      id: 'ms6',
      full_name: 'Zainab Musa',
      house_number: 100,
      class_level: 'Class 2',
      next_of_kin_name: 'Musa',
      emergency_contact_phone: '0802 222 3333',
      enrolled_since: 'pending',
      status: 'pending'
    }
  ];
}
export function saveStoredMadrasaStudents(students: any[]) {
  try {
    localStorage.setItem(MADRASA_STUDENTS_KEY, JSON.stringify(students));
  } catch(e) {}
}

const MADRASA_ATTENDANCE_KEY = 'lighthouse_madrasa_attendance_v3';
export function getStoredMadrasaAttendance(): any[] {
  try {
    const data = localStorage.getItem(MADRASA_ATTENDANCE_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {}
  
  const today = new Date().toISOString().split('T')[0];
  return [
    { id: 'ma1', student_id: 'ms1', date: today, check_in_time: new Date(new Date().setHours(7, 58, 0, 0)).toISOString(), status: 'present' },
    { id: 'ma2', student_id: 'ms2', date: today, check_in_time: new Date(new Date().setHours(8, 4, 0, 0)).toISOString(), status: 'present' },
    { id: 'ma4', student_id: 'ms4', date: today, check_in_time: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), status: 'present' }
  ];
}
export function saveStoredMadrasaAttendance(attendance: any[]) {
  try {
    localStorage.setItem(MADRASA_ATTENDANCE_KEY, JSON.stringify(attendance));
  } catch(e) {}
}

const MADRASA_STAFF_KEY = 'lighthouse_madrasa_staff_v3';
export function getStoredMadrasaStaff(): any[] {
  try {
    const data = localStorage.getItem(MADRASA_STAFF_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {}
  return [
    {
      id: 'mst1',
      full_name: 'Ustadh Fatai',
      role: 'Teacher',
      class_assigned: 'Class 1 & 2',
      status: 'active',
      check_in_time: new Date(new Date().setHours(7, 45, 0, 0)).toISOString()
    },
    {
      id: 'mst2',
      full_name: 'Ustadha Halima',
      role: 'Teacher',
      class_assigned: 'Class 3 & 4',
      status: 'active',
      check_in_time: new Date(new Date().setHours(7, 50, 0, 0)).toISOString()
    }
  ];
}
`;

if (!code.includes('getStoredMadrasaStudents')) {
  code += '\n' + additionalData;
  fs.writeFileSync('src/lib/estate-data.ts', code);
}
