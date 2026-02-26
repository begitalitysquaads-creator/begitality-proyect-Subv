-- 012_fix_collaborators.sql

-- 1. Asegurar que la clave foránea apunte a PROFILES para poder hacer el JOIN
ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_user_id_fkey;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Insertar retroactivamente a los dueños de los proyectos como colaboradores "owner"
-- Esto hará que aparezcan inmediatamente en la lista de Equipo Begitality
INSERT INTO public.project_collaborators (project_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;
