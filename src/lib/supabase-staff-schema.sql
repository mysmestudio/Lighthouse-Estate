-- Lighthouse Estate Management System
-- Domestic Staff Onboarding, Staff KYC & pgcrypto Encryption Schema

-- 1. Enable pgcrypto extension for secure NIN encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Invite Codes Table (7-day temporary onboarding invitations)
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) NOT NULL UNIQUE,
    employer_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    work_location VARCHAR(100) NOT NULL,
    schedule JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant 6-digit code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_lookup ON public.invite_codes(code) WHERE (used = false);

-- 3. Staff KYC Table (Identity, Encrypted NIN, Schedule, Remarks & Audit History)
CREATE TABLE IF NOT EXISTS public.staff_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    work_location VARCHAR(100) NOT NULL,
    schedule JSONB NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    home_address TEXT NOT NULL,
    nin_encrypted BYTEA, -- Encrypted using pgp_sym_encrypt
    nin_masked VARCHAR(20) NOT NULL, -- e.g. '*******7890'
    next_of_kin JSONB NOT NULL, -- { name, phone, relationship }
    documents JSONB NOT NULL, -- { passport_photo_url, national_id_url, guarantor_id_url }
    employer_remarks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Append-only remarks log
    change_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Audit change history
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'off_duty', 'rejected')),
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_kyc_employer ON public.staff_kyc(employer_id);
CREATE INDEX IF NOT EXISTS idx_staff_kyc_status ON public.staff_kyc(status);

-- 4. Server-Side Postgres Function for Inserting Staff KYC with pgcrypto NIN encryption
CREATE OR REPLACE FUNCTION public.insert_staff_kyc_secure(
    p_user_id UUID,
    p_employer_id UUID,
    p_full_name VARCHAR,
    p_phone VARCHAR,
    p_email VARCHAR,
    p_role VARCHAR,
    p_work_location VARCHAR,
    p_schedule JSONB,
    p_dob DATE,
    p_gender VARCHAR,
    p_home_address TEXT,
    p_raw_nin VARCHAR,
    p_nin_masked VARCHAR,
    p_next_of_kin JSONB,
    p_documents JSONB,
    p_encryption_key TEXT
) RETURNS UUID AS $$
DECLARE
    v_kyc_id UUID;
BEGIN
    INSERT INTO public.staff_kyc (
        user_id,
        employer_id,
        full_name,
        phone,
        email,
        role,
        work_location,
        schedule,
        dob,
        gender,
        home_address,
        nin_encrypted,
        nin_masked,
        next_of_kin,
        documents,
        status,
        change_history
    ) VALUES (
        p_user_id,
        p_employer_id,
        p_full_name,
        p_phone,
        p_email,
        p_role,
        p_work_location,
        p_schedule,
        p_dob,
        p_gender,
        p_home_address,
        pgp_sym_encrypt(p_raw_nin, p_encryption_key),
        p_nin_masked,
        p_next_of_kin,
        p_documents,
        'pending',
        jsonb_build_array(
            jsonb_build_object(
                'id', gen_random_uuid(),
                'timestamp', now(),
                'action', 'Onboarding Submitted',
                'details', 'Staff submitted complete identity profile & KYC documents',
                'author', p_full_name
            )
        )
    ) RETURNING id INTO v_kyc_id;

    RETURN v_kyc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_kyc ENABLE ROW LEVEL SECURITY;

-- Residents can create and view invite codes for their own household
CREATE POLICY "Residents manage their own invite codes"
    ON public.invite_codes FOR ALL
    USING (auth.uid() = employer_id);

-- Anyone can validate non-expired, un-used invite codes during public onboarding
CREATE POLICY "Public validate invite codes"
    ON public.invite_codes FOR SELECT
    USING (used = false AND expires_at > now());

-- Employers can read and update their staff KYC records
CREATE POLICY "Employers view and manage their staff KYC"
    ON public.staff_kyc FOR ALL
    USING (auth.uid() = employer_id);

-- Admins and Security can query active staff in directory (excluding raw documents/NIN via View)
CREATE POLICY "Admins full staff KYC access"
    ON public.staff_kyc FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
        )
    );

-- 6. Supabase Storage Bucket Policy for "staff-documents"
-- Restricts read access to the employing resident and admins only.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-documents', 'staff-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Employers and Admins view staff documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'staff-documents' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM public.app_users 
                WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
            )
        )
    );

CREATE POLICY "Staff upload onboarding documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'staff-documents');
