-- Begitality - Soporte para archivado de proyectos

-- Actualizar la restricción de check para incluir 'archived'
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('draft', 'in_progress', 'ready_export', 'exported', 'archived'));

-- Índice para mejorar el filtrado de proyectos activos vs archivados
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
