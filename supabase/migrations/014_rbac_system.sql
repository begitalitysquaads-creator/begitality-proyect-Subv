-- 014_rbac_system.sql

-- 1. Crear tipo de rol si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'consultant', 'auditor');
  END IF;
END $$;

-- 2. Asegurar que la tabla profiles tiene la columna role
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'consultant',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. RLS: El Admin puede ver y editar todos los perfiles, otros solo el suyo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 4. RLS para Proyectos: Admin ve todo, Consultor solo lo suyo o donde es colaborador
DROP POLICY IF EXISTS "Admins see all projects" ON public.projects;
CREATE POLICY "Admins see all projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
