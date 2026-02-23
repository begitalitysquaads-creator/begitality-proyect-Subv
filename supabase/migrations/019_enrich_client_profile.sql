-- 019_enrich_client_profile.sql
-- Objetivo: Enriquecer el perfil del cliente con datos técnicos y financieros para análisis de viabilidad (Fase 2).

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS cnae TEXT,
ADD COLUMN IF NOT EXISTS constitution_date DATE,
ADD COLUMN IF NOT EXISTS fiscal_region TEXT,
ADD COLUMN IF NOT EXISTS annual_turnover NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS de_minimis_received NUMERIC(15, 2) DEFAULT 0;

-- Comentarios para documentación
COMMENT ON COLUMN public.clients.cnae IS 'Código CNAE de la actividad principal';
COMMENT ON COLUMN public.clients.constitution_date IS 'Fecha oficial de constitución de la empresa';
COMMENT ON COLUMN public.clients.fiscal_region IS 'Región o Comunidad Autónoma para fiscalidad y ayudas regionales';
COMMENT ON COLUMN public.clients.annual_turnover IS 'Facturación anual del último ejercicio cerrado';
COMMENT ON COLUMN public.clients.employee_count IS 'Número total de empleados (plantilla media)';
COMMENT ON COLUMN public.clients.de_minimis_received IS 'Total de ayudas De Minimis recibidas en los últimos 3 ejercicios';
