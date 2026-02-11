-- Begitality - pgvector y Motor de Reutilización semántico
-- Ejecutar después de 001_initial_schema.sql

-- 1. Extensión para vectores (embedding gemini = 1536 dimensiones)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Fragmentos de documentos indexados para búsqueda semántica
-- Cada fila = un trozo de texto (convocatoria, memoria previa, etc.) con su embedding
CREATE TABLE public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('convocatoria_basis', 'section', 'previous_proposal')),
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_embeddings_own" ON public.document_embeddings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = document_embeddings.project_id AND p.user_id = auth.uid())
  );

-- Índice para búsqueda por proximidad (IVFFlat o HNSW)
-- HNSW suele dar mejor recall; opcionalmente ajustar m y ef_construction
CREATE INDEX idx_document_embeddings_embedding ON public.document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_document_embeddings_project_id ON public.document_embeddings(project_id);
CREATE INDEX idx_document_embeddings_source ON public.document_embeddings(project_id, source_type, source_id);

-- 3. Función RPC: búsqueda semántica por similitud de coseno
-- Devuelve los fragmentos más similares al embedding de la consulta (para inyectar como contexto en la IA)
CREATE OR REPLACE FUNCTION public.match_embeddings(
  p_project_id UUID,
  p_query_embedding vector(1536),
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
  -- Solo proyectos del usuario (seguridad aunque la función sea DEFINER)
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

-- Permiso para que el usuario autenticado solo consulte embeddings de sus proyectos (RLS en la tabla ya lo asegura; la función es DEFINER)
GRANT EXECUTE ON FUNCTION public.match_embeddings(UUID, vector(1536), INT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_embeddings(UUID, vector(1536), INT, FLOAT) TO service_role;
