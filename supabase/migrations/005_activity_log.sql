-- Tabla de registro de actividad / historial
-- Registra todas las acciones importantes del usuario en sus proyectos.

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- Acciones válidas:
  --   project_created, status_changed, convocatoria_uploaded, convocatoria_deleted,
  --   sections_generated, section_content_generated, section_edited, exported_pdf, exported_docx
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo el dueño puede ver su actividad
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_own"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activity_log_insert_own"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índices para consultas frecuentes
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_project_id ON public.activity_log(project_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
