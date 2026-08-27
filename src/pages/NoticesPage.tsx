import React, { useState, useMemo, useRef } from 'react';
import {
  Bell,
  ShieldAlert,
  Calendar,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pin,
  Flame,
  ArrowRight,
  Filter
} from 'lucide-react';
import { EstateNotice, AppUser, NoticeType } from '../types';
import { getStoredNotices } from '../lib/estate-data';
import { triggerSOSEvent } from '../lib/sos-service';

interface NoticesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ITEMS_PER_PAGE = 6;
const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const NoticesPage: React.FC<NoticesPageProps> = ({ currentUser, navigate }) => {
  const [notices] = useState<EstateNotice[]>(() => getStoredNotices());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'emergency' | 'event' | 'info'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sorting & Pinning logic:
  const sortedAndFilteredNotices = useMemo(() => {
    const isEmergency = (n: EstateNotice) =>
      n.type === 'emergency' ||
      n.category === 'emergency' ||
      n.priority === 'emergency' ||
      n.priority === 'urgent';

    let list = [...notices];

    if (selectedFilter !== 'all') {
      list = list.filter((n) => {
        const type = n.type || (isEmergency(n) ? 'emergency' : n.category === 'event' ? 'event' : 'info');
        return type === selectedFilter;
      });
    }

    return list.sort((a, b) => {
      const aEmerg = isEmergency(a);
      const bEmerg = isEmergency(b);

      if (aEmerg && !bEmerg) return -1;
      if (!aEmerg && bEmerg) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notices, selectedFilter]);

  // Pagination slice
  const totalPages = Math.ceil(sortedAndFilteredNotices.length / ITEMS_PER_PAGE) || 1;
  const paginatedNotices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredNotices.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAndFilteredNotices, currentPage]);

  const emergencyCount = notices.filter(
    (n) => n.type === 'emergency' || n.category === 'emergency' || n.priority === 'urgent' || n.priority === 'emergency'
  ).length;

  const eventCount = notices.filter((n) => n.type === 'event' || n.category === 'event').length;
  const infoCount = notices.filter(
    (n) => (n.type === 'info' || n.category === 'info' || (!n.type && n.category !== 'event' && n.category !== 'emergency'))
  ).length;

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
          <pattern id="lattice-notices" width="56" height="56" patternUnits="userSpaceOnUse">
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
              : 'Estate Bulletins'}
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
          <rect width="100%" height="100%" fill="url(#lattice-notices)" />
        </svg>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Sora'] font-bold text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                Notices &amp; Announcements
              </h1>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Official estate bulletins, security advisories, utility maintenance alerts, and community notices.
              </p>
            </div>
            {(currentUser?.role === 'admin' || currentUser?.role === 'master_admin') && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 rounded-xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all shrink-0 self-start sm:self-auto"
              >
                <Bell className="w-4 h-4" />
                <span>Admin Post</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => {
                setSelectedFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'all'
                  ? 'bg-[#257A54] text-white shadow-xs'
                  : 'bg-white border border-[#E3EFE7] text-[#516459] hover:text-[#16241D]'
              }`}
            >
              <span>All Bulletins</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {notices.length}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('emergency');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'emergency'
                  ? 'bg-[#A32D2D] text-white shadow-xs'
                  : 'bg-white border border-[#FCEBEB] text-[#A32D2D] hover:bg-[#FCEBEB]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Advisories</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {emergencyCount}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('event');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'event'
                  ? 'bg-[#B4922C] text-white shadow-xs'
                  : 'bg-white border border-[#E3EFE7] text-[#516459] hover:text-[#16241D]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Events</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {eventCount}
              </span>
            </button>

            <button
              onClick={() => {
                setSelectedFilter('info');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'info'
                  ? 'bg-[#257A54] text-white shadow-xs'
                  : 'bg-white border border-[#E3EFE7] text-[#516459] hover:text-[#16241D]'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>General Info</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                {infoCount}
              </span>
            </button>
          </div>

          {/* Notices List */}
          <div className="space-y-4">
            {paginatedNotices.length > 0 ? (
              paginatedNotices.map((n) => {
                const isEmerg = n.type === 'emergency' || n.category === 'emergency' || n.priority === 'urgent' || n.priority === 'emergency';
                const isEvent = n.type === 'event' || n.category === 'event';

                return (
                  <div
                    key={n.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      isEmerg
                        ? 'border-[#A32D2D]/30 bg-gradient-to-r from-[#FFF8F8] to-white'
                        : 'border-[#E3EFE7] hover:border-[#3FAE7A]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-['Sora'] font-bold uppercase tracking-wider ${
                          isEmerg
                            ? 'bg-[#FCEBEB] text-[#A32D2D]'
                            : isEvent
                            ? 'bg-[#FBF3D9] text-[#B4922C]'
                            : 'bg-[#EAF7EE] text-[#257A54]'
                        }`}>
                          {isEmerg ? 'Emergency Notice' : isEvent ? 'Community Event' : 'Estate Update'}
                        </span>
                        {isEmerg && (
                          <span className="px-2 py-0.5 rounded-full bg-[#A32D2D] text-white text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <Flame className="w-3 h-3" />
                            <span>Urgent</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-[#8AA096] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-['Sora'] font-bold text-base text-[#16241D] mb-1.5">
                      {n.title}
                    </h3>

                    <p className="text-xs text-[#516459] leading-relaxed mb-3">
                      {n.body || n.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#8AA096] pt-2 border-t border-[#E3EFE7]">
                      <span>Published by: <strong className="text-[#16241D]">{n.author_name || 'Light House Estate Management Exco'}</strong></span>
                      <span className="text-[#257A54] font-medium">{n.author_role || 'Estate Administration'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-[#E3EFE7] rounded-2xl py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="font-['Sora'] font-bold text-base text-[#16241D] mb-1">
                  No Announcements Yet
                </h3>
                <p className="text-xs text-[#8AA096] max-w-sm mx-auto leading-relaxed">
                  Official estate bulletins, security advisories, and community notices will appear here once published by estate administrators.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-xl border border-[#E3EFE7] bg-white flex items-center justify-center text-[#516459] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[#516459]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-xl border border-[#E3EFE7] bg-white flex items-center justify-center text-[#516459] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
          className="w-12 h-11 border-none bg-white/12 text-[#E8C547] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer"
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
