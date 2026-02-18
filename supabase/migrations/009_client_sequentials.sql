-- Begitality - Número de Cliente Secuencial

-- Crear una secuencia para los clientes
CREATE SEQUENCE IF NOT EXISTS client_number_seq;

-- Añadir la columna client_code a la tabla clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;

-- Función para generar el código automáticamente (ej: CL-0001)
CREATE OR REPLACE FUNCTION public.set_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    NEW.client_code := 'CL-' || LPAD(nextval('client_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar el código al insertar
DROP TRIGGER IF EXISTS tr_set_client_code ON public.clients;
CREATE TRIGGER tr_set_client_code
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_client_code();
