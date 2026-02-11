# Begitality – Pasos para producción

Este documento describe la configuración necesaria para llevar a producción: **Edge Functions** (IA), **exportación PDF/DOCX** y **pgvector** (motor de reutilización semántico).

---

## Cómo configurar Secrets y desplegar Edge Functions en Supabase

### Opción A: Desde el Dashboard (sin CLI)

1. **Entra en tu proyecto**
   - [supabase.com/dashboard](https://supabase.com/dashboard) → selecciona el proyecto de Begitality.

2. **Añadir secrets**
   - Menú izquierdo: **Project Settings** (icono de engranaje).
   - En el menú de la izquierda de Settings: **Edge Functions**.
   - Pestaña **Secrets**.
   - Pulsa **Add new secret** y crea:
     - **Name:** `GEMINI_API_KEY`  
       **Value:** tu API key de Gemini (por ejemplo desde [aistudio.google.com](https://aistudio.google.com) o Google Cloud).
     - (Opcional) **Name:** `ANTHROPIC_API_KEY`  
       **Value:** tu API key de Anthropic (para usar Claude).

3. **Desplegar las funciones desde la CLI** (necesaria para el deploy)
   - Las Edge Functions no se despliegan desde el Dashboard; hace falta la **Supabase CLI** (ver Opción B).  
   - Si no quieres usar CLI, puedes usar **Supabase Dashboard** → **Edge Functions** → **Deploy** si tu proyecto muestra esa opción; en muchos proyectos el deploy se hace solo por CLI.

### Opción B: Con Supabase CLI (recomendado para desplegar)

1. **Instalar Supabase CLI**
   - Con Homebrew (Mac): `brew install supabase/tap/supabase`
   - Con npm: `npm install -g supabase`
   - O descarga desde [github.com/supabase/cli/releases](https://github.com/supabase/cli/releases)

2. **Iniciar sesión**
   ```bash
   supabase login
   ```
   Se abrirá el navegador para autenticarte.

3. **Vincular el proyecto a tu carpeta**
   - En el Dashboard: **Project Settings** → **General** → **Reference ID** (es el ID del proyecto).
   ```bash
   cd /ruta/a/begitality-proyect-Subv
   supabase link --project-ref TU_PROJECT_REF
   ```
   Te pedirá la **database password** del proyecto (la que definiste al crear el proyecto).

4. **Configurar los secrets**
   ```bash
   supabase secrets set GEMINI_API_KEY=tu_clave_gemini_aqui
   supabase secrets set ANTHROPIC_API_KEY=tu_clave_anthropic_aqui   # opcional
   ```
   Para ver los secrets (solo nombres, no valores):
   ```bash
   supabase secrets list
   ```

5. **Desplegar las funciones**
   ```bash
   supabase functions deploy ai-chat
   supabase functions deploy ai-embed
   ```
   Si quieres desplegar las dos a la vez:
   ```bash
   supabase functions deploy ai-chat && supabase functions deploy ai-embed
   ```

6. **Comprobar**
   - Dashboard → **Edge Functions**: deberías ver `ai-chat` y `ai-embed` con estado “Deployed”.
   - La URL de cada una será:  
     `https://TU_PROJECT_REF.supabase.co/functions/v1/ai-chat`  
     `https://TU_PROJECT_REF.supabase.co/functions/v1/ai-embed`

### Resumen rápido (solo comandos)

```bash
# 1. Login (una vez)
supabase login

# 2. En la carpeta del proyecto, vincular
supabase link --project-ref TU_PROJECT_REF

# 3. Secrets (sustituir por tus keys reales)
supabase secrets set GEMINI_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...   # opcional

# 4. Desplegar
supabase functions deploy ai-chat
supabase functions deploy ai-embed
```

---

## 1. Backend real: Supabase Edge Functions (Gemini / Anthropic)

Las llamadas a IA se hacen desde el servidor (Edge Functions) para no exponer API keys en el cliente.

### Funciones disponibles

| Función      | Ruta (relativa al proyecto)            | Uso                                                            |
| ------------ | -------------------------------------- | -------------------------------------------------------------- |
| **ai-chat**  | `supabase/functions/ai-chat/index.ts`  | Chat con contexto de proyecto (Gemini o Anthropic).            |
| **ai-embed** | `supabase/functions/ai-embed/index.ts` | Generar embeddings (Gemini) para indexar y búsqueda semántica. |

### Secrets en Supabase

Configura los secrets en el dashboard o con la CLI:

```bash
# Con Supabase CLI (desde la raíz del proyecto)
supabase secrets set GEMINI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

O en **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

- `GEMINI_API_KEY`: clave de API de Gemini (chat y embeddings).

- `ANTHROPIC_API_KEY`: clave de API de Anthropic (opcional; si no está, usa solo Gemini).

### Despliegue de las funciones

```bash
supabase functions deploy ai-chat
supabase functions deploy ai-embed
```

### Uso desde el cliente (Next.js)

El cliente debe enviar el JWT de Supabase en `Authorization: Bearer <session.access_token>`.

**ai-chat** (POST):

```ts
const {
  data: { session },
} = await supabase.auth.getSession();
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Redacta el resumen ejecutivo...' }],
      projectContext: 'Convocatoria ICEX 2024. Proyecto X.',
      provider: 'Gemini', // o "anthropic"
      model: 'gpt-4o-mini', // opcional
    }),
  },
);
const { content } = await res.json();
```

**ai-embed** (POST):

```ts
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-embed`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({
      input: 'Texto a convertir en embedding', // o array de strings
      model: 'text-embedding-3-small',
    }),
  },
);
const { embeddings } = await res.json(); // number[] o number[][]
```

---

## 2. Exportación real: PDF y DOCX en el servidor

La generación de binarios se hace en **Next.js** (Node.js), no en Edge, usando **pdf-lib** y **docx**.

### Dependencias

Ya están en `package.json`:

- `pdf-lib`: generación de PDF (compatible con Turbopack/Next.js).
- `docx`: generación de .docx.

Instalación:

```bash
npm install
```

### API de exportación

**POST** `/api/export`

- **Body:** `{ "projectId": "uuid", "format": "pdf" | "docx" }`
- **Auth:** cookies de sesión Supabase (misma sesión que la app).
- **Respuesta:** archivo binario (PDF o DOCX) con `Content-Disposition: attachment`.

Desde el cliente (ya integrado en `ExportView`):

```ts
const res = await fetch('/api/export', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: project.id, format: 'pdf' }),
});
const blob = await res.blob();
// Descargar con createObjectURL + <a download>
```

No hace falta configurar variables de entorno adicionales para export; la autenticación es la sesión de la app.

---

## 3. Motor de reutilización semántico (pgvector + embeddings)

### Migración en Supabase

Ejecutar **después** de `001_initial_schema.sql`:

```sql
-- Contenido de supabase/migrations/002_pgvector_embeddings.sql
```

En **SQL Editor** de Supabase: pegar y ejecutar el contenido de `supabase/migrations/002_pgvector_embeddings.sql`.

Esto:

- Habilita la extensión **vector**.
- Crea la tabla **document_embeddings** (fragmentos de texto + `embedding vector(1536)`).
- Crea el índice HNSW para búsqueda por similitud.
- Crea la función **match_embeddings(project_id, query_embedding, match_count, match_threshold)**.

### Flujo típico

1. **Indexar:**
   - Trocear documentos (convocatoria, secciones, propuestas previas).
   - Llamar a **ai-embed** con cada trozo.
   - Insertar en `document_embeddings` con `project_id`, `source_type`, `source_id`, `content`, `embedding`.

2. **Buscar reutilización:**
   - El usuario escribe una consulta (ej. “presupuesto y viabilidad”).
   - Llamar a **ai-embed** con esa consulta → `query_embedding`.
   - En Supabase (desde el cliente o desde una Edge Function):
     ```ts
     const { data } = await supabase.rpc('match_embeddings', {
       p_project_id: projectId,
       p_query_embedding: queryEmbedding,
       p_match_count: 5,
       p_match_threshold: 0.7,
     });
     ```
   - Usar los `content` devueltos como contexto para **ai-chat** (redacción o reutilización).

### Dimensiones del embedding

Gemini **text-embedding-3-small** devuelve **1536** dimensiones, que coincide con la columna `vector(1536)` en la migración. Si cambias de modelo, ajusta la migración y la tabla.

---

## Resumen de comprobaciones

| Componente         | Comprobar                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edge Functions** | Secrets `GEMINI_API_KEY` y opcionalmente `ANTHROPIC_API_KEY`; despliegue de `ai-chat` y `ai-embed`; llamadas con `Authorization: Bearer <token>`. |
| **Exportación**    | `npm install` (pdfkit, docx); POST `/api/export` con `projectId` y `format`; sesión de Supabase en cookies.                                       |
| **pgvector**       | Ejecutar `002_pgvector_embeddings.sql`; indexar con **ai-embed** e insertar en `document_embeddings`; búsqueda con `match_embeddings`.            |

Si quieres, el siguiente paso puede ser implementar en la UI el flujo completo: **indexar** al cargar bases, **buscar** en el asistente y **redactar** con **ai-chat** usando el contexto devuelto por `match_embeddings`.
