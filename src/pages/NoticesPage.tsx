import React, { useState, useMemo } from 'react';
import {
  Bell,
  ShieldAlert,
  Calendar,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Pin,
  Flame,
  ArrowRight,
  Filter
} from 'lucide-react';
import { EstateNotice, AppUser, NoticeType } from '../types';
import { getStoredNotices } from '../lib/estate-data';

interface NoticesPageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const ITEMS_PER_PAGE = 6;

export const NoticesPage: React.FC<NoticesPageProps> = ({ currentUser, navigate }) => {
  const [notices] = useState<EstateNotice[]>(() => getStoredNotices());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'emergency' | 'event' | 'info'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting & Pinning logic:
  // 1. Emergency notices (type === 'emergency' or priority === 'emergency' or priority === 'urgent') are pinned to the top regardless of date.
  // 2. Non-emergency notices follow in reverse-chronological order (newest first).
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

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D9BE] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0F472A] text-[#E7D19C] text-[11px] font-bold uppercase tracking-wider">
                Official Gazette
              </span>
              <span className="text-xs text-[#10241A]/70 font-semibold">
                Lighthouse Estate Board
              </span>
            </div>
            <h1 className="fraunces text-3xl sm:text-4xl font-bold text-[#0A2F1C]">
              Community Notices & Alerts
            </h1>
            <p className="text-xs sm:text-sm text-[#10241A]/70 mt-1 max-w-xl">
              Official bulletins, utility updates, seasonal religious events, and emergency estate advisories.
            </p>
          </div>

          {(currentUser?.role === 'admin' ||
            currentUser?.role === 'master_admin' ||
            currentUser?.role === 'madrasa_admin') && (
            <button
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white text-xs font-bold hover:bg-[#0A2F1C] transition-all shadow-soft flex items-center gap-2 shrink-0"
            >
              <Bell className="w-4 h-4 text-[#E7D19C]" />
              <span>Post / Manage Notices</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            onClick={() => {
              setSelectedFilter('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedFilter === 'all'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'bg-white border border-[#E4D9BE] text-[#10241A]/70 hover:bg-[#F2EAD9]'
            }`}
          >
            <span>All Bulletins</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedFilter === 'all' ? 'bg-[#C89B3C] text-white' : 'bg-[#F2EAD9] text-[#0A2F1C]'
              }`}
            >
              {notices.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSelectedFilter('emergency');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedFilter === 'emergency'
                ? 'bg-red-800 text-white shadow-xs'
                : 'bg-white border border-red-200 text-red-800 hover:bg-red-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Advisories</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedFilter === 'emergency' ? 'bg-white text-red-900' : 'bg-red-100 text-red-800'
              }`}
            >
              {emergencyCount}
            </span>
          </button>

          <button
            onClick={() => {
              setSelectedFilter('event');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedFilter === 'event'
                ? 'bg-[#C89B3C] text-white shadow-xs'
                : 'bg-white border border-[#E4D9BE] text-[#10241A]/70 hover:bg-[#F2EAD9]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Community Events</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedFilter === 'event' ? 'bg-white text-[#0A2F1C]' : 'bg-[#F2EAD9] text-[#0A2F1C]'
              }`}
            >
              {eventCount}
            </span>
          </button>

          <button
            onClick={() => {
              setSelectedFilter('info');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedFilter === 'info'
                ? 'bg-[#0F472A] text-white shadow-xs'
                : 'bg-white border border-[#E4D9BE] text-[#10241A]/70 hover:bg-[#F2EAD9]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>General Info</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedFilter === 'info' ? 'bg-[#C89B3C] text-white' : 'bg-[#F2EAD9] text-[#0A2F1C]'
              }`}
            >
              {infoCount}
            </span>
          </button>
        </div>

        {/* Notices Stream (Reverse Chronological, Emergency Pinned to Top) */}
        <div className="space-y-6">
          {paginatedNotices.length === 0 ? (
            <div className="card-estate p-12 text-center bg-white border-[#E4D9BE] shadow-soft space-y-3">
              <Bell className="w-12 h-12 text-[#C89B3C] mx-auto opacity-50" />
              <h3 className="fraunces text-xl font-bold text-[#0A2F1C]">
                No Notices in this Category
              </h3>
              <p className="text-xs text-[#10241A]/70">
                Check other categories or reset the filter to view all gazettes.
              </p>
            </div>
          ) : (
            paginatedNotices.map((notice) => {
              const isEmergency =
                notice.type === 'emergency' ||
                notice.category === 'emergency' ||
                notice.priority === 'emergency' ||
                notice.priority === 'urgent';

              const isEvent = notice.type === 'event' || notice.category === 'event';

              return (
                <div
                  key={notice.id}
                  className={`bg-white rounded-[16px] p-6 sm:p-7 space-y-4 shadow-soft transition-all ${
                    isEmergency
                      ? 'border-2 border-red-500 bg-rose-50/20 ring-1 ring-red-400'
                      : isEvent
                      ? 'border-2 border-[#C89B3C]/70'
                      : 'border border-[#E4D9BE]'
                  }`}
                >
                  {/* Top Badge & Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4D9BE]/60 pb-3">
                    <div className="flex items-center gap-2">
                      {isEmergency ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-red-600 text-white shadow-xs animate-pulse">
                          <Flame className="w-3.5 h-3.5" />
                          <span>EMERGENCY ADVISORY • PINNED</span>
                        </span>
                      ) : isEvent ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Calendar className="w-3.5 h-3.5 text-[#C89B3C]" />
                          <span>COMMUNITY EVENT</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Info className="w-3.5 h-3.5 text-[#0F472A]" />
                          <span>GENERAL INFORMATION</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#10241A]/60 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#C89B3C]" />
                      <span>
                        {new Date(notice.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(notice.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Title & Body with Line Breaks Preserved */}
                  <div>
                    <h2
                      className={`fraunces text-xl sm:text-2xl font-bold ${
                        isEmergency ? 'text-red-950' : 'text-[#0A2F1C]'
                      }`}
                    >
                      {notice.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#10241A]/85 mt-2.5 whitespace-pre-wrap leading-relaxed">
                      {notice.body || notice.content}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3 border-t border-[#E4D9BE]/60 flex flex-wrap items-center justify-between text-xs text-[#10241A]/60 gap-2">
                    <span>
                      Issued by: <strong>{notice.author_name}</strong> ({notice.author_role.replace('_', ' ')})
                    </span>
                    <span className="font-mono text-[11px] text-[#0F472A]">
                      Ref: LH-GAZ-{notice.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E4D9BE] pt-4">
            <span className="text-xs text-[#10241A]/70">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredNotices.length)} of{' '}
              {sortedAndFilteredNotices.length} notices
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[#0A2F1C]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-2 rounded-lg border border-[#E4D9BE] bg-white disabled:opacity-40 hover:bg-[#F2EAD9]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
