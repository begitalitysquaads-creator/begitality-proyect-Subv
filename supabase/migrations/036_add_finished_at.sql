-- 036_add_finished_at.sql
-- Objetivo: Rastrear la fecha exacta de finalización para mostrarla en el calendario.

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.finished_at IS 'Fecha y hora exacta en la que el proyecto se marcó como finalizado.';
