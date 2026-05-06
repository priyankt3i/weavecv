CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text AS $$
  WITH jwt AS (
    SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb AS claims
  )
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    claims ->> 'sub',
    claims ->> 'user_id',
    claims ->> 'owner_id'
  )
  FROM jwt;
$$ LANGUAGE sql STABLE;

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT public.current_app_user_id(),
  title text NOT NULL DEFAULT 'Untitled resume',
  raw_text text NOT NULL DEFAULT '',
  tune_for_job boolean NOT NULL DEFAULT false,
  job_description text NOT NULL DEFAULT '',
  resume_markdown text NOT NULL DEFAULT '',
  active_step text NOT NULL DEFAULT 'create',
  active_template_id text NOT NULL DEFAULT 'modern-tech',
  imported_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_chat_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  review jsonb,
  render_settings jsonb,
  file_name text NOT NULL DEFAULT 'resume',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resumes
ALTER COLUMN owner_id SET DEFAULT public.current_app_user_id();

CREATE INDEX IF NOT EXISTS resumes_owner_updated_idx ON public.resumes (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  owner_id text PRIMARY KEY DEFAULT public.current_app_user_id(),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  subscription_status text NOT NULL DEFAULT 'inactive',
  pro_enabled boolean NOT NULL DEFAULT false,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions
ALTER COLUMN owner_id SET DEFAULT public.current_app_user_id();

CREATE INDEX IF NOT EXISTS user_subscriptions_customer_idx ON public.user_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_subscription_idx ON public.user_subscriptions (stripe_subscription_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resumes_set_updated_at ON public.resumes;
CREATE TRIGGER resumes_set_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_subscriptions_set_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_set_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their resumes" ON public.resumes;
CREATE POLICY "Users can read their resumes"
ON public.resumes
FOR SELECT
TO public
USING (owner_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Users can create their resumes" ON public.resumes;
CREATE POLICY "Users can create their resumes"
ON public.resumes
FOR INSERT
TO public
WITH CHECK (owner_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Users can update their resumes" ON public.resumes;
CREATE POLICY "Users can update their resumes"
ON public.resumes
FOR UPDATE
TO public
USING (owner_id = public.current_app_user_id())
WITH CHECK (owner_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Users can delete their resumes" ON public.resumes;
CREATE POLICY "Users can delete their resumes"
ON public.resumes
FOR DELETE
TO public
USING (owner_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Users can read their subscription" ON public.user_subscriptions;
CREATE POLICY "Users can read their subscription"
ON public.user_subscriptions
FOR SELECT
TO public
USING (owner_id = public.current_app_user_id());
