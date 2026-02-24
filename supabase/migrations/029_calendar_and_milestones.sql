-- 029_calendar_and_milestones.sql
-- Objetivo: Soportar cronogramas complejos y seguimiento de entregables.

-- 1. Añadir fecha de inicio al proyecto
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- 2. Crear tabla de hitos/entregables
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  type TEXT DEFAULT 'deliverable', -- 'deliverable', 'meeting', 'payment', 'review'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'delayed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe para evitar errores en recreación
DROP POLICY IF EXISTS "Users can manage milestones of their projects" ON public.project_milestones;

CREATE POLICY "Users can manage milestones of their projects"
ON public.project_milestones FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
    AND p.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.project_milestones IS 'Hitos y entregables específicos de cada proyecto para seguimiento cronológico.';
