CREATE TABLE IF NOT EXISTS public.project_diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  overall_score INT CHECK (overall_score BETWEEN 0 AND 100),
  summary TEXT,
  risks JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  section_scores JSONB DEFAULT '{}'::jsonb,
  requirements_found JSONB DEFAULT '[]'::jsonb,
  model_used TEXT DEFAULT 'gemini-2.0-flash'
);

ALTER TABLE public.project_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diagnostics_own" ON public.project_diagnostics;

CREATE POLICY "diagnostics_own" ON public.project_diagnostics FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_diagnostics.project_id AND p.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_diagnostics_project_id ON public.project_diagnostics(project_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_generated_at ON public.project_diagnostics(project_id, generated_at DESC);