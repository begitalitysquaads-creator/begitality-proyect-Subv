-- 026_auth_and_profile_enhancements.sql
-- Objetivo: Añadir soporte para 2FA manual (si no se usa el nativo de Supabase) y métricas de usuario.

-- Extender perfiles con campos para 2FA y preferencias
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Tabla para hitos alcanzados por el usuario (Gamificación/Divulgación)
CREATE TABLE IF NOT EXISTS public.user_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- e.g., 'first_project', 'five_projects', 'first_export'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

-- Habilitar RLS en hitos
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_milestones_select_own" ON public.user_milestones 
  FOR SELECT USING (auth.uid() = user_id);

-- Función para actualizar last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET last_login = NOW() WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Supabase Auth no dispara triggers fácilmente al login en la tabla auth.sessions de forma síncrona para perfiles públicos sin RLS complejo.
-- Lo manejaremos desde el middleware o el cliente de autenticación.

-- Bucket para avatares (si no existe)
-- Se asume que se crea vía consola o script de inicialización:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Políticas para el bucket de avatares
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar." ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
