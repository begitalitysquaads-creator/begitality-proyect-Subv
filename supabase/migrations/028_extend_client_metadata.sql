-- 028_extend_client_metadata.sql
-- Objetivo: Ampliar la base de datos de clientes con metadatos corporativos detallados.

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT, -- Range: Micro, Small, Medium, Large
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS revenue_range TEXT, -- Range: <2M, 2M-10M, 10M-50M, >50M
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.clients.address IS 'Dirección física o sede social de la empresa';
COMMENT ON COLUMN public.clients.company_size IS 'Tamaño de la empresa por categoría (Micro, Pequeña, Mediana, Grande)';
COMMENT ON COLUMN public.clients.founded_year IS 'Año de fundación de la empresa';
COMMENT ON COLUMN public.clients.website IS 'URL del sitio web corporativo';
COMMENT ON COLUMN public.clients.revenue_range IS 'Rango de facturación anual estimada';
COMMENT ON COLUMN public.clients.sector IS 'Sector de actividad económica o vertical de negocio';
