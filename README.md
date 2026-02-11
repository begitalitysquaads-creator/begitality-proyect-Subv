# Begitality

Plataforma inteligente de gestión de subvenciones. Automatiza la redacción de memorias técnicas para convocatorias públicas con IA contextual (sin re-contextualizar en cada proyecto).

## Stack

- **Framework:** Next.js 16.1 (App Router)
- **Lenguaje:** TypeScript
- **Backend/DB:** Supabase (Auth, DB, Storage)
- **UI:** React, Radix UI, TailwindCSS
- **IA:** gemini/Anthropic (Etapa 3)

## Requisitos

- Node.js 20.9+ (LTS)
- Cuenta [Supabase](https://supabase.com)

## Setup

1. **Clonar e instalar**

   ```bash
   npm install
   ```

2. **Variables de entorno**
   - Copiar `.env.example` a `.env.local`
   - En el dashboard de Supabase: Project Settings → API → anotar `Project URL` y `anon public` key
   - Rellenar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Base de datos**
   - En Supabase: SQL Editor → New query
   - Pegar y ejecutar el contenido de `supabase/migrations/001_initial_schema.sql` (ver `docs/COMPARATIVA-SQL-Y-ESTRUCTURA.md` para comparativa con otros SQLs).
   - Para **cargar PDFs de convocatoria**: ejecutar también `supabase/migrations/003_storage_convocatoria.sql` (crea el bucket y las políticas de Storage). Si el INSERT del bucket falla, crea el bucket desde Dashboard → Storage → New bucket (id: `convocatoria-files`, privado) y vuelve a ejecutar solo las políticas del mismo fichero.

4. **Auth (confirmación de email / OAuth)**
   - En Supabase: Authentication → URL Configuration
   - Añadir en **Redirect URLs**: `http://localhost:3000/auth/callback` (y la URL de producción cuando corresponda).

5. **Arrancar**
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto (Etapa 1)

```
app/
  layout.tsx              # Layout raíz + fuentes
  page.tsx                # Landing (sin auth)
  globals.css
  (auth)/
    login/page.tsx
    signup/page.tsx
  auth/callback/route.ts  # Intercambio de code por sesión (email confirm / OAuth)
  dashboard/
    layout.tsx            # Sidebar + área principal
    page.tsx              # Panel con proyectos
    projects/
      page.tsx            # Lista de proyectos
      new/page.tsx        # Crear proyecto
      [id]/page.tsx       # Espacio de trabajo (S2)
      [id]/export/page.tsx
    history/page.tsx
components/
  ui/sidebar.tsx
  export/ExportView.tsx
lib/
  supabase/client.ts
  supabase/server.ts
  types.ts
  utils.ts
supabase/
  migrations/001_initial_schema.sql
middleware.ts             # Auth + protección rutas
```

## Etapas de desarrollo

- **Etapa 1 (S1):** Arquitectura base, Auth Supabase, Dashboard y navegación lateral. ✅
- **Etapa 2 (S2):** Espacio de trabajo por proyecto, “Cargar Bases”, esquema DB completo.
- **Etapa 3 (S3):** Asistente IA, motor de reutilización, checklists dinámicos.
- **Etapa 4 (S4):** Exportación PDF/Word, flujo completo, refinamiento visual.

## Producción (Edge Functions, PDF/DOCX, pgvector)

Ver **[docs/PRODUCCION.md](docs/PRODUCCION.md)** para:

- Configurar **Supabase Edge Functions** (ai-chat, ai-embed) y secrets (Gemini/Anthropic).
- Uso de la **API de exportación** (PDF/DOCX) en `/api/export`.
- Migración **pgvector** y motor de reutilización semántico (`002_pgvector_embeddings.sql`).

## Nota

El archivo `index.tsx` en la raíz es la versión monolítica anterior; la aplicación actual está en la estructura Next.js descrita arriba.
