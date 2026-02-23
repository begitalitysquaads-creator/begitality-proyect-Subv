-- 016_company_wide_collaboration.sql
-- Objetivo: Permitir que todos los trabajadores vean todos los proyectos y clientes.

-- 1. LIMPIEZA DE POLÍTICAS ANTIGUAS (Silos individuales)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- 2. NUEVO MODELO DE PERMISOS: COLABORACIÓN TOTAL POR ROL

-- Función helper para verificar si es un trabajador activo
CREATE OR REPLACE FUNCTION public.is_begitality_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para verificar si es Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- APLICACIÓN DE POLÍTICAS UNIVERSALES ---

-- TABLA: PROFILES
CREATE POLICY "Profiles: Ver todos" ON public.profiles FOR SELECT USING (is_begitality_staff());
CREATE POLICY "Profiles: Admins gestionan todo" ON public.profiles FOR ALL USING (is_admin());
CREATE POLICY "Profiles: Usuarios editan su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TABLA: CLIENTS
CREATE POLICY "Clients: Ver y crear todos" ON public.clients FOR SELECT USING (is_begitality_staff());
CREATE POLICY "Clients: Consultores gestionan" ON public.clients FOR INSERT WITH CHECK (is_begitality_staff());
CREATE POLICY "Clients: Consultores actualizan" ON public.clients FOR UPDATE USING (is_begitality_staff());
CREATE POLICY "Clients: Solo Admins borran" ON public.clients FOR DELETE USING (is_admin());

-- TABLA: PROJECTS (El núcleo)
CREATE POLICY "Projects: Acceso total equipo" ON public.projects FOR SELECT USING (is_begitality_staff());
CREATE POLICY "Projects: Creación equipo" ON public.projects FOR INSERT WITH CHECK (is_begitality_staff());
CREATE POLICY "Projects: Edición equipo" ON public.projects FOR UPDATE USING (is_begitality_staff());
CREATE POLICY "Projects: Solo Admins borran" ON public.projects FOR DELETE USING (is_admin());

-- TABLA: SECTIONS (Memoria Técnica)
CREATE POLICY "Sections: Acceso total equipo" ON public.sections FOR ALL USING (is_begitality_staff());

-- TABLA: CONVOCATORIA_BASES (PDFs)
CREATE POLICY "Bases: Acceso total equipo" ON public.convocatoria_bases FOR ALL USING (is_begitality_staff());

-- TABLA: PROJECT_BUDGETS (Finanzas)
CREATE POLICY "Budgets: Acceso total equipo" ON public.project_budgets FOR ALL USING (is_begitality_staff());

-- TABLA: PROJECT_TASKS (Hitos)
CREATE POLICY "Tasks: Acceso total equipo" ON public.project_tasks FOR ALL USING (is_begitality_staff());

-- TABLA: AI_MESSAGES (Chat)
CREATE POLICY "AI: Acceso total equipo" ON public.ai_messages FOR ALL USING (is_begitality_staff());

-- TABLA: DOCUMENT_EMBEDDINGS (Vectores IA)
CREATE POLICY "Embeddings: Acceso total equipo" ON public.document_embeddings FOR ALL USING (is_begitality_staff());

-- 3. ASEGURAR ESTRUCTURA DE ROLES (Por si fallaron pasos previos)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'junior_consultant';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. DAR PERMISOS A LAS FUNCIONES RPC
GRANT EXECUTE ON FUNCTION public.is_begitality_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
