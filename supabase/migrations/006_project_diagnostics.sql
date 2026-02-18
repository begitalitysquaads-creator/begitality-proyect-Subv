-- Begitality - Diagnósticos IA de proyecto
-- Ejecutar después de 005_activity_log.sql

-- Tabla de diagnósticos generados por IA
CREATE TABLE public.project_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  overall_score INT CHECK (overall_score BETWEEN 0 AND 100),
  summary TEXT,                        -- Resumen ejecutivo del diagnóstico
  risks JSONB DEFAULT '[]',            -- Array de { level: 'high'|'medium'|'low', message: string, section_id?: string }
  suggestions JSONB DEFAULT '[]',      -- Array de { priority: 1-3, action: string, section_title?: string }
  section_scores JSONB DEFAULT '{}',   -- Map section_id -> { score: int, feedback: string }
  requirements_found JSONB DEFAULT '[]', -- Requisitos detectados en la convocatoria
  model_used TEXT DEFAULT 'gemini-2.5-flash'
);

ALTER TABLE public.project_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostics_own" ON public.project_diagnostics FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_diagnostics.project_id AND p.user_id = auth.uid())
  );

CREATE INDEX idx_diagnostics_project_id ON public.project_diagnostics(project_id);
CREATE INDEX idx_diagnostics_generated_at ON public.project_diagnostics(project_id, generated_at DESC);
