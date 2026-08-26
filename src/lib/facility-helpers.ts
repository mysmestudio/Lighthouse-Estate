import { Facility, FacilityBooking, BookingStatus, HouseUnitType } from '../types';

export const INITIAL_FACILITIES: Facility[] = [
  {
    id: 'fac-kitchen',
    name: 'Estate Kitchen',
    category: 'Culinary & Events',
    description: 'Fully equipped culinary catering kitchen and banquet area for family feasts, catering prep, and resident events.',
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
  }
];

const STORAGE_KEY_BOOKINGS = 'lighthouse_facility_bookings_v2';

const SAMPLE_BOOKINGS: FacilityBooking[] = [];

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
