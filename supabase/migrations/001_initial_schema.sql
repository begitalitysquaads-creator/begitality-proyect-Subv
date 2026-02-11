-- Begitality - Esquema inicial (Etapa 1 + base para Etapa 2)
-- Ejecutar en Supabase SQL Editor o via CLI

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'senior_consultant' CHECK (plan IN ('starter', 'consultant', 'senior_consultant', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos (espacio de trabajo por convocatoria)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grant_name TEXT NOT NULL,
  grant_type TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready_export', 'exported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos "Bases" de la convocatoria (PDFs cargados)
CREATE TABLE public.convocatoria_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secciones de la memoria técnica por proyecto
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist dinámico por proyecto (requisitos de convocatoria)
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  checked BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensajes del asistente IA (contexto del chat por proyecto)
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo el dueño puede ver/editar sus datos
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatoria_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "projects_all_own" ON public.projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "convocatoria_bases_own" ON public.convocatoria_bases FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = convocatoria_bases.project_id AND p.user_id = auth.uid()));

CREATE POLICY "sections_own" ON public.sections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = sections.project_id AND p.user_id = auth.uid()));

CREATE POLICY "checklist_items_own" ON public.checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = checklist_items.project_id AND p.user_id = auth.uid()));

CREATE POLICY "ai_messages_own" ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = ai_messages.project_id AND p.user_id = auth.uid()));

-- Índices
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_sections_project_id ON public.sections(project_id);
CREATE INDEX idx_convocatoria_bases_project_id ON public.convocatoria_bases(project_id);
CREATE INDEX idx_ai_messages_project_id ON public.ai_messages(project_id);

-- Trigger: crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket para bases y exportaciones (crear desde Dashboard o API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('convocatoria-files', 'convocatoria-files', false);
-- Políticas de storage según project_id en path o metadata.
