import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Bell, 
  Home, 
  UserPlus
} from 'lucide-react';
import { AppUser, StaffRole } from '../types';
import { 
  getAllActiveStaffForDirectory, 
  isStaffScheduledToday, 
  isStaffOnDutyNow 
} from '../lib/staff-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface StaffDirectoryPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ROLE_FILTERS: Array<'All' | StaffRole> = [
  'All',
  'Cleaner',
  'Driver',
  'Nanny',
  'Gardener',
  'Cook',
  'Security Guard',
  'Housekeeper',
  'Other',
];

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const StaffDirectoryPage: React.FC<StaffDirectoryPageProps> = ({ currentUser, navigate }) => {
  const [activeStaff, setActiveStaff] = useState<ReturnType<typeof getAllActiveStaffForDirectory>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'All' | StaffRole>('All');
  const [onlyOnDutyToday, setOnlyOnDutyToday] = useState(false);
  const [onlyOnDutyNow, setOnlyOnDutyNow] = useState(false);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const list = getAllActiveStaffForDirectory();
    setActiveStaff(list);
  }, []);

  const filteredStaff = activeStaff.filter((staff) => {
    if (selectedRole !== 'All' && staff.role !== selectedRole) return false;
    if (onlyOnDutyToday && !isStaffScheduledToday(staff.schedule)) return false;
    if (onlyOnDutyNow && !isStaffOnDutyNow(staff.schedule)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = staff.full_name.toLowerCase().includes(q);
      const matchRole = staff.role.toLowerCase().includes(q);
      const matchEmployer = (staff.employer_name || '').toLowerCase().includes(q);
      const matchHouse = (staff.work_location || '').toLowerCase().includes(q) ||
        (staff.employer_house_number ? staff.employer_house_number.toString().includes(q) : false);
      const matchPhone = staff.phone.includes(q);

      if (!matchName && !matchRole && !matchEmployer && !matchHouse && !matchPhone) {
        return false;
      }
    }

    return true;
  });

  const onDutyNowCount = activeStaff.filter((s) => isStaffOnDutyNow(s.schedule)).length;
  const onDutyTodayCount = activeStaff.filter((s) => isStaffScheduledToday(s.schedule)).length;

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
          <pattern id="lattice-directory" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Pillbar Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident' && currentUser?.house_number
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : currentUser?.role === 'admin' || currentUser?.role === 'master_admin'
              ? 'Estate Management'
              : currentUser?.role === 'security'
              ? 'Gate Security'
              : 'Estate Staff Registry'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs hover:opacity-90 transition-opacity"
            title="Account Settings"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Header with SVG Lattice Pattern */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice-directory)" />
        </svg>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-[#3FAE7A]/25 text-[#76dfa8] text-[10.5px] font-['Sora'] font-bold uppercase tracking-wider border border-[#3FAE7A]/30">
                  Estate Registry
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[10.5px] font-bold">
                  {onDutyNowCount} On Duty Now
                </span>
              </div>
              <h1 className="font-['Sora'] font-bold text-xl sm:text-2xl tracking-tight text-white">
                Domestic Staff Directory
              </h1>
              <p className="text-xs text-white/70">
                Verified roster of domestic staff, drivers, nannies, cooks, and estate contractors
              </p>
            </div>

            <button
              onClick={() => navigate('/household')}
              className="px-4 py-2.5 rounded-2xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rounded Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#8AA096] uppercase tracking-wider">Total Active Staff</div>
              <div className="font-['Sora'] font-extrabold text-xl text-[#16241D] mt-1">{activeStaff.length}</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#8AA096] uppercase tracking-wider">On Duty Today</div>
              <div className="font-['Sora'] font-extrabold text-xl text-[#257A54] mt-1">{onDutyTodayCount}</div>
            </div>
            <div className="bg-white border border-[#E3EFE7] rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-[#8AA096] uppercase tracking-wider">Currently In Estate</div>
              <div className="font-['Sora'] font-extrabold text-xl text-[#3FAE7A] mt-1 flex items-center gap-2">
                <span>{onDutyNowCount}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#3FAE7A] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E3EFE7] shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8AA096] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name, role, employer, phone, house number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {ROLE_FILTERS.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-['Sora'] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedRole === role
                        ? 'bg-[#123528] text-white shadow-xs'
                        : 'bg-[#FBFDF9] text-[#516459] hover:bg-[#EAF7EE] hover:text-[#123528]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#516459]">
                  <input
                    type="checkbox"
                    checked={onlyOnDutyToday}
                    onChange={(e) => setOnlyOnDutyToday(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#257A54] rounded"
                  />
                  <span>Scheduled Today</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#516459]">
                  <input
                    type="checkbox"
                    checked={onlyOnDutyNow}
                    onChange={(e) => setOnlyOnDutyNow(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#257A54] rounded"
                  />
                  <span>On Duty Now</span>
                </label>
              </div>
            </div>
          </div>

          {/* Staff Roster Grid */}
          {filteredStaff.length === 0 ? (
            <div className="bg-white border border-[#E3EFE7] rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-['Sora'] font-bold text-sm text-[#16241D]">No staff members found</h3>
              <p className="text-xs text-[#8AA096] max-w-sm mx-auto">
                Try adjusting your search query or filter selection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((staff) => {
                const isNow = isStaffOnDutyNow(staff.schedule);
                const isToday = isStaffScheduledToday(staff.schedule);

                return (
                  <div
                    key={staff.id}
                    className="bg-white border border-[#E3EFE7] hover:border-[#3FAE7A]/40 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center font-['Sora'] font-bold text-base">
                            {staff.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-['Sora'] font-bold text-sm text-[#16241D]">
                              {staff.full_name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-[#FBFDF9] border border-[#E3EFE7] text-[10.5px] font-bold text-[#257A54]">
                              {staff.role}
                            </span>
                          </div>
                        </div>

                        {isNow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EAF7EE] text-[#257A54] border border-[#3FAE7A]/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3FAE7A] animate-pulse" />
                            <span>On Duty</span>
                          </span>
                        ) : isToday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FBF3D9] text-[#8C6D1F]">
                            Today
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-gray-100 text-gray-500">
                            Off Duty
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-[#516459]">
                        <div className="flex items-center gap-2">
                          <Home className="w-3.5 h-3.5 text-[#8AA096]" />
                          <span>
                            {staff.employer_house_number ? `House ${staff.employer_house_number}` : 'Estate Facility'} ({staff.employer_name || 'Resident'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#8AA096]" />
                          <span>{staff.schedule.days.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#8AA096]" />
                          <span>{staff.schedule.startTime} - {staff.schedule.endTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E3EFE7] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[#257A54] font-semibold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Gate Clearance Active</span>
                      </div>

                      <a
                        href={`tel:${staff.phone}`}
                        className="p-2 rounded-xl bg-[#EAF7EE] text-[#257A54] hover:bg-[#3FAE7A] hover:text-white transition-colors"
                        title="Call staff"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
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
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z" />
          </svg>
          <span className="text-[8.5px] font-bold">Facilities</span>
        </button>
        <button
          onClick={() => navigate('/household')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-[#E8C547] transition-colors cursor-pointer"
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
    </div>
  );
};
