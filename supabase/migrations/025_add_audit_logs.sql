-- 025_add_audit_logs.sql
-- Objetivo: Crear tabla de auditoría para trazabilidad completa de acciones (Fase 4).

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Ver logs del propio proyecto
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_view" ON public.audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = audit_logs.project_id) -- Simplificado para Begitality staff
    AND public.is_begitality_staff()
  );

-- Permitir inserción a todos los autenticados (el backend controlará la lógica)
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.audit_logs IS 'Registro inmutable de acciones críticas sobre el expediente.';
