# Comparativa: SQL y estructura del proyecto

## Qué ejecutar en Supabase para la creación inicial

**Recomendación: ejecutar `supabase/migrations/001_initial_schema.sql`.**

Es el más completo para la fase actual porque incluye:

- **profiles** + trigger que crea el perfil al registrarse (necesario para login/UI).
- **projects** con `grant_name` y `grant_type` (alineado con el dashboard y convocatorias).
- **sections** (memoria técnica por proyecto), **convocatoria_bases**, **checklist_items**, **ai_messages**.
- **RLS** definido en todas las tablas (no solo en `projects`).
- **Índices** para consultas por `user_id` y `project_id`.
- **Trigger** `on_auth_user_created` → `handle_new_user()`.

---

## Comparativa con `creacion-de-tablas.sql` (tu fichero)

| Aspecto | 001_initial_schema.sql (mío) | creacion-de-tablas.sql (tuyo) |
|--------|------------------------------|------------------------------|
| **profiles** | Sí (con plan, trigger) | No |
| **projects** | name, grant_name, grant_type, status (draft/in_progress/ready_export/exported) | name, description, deadline, status (draft/review/completed) |
| **Documentos** | convocatoria_bases (solo bases) | documents con type: grant_basis, technical_memory, previous_proposal |
| **Secciones / contenido** | sections (título, contenido, orden) para la memoria | document_sections (contenido + **embedding vector(1536)**) por documento |
| **Checklist** | checklist_items (label, required, checked) | requirements (label, description, is_completed, **source_fragment_id**) |
| **IA** | ai_messages (chat por proyecto) | — |
| **RLS** | Todas las tablas con políticas concretas | Solo projects; indica “repetir para documentos…” pero no está escrito |
| **Extensión** | uuid-ossp | **admin vector** (error: la extensión correcta es `vector` de pgvector) |
| **Trigger signup** | Sí | No |

### Qué tiene de mejor el tuyo y conviene incorporar después

1. **document_sections con `embedding vector(1536)`**  
   Es la base para el “cerebro” de la IA (búsqueda semántica, motor de reutilización). En 001 no hay embeddings; en una **segunda migración** se puede añadir pgvector y esta tabla (o unificar con `sections` si quieres una sola fuente de verdad).

2. **documents** unificada con `type`  
   Un solo modelo para bases de convocatoria, memoria técnica y propuestas previas es más escalable. Se puede añadir en una 002 o mantener `convocatoria_bases` para “bases” y añadir `documents` solo para “propuestas previas” y memoria si lo prefieres.

3. **requirements** con `description` y **source_fragment_id**  
   Muy útil para trazabilidad (qué requisito viene de qué fragmento del documento). Se puede añadir a `checklist_items` en una migración (columnas opcionales).

4. **projects.description** y **projects.deadline**  
   Son útiles; se pueden añadir a la tabla `projects` en una 002 sin romper nada.

### Error en tu SQL

- `create extension if admin vector` es incorrecto.  
- La extensión para vectores en Supabase es **pgvector**, y se habilita con:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
  En 001 no está porque no usamos embeddings aún; en la migración que añada IA (embedding) habrá que poner esta línea.

---

## Resumen

- **Para crear las tablas ahora y que login/dashboard funcionen:**  
  Ejecuta en el SQL Editor de Supabase: **`supabase/migrations/001_initial_schema.sql`**.

- **Tu `creacion-de-tablas.sql`:**  
  No usarlo tal cual (error en la extensión, RLS incompleto, sin profiles/trigger).  
  Sus ideas (documents, document_sections con embedding, requirements con source_fragment_id, description/deadline en projects) se pueden llevar a una **002_embedding_and_documents.sql** cuando avances con la Etapa 3 (IA y reutilización).

---

## Estructura del proyecto: EXTRUCTURA.md vs lo implementado

- **Rutas:**  
  La app usa **`app/` en la raíz** (no `src/app/`). Ambas son válidas en Next.js; la raíz es la más habitual con `create-next-app`.

- **Auth:**  
  Se ha añadido **`app/auth/callback/route.ts`** como en tu EXTRUCTURA (auth-callback).  
  Sirve para:
  - Confirmación de email (link que Supabase redirige con `?code=...`).
  - OAuth (Google, etc.) si lo activas.

- **Configuración en Supabase:**  
  En **Authentication → URL Configuration** añade en “Redirect URLs”:
  - `http://localhost:3000/auth/callback` (desarrollo)
  - Y tu URL de producción cuando la tengas.

- **Middleware vs proxy:**  
  Tu doc menciona **proxy.ts** (nuevo estándar en Next.js 16).  
  La app sigue usando **middleware.ts** (sigue funcionando; Next.js muestra aviso de deprecación).  
  Cuando quieras migrar a proxy, se puede sustituir por la convención `proxy.ts` y `getClaims()` según la doc de Supabase.

- **Carpetas que tienes en EXTRUCTURA y están (o estarán) en el proyecto:**  
  - `(auth)/login`, `(auth)/signup` ✅  
  - `auth/callback` ✅ (recién añadido)  
  - `(dashboard)/layout`, `page`, `projects/[id]`, `projects/new` ✅  
  - `lib/supabase/client.ts`, `server.ts` ✅  
  - `lib/ai/` y `context.ts` → para Etapa 3 (IA).  
  - `types/` → actualmente los tipos están en `lib/types.ts`; se puede mover a `types/` si prefieres.
