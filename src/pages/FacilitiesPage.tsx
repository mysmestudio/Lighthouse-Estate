import React, { useState, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Info, 
  X, 
  Utensils, 
  Trophy, 
  Sparkles, 
  BookOpen, 
  Trees, 
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Search,
  Check,
  Bell
} from 'lucide-react';
import { AppUser, Facility, FacilityBooking } from '../types';
import { 
  INITIAL_FACILITIES, 
  getStoredBookings, 
  createFacilityBooking, 
  cancelBooking 
} from '../lib/facility-helpers';
import { triggerSOSEvent } from '../lib/sos-service';

interface FacilitiesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ currentUser, navigate }) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'my-bookings'>('explore');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookings, setBookings] = useState<FacilityBooking[]>(() => getStoredBookings());

  // Modal State
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(10);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [agreedToRules, setAgreedToRules] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<FacilityBooking | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const categories: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'All Amenities', value: 'all', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'Culinary & Events', value: 'Culinary & Events', icon: <Utensils className="w-3.5 h-3.5" /> },
    { label: 'Sports & Fitness', value: 'Sports & Fitness', icon: <Trophy className="w-3.5 h-3.5" /> },
    { label: 'Community & Faith', value: 'Community & Faith', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { label: 'Outdoor & Leisure', value: 'Outdoor & Leisure', icon: <Trees className="w-3.5 h-3.5" /> },
  ];

  const filteredFacilities = INITIAL_FACILITIES.filter((f) => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const residentBookings = bookings.filter((b) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin' || currentUser.role === 'master_admin') return true;
    return b.resident_id === currentUser.id || b.house_number === currentUser.house_number;
  });

  const handleOpenBooking = (facility: Facility) => {
    setSelectedFacility(facility);
    setSelectedSlot(facility.availableTimeSlots[0] || '');
    setEventTitle('');
    setPurpose('');
    setGuestCount(Math.min(15, facility.capacity));
    setSpecialRequests('');
    setAgreedToRules(false);
    setBookingError('');
    setBookingSuccess(null);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this facility reservation?')) return;
    const res = cancelBooking(bookingId, currentUser?.id || 'user-res-1');
    if (res.success) {
      setBookings(getStoredBookings());
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    if (!selectedSlot) {
      setBookingError('Please select a time slot.');
      return;
    }
    if (!eventTitle.trim()) {
      setBookingError('Please enter an event or activity title.');
      return;
    }
    if (!agreedToRules) {
      setBookingError('Please review and agree to the facility rules.');
      return;
    }

    setSubmitting(true);
    setBookingError('');

    setTimeout(() => {
      const result = createFacilityBooking({
        facilityId: selectedFacility.id,
        residentId: currentUser?.id || 'user-res-1',
        residentName: currentUser?.full_name || 'Resident',
        residentPhone: currentUser?.phone || '',
        houseNumber: currentUser?.house_number || 14,
        houseUnit: currentUser?.house_unit || 'Main House',
        bookingDate: selectedDate,
        timeSlot: selectedSlot,
        eventTitle,
        purpose,
        guestCount,
        specialRequests,
      });

      setSubmitting(false);

      if (result.error) {
        setBookingError(result.error);
      } else if (result.booking) {
        setBookingSuccess(result.booking);
        setBookings(getStoredBookings());
      }
    }, 300);
  };

  // SOS Press & Hold
  const handleSOSStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${SOS_HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(async () => {
      setSosActivated(true);
      setIsHoldingSOS(false);
      setShowSosToast(true);

      if (currentUser) {
        try {
          await triggerSOSEvent(currentUser);
        } catch (err) {
          console.error(err);
        }
      }

      setTimeout(() => {
        setSosActivated(false);
        setShowSosToast(false);
        setSosTransition('none');
        setSosProgressOffset(SOS_RING_LENGTH);
      }, 4000);
    }, SOS_HOLD_MS);
  };

  const handleSOSCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(SOS_RING_LENGTH);
  };

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TA';

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-sans pb-32">
      {/* SVG Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="lattice-fac" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Top Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <div className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident'
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : 'Estate Facilities'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            title="Account & Profile Settings"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice-fac)" />
        </svg>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Sora'] font-bold text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                Estate Facilities & Spaces
              </h1>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Reserve community spaces including the Mosque Hall, Football Arena, Tennis Court, and BBQ Pavilion.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('explore')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'explore'
                    ? 'bg-[#E8C547] text-[#4A3B0A] shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Amenities
              </button>
              <button
                onClick={() => setActiveTab('my-bookings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'my-bookings'
                    ? 'bg-[#E8C547] text-[#4A3B0A] shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                My Bookings ({residentBookings.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Search & Categories */}
          {activeTab === 'explore' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8AA096]" />
                <input
                  type="text"
                  placeholder="Search facilities by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-[#E3EFE7] rounded-xl text-xs text-[#16241D] placeholder-[#8AA096] focus:outline-none focus:border-[#3FAE7A] shadow-xs"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedCategory(c.value)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      selectedCategory === c.value
                        ? 'bg-[#257A54] text-white shadow-xs'
                        : 'bg-white border border-[#E3EFE7] text-[#516459] hover:text-[#16241D]'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Explore Amenities Grid */}
          {activeTab === 'explore' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredFacilities.map((fac) => (
                <div
                  key={fac.id}
                  className="bg-white border border-[#E3EFE7] rounded-2xl overflow-hidden shadow-xs hover:border-[#3FAE7A]/40 transition-all flex flex-col justify-between"
                >
                  <div className="relative h-36 w-full bg-[#EAF7EE] overflow-hidden">
                    <img
                      src={fac.imageUrl}
                      alt={fac.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#123528]/85 backdrop-blur-xs text-white text-[10px] font-['Sora'] font-bold">
                      {fac.category}
                    </span>
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[#16241D] text-[10.5px] font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#257A54]" />
                      Cap: {fac.capacity}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-['Sora'] font-bold text-base text-[#16241D] mb-1">
                        {fac.name}
                      </h3>
                      <p className="text-xs text-[#516459] line-clamp-2 leading-relaxed mb-3">
                        {fac.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8AA096] mb-4">
                        <MapPin className="w-3 h-3 text-[#257A54]" />
                        <span>{fac.location}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenBooking(fac)}
                      className="w-full py-2 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Reserve Space</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* My Bookings Tab */
            <div className="space-y-3">
              {residentBookings.length === 0 ? (
                <div className="bg-white border border-[#E3EFE7] rounded-2xl p-10 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">No reservations yet</h3>
                  <p className="text-xs text-[#516459] max-w-sm mx-auto">
                    You have not reserved any estate amenities. Browse available spaces and select a date.
                  </p>
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A]"
                  >
                    <span>Browse Facilities</span>
                  </button>
                </div>
              ) : (
                residentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border border-[#E3EFE7] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-['Sora'] font-bold text-base text-[#16241D]">
                          {b.facility_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          b.status === 'confirmed'
                            ? 'bg-[#EAF7EE] text-[#257A54]'
                            : b.status === 'cancelled'
                            ? 'bg-[#FCEBEB] text-[#A32D2D]'
                            : 'bg-[#FBF3D9] text-[#B4922C]'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#516459] font-medium mb-1">
                        "{b.event_title}"
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8AA096]">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-[#257A54]" />
                          {b.booking_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#257A54]" />
                          {b.time_slot}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#257A54]" />
                          {b.guest_count} guests
                        </span>
                      </div>
                    </div>

                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-3 py-1.5 rounded-xl border border-[#A32D2D]/30 text-[#A32D2D] hover:bg-[#FCEBEB] text-xs font-bold self-start sm:self-center transition-colors"
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* Floating Bottom Dock */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-2xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[8.5px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/passes')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V9z" />
            <path d="M9 14h6" />
          </svg>
          <span className="text-[8.5px] font-bold">Passes</span>
        </button>
        <button
          onClick={() => navigate('/facilities')}
          className="w-12 h-11 border-none bg-white/12 text-[#E8C547] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z" />
          </svg>
          <span className="text-[8.5px] font-bold">Facilities</span>
        </button>
        <button
          onClick={() => navigate('/household')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[8.5px] font-bold">Staff</span>
        </button>
        <button
          onClick={() => navigate('/notices')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[8.5px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Floating Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-50">
        <svg className="absolute inset-0 w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="31" stroke="rgba(18,53,40,0.12)" strokeWidth="4" fill="none" />
          <circle
            cx="35"
            cy="35"
            r="31"
            stroke="#C23A38"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={SOS_RING_LENGTH}
            strokeDashoffset={sosProgressOffset}
            style={{ transition: sosTransition }}
          />
        </svg>

        <button
          onMouseDown={handleSOSStart}
          onMouseUp={handleSOSCancel}
          onMouseLeave={handleSOSCancel}
          onTouchStart={handleSOSStart}
          onTouchEnd={handleSOSCancel}
          onTouchCancel={handleSOSCancel}
          className={`absolute top-[7px] left-[7px] w-14 h-14 rounded-full border-none bg-gradient-to-br from-[#F0645F] to-[#C23A38] flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg select-none touch-none ${
            isHoldingSOS ? 'scale-95' : 'animate-pulse'
          } ${sosActivated ? 'bg-gradient-to-br from-[#FF6E68] to-[#D2413F] scale-105' : ''}`}
          aria-label="Hold for 5 seconds for SOS"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="white" stroke="none" />
          </svg>
          <span className="font-['Sora'] font-extrabold text-[8.5px] tracking-wider text-white">SOS</span>
        </button>

        {showSosToast && (
          <div className="absolute bottom-20 right-0 bg-[#0D2A1F] border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
            Alert sent to gate security
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedFacility(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FBFDF9] border border-[#E3EFE7] flex items-center justify-center text-[#516459]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="font-['Sora'] font-bold text-[10.5px] uppercase tracking-wider text-[#257A54]">
                Reservation Request
              </span>
              <h2 className="font-['Sora'] font-bold text-xl text-[#16241D] mt-0.5">
                {selectedFacility.name}
              </h2>
              <p className="text-xs text-[#516459]">
                Capacity: {selectedFacility.capacity} people &middot; {selectedFacility.location}
              </p>
            </div>

            {bookingSuccess ? (
              <div className="space-y-4">
                <div className="bg-[#EAF7EE] border border-[#3FAE7A]/30 rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#3FAE7A] text-white flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">Reservation Confirmed!</h3>
                  <p className="text-xs text-[#257A54] mt-0.5">
                    {bookingSuccess.booking_date} &middot; {bookingSuccess.time_slot}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFacility(null);
                    setActiveTab('my-bookings');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-bold text-xs hover:bg-[#DDB63A]"
                >
                  View My Bookings
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-3.5 text-xs">
                {bookingError && (
                  <div className="p-3 rounded-xl bg-[#FCEBEB] border border-[#A32D2D]/20 text-[#A32D2D] text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Event / Purpose Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Family Eid Dinner / Weekend Football"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                      Est. Guests
                    </label>
                    <input
                      type="number"
                      max={selectedFacility.capacity}
                      min={1}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-sm focus:outline-none focus:border-[#3FAE7A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1 text-[10.5px]">
                    Available Time Slot *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFacility.availableTimeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                          selectedSlot === slot
                            ? 'border-[#3FAE7A] bg-[#EAF7EE] text-[#257A54]'
                            : 'border-[#E3EFE7] bg-[#FBFDF9] text-[#516459] hover:border-[#3FAE7A]/40'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToRules}
                      onChange={(e) => setAgreedToRules(e.target.checked)}
                      className="mt-0.5 rounded text-[#257A54] focus:ring-[#3FAE7A]"
                    />
                    <span className="text-[11.5px] text-[#516459]">
                      I agree to the estate facility usage guidelines, cleanup protocol, and quiet hours (after 10:00 PM).
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-[#E8C547] text-[#4A3B0A] font-['Sora'] font-bold text-sm hover:bg-[#DDB63A] active:scale-98 transition-all mt-2"
                >
                  {submitting ? 'Submitting Reservation...' : 'Confirm Reservation'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
