export type UserRole = 
  | 'resident' 
  | 'staff' 
  | 'security' 
  | 'admin' 
  | 'master_admin' 
  | 'madrasa_admin';

export type UserStatus = 
  | 'pending' 
  | 'active' 
  | 'suspended' 
  | 'off_duty' 
  | 'rejected' 
  | 'deleted';

export type HouseUnitType = 
  | 'Main House' 
  | 'Ground Floor' 
  | 'First Floor' 
  | 'BQ';

export interface AppUser {
  id: string;
  auth_user_id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  email: string;
  house_number: number;
  house_unit: HouseUnitType;
  pin?: string;
  pin_hash?: string;
  status: UserStatus;
  dues_status?: 'up_to_date' | 'overdue' | 'exempt' | 'paid' | 'unpaid';
  employer_id?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_relationship?: string;
  vehicle_plates?: string[];
  notify_gate_alerts?: boolean;
  notify_notices?: boolean;
  notify_sms?: boolean;
}

export type PassType = 
  | 'guest' 
  | 'delivery' 
  | 'long_stay' 
  | 'exit' 
  | 'group'
  | 'one_time' 
  | 'recurring' 
  | 'contractor';

export type EntryType = 'single' | 'multi';

export type PassStatus = 
  | 'active' 
  | 'used' 
  | 'out' 
  | 'expired' 
  | 'revoked';

export interface VisitorPass {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_phone?: string;
  house_number: number;
  house_unit: HouseUnitType;
  guest_name: string;
  guest_phone?: string;
  guest_plate_number?: string;
  pass_type: PassType;
  entry_type?: EntryType; // distinguishes 'single' (Guest, Delivery, Exit) from 'multi' (Long Stay, Group)
  artisan_date?: string; // YYYY-MM-DD for Artisan/Contractor
  start_time?: string; // HH:mm for Artisan/Contractor
  end_time?: string; // HH:mm for Artisan/Contractor
  valid_to?: string; // YYYY-MM-DD for Long Stay Visitor
  guest_count?: number;
  pass_code: string; // 6-digit numeric code
  qr_payload?: string;
  valid_from: string;
  valid_until: string; // alias/same as expires_at
  expires_at?: string;
  status: PassStatus;
  overstayed?: boolean;
  overstay_alerted?: boolean;
  overstay_time?: string;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  checked_out_at?: string;
  notes?: string;
}

export interface EstateAlert {
  id: string;
  type: 'overstay_alert' | 'sos' | 'pass_scanned' | 'security';
  title: string;
  message: string;
  target_role: 'admin' | 'resident' | 'all';
  target_user_id?: string;
  target_house_number?: number;
  pass_id?: string;
  pass_code?: string;
  visitor_name?: string;
  severity: 'warning' | 'critical' | 'info';
  created_at: string;
  read?: boolean;
  resolved?: boolean;
}

export interface PassVerificationAttempt {
  id: string;
  pass_id?: string;
  pass_code: string;
  attempted_at: string;
  status: 'success' | 'failed';
  reason?: 'success' | 'expired' | 'not_found' | 'already_used' | 'revoked' | 'rate_limited' | 'checked_out';
  guard_name?: string;
  verified_method: 'pin' | 'qr';
  visitor_name?: string;
  house_info?: string;
}

export interface VerificationResult {
  success: boolean;
  code: string;
  status: PassStatus | 'rate_limited' | 'not_found';
  actionTaken?: 'granted_entry' | 'granted_exit' | 'denied';
  reason?: 'success' | 'expired' | 'not_found' | 'already_used' | 'revoked' | 'rate_limited' | 'checked_out';
  message: string;
  pass?: {
    id: string;
    guest_name: string;
    pass_type: PassType;
    guest_count?: number;
    guest_phone?: string;
    guest_plate_number?: string;
    house_number: number;
    house_unit: string;
    resident_name: string;
    resident_phone?: string;
    valid_until: string;
    status: PassStatus;
  };
  timestamp: string;
}

export type NoticeType = 'emergency' | 'event' | 'info';

export interface EstateNotice {
  id: string;
  title: string;
  type?: NoticeType;
  category?: 'announcement' | 'security' | 'madrasa' | 'maintenance' | 'community' | 'emergency' | 'event' | 'info';
  content: string; // or body
  body?: string;
  priority?: 'normal' | 'urgent' | 'pinned' | 'emergency';
  author_name: string;
  author_role: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

export interface AccessLog {
  id: string;
  pass_id?: string;
  pass_code?: string;
  visitor_name: string;
  house_info: string;
  direction: 'in' | 'out';
  guard_name: string;
  timestamp: string;
  vehicle_plate?: string;
  verified_method: 'pin' | 'qr' | 'manual' | 'resident_override';
  notes?: string;
}

// Domestic Staff & KYC Management Types
export type StaffRole = 
  | 'Cleaner' 
  | 'Driver' 
  | 'Nanny' 
  | 'Gardener' 
  | 'Cook' 
  | 'Security Guard' 
  | 'Housekeeper' 
  | 'Other';

export interface StaffSchedule {
  days: string[]; // e.g. ['Monday', 'Wednesday', 'Friday']
  startTime: string; // e.g. '08:00'
  endTime: string; // e.g. '17:00'
}

export interface StaffInviteCode {
  id: string;
  code: string; // 6-digit numeric string e.g. "492810"
  employer_id: string;
  employer_name?: string;
  employer_house_number?: number;
  employer_house_unit?: HouseUnitType;
  role: StaffRole;
  work_location: string;
  schedule: StaffSchedule;
  expires_at: string; // default now() + 7 days
  used: boolean;
  used_at?: string;
  created_at: string;
}

export interface EmployerRemark {
  id: string;
  text: string;
  created_at: string;
  author_name: string;
}

export interface StaffChangeHistoryItem {
  id: string;
  timestamp: string;
  action: string; // e.g. 'Onboarding Completed', 'Approved', 'Schedule Updated', 'Marked Off Duty', 'Remark Appended'
  details: string;
  author: string;
}

export interface StaffKYC {
  id: string;
  user_id: string; // links to app_users.id
  employer_id: string;
  employer_name?: string;
  employer_house_number?: number;
  employer_house_unit?: HouseUnitType;
  full_name: string;
  phone: string;
  email?: string;
  role: StaffRole;
  work_location: string;
  schedule: StaffSchedule;
  dob: string;
  gender: 'Male' | 'Female';
  home_address: string;
  nin_encrypted?: string; // encrypted via pgcrypto / Postgres function
  nin_masked: string; // e.g. '*******7890' (last 4 digits visible)
  next_of_kin: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents: {
    passport_photo_url: string;
    national_id_url: string;
    guarantor_id_url: string;
  };
  employer_remarks: EmployerRemark[]; // jsonb array, strictly append-only
  change_history: StaffChangeHistoryItem[]; // jsonb array
  status: 'pending' | 'active' | 'off_duty' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

// Emergency SOS Types
export type SOSStatus = 'triggered' | 'acknowledged' | 'cleared';

export interface SOSEvent {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_phone?: string;
  house_number: number;
  house_unit: HouseUnitType | string;
  triggered_at: string;
  status: SOSStatus;
  acknowledged_at?: string;
  acknowledged_by?: string;
  cleared_at?: string;
  cleared_by?: string;
  resolution_notes?: string;
  notified_admin_emails?: string[];
  edge_function_dispatched?: boolean;
}

// ==========================================
// Community Modules Types
// ==========================================

// Townhall Polls Types
export interface PollOption {
  id: string;
  text: string;
}

export type PollVisibility = 'after_vote' | 'after_close' | 'always';
export type PollStatus = 'open' | 'closed';

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  created_by: string;
  creator_name: string;
  results_visibility: PollVisibility;
  close_date?: string | null;
  status: PollStatus;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  voter_id: string;
  voter_name?: string;
  house_number?: number;
  house_unit?: string;
  option_id: string;
  voted_at: string;
}

export interface PollWithStats extends Poll {
  votesCount: number;
  userVotedOptionId?: string | null;
  optionVoteCounts: Record<string, number>;
  optionVotePercentages: Record<string, number>;
  canViewResults: boolean;
}

// Fix-It Tickets Types
export type TicketCategory = 'Electrical' | 'Plumbing' | 'Security' | 'Other';
export type TicketStatus = 'pending' | 'in_progress' | 'resolved';

export interface FixItTicket {
  id: string;
  resident_id: string;
  resident_name: string;
  resident_phone?: string;
  house_number: number;
  house_unit: HouseUnitType | string;
  category: TicketCategory;
  description: string;
  photo_url?: string;
  status: TicketStatus;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

// Resident Marketplace Noticeboard Types
export type MarketplaceCategory = 
  | 'Household' 
  | 'Electronics' 
  | 'Furniture' 
  | 'Services' 
  | 'Vehicles' 
  | 'Kids & Baby' 
  | 'Other';

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_phone: string;
  house_number: number;
  house_unit: HouseUnitType | string;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price?: number | null;
  price_type?: 'fixed' | 'free' | 'negotiable';
  contact_method: string;
  status: 'active' | 'sold' | 'archived';
  created_at: string;
}

// Facility Booking Types
export type FacilityCategory = 
  | 'Culinary & Events' 
  | 'Sports & Fitness' 
  | 'Community & Faith' 
  | 'Outdoor & Leisure';

export interface Facility {
  id: string;
  name: string;
  category: FacilityCategory;
  description: string;
  capacity: number;
  location: string;
  imageUrl: string;
  operatingHours: string;
  availableTimeSlots: string[];
  features: string[];
  rules: string[];
  hourlyRate: string;
  requiresApproval: boolean;
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

export interface FacilityBooking {
  id: string;
  facility_id: string;
  facility_name: string;
  resident_id: string;
  resident_name: string;
  resident_phone?: string;
  house_number: number;
  house_unit: HouseUnitType | string;
  booking_date: string; // YYYY-MM-DD
  time_slot: string; // e.g. "09:00 - 12:00"
  start_time: string;
  end_time: string;
  event_title: string;
  purpose: string;
  guest_count: number;
  status: BookingStatus;
  special_requests?: string;
  created_at: string;
  admin_notes?: string;
}

