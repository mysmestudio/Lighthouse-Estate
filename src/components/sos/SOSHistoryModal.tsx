import React from 'react';
import { X, ShieldAlert, CheckCircle2, Clock, MapPin, User, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SOSEvent, AppUser } from '../../types';

interface SOSHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SOSEvent[];
  currentUser: AppUser | null;
}

export const SOSHistoryModal: React.FC<SOSHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  currentUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-[#E4D9BE] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0A2F1C] text-white p-5 sm:p-6 border-b border-[#C89B3C]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#FBF8F1]">
                Emergency SOS History
              </h3>
              <p className="text-xs text-[#E7D19C]/80">
                Log of security alerts & false alarm resolutions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#E7D19C]/70 hover:text-[#FBF8F1] hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF7EE] text-[#0F472A] flex items-center justify-center mx-auto border border-[#E4D9BE]">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-[#0A2F1C]">No SOS Alerts on Record</h4>
              <p className="text-xs text-[#10241A]/60 max-w-xs mx-auto">
                You have not triggered any emergency alarms. The 2-second press-and-hold button remains on screen if you ever need urgent security assistance.
              </p>
            </div>
          ) : (
            history.map((ev) => {
              const dateStr = new Date(ev.triggered_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isTriggered = ev.status === 'triggered';
              const isAcknowledged = ev.status === 'acknowledged';
              const isCleared = ev.status === 'cleared';

              return (
                <div
                  key={ev.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isTriggered
                      ? 'bg-red-50/80 border-red-300 ring-2 ring-red-400'
                      : isAcknowledged
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-[#FAF7EE] border-[#E4D9BE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isTriggered
                            ? 'bg-red-600 text-white animate-pulse'
                            : isAcknowledged
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {isTriggered
                          ? '🚨 Active Alert'
                          : isAcknowledged
                          ? '⏳ Security Responding'
                          : '✓ Cleared & Resolved'}
                      </span>
                      <span className="text-[11px] text-[#10241A]/60 font-medium">
                        {dateStr}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#10241A]/40">
                      ID: {ev.id.slice(-6)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#10241A]/80">
                      <MapPin className="w-3.5 h-3.5 text-[#C89B3C] shrink-0" />
                      <span>
                        House {ev.house_number} ({ev.house_unit})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#10241A]/80">
                      <User className="w-3.5 h-3.5 text-[#C89B3C] shrink-0" />
                      <span className="truncate">{ev.resident_name}</span>
                    </div>
                  </div>

                  {/* Acknowledged status details */}
                  {ev.acknowledged_by && (
                    <div className="text-xs bg-white/70 p-2.5 rounded-xl border border-[#E4D9BE]/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#0A2F1C]">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Acknowledged by:</span>
                        </span>
                        <span className="font-bold">{ev.acknowledged_by}</span>
                      </div>
                      {ev.acknowledged_at && (
                        <div className="text-[10px] text-[#10241A]/50 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(ev.acknowledged_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {ev.resolution_notes && (
                    <div className="text-xs bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-[#0F472A]">
                      <div className="font-bold text-[11px] mb-0.5">Resolution Notes:</div>
                      <div className="text-[11px] leading-relaxed">{ev.resolution_notes}</div>
                      {ev.cleared_by && (
                        <div className="text-[10px] text-emerald-800/70 mt-1">
                          Cleared by {ev.cleared_by}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF7EE] border-t border-[#E4D9BE] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-sm transition-all"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
