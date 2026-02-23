-- 018_fix_rls_recursion.sql
-- Objetivo: Eliminar la recursividad infinita en las políticas de colaboradores.

-- 1. Limpiar políticas conflictivas
DROP POLICY IF EXISTS "Collaborators: Ver todos" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators: Admins gestionan todo" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators: Dueños gestionan su equipo" ON public.project_collaborators;

-- 2. Política de Lectura: Todos los empleados pueden ver quién colabora en qué.
CREATE POLICY "Collaborators: Lectura global" 
ON public.project_collaborators FOR SELECT 
USING (public.is_begitality_staff());

-- 3. Política de Gestión: Solo el creador del proyecto (owner) o un Admin pueden añadir/quitar gente.
CREATE POLICY "Collaborators: Gestión por owner o admin" 
ON public.project_collaborators FOR ALL 
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.user_id = auth.uid()
  )
);
