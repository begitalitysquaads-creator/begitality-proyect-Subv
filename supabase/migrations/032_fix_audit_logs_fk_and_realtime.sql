-- 032_fix_audit_logs_fk_and_realtime.sql
-- Objetivo: Vincular logs de auditoría a perfiles y habilitar tiempo real.

-- 1. Asegurar la integridad de la clave foránea hacia profiles
ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. Habilitar REALTIME para audit_logs (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
