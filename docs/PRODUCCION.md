# Begitality – Guía de Producción

Este documento detalla los pasos para el despliegue de infraestructura crítica: Edge Functions (IA), Exportación Documental y motor pgvector.

---

## 1. Backend IA: Supabase Edge Functions

El sistema delega la lógica pesada de IA a Edge Functions para proteger las API Keys y mejorar la latencia.

### Funciones Disponibles
- **`ai-chat`**: Orquestación de Gemini 3 Flash con contexto de proyecto.
- **`ai-embed`**: Generación de vectores semánticos (Dimensión 768) usando `text-embedding-004`.

### Despliegue con Supabase CLI
```bash
# 1. Vincular proyecto
supabase link --project-ref TU_PROJECT_ID

# 2. Configurar Secrets
supabase secrets set GEMINI_API_KEY=tu_clave_aqui

# 3. Deploy
supabase functions deploy ai-chat
supabase functions deploy ai-embed
```

---

## 2. Motor de Exportación (PDF/DOCX)

La generación de archivos se ejecuta en el entorno Node.js de Next.js para mayor compatibilidad con librerías de buffer.

### Librerías Utilizadas
- **`jspdf`**: Generación de informes técnicos de calidad y certificados de viabilidad con diseño premium.
- **`docx`**: Construcción de borradores de memorias técnicas compatibles con Microsoft Word.

### Endpoints de API
- **POST `/api/export`**: Generación de la memoria técnica completa.
- **POST `/api/export/review`**: Generación del Informe de Auditoría Técnica.
- **POST `/api/export/viability`**: Generación del Certificado de Viabilidad IA.

---

## 3. Base de Datos y Vectores

### Configuración pgvector
Asegúrate de que la base de datos tenga habilitada la extensión y la dimensión correcta para el modelo de Google:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- El modelo text-embedding-004 genera 768 dimensiones
ALTER TABLE public.document_embeddings ADD COLUMN embedding vector(768);
```

### Comprobación de Producción
| Componente | Requisito |
| :--- | :--- |
| **Edge Functions** | Secret `GEMINI_API_KEY` configurado. |
| **CORS** | Dominios de producción permitidos en Supabase. |
| **Auth** | Redirect URL de Google OAuth configurada en el dashboard de Supabase. |
