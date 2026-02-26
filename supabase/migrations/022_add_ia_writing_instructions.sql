-- 022_add_ia_writing_instructions.sql
-- Objetivo: Almacenar instrucciones personalizadas de redacción para la IA por proyecto.

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS writing_instructions TEXT;

COMMENT ON COLUMN public.projects.writing_instructions IS 'Instrucciones específicas de tono, estilo o enfoque para la generación de contenido por IA.';
