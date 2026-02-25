# Comparativa: SQL y estructura del proyecto

## Estado de la Base de Datos (Supabase)

**IMPORTANTE: Para un despliegue completo, deben ejecutarse las 37 migraciones en orden correlativo.**

El esquema actual ha evolucionado significativamente desde el inicio, integrando:

- **RBAC (Role Based Access Control):** Gestión de roles (`admin`, `senior_consultant`, etc.) y permisos vía RLS.
- **Audit Logs:** Trazabilidad completa de acciones de usuarios en proyectos y seguridad.
- **Smart Roadmap:** Sistema de hitos, tareas y plazos con vistas de calendario.
- **IA Writing Instructions:** Almacenamiento de directrices de estilo transversales.

---

## Comparativa de Modelos de Datos

| Característica | Implementación Actual (Migraciones 001-037) | Observaciones |
| :--- | :--- | :--- |
| **Perfiles** | Tabla `profiles` con roles y auditoría integrada. | Trigger automático en `auth.signup`. |
| **Proyectos** | Gestión de estados (`finished`, `archived`), deadlines y presupuestos. | Integrado con `project_collaborators`. |
| **Embeddings** | **pgvector** con dimensión **768**. | Usa el modelo `text-embedding-004`. |
| **Auditoría** | Tabla `audit_logs` con soporte para tiempo real. | Crítico para cumplimiento técnico. |
| **Calendario** | Tablas `project_milestones` y tareas con fechas. | Permite vista unificada en el dashboard. |

### Configuración de Vectores
A diferencia de versiones preliminares, el sistema utiliza **Google GenAI text-embedding-004**, lo que requiere:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Tabla de embeddings con dimensión 768
ALTER TABLE public.document_embeddings ADD COLUMN embedding vector(768);
```

---

## Recomendaciones de Despliegue

1. **Migración Inicial:** Ejecutar `001_initial_schema.sql`.
2. **Ciclo Completo:** No saltar ninguna migración intermedia, especialmente las referidas a `collaborators` y `rbac`, ya que habilitan las políticas de seguridad (RLS) necesarias para la interfaz.
3. **Auditoría:** La migración `032_fix_audit_logs_fk_and_realtime.sql` es vital para que el componente `AuditLogViewer` funcione correctamente en tiempo real.
