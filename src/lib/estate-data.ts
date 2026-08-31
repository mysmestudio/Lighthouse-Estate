import { VisitorPass, EstateNotice, AccessLog, AppUser } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredAppUsers } from './auth-helpers';

export const INITIAL_PASSES: VisitorPass[] = [];

export const INITIAL_NOTICES: EstateNotice[] = [
  {
    id: 'n1',
    title: 'Mandatory visitor pass pre-registration for Friday Jumu’ah',
    content: 'All non-resident Friday congregants must be issued digital visitor passes via the portal before 11:30 AM. Walk-ins without a pre-registered pass may be turned away at peak hours.',
    category: 'emergency',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-12T00:00:00.000Z'
  },
  {
    id: 'n2',
    title: 'Perimeter solar inverter upgrade & night illumination',
    content: 'The Central Infrastructure Committee has scheduled routine maintenance and battery replacement on the West wing perimeter lighting from Aug 16–18.',
    category: 'maintenance',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-10T00:00:00.000Z'
  },
  {
    id: 'n3',
    title: 'Estate levy reminder cycle begins September 1',
    content: 'Households with outstanding levies will receive a reminder notice. Contact the estate office to arrange a payment plan before the next reconciliation cycle.',
    category: 'info',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'n4',
    title: 'Madrasa registration open for the new term',
    content: 'Enrol resident or external learners via the registration form. Classes resume the second week of September at the estate mosque hall.',
    category: 'info',
    author_name: 'Madrasa Admin',
    author_role: 'madrasa_admin',
    created_at: '2026-08-05T00:00:00.000Z'
  }
];

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

const FACILITY_BOOKINGS_KEY = 'lighthouse_facility_bookings_v3';
export function getStoredFacilityBookings(): any[] {
  try {
    const data = localStorage.getItem(FACILITY_BOOKINGS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [];
}
export function saveStoredFacilityBookings(bookings: any[]) {
  try {
    localStorage.setItem(FACILITY_BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.error(e);
  }
}

const FIXIT_TICKETS_KEY = 'lighthouse_fixit_tickets_v3';
export function getStoredFixItTickets(): any[] {
  try {
    const data = localStorage.getItem(FIXIT_TICKETS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: '1',
      resident_id: 'r1',
      resident_name: 'Resident',
      house_number: 42,
      house_unit: 'Duplex',
      category: 'Electrical',
      description: 'Flickering hallway light',
      status: 'in_progress',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: '2',
      resident_id: 'r1',
      resident_name: 'Resident',
      house_number: 42,
      house_unit: 'Duplex',
      category: 'Plumbing',
      description: 'Slow kitchen drain',
      status: 'resolved',
      created_at: new Date(Date.now() - 21 * 86400000).toISOString()
    },
    {
      id: '3',
      resident_id: 'r1',
      resident_name: 'Resident',
      house_number: 42,
      house_unit: 'Duplex',
      category: 'Other',
      description: 'Loose gate hinge, Gate 2',
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ];
}
export function saveStoredFixItTickets(tickets: any[]) {
  try {
    localStorage.setItem(FIXIT_TICKETS_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.error(e);
  }
}


const MARKETPLACE_KEY = 'lighthouse_marketplace_v3';
export function getStoredMarketplaceListings(): any[] {
  try {
    const data = localStorage.getItem(MARKETPLACE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: '1', seller_id: 'r1', seller_name: 'Resident', seller_phone: '08012345678', house_number: 23, title: '3-seater sofa set', price: 45000, category: 'furniture'
    },
    {
      id: '2', seller_id: 'r2', seller_name: 'Neighbor', seller_phone: '08087654321', house_number: 61, title: 'iPhone charger, new', price: 3500, category: 'electronics'
    },
    {
      id: '3', seller_id: 'r3', seller_name: 'Neighbor 2', seller_phone: '08099998888', house_number: 88, title: 'Kids bicycle', price: 0, category: 'giveaways'
    },
    {
      id: '4', seller_id: 'r4', seller_name: 'Neighbor 3', seller_phone: '08044445555', house_number: 14, title: 'Home cleaning service', price: 8000, category: 'services'
    },
    {
      id: '5', seller_id: 'r5', seller_name: 'Neighbor 4', seller_phone: '08011112222', house_number: 42, title: 'Dining table, 6-seater', price: 60000, category: 'furniture'
    },
    {
      id: '6', seller_id: 'r6', seller_name: 'Neighbor 5', seller_phone: '08033334444', house_number: 61, title: 'Baby clothes bundle', price: 0, category: 'giveaways'
    }
  ];
}
export function saveStoredMarketplaceListings(listings: any[]) {
  try {
    localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(listings));
  } catch(e) {}
}

const POLLS_KEY = 'lighthouse_polls_v3';
export function getStoredPolls(): any[] {
  try {
    const data = localStorage.getItem(POLLS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'p1',
      title: 'Automated barriers at Gate 2?',
      closesIn: '3d',
      status: 'open',
      description: 'Proposal to install automatic rising barriers at the secondary gate, reducing manual gatehouse staffing at night.',
      options: [
        { id: 'o1', label: 'Yes, install them', pct: 61 },
        { id: 'o2', label: 'No, keep it manual', pct: 24 },
        { id: 'o3', label: 'Need more information', pct: 15 }
      ],
      turnout: 68
    },
    {
      id: 'p2',
      title: 'Clubhouse renovation contractor',
      closesIn: '6d',
      status: 'open',
      description: 'Choose which shortlisted contractor should renovate the clubhouse lounge and rooftop.',
      options: [
        { id: 'o1', label: 'Adekunle Interiors', pct: 47 },
        { id: 'o2', label: 'Lekki Build Co.', pct: 33 },
        { id: 'o3', label: 'Prestige Fit-Out', pct: 20 }
      ],
      turnout: 52
    },
    {
      id: 'p3',
      title: 'Increase monthly security levy by ₦2,000',
      closesIn: 'closed Aug 3',
      status: 'closed',
      passed: true,
      turnout: 74
    },
    {
      id: 'p4',
      title: 'Switch estate waste vendor',
      closesIn: 'closed Jul 21',
      status: 'closed',
      passed: false,
      turnout: 58
    }
  ];
}
export function saveStoredPolls(polls: any[]) {
  try {
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
  } catch(e) {}
}

const POLL_VOTES_KEY = 'lighthouse_poll_votes_v3';
export function getStoredPollVotes(): any[] {
  try {
    const data = localStorage.getItem(POLL_VOTES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}
export function saveStoredPollVotes(votes: any[]) {
  try {
    localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes));
  } catch(e) {}
}

const SOS_EVENTS_KEY = 'lighthouse_sos_events_v3';
export function getStoredSosEvents(): any[] {
  try {
    const data = localStorage.getItem(SOS_EVENTS_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {}
  return [
    {
      id: 's1',
      resident_name: 'Dr. Tariq Al-Mansoor',
      house_number: 14,
      resident_phone: '0803 555 0142',
      triggered_at: new Date(Date.now() - 14 * 1000).toISOString(),
      status: 'triggered'
    },
    {
      id: 's2',
      resident_name: 'Fatima Bello',
      house_number: 61,
      triggered_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      status: 'acknowledged',
      acknowledged_by: 'Chinedu A.',
      notes: 'acknowledged by you, 2 min response'
    },
    {
      id: 's3',
      resident_name: 'David Okonkwo',
      house_number: 23,
      triggered_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      status: 'resolved',
      notes: 'false alarm, confirmed by resident'
    },
    {
      id: 's4',
      resident_name: 'Musa I., Gate 2',
      is_guard: true,
      triggered_at: new Date(Date.now() - 28 * 3600000).toISOString(),
      status: 'resolved',
      notes: 'backup dispatched, resolved'
    }
  ];
}
export function saveStoredSosEvents(events: any[]) {
  try {
    localStorage.setItem(SOS_EVENTS_KEY, JSON.stringify(events));
  } catch(e) {}
}


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
