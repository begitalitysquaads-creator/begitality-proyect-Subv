# 🚀 Begitality | Executive AI Grant Hub (2026 Edition)

Plataforma de inteligencia estratégica para la gestión avanzada de subvenciones públicas. Begitality redefine la consultoría técnica mediante la automatización de alto nivel, utilizando IA generativa de última generación (Gemini 3) para la redacción, auditoría y optimización de expedientes técnicos.

---

## 🛠️ Stack Tecnológico (Elite Core)

- **Framework:** Next.js 16.1 (App Router + Turbopack)
- **Runtime:** Bun / Node.js 22 (LTS)
- **Database & Auth:** Supabase (PostgreSQL 17 + RLS Enforcement)
- **Vector Engine:** pgvector para RAG (Retrieval-Augmented Generation)
- **AI Core:** Google Generative AI (gemini-3-flash-preview) • v1beta API
- **UI/UX:** Tailwind CSS 4 (Oxide), Radix UI, Lucide Icons
- **Type Safety:** TypeScript 5.7 (Strict Mode)

---

## ✨ Funcionalidades Premium

### 🧠 Inteligencia Documental (RAG)
- **Ficha Técnica Inteligente:** Extracción automática de KPIs (Importes, Intensidad, Plazos) desde PDFs oficiales. Permite refinado manual con sincronización en base de datos.
- **Contexto de Redacción:** Panel dinámico para inyectar directrices de estilo, tono y enfoque técnico que la IA aplica transversalmente.

### 🛡️ Auditoría y Control
- **Diagnóstico IA Premium:** Evaluación proactiva de la calidad de la memoria técnica con puntuación (Score 0-100) y detección de riesgos técnicos.
- **Historial de Actividad (Audit Trail):** Trazabilidad absoluta en tiempo real de todos los cambios realizados por el equipo (logs inmutables).

### ⚡ Operaciones de Alto Rendimiento
- **Comandos IA Dinámicos:** Modificación de textos en tiempo real mediante lenguaje natural ("Hazlo más técnico", "Resume a 500 palabras").
- **Smart Roadmap:** Plan de acción autogenerado desde las bases de la convocatoria con gestión documental integrada.
- **Simulador Financiero:** Cálculo dinámico de ROI y subvención estimada basado en la intensidad de ayuda.

---

## 🚀 Setup de Desarrollo

1. **Dependencias**
   ```bash
   npm install
   ```

2. **Entorno Operativo**
   Configurar `.env.local` con las credenciales de Supabase y Gemini:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   GEMINI_API_KEY=...
   ```

3. **Arquitectura de Datos**
   - Ejecutar migraciones en orden correlativo desde `supabase/migrations/`.
   - **Crítico:** Asegurar la ejecución de `032_fix_audit_logs_fk_and_realtime.sql` para habilitar la trazabilidad de usuarios.

4. **Ejecución**
   ```bash
   npm run dev
   ```

---

## 🏗️ Estructura de la Aplicación

```text
app/
  ├── (auth)/           # Flujos de acceso blindados
  ├── api/              # Endpoints de IA y Operaciones Técnicas
  ├── dashboard/        # Centro de control ejecutivo
  └── layout.tsx        # Inyección de Begitality Design System
components/
  ├── project/          # Módulos de inteligencia (Ficha IA, Diagnóstico, etc.)
  ├── ui/               # Componentes Premium (Selectors, DatePickers)
  └── export/           # Motor de generación DOCX/PDF
lib/
  ├── ai.ts             # Configuración Gemini 3 v1beta
  ├── audit-client.ts   # Sistema de logging de cliente
  └── supabase/         # Clientes de base de datos (Server/Client)
```

---

## 📊 Roadmap de Evolución

- [x] **Fase 1:** Arquitectura y RBAC (Role Based Access Control).
- [x] **Fase 2:** Ingesta RAG y Ficha Técnica Inteligente.
- [x] **Fase 3:** Diagnóstico de Calidad y Comandos IA.
- [x] **Fase 4:** Historial de Auditoría y Refinamiento Premium UI.
- [ ] **Fase 5:** Integración con APIs de firma digital y registro oficial.

---

## ⚖️ Licencia y Propiedad

Begitality es una plataforma propietaria optimizada para consultoría de alto nivel. Todos los derechos reservados © 2026.
