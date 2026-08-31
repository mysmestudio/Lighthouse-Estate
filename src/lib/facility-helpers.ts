import { Facility, FacilityBooking, BookingStatus, HouseUnitType } from '../types';

export const INITIAL_FACILITIES: Facility[] = [
  {
    id: 'fac-kitchen',
    name: 'Estate Kitchen & Banquet Area',
    category: 'Culinary & Events',
    description: 'Fully equipped commercial catering kitchen and banquet area for family feasts, private catering prep, and resident receptions.',
    capacity: 80,
    location: 'Clubhouse West Wing (Ground Floor)',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    operatingHours: '08:00 – 22:00',
    openTime: '08:00',
    closeTime: '22:00',
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
      'Breakages or damages will be deducted from security deposit'
    ],
    hourlyRate: 'Free for Residents (₦15,000 Refundable Deposit)',
    requiresApproval: true,
  },
  {
    id: 'fac-clubhouse',
    name: 'Community Clubhouse & Event Lounge',
    category: 'Community & Faith',
    description: 'Spacious air-conditioned hall with high ceilings, AV projector, stage, and flexible seating for community townhalls, lectures, and celebrations.',
    capacity: 150,
    location: 'Central Plaza Building',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    operatingHours: '07:00 – 23:00',
    openTime: '07:00',
    closeTime: '23:00',
    features: [
      '4K Laser Projector & Motorized 150" Screen',
      'Wireless Podium Microphones & Acoustic System',
      'Central Climate Control System',
      'Lounge Sofas & Formal Banqueting Layouts',
      'Adjoining Restrooms & Baby Changing Stations'
    ],
    rules: [
      'Estate quiet hours strictly enforced after 22:00',
      'Decorations must not use wall-damaging adhesives or nails',
      'All trash must be bagged and placed in exterior bins'
    ],
    hourlyRate: 'Free for Residents',
    requiresApproval: true,
  },
  {
    id: 'fac-turf',
    name: 'Sports Turf & Multi-Court',
    category: 'Sports & Fitness',
    description: 'Floodlit artificial turf pitch and court marked for 5-a-side football, tennis, and basketball with spectator benches.',
    capacity: 30,
    location: 'North Recreation Park',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    operatingHours: '06:00 – 22:00',
    openTime: '06:00',
    closeTime: '22:00',
    features: [
      'FIFA-standard Shock-absorbing Astroturf',
      'LED Stadium Floodlighting for evening play',
      'Adjustable Basketball Hoops & Tennis Net',
      'Hydration & Water Refill Station'
    ],
    rules: [
      'Appropriate sports footwear (cleats/sneakers) mandatory',
      'Floodlights turn off automatically at 22:00',
      'Spectators must stay behind safety perimeter fencing'
    ],
    hourlyRate: 'Free for Residents',
    requiresApproval: false,
  },
  {
    id: 'fac-pool',
    name: 'Swimming Pool & Sun Deck',
    category: 'Sports & Fitness',
    description: 'Resort-style 25m heated lap pool with dedicated shallow kids wading pool, shaded cabanas, and sun loungers.',
    capacity: 40,
    location: 'Clubhouse South Terrace',
    imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
    operatingHours: '06:30 – 20:30',
    openTime: '06:30',
    closeTime: '20:30',
    features: [
      'Trained Estate Lifeguard on Duty',
      'Outdoor Showers & Changing Cabins',
      'Chlorine & UV Water Purification',
      'Anti-slip Pool Decking & Sun Loungers'
    ],
    rules: [
      'Children under 12 must be supervised by an adult at all times',
      'No glassware or porcelain items around the pool perimeter',
      'Shower before entering the pool'
    ],
    hourlyRate: 'Free for Residents',
    requiresApproval: false,
  },
  {
    id: 'fac-coworking',
    name: 'Co-Working Hub & Boardroom',
    category: 'Community & Faith',
    description: 'Quiet executive workspace with high-speed fiber internet, ergonomic workstations, private phone booths, and an 8-seater boardroom.',
    capacity: 20,
    location: 'Clubhouse 1st Floor',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    operatingHours: '07:00 – 22:00',
    openTime: '07:00',
    closeTime: '22:00',
    features: [
      'Dedicated 1 Gbps Fiber Mesh WiFi & UPS Backup',
      'Smart Conference Display & Zoom Video Bar',
      'Color Wireless Printing & Scanning Station',
      'Artisan Coffee & Tea Bar'
    ],
    rules: [
      'Keep mobile ringers on silent; use phone booths for calls',
      'Clean up desk and whiteboard after meetings',
      'No hot meals inside the main conference room'
    ],
    hourlyRate: 'Free for Residents',
    requiresApproval: false,
  },
  {
    id: 'fac-gazebo',
    name: 'Children’s Playground & Picnic Gazebo',
    category: 'Outdoor & Leisure',
    description: 'Landscaped garden park with shaded wooden gazebos, barbecue grills, swings, slides, and grassy picnic lawns.',
    capacity: 60,
    location: 'East Park Gardens',
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80',
    operatingHours: '07:00 – 20:00',
    openTime: '07:00',
    closeTime: '20:00',
    features: [
      'Safety Rubber Mulch Playground Flooring',
      'Built-in Charcoal BBQ Grills',
      'Covered Picnic Tables & Gazebos',
      'Perimeter Child-safe Fencing'
    ],
    rules: [
      'Extinguish all BBQ charcoal completely before departure',
      'Dispose of food leftovers in designated wildlife-proof bins',
      'Pets must be kept on a leash in designated areas'
    ],
    hourlyRate: 'Free for Residents',
    requiresApproval: false,
  }
];

const STORAGE_KEY_BOOKINGS = 'lighthouse_facility_bookings_v3';

export function getStoredBookings(): FacilityBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredBookings(bookings: FacilityBooking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save facility bookings:', err);
  }
}

export function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().slice(0, 5);
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function checkFacilityAvailability(
  facilityId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): { available: boolean; conflictReason?: string; conflictingBooking?: FacilityBooking } {
  const facility = INITIAL_FACILITIES.find((f) => f.id === facilityId);
  if (!facility) {
    return { available: false, conflictReason: 'Facility not found.' };
  }

  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);

  if (endMins <= startMins) {
    return { available: false, conflictReason: 'End time must be after start time.' };
  }

  if (endMins - startMins < 30) {
    return { available: false, conflictReason: 'Minimum reservation duration is 30 minutes.' };
  }

  const openMins = parseTimeToMinutes(facility.openTime || '06:00');
  const closeMins = parseTimeToMinutes(facility.closeTime || '23:00');

  if (startMins < openMins) {
    return {
      available: false,
      conflictReason: `Start time (${startTime}) is before opening hours (${facility.openTime || '06:00'}).`,
    };
  }

  if (endMins > closeMins) {
    return {
      available: false,
      conflictReason: `End time (${endTime}) exceeds closing hours (${facility.closeTime || '23:00'}).`,
    };
  }

  const bookings = getStoredBookings();
  const overlap = bookings.find((b) => {
    if (b.facility_id !== facilityId || b.booking_date !== bookingDate || b.status === 'cancelled') {
      return false;
    }
    if (excludeBookingId && b.id === excludeBookingId) return false;

    const bStartMins = parseTimeToMinutes(b.start_time);
    const bEndMins = parseTimeToMinutes(b.end_time);

    // Overlap condition: (StartA < EndB) and (EndA > StartB)
    return startMins < bEndMins && endMins > bStartMins;
  });

  if (overlap) {
    return {
      available: false,
      conflictReason: `Time conflict: Already reserved from ${overlap.start_time} to ${overlap.end_time} ("${overlap.event_title}"). Please choose another time.`,
      conflictingBooking: overlap,
    };
  }

  return { available: true };
}

export function createFacilityBooking(params: {
  facilityId: string;
  residentId: string;
  residentName: string;
  residentPhone?: string;
  houseNumber?: number;
  houseUnit?: HouseUnitType | string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  eventTitle: string;
  purpose: string;
  guestCount: number;
  specialRequests?: string;
}): { booking?: FacilityBooking; error?: string } {
  const facility = INITIAL_FACILITIES.find((f) => f.id === params.facilityId);
  if (!facility) {
    return { error: 'Selected facility does not exist.' };
  }

  const validation = checkFacilityAvailability(
    params.facilityId,
    params.bookingDate,
    params.startTime,
    params.endTime
  );

  if (!validation.available) {
    return { error: validation.conflictReason || 'Selected time is not available.' };
  }

  const cleanTimeSlot = `${params.startTime.trim()} – ${params.endTime.trim()}`;

  const newBooking: FacilityBooking = {
    id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    facility_id: facility.id,
    facility_name: facility.name,
    resident_id: params.residentId,
    resident_name: params.residentName,
    resident_phone: params.residentPhone,
    house_number: params.houseNumber || 0,
    house_unit: params.houseUnit || 'Main House',
    booking_date: params.bookingDate,
    time_slot: cleanTimeSlot,
    start_time: params.startTime.trim(),
    end_time: params.endTime.trim(),
    event_title: params.eventTitle.trim(),
    purpose: params.purpose.trim(),
    guest_count: params.guestCount,
    status: facility.requiresApproval ? 'pending' : 'confirmed',
    special_requests: params.specialRequests?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  const existingBookings = getStoredBookings();
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
