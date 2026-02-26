-- 010_features_implementation.sql

-- 1. Adjust embeddings for Google (768 dimensions)
DO $$
BEGIN
  -- Only alter if the column exists and we assume it might be the wrong dimension (1536).
  -- Dropping and recreating is safer for a dev environment to ensure type correctness.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_embeddings' AND column_name = 'embedding') THEN
    ALTER TABLE public.document_embeddings DROP COLUMN embedding;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_embeddings' AND column_name = 'embedding') THEN
    ALTER TABLE public.document_embeddings ADD COLUMN embedding vector(768); -- Google GenAI text-embedding-004
  END IF;
END $$;

-- Update the match_embeddings function to use 768
CREATE OR REPLACE FUNCTION public.match_embeddings(
  p_project_id UUID,
  p_query_embedding vector(768),
  p_match_count INT DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.user_id = auth.uid()) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    de.id,
    de.source_type,
    de.source_id,
    de.content,
    1 - (de.embedding <=> p_query_embedding)::float AS similarity,
    de.metadata
  FROM public.document_embeddings de
  WHERE de.project_id = p_project_id
    AND (1 - (de.embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY de.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- 2. Budget Module
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('personal', 'equipment', 'external', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Budgets
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid error on re-run
DROP POLICY IF EXISTS "project_budgets_own" ON public.project_budgets;

CREATE POLICY "project_budgets_own" ON public.project_budgets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_budgets.project_id AND p.user_id = auth.uid()));

-- 3. Task/Milestone Module
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Tasks
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_tasks_own" ON public.project_tasks;

CREATE POLICY "project_tasks_own" ON public.project_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));

-- 4. Collaborators (Simple Version)
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- RLS for Collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborators_manage_own" ON public.project_collaborators;
DROP POLICY IF EXISTS "collaborators_view_self" ON public.project_collaborators;

CREATE POLICY "collaborators_manage_own" ON public.project_collaborators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_collaborators.project_id AND p.user_id = auth.uid()));

CREATE POLICY "collaborators_view_self" ON public.project_collaborators FOR SELECT
  USING (user_id = auth.uid());
