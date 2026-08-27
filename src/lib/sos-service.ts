import { AppUser, SOSEvent, SOSStatus } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getStoredAppUsers } from './auth-helpers';

const SOS_STORAGE_KEY = 'lighthouse_sos_events_v2';
const SOS_EVENT_CHANNEL = 'lighthouse_sos_events_updated';

export const INITIAL_SOS_EVENTS: SOSEvent[] = [];

/**
 * Retrieves all stored SOS events from localStorage with fallback
 */
export function getStoredSOSEvents(): SOSEvent[] {
  try {
    const raw = localStorage.getItem(SOS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(INITIAL_SOS_EVENTS));
      return INITIAL_SOS_EVENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading SOS events from storage:', err);
    return INITIAL_SOS_EVENTS;
  }
}

/**
 * Saves SOS events to localStorage and broadcasts update event
 */
export function setStoredSOSEvents(events: SOSEvent[]): void {
  try {
    localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(events));
    // Broadcast for multi-tab and reactive local synchronization
    window.dispatchEvent(new CustomEvent(SOS_EVENT_CHANNEL, { detail: events }));
  } catch (err) {
    console.error('Error saving SOS events to storage:', err);
  }
}

/**
 * Simulated Edge Function that dispatches urgent alert emails to all active administrators
 */
export async function dispatchAdminSOSEmailNotification(event: SOSEvent): Promise<string[]> {
  try {
    const allUsers = getStoredAppUsers();
    const activeAdmins = allUsers.filter(
      (u) =>
        (u.role === 'admin' || u.role === 'master_admin' || u.role === 'madrasa_admin') &&
        u.status === 'active'
    );

    const adminEmails = activeAdmins.map((a) => a.email).filter(Boolean);
    if (adminEmails.length === 0) {
      adminEmails.push('admin@lighthouse.estate', 'headofsecurity@lighthouse.estate');
    }

    console.info(`[EDGE FUNCTION: send-sos-admin-alert] 🚨 Emergency notification dispatched to ${adminEmails.join(', ')} for House ${event.house_number} (${event.house_unit}) at ${event.triggered_at}`);

    // If Supabase edge function exists:
    if (isSupabaseConfigured) {
      try {
        await supabase.functions.invoke('send-sos-admin-alert', {
          body: {
            sos_id: event.id,
            resident_id: event.resident_id,
            resident_name: event.resident_name,
            resident_phone: event.resident_phone,
            house_number: event.house_number,
            house_unit: event.house_unit,
            triggered_at: event.triggered_at,
            admin_emails: adminEmails,
          },
        });
      } catch (invokeErr) {
        console.warn('Supabase edge function invoke fallback:', invokeErr);
      }
    }

    return adminEmails;
  } catch (error) {
    console.error('Failed to dispatch SOS admin email notification:', error);
    return ['admin@lighthouse.estate'];
  }
}

/**
 * Trigger an Emergency SOS event from resident UI
 */
export async function triggerSOSEvent(resident: AppUser): Promise<SOSEvent> {
  const newId = `sos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const triggeredAt = new Date().toISOString();

  // Create event object
  const newSOSEvent: SOSEvent = {
    id: newId,
    resident_id: resident.id,
    resident_name: resident.full_name,
    resident_phone: resident.phone || '',
    house_number: resident.house_number || 14,
    house_unit: resident.house_unit || 'Main House',
    triggered_at: triggeredAt,
    status: 'triggered',
    edge_function_dispatched: true,
  };

  // Dispatch email notification to admins in background
  const notifiedEmails = await dispatchAdminSOSEmailNotification(newSOSEvent);
  newSOSEvent.notified_admin_emails = notifiedEmails;

  // Supabase Database Sync if available
  if (isSupabaseConfigured) {
    try {
      await supabase.from('sos_events').insert({
        id: newSOSEvent.id,
        resident_id: newSOSEvent.resident_id,
        resident_name: newSOSEvent.resident_name,
        resident_phone: newSOSEvent.resident_phone,
        house_number: newSOSEvent.house_number,
        house_unit: newSOSEvent.house_unit,
        triggered_at: newSOSEvent.triggered_at,
        status: 'triggered',
        notified_admin_emails: notifiedEmails,
        edge_function_dispatched: true,
      });
    } catch (dbErr) {
      console.warn('Supabase SOS insert fallback:', dbErr);
    }
  }

  // Update local store & broadcast
  const current = getStoredSOSEvents();
  const updated = [newSOSEvent, ...current];
  setStoredSOSEvents(updated);

  // Play audio alert chime
  playSOSAlertSiren();

  return newSOSEvent;
}

/**
 * Guard acknowledges the SOS alert (Sets acknowledged_by & acknowledged_at, keeps alert active on screen)
 */
export async function acknowledgeSOSEvent(sosId: string, guardName: string): Promise<SOSEvent | null> {
  const now = new Date().toISOString();
  const current = getStoredSOSEvents();
  let targetEvent: SOSEvent | null = null;

  const updated = current.map((ev) => {
    if (ev.id === sosId) {
      targetEvent = {
        ...ev,
        status: 'acknowledged' as SOSStatus,
        acknowledged_at: now,
        acknowledged_by: guardName,
      };
      return targetEvent;
    }
    return ev;
  });

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('sos_events')
        .update({
          status: 'acknowledged',
          acknowledged_at: now,
          acknowledged_by: guardName,
        })
        .eq('id', sosId);
    } catch (err) {
      console.warn('Supabase SOS acknowledge error:', err);
    }
  }

  setStoredSOSEvents(updated);
  return targetEvent;
}

/**
 * Guard clears and resolves the SOS alert (Sets cleared_at, cleared_by, and resolution notes)
 */
export async function clearSOSEvent(
  sosId: string,
  guardName: string,
  resolutionNotes?: string
): Promise<SOSEvent | null> {
  const now = new Date().toISOString();
  const current = getStoredSOSEvents();
  let targetEvent: SOSEvent | null = null;

  const updated = current.map((ev) => {
    if (ev.id === sosId) {
      targetEvent = {
        ...ev,
        status: 'cleared' as SOSStatus,
        cleared_at: now,
        cleared_by: guardName,
        resolution_notes: resolutionNotes || 'Situation verified and cleared by gate security team.',
      };
      return targetEvent;
    }
    return ev;
  });

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('sos_events')
        .update({
          status: 'cleared',
          cleared_at: now,
          cleared_by: guardName,
          resolution_notes: resolutionNotes || 'Situation verified and cleared by gate security team.',
        })
        .eq('id', sosId);
    } catch (err) {
      console.warn('Supabase SOS clear error:', err);
    }
  }

  setStoredSOSEvents(updated);
  return targetEvent;
}

/**
 * Get all active (unresolved) SOS events
 */
export function getActiveSOSEvents(): SOSEvent[] {
  const all = getStoredSOSEvents();
  return all.filter((ev) => ev.status === 'triggered' || ev.status === 'acknowledged');
}

/**
 * Get SOS event history for a specific resident (for transparency and false alarm review)
 */
export function getResidentSOSHistory(residentId: string): SOSEvent[] {
  const all = getStoredSOSEvents();
  return all
    .filter((ev) => ev.resident_id === residentId)
    .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
}

/**
 * Subscribes to real-time SOS changes using Supabase Realtime channel + Local Event Bus
 */
export function subscribeToSOSEvents(callback: (events: SOSEvent[]) => void): () => void {
  // Initial fire
  callback(getStoredSOSEvents());

  // 1. Local window event listener (zero-latency across components and tabs)
  const handleLocalUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<SOSEvent[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getStoredSOSEvents());
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === SOS_STORAGE_KEY) {
      callback(getStoredSOSEvents());
    }
  };

  window.addEventListener(SOS_EVENT_CHANNEL, handleLocalUpdate);
  window.addEventListener('storage', handleStorageChange);

  // 2. Supabase Realtime channel subscription if configured
  let supabaseChannel: any = null;
  if (isSupabaseConfigured) {
    try {
      supabaseChannel = supabase
        .channel('public:sos_events_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sos_events' },
          async () => {
            try {
              const { data } = await supabase
                .from('sos_events')
                .select('*')
                .order('triggered_at', { ascending: false });

              if (data && Array.isArray(data)) {
                setStoredSOSEvents(data as SOSEvent[]);
                callback(data as SOSEvent[]);
              }
            } catch (err) {
              console.warn('Realtime fetch error:', err);
            }
          }
        )
        .subscribe();
    } catch (subErr) {
      console.warn('Supabase Realtime subscription error:', subErr);
    }
  }

  // Cleanup handler
  return () => {
    window.removeEventListener(SOS_EVENT_CHANNEL, handleLocalUpdate);
    window.removeEventListener('storage', handleStorageChange);
    if (supabaseChannel && isSupabaseConfigured) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

/**
 * Web Audio API synthesizer for instant emergency siren audio without external file loading
 */
export function playSOSAlertSiren(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    // Siren pitch modulation (800Hz to 1200Hz loop)
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.35);
    osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.7);
    osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 1.05);
    osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 1.4);

    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.3);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    // Audio playback may be restricted by browser gesture policies
    console.debug('Audio alert playback skipped:', e);
  }
}
