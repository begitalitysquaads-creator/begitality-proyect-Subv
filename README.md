# 🚀 Begitality | Executive AI Grant Hub (2026 Edition)

Plataforma de inteligencia estratégica para la gestión avanzada de subvenciones públicas. Begitality redefine la consultoría técnica mediante la automatización de alto nivel, utilizando IA generativa de última generación (Gemini 3) para la redacción, auditoría y optimización de expedientes técnicos.

---

## 🛠️ Stack Tecnológico (Elite Core)

- **Framework:** Next.js 16.1 (App Router + Turbopack)
- **Runtime:** Bun / Node.js 22 (LTS)
- **Database & Auth:** Supabase (PostgreSQL 17 + RLS Enforcement)
- **Vector Engine:** pgvector para RAG (Retrieval-Augmented Generation)
- **AI Core:** Google Generative AI (Gemini 3 Flash) • v1beta API
- **Export:** Motor premium con jsPDF y docx
- **UI/UX:** Tailwind CSS 4 (Oxide), Radix UI, Lucide Icons
- **Type Safety:** TypeScript 5.7 (Strict Mode)

---

## ✨ Funcionalidades Premium

### 🧠 Inteligencia Documental (RAG)
- **Ficha Técnica Inteligente:** Extracción automática de KPIs (Importes, Intensidad, Plazos) desde PDFs oficiales.
- **Contexto de Redacción:** Panel dinámico para inyectar directrices de estilo y enfoque técnico transversal.

### 🛡️ Auditoría y Control (Audit Trail)
- **Historial de Actividad:** Trazabilidad absoluta en tiempo real de todos los cambios realizados por el equipo.
- **Diagnóstico IA:** Evaluación proactiva de la calidad de la memoria con puntuación (Score 0-100).

### 📅 Planificación Estratégica
- **Calendario Unificado:** Gestión visual de hitos, tareas y plazos críticos de entrega.
- **Smart Roadmap:** Plan de acción autogenerado desde las bases de la convocatoria.

### 👥 Administración y Seguridad
- **Gestión de Usuarios:** Panel administrativo para control de roles (RBAC) e invitaciones.
- **Seguridad Blindada:** Flujos de acceso verificados y políticas de RLS a nivel de base de datos.

---

## 🚀 Setup de Desarrollo

1. **Dependencias**
   ```bash
   bun install
   ```

2. **Entorno Operativo**
   Configurar `.env.local` con credenciales de Supabase y Gemini.

3. **Arquitectura de Datos**
   - Ejecutar las 37 migraciones en orden correlativo desde `supabase/migrations/`.

4. **Ejecución**
   ```bash
   bun dev
   ```

---

## 🏗️ Estructura de la Aplicación

```text
app/
  ├── (auth)/           # Flujos de acceso blindados (Login, MFA)
  ├── api/              # Endpoints de IA, Exportación y Admin
  ├── dashboard/        # Centro de control (Admin, Calendar, CRM)
  └── auth/             # Callbacks de OAuth
components/
  ├── project/          # Módulos de inteligencia de negocio
  ├── ui/               # Componentes Premium Begitality
  └── export/           # Vistas de previsualización documental
lib/                    # Core: AI, Audit, Auth, Supabase
```

---

## 📊 Roadmap de Evolución

- [x] **Fase 1:** Arquitectura, RBAC y Seguridad Blindada.
- [x] **Fase 2:** Ingesta RAG y Ficha Técnica Inteligente.
- [x] **Fase 3:** Diagnóstico de Calidad y Comandos IA.
- [x] **Fase 4:** Calendario de Hitos y Trazabilidad (Audit Log).
- [x] **Fase 5:** Panel de Administración y Optimización Técnica.
- [ ] **Fase 6:** Integración con firma digital y registro oficial.

---

## ⚖️ Licencia y Propiedad

Begitality es una plataforma propietaria optimizada para consultoría de alto nivel. Todos los derechos reservados © 2026.
