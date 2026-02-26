-- Begitality V4 - Auditoría y Persistencia

-- Campos para guardar los informes de IA
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS viability_report TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS review_report TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS success_score INTEGER DEFAULT 0;

-- Índice para ordenar por puntuación en el histórico
CREATE INDEX IF NOT EXISTS idx_projects_score ON public.projects(success_score);
