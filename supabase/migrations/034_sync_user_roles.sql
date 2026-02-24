-- 034_sync_user_roles.sql
-- Objetivo: Sincronizar el campo 'role' de public.profiles con auth.users.app_metadata.
-- Esto es crucial para que el middleware de Next.js pueda leer el rol del usuario de forma eficiente sin consultar la DB.

-- 1. Función para sincronizar el rol
CREATE OR REPLACE FUNCTION public.handle_sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizamos los metadatos de la tabla auth.users
  -- Esto requiere que el trigger se ejecute con permisos suficientes (SECURITY DEFINER)
  UPDATE auth.users
  SET raw_app_metadata_data = 
    coalesce(raw_app_metadata_data, '{}'::jsonb) || 
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
-- Ejecutamos una actualización en todos los perfiles para disparar el trigger
-- y que todos los usuarios actuales tengan su rol en app_metadata.
UPDATE public.profiles SET role = role;
