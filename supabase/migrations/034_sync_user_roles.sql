-- 034_sync_user_roles.sql
-- Objetivo: Sincronizar el campo 'role' de public.profiles con auth.users.raw_app_meta_data.
-- Esto es crucial para que el middleware de Next.js pueda leer el rol del usuario de forma eficiente sin consultar la DB.

-- 1. Función para sincronizar el rol
CREATE OR REPLACE FUNCTION public.handle_sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizamos los metadatos de la tabla auth.users (esquema interno de Supabase)
  -- El nombre correcto de la columna es raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para sincronizar al insertar o actualizar un perfil
DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;
CREATE TRIGGER on_profile_role_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_role();

-- 3. Sincronización inicial para usuarios existentes
-- Esto disparará el trigger para todos y actualizará auth.users
UPDATE public.profiles SET role = role;
