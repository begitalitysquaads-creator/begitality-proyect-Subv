    -- 020_add_grant_summary.sql
    -- Objetivo: Almacenar la ficha resumen generada por IA de las bases de convocatoria.

    ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS grant_summary JSONB;

    COMMENT ON COLUMN public.projects.grant_summary IS 'Resumen técnico extraído por IA (Importe, intensidad, plazos)';
