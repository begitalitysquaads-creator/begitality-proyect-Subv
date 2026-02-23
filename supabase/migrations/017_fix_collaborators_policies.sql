-- 017_fix_collaborators_policies.sql
-- Objetivo: Restaurar las políticas de RLS para project_collaborators que fueron borradas accidentalmente.

-- Habilitar RLS (por si acaso no lo estaba)
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 1. Ver colaboradores: Todos los trabajadores activos de Begitality pueden ver quién está en cada proyecto.
CREATE POLICY "Collaborators: Ver todos" ON public.project_collaborators 
FOR SELECT USING (public.is_begitality_staff());

-- 2. Gestionar colaboradores: Los Admins pueden añadir/quitar a cualquier persona.
CREATE POLICY "Collaborators: Admins gestionan todo" ON public.project_collaborators 
FOR ALL USING (public.is_admin());

-- 3. Gestionar colaboradores propios: Los Consultores pueden añadir/quitar colaboradores de sus proyectos (donde son dueños).
CREATE POLICY "Collaborators: Dueños gestionan su equipo" ON public.project_collaborators 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = project_collaborators.project_id 
    AND pc.user_id = auth.uid() 
    AND pc.role = 'owner'
  )
);
