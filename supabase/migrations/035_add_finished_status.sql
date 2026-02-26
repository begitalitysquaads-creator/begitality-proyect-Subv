-- 035_add_finished_status.sql
-- Objetivo: Añadir el estado 'finished' para diferenciar proyectos completados de los simplemente exportados.

-- 1. Actualizar la restricción de check para incluir 'finished'
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('draft', 'in_progress', 'ready_export', 'exported', 'archived', 'finished'));

-- 2. Actualizar comentarios para claridad
COMMENT ON COLUMN public.projects.status IS 'Estado del proyecto: draft, in_progress, ready_export, exported (descargado), finished (finalizado oficialmente), archived (archivado).';
