-- 032_fix_milestones_rls.sql
-- Objetivo: Sincronizar permisos de hitos con la visibilidad total del equipo Begitality.

-- 1. Eliminar política restrictiva por user_id
DROP POLICY IF EXISTS "Users can manage milestones of their projects" ON public.project_milestones;

-- 2. Crear política de acceso total para el equipo activo
CREATE POLICY "Milestones: Acceso total equipo"
ON public.project_milestones FOR ALL
USING (public.is_begitality_staff());

-- 3. Asegurar que las tareas del proyecto también tengan visibilidad total (refuerzo)
DROP POLICY IF EXISTS "Tasks: Acceso total equipo" ON public.project_tasks;
CREATE POLICY "Tasks: Acceso total equipo" 
ON public.project_tasks FOR ALL 
USING (public.is_begitality_staff());

-- 4. Asegurar que los presupuestos también tengan visibilidad total
DROP POLICY IF EXISTS "Budgets: Acceso total equipo" ON public.project_budgets;
CREATE POLICY "Budgets: Acceso total equipo" 
ON public.project_budgets FOR ALL 
USING (public.is_begitality_staff());

COMMENT ON POLICY "Milestones: Acceso total equipo" ON public.project_milestones IS 'Permite a cualquier trabajador activo gestionar hitos de cualquier proyecto.';
