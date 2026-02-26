-- 037_make_audit_logs_project_id_nullable.sql
-- Objetivo: Permitir registros de auditoría que no dependan de un proyecto específico (como gestión de usuarios).

-- 1. Quitar la restricción NOT NULL de project_id
ALTER TABLE public.audit_logs
ALTER COLUMN project_id DROP NOT NULL;

-- 2. Actualizar la política de visualización para permitir registros sin project_id
DROP POLICY IF EXISTS "audit_logs_view" ON public.audit_logs;

CREATE POLICY "audit_logs_view" ON public.audit_logs FOR SELECT
  USING (
    (project_id IS NULL OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = audit_logs.project_id))
    AND public.is_begitality_staff()
  );

COMMENT ON COLUMN public.audit_logs.project_id IS 'ID del proyecto asociado. NULL si es una acción global del sistema.';
