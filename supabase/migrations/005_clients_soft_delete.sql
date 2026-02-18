-- Begitality - Soft Delete y Mejoras de Clientes

-- Añadir columna status a clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Actualizar la política RLS para permitir ver archivados pero filtrar por defecto en la app
DROP POLICY IF EXISTS "clients_all_own" ON public.clients;
CREATE POLICY "clients_all_own" ON public.clients FOR ALL
  USING (auth.uid() = user_id);
