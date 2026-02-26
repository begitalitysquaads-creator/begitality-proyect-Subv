-- Begitality - Chat por Sección

-- Añadir section_id a ai_messages para hilos independientes
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE;

-- Índice para mejorar la carga del chat
CREATE INDEX IF NOT EXISTS idx_ai_messages_section_id ON public.ai_messages(section_id);
