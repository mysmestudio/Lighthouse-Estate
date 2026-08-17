-- ==============================================================================
-- LIGHTHOUSE ESTATE - COMMUNITY MODULES SCHEMA & RLS POLICIES
-- ==============================================================================
-- Includes:
-- 1. polls (Townhall polls created by admin)
-- 2. poll_votes (Resident votes with unique constraint poll_id + voter_id)
-- 3. tickets (Fix-It maintenance tickets submitted by residents, managed by admins)
-- 4. marketplace_listings (Noticeboard for resident goods and services)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TOWNHALL POLLS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL, -- Array of { id: text, text: text } (2 to 4 options)
  created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL DEFAULT 'Estate Administration',
  results_visibility TEXT NOT NULL DEFAULT 'after_vote' CHECK (results_visibility IN ('after_vote', 'after_close', 'always')),
  close_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view polls
CREATE POLICY "Authenticated users can view polls"
  ON public.polls
  FOR SELECT
  USING (true);

-- Admins can create polls
CREATE POLICY "Admins can insert polls"
  ON public.polls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- Admins can update polls (close poll, edit close date)
CREATE POLICY "Admins can update polls"
  ON public.polls
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- Admins can delete polls
CREATE POLICY "Admins can delete polls"
  ON public.polls
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- ==============================================================================
-- 2. POLL VOTES TABLE (ONE VOTE PER RESIDENT PER POLL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  voter_name TEXT,
  house_number INTEGER,
  house_unit TEXT,
  option_id TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_poll_voter UNIQUE (poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter_id ON public.poll_votes(voter_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Residents can see their own vote, admins can see all votes
CREATE POLICY "Users can view relevant votes"
  ON public.poll_votes
  FOR SELECT
  USING (
    voter_id = auth.uid() 
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = poll_votes.voter_id)
    OR EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- Residents can cast one vote
CREATE POLICY "Residents can insert vote"
  ON public.poll_votes
  FOR INSERT
  WITH CHECK (
    voter_id = auth.uid() 
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = poll_votes.voter_id)
  );

-- ==============================================================================
-- 3. FIX-IT TICKETS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  resident_name TEXT NOT NULL,
  resident_phone TEXT,
  house_number INTEGER NOT NULL,
  house_unit TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Electrical', 'Plumbing', 'Security', 'Other')),
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_resident_id ON public.tickets(resident_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Residents see their own tickets, Admins see all tickets
CREATE POLICY "Users can view relevant tickets"
  ON public.tickets
  FOR SELECT
  USING (
    resident_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = tickets.resident_id)
    OR EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- Residents can submit fix-it tickets
CREATE POLICY "Residents can submit tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    resident_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = tickets.resident_id)
  );

-- Admins can update status and resolution notes
CREATE POLICY "Admins can update tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- ==============================================================================
-- 4. MARKETPLACE LISTINGS TABLE (COMMUNITY NOTICEBOARD)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  seller_phone TEXT NOT NULL,
  house_number INTEGER NOT NULL,
  house_unit TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Household', 'Electronics', 'Furniture', 'Services', 'Vehicles', 'Kids & Baby', 'Other')),
  price NUMERIC(12, 2),
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'free', 'negotiable')),
  contact_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON public.marketplace_listings(created_at DESC);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view active listings
CREATE POLICY "Everyone can view active marketplace listings"
  ON public.marketplace_listings
  FOR SELECT
  USING (
    status = 'active' 
    OR seller_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = marketplace_listings.seller_id)
    OR EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

-- Residents can create listings
CREATE POLICY "Residents can create marketplace listings"
  ON public.marketplace_listings
  FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = marketplace_listings.seller_id)
  );

-- Residents can update/delete their own listings; Admins can moderate all
CREATE POLICY "Sellers and Admins can update listings"
  ON public.marketplace_listings
  FOR UPDATE
  USING (
    seller_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = marketplace_listings.seller_id)
    OR EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );

CREATE POLICY "Sellers and Admins can delete listings"
  ON public.marketplace_listings
  FOR DELETE
  USING (
    seller_id = auth.uid()
    OR auth.uid() IN (SELECT auth_user_id FROM public.app_users WHERE id = marketplace_listings.seller_id)
    OR EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE (app_users.id = auth.uid() OR app_users.auth_user_id = auth.uid())
      AND app_users.role IN ('admin', 'master_admin', 'madrasa_admin')
    )
  );
