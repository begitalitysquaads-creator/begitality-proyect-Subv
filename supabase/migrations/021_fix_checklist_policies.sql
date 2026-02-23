-- 021_fix_checklist_policies.sql
-- Objetivo: Asegurar políticas de colaboración para el checklist dinámico.

-- 1. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "checklist_items_own" ON public.checklist_items;

-- 2. Aplicar políticas de colaboración total
CREATE POLICY "Checklist: Acceso total equipo" ON public.checklist_items FOR ALL USING (public.is_begitality_staff());
