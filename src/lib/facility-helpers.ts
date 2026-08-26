import { Facility, FacilityBooking, BookingStatus, HouseUnitType } from '../types';

export const INITIAL_FACILITIES: Facility[] = [
  {
    id: 'fac-kitchen',
    name: 'Estate Event Kitchen & Banquet Hall',
    category: 'Culinary & Events',
    description: 'Fully equipped culinary catering kitchen and attached banquet hall for family feasts, catering prep, and celebratory events.',
    capacity: 80,
    location: 'Clubhouse West Wing (Ground Floor)',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    operatingHours: '08:00 – 22:00',
    availableTimeSlots: [
      '08:00 - 12:00 (Morning Prep)',
      '12:30 - 16:30 (Afternoon Banquet)',
      '17:00 - 21:30 (Evening Dinner)'
    ],
    features: [
      'Double Commercial Convection Ovens',
      'Stainless Steel Prep Islands',
      'Walk-in Cold Storage & Freezers',
      'Buffet Chafing Dishes & Warmers',
      '80 Dining Chairs & Banquet Tables',
      'Surround Sound Audio System'
    ],
    rules: [
      'No deep-frying with open oil vats outside designated grease extractors',
      'Cleaning and waste disposal must be completed by 22:00 quiet hour',
      'Breakages will be deducted from security deposit'
    ],
    hourlyRate: 'Free for Residents (₦15,000 Refundable Deposit)',
    requiresApproval: true,
  },
  {
    id: 'fac-football',
    name: 'AstroTurf Football Field & Sports Arena',
    category: 'Sports & Fitness',
    description: 'High-grade floodlit synthetic pitch suitable for 5-a-side and 7-a-side matches, youth drills, and weekend resident tournaments.',
    capacity: 30,
    location: 'North Green Recreational Park',
    imageUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80',
    operatingHours: '06:30 – 21:30',
    availableTimeSlots: [
      '06:30 - 08:30 (Early Morning Match)',
      '09:00 - 11:00 (Youth Academy)',
      '16:00 - 18:00 (Afternoon League)',
      '18:30 - 20:30 (Floodlit Evening Match)'
    ],
    features: [
      'All-Weather Shock-Absorbent Turf',
      'High-Lumen LED Night Floodlights',
      'Digital Scoreboard & Timer',
      'Shaded Team Dugouts & Spectator Benches',
      'Changing Rooms with Hot Showers'
    ],
    rules: [
      'Turf or rubber studs only; metal cleats strictly prohibited',
      'Maximum 2 slots per household per weekend',
      'Estate youth players receive priority on Saturday mornings'
    ],
    hourlyRate: 'Complimentary for Residents',
    requiresApproval: false,
  },
  {
    id: 'fac-mosque',
    name: 'Mosque Meeting Room & Majlis Hall',
    category: 'Community & Faith',
    description: 'Serene, air-conditioned conference and majlis hall designed for study circles, committee deliberations, and community seminars.',
    capacity: 45,
    location: 'Al-Noor Community Center (First Floor)',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    operatingHours: '08:00 – 21:00',
    availableTimeSlots: [
      '09:00 - 11:30 (Morning Session)',
      '14:00 - 16:30 (Afternoon Circle)',
      '17:30 - 20:30 (Evening Majlis)'
    ],
    features: [
      'High-Definition Laser Projector & Screen',
      'Executive U-Shape & Low-Majlis Cushion Seating',
      'Wireless Handheld & Lapel Microphones',
      'Tea, Coffee & Filtered Water Station',
      'High-Speed Wi-Fi'
    ],
    rules: [
      'Modest attire required at all times',
      'Audio volume must respect prayer times in the main prayer hall',
      'Shoes must be placed in dedicated entrance cubbies'
    ],
    hourlyRate: 'Complimentary for Residents',
    requiresApproval: true,
  },
  {
    id: 'fac-tennis',
    name: 'All-Weather Tennis & Pickleball Court',
    category: 'Sports & Fitness',
    description: 'Professional hard court with dual tennis and pickleball markings, perimeter netting, and evening floodlighting.',
    capacity: 8,
    location: 'Sports Complex East',
    imageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    operatingHours: '06:30 – 21:30',
    availableTimeSlots: [
      '06:30 - 08:30 (Dawn Session)',
      '09:00 - 11:00 (Morning Practice)',
      '16:30 - 18:30 (Sunset Session)',
      '19:00 - 21:00 (Night Floodlight Session)'
    ],
    features: [
      'US Open Regulation Surface Coating',
      'Automatic Ball Thrower Machine (On Request)',
      'Perimeter Windbreak Screens',
      'Shaded Player Rest Pavilion'
    ],
    rules: [
      'Non-marking court shoes compulsory',
      '1-hour limit if other residents are waiting without prior reservation'
    ],
    hourlyRate: 'Complimentary for Residents',
    requiresApproval: false,
  },
  {
    id: 'fac-pavilion',
    name: 'Central Garden Pergola & BBQ Pavilion',
    category: 'Outdoor & Leisure',
    description: 'Covered outdoor garden sanctuary surrounded by lush landscaping, fitted with built-in grills for family barbecues and picnics.',
    capacity: 50,
    location: 'Central Garden Promenade',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    operatingHours: '09:00 – 22:00',
    availableTimeSlots: [
      '10:00 - 13:30 (Lunch BBQ & Picnic)',
      '14:30 - 18:00 (Afternoon Gathering)',
      '18:30 - 21:30 (Evening Sunset Grill)'
    ],
    features: [
      'Stainless Steel Charcoal & Gas Grill Pits',
      'Heavy-duty Teak Picnic Tables & Benches',
      'Warm Ambient Fairy Lighting',
      'Outdoor Sink & Preparation Counter',
      'Adjoining Lawn for Children'
    ],
    rules: [
      'Charcoal coals must be safely extinguished with provided sand bucket',
      'Amplified music strictly forbidden after 21:30',
      'Carry-in / carry-out clean lawn policy'
    ],
    hourlyRate: 'Complimentary for Residents',
    requiresApproval: false,
  }
];

const STORAGE_KEY_BOOKINGS = 'lighthouse_facility_bookings_v1';

const SAMPLE_BOOKINGS: FacilityBooking[] = [
  {
    id: 'bk-101',
    facility_id: 'fac-kitchen',
    facility_name: 'Estate Event Kitchen & Banquet Hall',
    resident_id: 'user-res-1',
    resident_name: 'Dr. Tariq Al-Mansoor',
    resident_phone: '+234 803 123 4567',
    house_number: 14,
    house_unit: 'Main House',
    booking_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days ahead
    time_slot: '12:30 - 16:30 (Afternoon Banquet)',
    start_time: '12:30',
    end_time: '16:30',
    event_title: 'Family Eid Reunion & Lunch',
    purpose: 'Family celebration with extended family visiting the estate.',
    guest_count: 35,
    status: 'confirmed',
    special_requests: 'Request access to warming trays and extra dining chairs.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    admin_notes: 'Approved by Estate Admin. Deposit verified.'
  },
  {
    id: 'bk-102',
    facility_id: 'fac-football',
    facility_name: 'AstroTurf Football Field & Sports Arena',
    resident_id: 'user-res-2',
    resident_name: 'Engr. Mustapha Bello',
    resident_phone: '+234 802 345 6789',
    house_number: 22,
    house_unit: 'Main House',
    booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    time_slot: '18:30 - 20:30 (Floodlit Evening Match)',
    start_time: '18:30',
    end_time: '20:30',
    event_title: 'Weekly Resident Friendly Derby',
    purpose: 'House 20s vs House 30s friendly sports evening.',
    guest_count: 16,
    status: 'confirmed',
    created_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'bk-103',
    facility_id: 'fac-mosque',
    facility_name: 'Mosque Meeting Room & Majlis Hall',
    resident_id: 'user-res-1',
    resident_name: 'Dr. Tariq Al-Mansoor',
    resident_phone: '+234 803 123 4567',
    house_number: 14,
    house_unit: 'Main House',
    booking_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    time_slot: '17:30 - 20:30 (Evening Majlis)',
    start_time: '17:30',
    end_time: '20:30',
    event_title: 'Quarterly Madrasa Curriculum Committee',
    purpose: 'Review of term syllabus and youth Quran memorization competition.',
    guest_count: 18,
    status: 'pending',
    created_at: new Date().toISOString()
  }
];

export function getStoredBookings(): FacilityBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(SAMPLE_BOOKINGS));
      return SAMPLE_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_BOOKINGS;
  }
}

export function saveStoredBookings(bookings: FacilityBooking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save facility bookings:', err);
  }
}

export function createFacilityBooking(params: {
  facilityId: string;
  residentId: string;
  residentName: string;
  residentPhone?: string;
  houseNumber: number;
  houseUnit: HouseUnitType | string;
  bookingDate: string;
  timeSlot: string;
  eventTitle: string;
  purpose: string;
  guestCount: number;
  specialRequests?: string;
}): { booking?: FacilityBooking; error?: string } {
  const facility = INITIAL_FACILITIES.find((f) => f.id === params.facilityId);
  if (!facility) {
    return { error: 'Selected facility does not exist.' };
  }

  const existingBookings = getStoredBookings();

  // Check for conflict on same facility, same date, same time slot (if not cancelled)
  const hasConflict = existingBookings.some(
    (b) =>
      b.facility_id === params.facilityId &&
      b.booking_date === params.bookingDate &&
      b.time_slot === params.timeSlot &&
      b.status !== 'cancelled'
  );

  if (hasConflict) {
    return {
      error: `This time slot (${params.timeSlot}) is already booked for ${facility.name} on ${params.bookingDate}. Please select another slot.`,
    };
  }

  const [startTime = '08:00', endTime = '12:00'] = params.timeSlot
    .split(' ')[0]
    .split('-');

  const newBooking: FacilityBooking = {
    id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    facility_id: facility.id,
    facility_name: facility.name,
    resident_id: params.residentId,
    resident_name: params.residentName,
    resident_phone: params.residentPhone,
    house_number: params.houseNumber,
    house_unit: params.houseUnit,
    booking_date: params.bookingDate,
    time_slot: params.timeSlot,
    start_time: startTime.trim(),
    end_time: endTime.trim(),
    event_title: params.eventTitle,
    purpose: params.purpose,
    guest_count: params.guestCount,
    status: facility.requiresApproval ? 'pending' : 'confirmed',
    special_requests: params.specialRequests,
    created_at: new Date().toISOString(),
  };

  existingBookings.unshift(newBooking);
  saveStoredBookings(existingBookings);

  return { booking: newBooking };
}

export function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  adminNotes?: string
): boolean {
  const list = getStoredBookings();
  const index = list.findIndex((b) => b.id === bookingId);
  if (index === -1) return false;

  list[index].status = newStatus;
  if (adminNotes !== undefined) {
    list[index].admin_notes = adminNotes;
  }

  saveStoredBookings(list);
  return true;
}

export function cancelBooking(bookingId: string, residentId: string): { success: boolean; error?: string } {
  const list = getStoredBookings();
  const index = list.findIndex((b) => b.id === bookingId);
  if (index === -1) return { success: false, error: 'Booking not found.' };

  const booking = list[index];
  if (booking.resident_id !== residentId && !residentId.startsWith('user-adm')) {
    return { success: false, error: 'You are not authorized to cancel this booking.' };
  }

  list[index].status = 'cancelled';
  saveStoredBookings(list);
  return { success: true };
}
