-- 023_smart_roadmap_consolidation.sql
-- Objetivo: Unificar el checklist IA y las tareas manuales en una Hoja de Ruta Inteligente.

-- 1. Añadir columnas necesarias a project_tasks
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

-- 2. Migrar datos existentes si los hubiera (opcional, aquí partimos de limpio)
-- 3. Eliminar la tabla antigua de checklist
DROP TABLE IF EXISTS public.checklist_items;

-- 4. Comentarios
COMMENT ON COLUMN public.project_tasks.file_path IS 'Ruta al documento PDF/Word cargado para este requisito.';
COMMENT ON COLUMN public.project_tasks.review_status IS 'Estado de revisión humana del documento aportado.';
