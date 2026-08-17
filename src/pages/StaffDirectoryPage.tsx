import React, { useState, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';
import { AppUser, StaffRole } from '../types';
import { 
  getAllActiveStaffForDirectory, 
  isStaffScheduledToday, 
  isStaffOnDutyNow 
} from '../lib/staff-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

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

export const StaffDirectoryPage: React.FC<StaffDirectoryPageProps> = ({ currentUser, navigate }) => {
  const [activeStaff, setActiveStaff] = useState<ReturnType<typeof getAllActiveStaffForDirectory>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'All' | StaffRole>('All');
  const [onlyOnDutyToday, setOnlyOnDutyToday] = useState(false);
  const [onlyOnDutyNow, setOnlyOnDutyNow] = useState(false);

  useEffect(() => {
    const list = getAllActiveStaffForDirectory();
    setActiveStaff(list);
  }, []);

  const filteredStaff = activeStaff.filter((staff) => {
    // 1. Role filter
    if (selectedRole !== 'All' && staff.role !== selectedRole) return false;

    // 2. On Duty Today filter
    if (onlyOnDutyToday && !isStaffScheduledToday(staff.schedule)) return false;

    // 3. On Duty Now filter
    if (onlyOnDutyNow && !isStaffOnDutyNow(staff.schedule)) return false;

    // 4. Search query filter
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

  // Calculate live count metrics
  const onDutyNowCount = activeStaff.filter((s) => isStaffOnDutyNow(s.schedule)).length;
  const onDutyTodayCount = activeStaff.filter((s) => isStaffScheduledToday(s.schedule)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-[#0A2F1C] text-white rounded-3xl p-6 sm:p-10 border border-[#C89B3C]/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 text-[#C89B3C] pointer-events-none">
          <svg width="220" height="220" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#E7D19C]/20 text-[#E7D19C] border border-[#C89B3C]/40">
                Security & Gatehouse Clearance
              </span>
              <span className="text-[11px] text-[#E7D19C]/80 font-medium">
                Verified Active Domestic Personnel
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#FBF8F1] tracking-tight">
              Estate Staff Directory
            </h1>
            <p className="text-sm text-[#E7D19C]/80 mt-2 max-w-2xl leading-relaxed">
              Real-time gate and neighborhood verification for domestic employees across all Lighthouse Estate residences.
            </p>
          </div>

          {currentUser?.role === 'resident' && (
            <button
              onClick={() => navigate('/household')}
              className="px-5 py-3 rounded-2xl bg-[#C89B3C] hover:bg-[#b58b34] text-[#0A2F1C] font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <UserCheck className="w-4 h-4 text-[#0A2F1C]" />
              <span>My Household Hub</span>
            </button>
          )}
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-[#C89B3C]/20">
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-[#E7D19C]/80 font-medium">Total Active Staff</div>
            <div className="text-2xl font-serif font-bold text-[#FBF8F1] mt-0.5">
              {activeStaff.length}
            </div>
          </div>
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl">
            <div className="text-[11px] text-emerald-300 font-medium">On Duty Right Now</div>
            <div className="text-2xl font-serif font-bold text-emerald-300 mt-0.5 flex items-center gap-2">
              <span>{onDutyNowCount}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
          <div className="bg-[#0F472A]/80 border border-[#C89B3C]/30 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-[11px] text-[#E7D19C]/80 font-medium">Scheduled Today</div>
            <div className="text-2xl font-serif font-bold text-[#E7D19C] mt-0.5">
              {onDutyTodayCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-[#E4D9BE] p-5 sm:p-6 shadow-soft space-y-4">
        {/* Search & Quick Toggles */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10241A]/40" />
            <input
              type="text"
              placeholder="Search by staff name, employer name, house number, role, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#FAF7EE] border border-[#E4D9BE] focus:outline-none focus:ring-2 focus:ring-[#0F472A]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyOnDutyNow(!onlyOnDutyNow)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                onlyOnDutyNow
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-[#FAF7EE] text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyOnDutyNow ? 'bg-white' : 'bg-emerald-600'}`} />
              <span>On Duty Now Only</span>
            </button>

            <button
              onClick={() => setOnlyOnDutyToday(!onlyOnDutyToday)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                onlyOnDutyToday
                  ? 'bg-[#0F472A] text-white shadow-2xs'
                  : 'bg-[#FAF7EE] text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today's Shift</span>
            </button>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === role
                  ? 'bg-[#0F472A] text-white shadow-2xs'
                  : 'bg-[#FAF7EE] text-[#10241A]/70 hover:bg-[#F2EAD9] border border-[#E4D9BE]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-[#E4D9BE] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7EE] text-[#0F472A] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#0A2F1C]">
              No active staff matching criteria
            </h3>
            <p className="text-xs text-[#10241A]/60 max-w-sm mx-auto">
              Try adjusting your search terms or filters above.
            </p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const scheduledToday = isStaffScheduledToday(staff.schedule);
            const onDutyNow = isStaffOnDutyNow(staff.schedule);

            return (
              <div
                key={staff.id}
                className="bg-white rounded-3xl border border-[#E4D9BE] p-6 shadow-soft hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                        alt={staff.full_name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover border border-[#E4D9BE] shadow-2xs"
                      />
                      {onDutyNow && (
                        <span
                          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse"
                          title="Currently On Duty"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-serif font-bold text-base text-[#0A2F1C] truncate">
                          {staff.full_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F2EAD9] text-[#0F472A] border border-[#E4D9BE]">
                          {staff.role}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active Pass
                        </span>
                      </div>

                      <div className="text-xs text-[#10241A]/70 mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#C89B3C]" />
                        <span>{staff.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employer & Unit Details */}
                  <div className="mt-4 p-3 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE]/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#10241A]/60">Resident Employer:</span>
                      <span className="font-bold text-[#0A2F1C]">
                        {staff.employer_name || 'Dr. Tariq Al-Mansoor'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#10241A]/60">Assigned Location:</span>
                      <span className="font-medium text-[#10241A] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C89B3C]" />
                        <span>{staff.work_location}</span>
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="mt-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#10241A]/60 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C89B3C]" />
                        <span>Shift Hours:</span>
                      </span>
                      <span className="font-bold text-[#0A2F1C]">
                        {staff.schedule.startTime} – {staff.schedule.endTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#10241A]/60">Duty Days:</span>
                      <span className="text-[#10241A] font-medium text-[11px]">
                        {staff.schedule.days.map((d) => d.slice(0, 3)).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duty Status Footer Badge */}
                <div className="pt-3 border-t border-[#E4D9BE] flex items-center justify-between text-xs">
                  {onDutyNow ? (
                    <span className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>On Duty Right Now</span>
                    </span>
                  ) : scheduledToday ? (
                    <span className="flex items-center gap-1.5 text-[#0F472A] font-semibold text-[11px] bg-[#FAF7EE] px-2.5 py-1 rounded-full border border-[#E4D9BE]">
                      <Calendar className="w-3 h-3 text-[#C89B3C]" />
                      <span>Scheduled for Today</span>
                    </span>
                  ) : (
                    <span className="text-[#10241A]/50 text-[11px]">
                      Off duty today
                    </span>
                  )}

                  <div className="text-[10px] text-[#10241A]/40 font-mono">
                    ID: {staff.id.slice(-6)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
