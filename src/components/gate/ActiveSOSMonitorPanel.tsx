import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Radio, 
  Check, 
  X,
  History,
  ShieldCheck
} from 'lucide-react';
import { SOSEvent, AppUser } from '../../types';
import { 
  subscribeToSOSEvents, 
  acknowledgeSOSEvent, 
  clearSOSEvent, 
  playSOSAlertSiren 
} from '../../lib/sos-service';

interface ActiveSOSMonitorPanelProps {
  currentUser: AppUser | null;
}

export const ActiveSOSMonitorPanel: React.FC<ActiveSOSMonitorPanelProps> = ({ currentUser }) => {
  const [allEvents, setAllEvents] = useState<SOSEvent[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedEventToClear, setSelectedEventToClear] = useState<SOSEvent | null>(null);
  const [resolutionNote, setResolutionNote] = useState('Situation verified and all clear.');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const guardDisplayName = currentUser?.full_name || 'Officer On Duty (Gate 1)';

  // Subscribe to real-time SOS events from Supabase / Event bus
  useEffect(() => {
    const unsubscribe = subscribeToSOSEvents((events) => {
      setAllEvents(events);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter active (unresolved) SOS events: triggered or acknowledged
  const activeEvents = allEvents.filter(
    (ev) => ev.status === 'triggered' || ev.status === 'acknowledged'
  );

  // Play audio alert when a new unacknowledged SOS is detected
  useEffect(() => {
    const unacknowledgedCount = activeEvents.filter((e) => e.status === 'triggered').length;
    if (unacknowledgedCount > 0 && soundEnabled) {
      playSOSAlertSiren();
      const interval = setInterval(() => {
        if (soundEnabled && activeEvents.some((e) => e.status === 'triggered')) {
          playSOSAlertSiren();
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeEvents, soundEnabled]);

  // Handle Acknowledge Action (Distinct Action 1: sets acknowledged_by, but stays on screen)
  const handleAcknowledge = async (sosId: string) => {
    setIsProcessing(true);
    try {
      await acknowledgeSOSEvent(sosId, guardDisplayName);
    } catch (err) {
      console.error('Failed to acknowledge SOS:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Clear Action (Distinct Action 2: sets cleared_at, cleared_by, resolution notes)
  const handleConfirmClear = async () => {
    if (!selectedEventToClear) return;
    setIsProcessing(true);
    try {
      await clearSOSEvent(selectedEventToClear.id, guardDisplayName, resolutionNote);
      setSelectedEventToClear(null);
    } catch (err) {
      console.error('Failed to clear SOS:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // If no active events, show a clean, high-visibility "All Clear" status bar
  if (activeEvents.length === 0) {
    return (
      <>
        <div className="bg-[#0A2F1C] border-b-2 border-emerald-500/50 px-4 py-2.5 sm:px-6 shadow-md flex items-center justify-between font-sans">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ESTATE SOS MONITOR: ALL CLEAR</span>
            </div>
            <span className="hidden sm:inline-block text-[11px] text-[#E7D19C]/70">
              | 0 Active Distress Signals
            </span>
          </div>

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="text-[11px] text-[#E7D19C] hover:text-white font-medium flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            <History className="w-3 h-3 text-[#C89B3C]" />
            <span>SOS History Log</span>
          </button>
        </div>

        {/* History Drawer Modal */}
        {showHistoryDrawer && (
          <SOSHistoryDrawer
            events={allEvents}
            onClose={() => setShowHistoryDrawer(false)}
          />
        )}
      </>
    );
  }

  // Active SOS Emergency Alert Banner (Permanent, Unmissable at the top of Gate Hub)
  return (
    <>
      <div className="bg-red-950 border-b-4 border-red-600 shadow-2xl p-4 sm:p-6 font-sans text-white relative overflow-hidden animate-fade-in">
        {/* Pulsing Alert Top Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-red-800/80 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-red-200">
                🚨 EMERGENCY DISTRESS SIGNAL DETECTED ({activeEvents.length} ACTIVE)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-semibold flex items-center gap-1.5 border border-red-700 transition-colors"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-red-300 animate-pulse" />
                  <span>Siren On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white/60" />
                  <span>Siren Muted</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-semibold flex items-center gap-1 border border-red-700 text-[#E7D19C] transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        {/* List of active distress signals */}
        <div className="space-y-4">
          {activeEvents.map((event) => {
            const isAcknowledged = event.status === 'acknowledged';
            const elapsedSeconds = Math.floor(
              (Date.now() - new Date(event.triggered_at).getTime()) / 1000
            );

            return (
              <div
                key={event.id}
                className={`rounded-2xl p-4 sm:p-5 border-2 transition-all ${
                  isAcknowledged
                    ? 'bg-amber-950/80 border-amber-500 text-amber-50'
                    : 'bg-red-900/90 border-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-500/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Big clear house location display */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                          isAcknowledged
                            ? 'bg-amber-500 text-black'
                            : 'bg-red-600 text-white animate-bounce'
                        }`}
                      >
                        {isAcknowledged ? '⏳ ACKNOWLEDGED / IN PROGRESS' : '🚨 IMMEDIATE RESPONSE REQUIRED'}
                      </span>
                      <span className="text-xs text-white/80 font-mono">
                        Triggered {elapsedSeconds < 60 ? `${elapsedSeconds}s ago` : `${Math.floor(elapsedSeconds / 60)}m ago`} ({new Date(event.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                      </span>
                    </div>

                    {/* Giant Unmissable House Unit */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white flex items-center gap-2">
                        <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-[#C89B3C] shrink-0" />
                        <span>HOUSE {event.house_number}</span>
                        <span className="text-base sm:text-2xl font-sans font-normal text-white/80">
                          — {event.house_unit}
                        </span>
                      </div>
                    </div>

                    {/* Resident Info & Call button */}
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-white/90 pt-1 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold">
                        <User className="w-4 h-4 text-[#C89B3C]" />
                        <span>{event.resident_name}</span>
                      </span>

                      {event.resident_phone && (
                        <a
                          href={`tel:${event.resident_phone}`}
                          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-xl font-bold transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{event.resident_phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Acknowledgment metadata if acknowledged */}
                    {isAcknowledged && (
                      <div className="text-xs text-amber-200 bg-black/40 p-2 rounded-xl mt-2 flex items-center justify-between flex-wrap gap-2">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            Acknowledged by: <strong>{event.acknowledged_by}</strong>
                          </span>
                        </span>
                        {event.acknowledged_at && (
                          <span className="text-[11px] opacity-80">
                            At {new Date(event.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Two Distinct Actions: 1. Acknowledge | 2. Clear & Resolve */}
                  <div className="flex flex-row lg:flex-col items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                    {!isAcknowledged ? (
                      <button
                        onClick={() => handleAcknowledge(event.id)}
                        disabled={isProcessing}
                        className="flex-1 lg:flex-none w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-black stroke-[3]" />
                        <span>Acknowledge Alert</span>
                      </button>
                    ) : (
                      <div className="w-full text-center px-4 py-2 rounded-xl bg-emerald-900/60 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Patrol Dispatched</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedEventToClear(event);
                        setResolutionNote('Situation verified and cleared by gate security team.');
                      }}
                      disabled={isProcessing}
                      className="flex-1 lg:flex-none w-full px-5 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm uppercase tracking-wider border border-white/40 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Clear & Resolve</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear & Resolution Notes Modal */}
      {selectedEventToClear && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans text-[#10241A]">
          <div 
            className="bg-white rounded-3xl max-w-md w-full border border-[#E4D9BE] shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0A2F1C]">
                    Resolve Emergency Alarm
                  </h3>
                  <p className="text-xs text-[#10241A]/60">
                    House {selectedEventToClear.house_number} ({selectedEventToClear.house_unit})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEventToClear(null)}
                className="p-1.5 rounded-lg text-[#10241A]/50 hover:bg-[#FAF7EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A2F1C]">
                Select Resolution Outcome / Notes:
              </label>

              {/* Quick resolution presets */}
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Situation verified and all clear. False trigger confirmed by resident.',
                  'Security patrol arrived on site. Situation contained and resolved.',
                  'Medical assistance provided by first responders. Resident safe.',
                  'Accidental trigger during device setup. All residents safe.',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResolutionNote(preset)}
                    className={`text-left text-xs p-2.5 rounded-xl border transition-all ${
                      resolutionNote === preset
                        ? 'bg-[#0F472A] text-white border-[#0F472A] font-semibold'
                        : 'bg-[#FAF7EE] text-[#10241A]/80 border-[#E4D9BE] hover:bg-[#F2EAD9]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter custom incident resolution notes..."
                className="w-full mt-2 p-3 text-xs rounded-xl bg-[#FAF7EE] border border-[#E4D9BE] focus:outline-none focus:ring-2 focus:ring-[#0F472A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4D9BE]">
              <button
                type="button"
                onClick={() => setSelectedEventToClear(null)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF7EE] text-xs font-semibold text-[#10241A]/70 hover:bg-[#F2EAD9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Clear Alarm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistoryDrawer && (
        <SOSHistoryDrawer
          events={allEvents}
          onClose={() => setShowHistoryDrawer(false)}
        />
      )}
    </>
  );
};

interface SOSHistoryDrawerProps {
  events: SOSEvent[];
  onClose: () => void;
}

const SOSHistoryDrawer: React.FC<SOSHistoryDrawerProps> = ({ events, onClose }) => {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans text-[#10241A]">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border border-[#E4D9BE] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0A2F1C] text-white p-5 border-b border-[#C89B3C]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#C89B3C]" />
            <div>
              <h3 className="font-serif font-bold text-base text-[#FBF8F1]">
                Estate Distress Signal Audit Log
              </h3>
              <p className="text-xs text-[#E7D19C]/70">
                All triggered, acknowledged, and cleared SOS events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#E7D19C]/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {events.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#10241A]/50">
              No emergency signals recorded in database.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl bg-[#FAF7EE] border border-[#E4D9BE] text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0A2F1C] text-sm">
                    House {ev.house_number} ({ev.house_unit})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ev.status === 'triggered'
                        ? 'bg-red-600 text-white'
                        : ev.status === 'acknowledged'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                <div className="text-[#10241A]/70 text-[11px] grid grid-cols-2 gap-1">
                  <div>
                    <strong>Resident:</strong> {ev.resident_name}
                  </div>
                  <div>
                    <strong>Triggered:</strong>{' '}
                    {new Date(ev.triggered_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {ev.acknowledged_by && (
                    <div className="col-span-2 text-amber-900">
                      <strong>Acknowledged by:</strong> {ev.acknowledged_by}
                    </div>
                  )}
                  {ev.resolution_notes && (
                    <div className="col-span-2 text-emerald-900 bg-emerald-50 p-2 rounded-xl border border-emerald-200 mt-1">
                      <strong>Resolution:</strong> {ev.resolution_notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#FAF7EE] border-t border-[#E4D9BE] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-xs"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
