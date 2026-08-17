import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Phone, 
  History, 
  X, 
  MapPin, 
  Radio, 
  BellRing,
  HelpCircle
} from 'lucide-react';
import { AppUser, SOSEvent } from '../../types';
import { 
  triggerSOSEvent, 
  getResidentSOSHistory, 
  subscribeToSOSEvents 
} from '../../lib/sos-service';
import { SOSHistoryModal } from './SOSHistoryModal';

interface PersistentSOSButtonProps {
  currentUser: AppUser | null;
  navigate?: (path: string) => void;
}

const HOLD_DURATION_MS = 2000; // 2 seconds press-and-hold requirement

export const PersistentSOSButton: React.FC<PersistentSOSButtonProps> = ({ currentUser, navigate }) => {
  // Only show for authenticated users
  if (!currentUser) return null;

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sosHistory, setSosHistory] = useState<SOSEvent[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Load history and subscribe to real-time status updates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToSOSEvents((allEvents) => {
      const myHistory = allEvents
        .filter((e) => e.resident_id === currentUser.id)
        .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());

      setSosHistory(myHistory);

      // Check if there is an ongoing un-cleared SOS for this resident
      const ongoing = myHistory.find((e) => e.status === 'triggered' || e.status === 'acknowledged');
      if (ongoing) {
        setActiveSOS(ongoing);
      } else {
        setActiveSOS(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Clean up any running timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleStartHold = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent context menu on long press
    if ('touches' in e && e.cancelable) {
      // allow default for touch events if needed, or prevent default zoom
    }

    if (isTriggering) return;

    // Haptic feedback
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (err) {
        // ignore
      }
    }

    setIsHolding(true);
    setHoldProgress(0);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);

      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        // 2 seconds completed -> Trigger SOS!
        handleTriggerSOS();
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleCancelHold = () => {
    if (!isHolding) return;
    setIsHolding(false);
    setHoldProgress(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleTriggerSOS = async () => {
    if (!currentUser) return;
    setIsHolding(false);
    setHoldProgress(0);
    setIsTriggering(true);

    // Haptic confirmation
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 200]);
      } catch (err) {
        // ignore
      }
    }

    try {
      const event = await triggerSOSEvent(currentUser);
      setActiveSOS(event);
      setShowConfirmationModal(true);
    } catch (err) {
      console.error('Failed to trigger emergency SOS:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  // SVG circular progress calculation
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  return (
    <>
      {/* Persistent Floating SOS Button Container */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Active Emergency Ongoing Banner (If triggered & not cleared) */}
        {activeSOS && (
          <div 
            onClick={() => setShowConfirmationModal(true)}
            className="cursor-pointer bg-red-600 text-white px-3.5 py-2 rounded-2xl shadow-xl border-2 border-white/80 flex items-center gap-2 animate-bounce hover:bg-red-700 transition-all text-xs font-bold"
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>
              {activeSOS.status === 'acknowledged' 
                ? 'Security Dispatched' 
                : 'SOS Active — Security Alerted'}
            </span>
          </div>
        )}

        {/* Floating Button with Hold Progress Ring */}
        <div className="relative flex items-center justify-center">
          {/* Circular Progress SVG Ring during Hold */}
          <svg className="absolute -inset-2 w-[76px] h-[76px] -rotate-90 pointer-events-none z-10">
            {/* Background track */}
            {isHolding && (
              <circle
                cx="38"
                cy="38"
                r={radius}
                className="text-red-950/40"
                strokeWidth="4.5"
                stroke="currentColor"
                fill="transparent"
              />
            )}
            {/* Animated filling stroke */}
            {isHolding && (
              <circle
                cx="38"
                cy="38"
                r={radius}
                className="text-white"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 50ms linear',
                }}
              />
            )}
          </svg>

          {/* Main SOS Trigger Button */}
          <button
            onMouseDown={handleStartHold}
            onMouseUp={handleCancelHold}
            onMouseLeave={handleCancelHold}
            onTouchStart={handleStartHold}
            onTouchEnd={handleCancelHold}
            onTouchCancel={handleCancelHold}
            onContextMenu={(e) => e.preventDefault()}
            title="Press and hold 2 seconds to alert Security"
            className={`relative w-15 h-15 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all active:scale-95 cursor-pointer ${
              activeSOS
                ? 'bg-red-700 ring-4 ring-red-400 ring-offset-2 animate-pulse shadow-red-600/60'
                : isHolding
                ? 'bg-red-700 scale-105 ring-4 ring-white/90 shadow-red-600/80'
                : 'bg-red-600 hover:bg-red-700 ring-2 ring-red-400/80 hover:ring-red-300 shadow-red-600/50 hover:shadow-red-600/70'
            }`}
          >
            <ShieldAlert className={`w-6 h-6 transition-transform ${isHolding ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 leading-none">
              SOS
            </span>
          </button>
        </div>

        {/* Instructional micro-badge */}
        <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-full text-[10px] font-medium shadow-md border border-white/15">
          {isHolding ? (
            <span className="text-amber-300 font-bold animate-pulse">
              Hold {Math.max(0, (HOLD_DURATION_MS - (holdProgress / 100) * HOLD_DURATION_MS) / 1000).toFixed(1)}s...
            </span>
          ) : (
            <>
              <span>Hold 2s for SOS</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistoryModal(true);
                }}
                className="text-[#E7D19C] hover:underline font-bold ml-1 flex items-center gap-0.5"
                title="View past SOS events"
              >
                <History className="w-2.5 h-2.5" />
                <span>Logs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Immediate On-Screen Confirmation Modal */}
      {showConfirmationModal && activeSOS && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div 
            className="bg-white rounded-3xl max-w-md w-full border-2 border-red-500 shadow-2xl overflow-hidden text-[#10241A] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Flashing Top Banner */}
            <div className="bg-red-600 text-white p-6 text-center space-y-2 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-15 translate-x-4 -translate-y-4">
                <ShieldAlert className="w-32 h-32" />
              </div>

              <div className="w-14 h-14 rounded-full bg-white text-red-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <BellRing className="w-7 h-7" />
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight leading-tight">
                Help is on the way!
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-red-100 uppercase tracking-wider">
                Security Gatehouse has been alerted
              </p>
            </div>

            {/* Alert Details Body */}
            <div className="p-6 space-y-5">
              <div className="bg-[#FAF7EE] border border-[#E4D9BE] rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                  <span className="text-[#10241A]/60 font-medium">Alert Location:</span>
                  <span className="font-bold text-[#0A2F1C] text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>House {activeSOS.house_number} ({activeSOS.house_unit})</span>
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                  <span className="text-[#10241A]/60 font-medium">Triggered By:</span>
                  <span className="font-bold text-[#0A2F1C]">{activeSOS.resident_name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-[#E4D9BE] pb-2">
                  <span className="text-[#10241A]/60 font-medium">Triggered At:</span>
                  <span className="font-mono text-[#0A2F1C]">
                    {new Date(activeSOS.triggered_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#10241A]/60 font-medium">Live Status:</span>
                  {activeSOS.status === 'acknowledged' ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acknowledged by Security</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold flex items-center gap-1 animate-pulse">
                      <Radio className="w-3 h-3 text-red-600" />
                      <span>Broadcasting to Gate 1...</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Security Guard Response Card */}
              {activeSOS.acknowledged_by ? (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-xs space-y-1.5">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Response Team Dispatched</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    <strong>{activeSOS.acknowledged_by}</strong> has acknowledged your alarm and dispatched the nearest patrol officer to House {activeSOS.house_number}.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>All Admins & Gate Officers Notified</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    An emergency alert email has been dispatched via Edge Function to all active estate administrators. Stay inside if safe to do so.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="w-full py-3 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Understand — Keep Alarm Active</span>
                </button>

                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setShowHistoryModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FAF7EE] hover:bg-[#F2EAD9] text-[#10241A]/70 font-semibold text-xs border border-[#E4D9BE] transition-all flex items-center justify-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>View SOS Logs & False Alarm Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      <SOSHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={sosHistory}
        currentUser={currentUser}
      />
    </>
  );
};
