-- 031_fix_ghost_columns_and_rls.sql
-- Objetivo: Asegurar que la columna project_deadline exista y que las políticas de RLS sean consistentes.

-- 1. Añadir project_deadline si no existe
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_deadline DATE;

COMMENT ON COLUMN public.projects.project_deadline IS 'Fecha límite de entrega de la memoria técnica (ISO DATE)';

-- 2. Asegurar políticas de RLS para proyectos
DROP POLICY IF EXISTS "Projects: Acceso total equipo" ON public.projects;
CREATE POLICY "Projects: Acceso total equipo" 
ON public.projects FOR SELECT 
USING (public.is_begitality_staff());

DROP POLICY IF EXISTS "Projects: Creación equipo" ON public.projects;
CREATE POLICY "Projects: Creación equipo" 
ON public.projects FOR INSERT 
WITH CHECK (public.is_begitality_staff());

DROP POLICY IF EXISTS "Projects: Edición equipo" ON public.projects;
CREATE POLICY "Projects: Edición equipo" 
ON public.projects FOR UPDATE 
USING (public.is_begitality_staff());

-- 3. Índice para mejorar búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON public.projects(project_deadline);
