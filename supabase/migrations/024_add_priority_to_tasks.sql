-- 024_add_priority_to_tasks.sql
-- Objetivo: Añadir prioridad y metadatos a las tareas para mayor control técnico.

ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_tasks.priority IS 'Prioridad de la tarea o hito.';
COMMENT ON COLUMN public.project_tasks.metadata IS 'Datos adicionales capturados para la tarea.';
