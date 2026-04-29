CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT auth.user_id(),
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

CREATE INDEX IF NOT EXISTS resumes_owner_updated_idx ON public.resumes (owner_id, updated_at DESC);

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

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their resumes" ON public.resumes;
CREATE POLICY "Users can read their resumes"
ON public.resumes
FOR SELECT
TO authenticated
USING (owner_id = auth.user_id());

DROP POLICY IF EXISTS "Users can create their resumes" ON public.resumes;
CREATE POLICY "Users can create their resumes"
ON public.resumes
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update their resumes" ON public.resumes;
CREATE POLICY "Users can update their resumes"
ON public.resumes
FOR UPDATE
TO authenticated
USING (owner_id = auth.user_id())
WITH CHECK (owner_id = auth.user_id());

DROP POLICY IF EXISTS "Users can delete their resumes" ON public.resumes;
CREATE POLICY "Users can delete their resumes"
ON public.resumes
FOR DELETE
TO authenticated
USING (owner_id = auth.user_id());
