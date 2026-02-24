-- 033_add_last_accessed_at.sql
-- Objetivo: Rastrear el acceso real a los proyectos para mejorar la ordenación del Panel.

-- 1. Añadir columna si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'last_accessed_at') THEN
    ALTER TABLE public.projects ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Índice para rendimiento en ordenación por acceso (Descendente)
CREATE INDEX IF NOT EXISTS idx_projects_last_accessed_at ON public.projects(last_accessed_at DESC);

-- 3. Poblar inicialmente con la fecha de actualización para proyectos existentes (solo la primera vez)
-- Usamos un flag o simplemente lo hacemos si la columna se acaba de añadir.
UPDATE public.projects SET last_accessed_at = updated_at WHERE last_accessed_at = created_at;

-- 4. HABILITAR REALTIME para la tabla de proyectos (Crucial para que el Panel se actualice solo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
