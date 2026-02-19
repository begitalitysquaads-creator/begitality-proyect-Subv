-- Tabla para almacenar tokens de Google OAuth (Google Drive)
-- Permite a cada usuario conectar su cuenta de Google para exportar a Drive.

CREATE TABLE public.google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS: solo el dueño puede ver y modificar sus tokens
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_tokens_select_own"
  ON public.google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "google_tokens_insert_own"
  ON public.google_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "google_tokens_update_own"
  ON public.google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "google_tokens_delete_own"
  ON public.google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para búsqueda rápida por user_id
CREATE INDEX idx_google_tokens_user_id ON public.google_tokens(user_id);
