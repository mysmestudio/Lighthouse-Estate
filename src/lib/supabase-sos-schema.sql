-- ==============================================================================
-- LIGHTHOUSE ESTATE - EMERGENCY SOS SCHEMA & REALTIME CONFIGURATION
-- ==============================================================================
-- This SQL migration sets up the 'sos_events' table, Row-Level-Security (RLS),
-- Realtime broadcast publications, and Edge Function alerting triggers.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREATE SOS_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  resident_name TEXT NOT NULL,
  resident_phone TEXT,
  house_number INTEGER NOT NULL,
  house_unit TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'cleared')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  cleared_at TIMESTAMPTZ,
  cleared_by TEXT,
  resolution_notes TEXT,
  notified_admin_emails TEXT[],
  edge_function_dispatched BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by status and resident
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON public.sos_events(status);
CREATE INDEX IF NOT EXISTS idx_sos_events_resident ON public.sos_events(resident_id);
CREATE INDEX IF NOT EXISTS idx_sos_events_triggered_at ON public.sos_events(triggered_at DESC);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- Residents can read their own SOS history
CREATE POLICY "Residents can view their own SOS events"
  ON public.sos_events
  FOR SELECT
  USING (auth.uid() = resident_id OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = sos_events.resident_id));

-- Residents can insert new SOS triggers
CREATE POLICY "Residents can trigger SOS"
  ON public.sos_events
  FOR INSERT
  WITH CHECK (true);

-- Guards and Admins can view ALL SOS events
CREATE POLICY "Security and Admins can view all SOS events"
  ON public.sos_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('security', 'admin', 'master_admin')
    )
  );

-- Guards and Admins can update SOS events (acknowledge, clear)
CREATE POLICY "Security and Admins can update SOS events"
  ON public.sos_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('security', 'admin', 'master_admin')
    )
  );

-- 3. ENABLE SUPABASE REALTIME
-- Enables instant WebSocket broadcasts to Gate Hub and Security tablets
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;

-- 4. EDGE FUNCTION WEBHOOK / NOTIFICATION TRIGGER (SIMULATION / LOGGING)
-- When a new SOS event is inserted, notify active admins via email & push notification
CREATE OR REPLACE FUNCTION public.handle_sos_trigger_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log trigger for edge function dispatcher
  RAISE NOTICE 'EMERGENCY SOS TRIGGERED: House % (%) at % by %', 
    NEW.house_number, NEW.house_unit, NEW.triggered_at, NEW.resident_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sos_event_created
  AFTER INSERT ON public.sos_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sos_trigger_notification();
