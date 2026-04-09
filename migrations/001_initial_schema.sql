-- ============================================================
-- Smile Forward — Initial Schema Migration
-- Migrated from Supabase to Self-Hosted PostgreSQL
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AUTH: Users table (replaces Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    email_confirmed_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON public.users(email);

-- ============================================================
-- User Roles (RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'basic')) DEFAULT 'basic',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================
-- Leads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    name TEXT,
    email TEXT,
    phone TEXT,
    survey_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),
    marketing_consent BOOLEAN DEFAULT false,
    video_path TEXT
);

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email);

-- ============================================================
-- Generations (Images & Videos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('image', 'video')),
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'error', 'initializing', 'processing_video', 'processing_video_veo')),
    input_path TEXT,
    output_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_generations_lead_id ON public.generations(lead_id);
CREATE INDEX idx_generations_status ON public.generations(status);
CREATE INDEX idx_generations_type ON public.generations(type);

-- ============================================================
-- Analysis Results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    result JSONB NOT NULL
);

CREATE INDEX idx_analysis_results_lead_id ON public.analysis_results(lead_id);

-- ============================================================
-- Selfie Sessions (Cross-Device QR Flow)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.selfie_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'pending',
    image_url TEXT
);

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_id TEXT
);

CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- API Usage Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    endpoint TEXT,
    status INTEGER,
    duration INTEGER,
    user_id UUID,
    service_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT (timezone('utc', now()))
);

CREATE INDEX idx_api_usage_service ON public.api_usage_logs(service_name);

-- ============================================================
-- Helper Function: is_admin (application-level equivalent)
-- Note: In the self-hosted version, auth checks happen in 
-- application middleware, but this function is preserved for
-- any direct DB usage.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = p_user_id
        AND role = 'admin'
    );
$$;

-- ============================================================
-- Trigger: Auto-update updated_at on users table
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
