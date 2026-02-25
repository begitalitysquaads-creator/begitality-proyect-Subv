# Estructura del Proyecto (Next.js 16.1 + App Router)

Esta estructura aprovecha la estabilidad de Turbopack y el sistema de App Router nativo para gestionar la lógica de negocio y la interfaz de usuario.

```text
begitality/
├── app/                        # Directorio principal de la aplicación (App Router)
│   ├── (auth)/                 # Grupo de rutas para autenticación blindada
│   │   ├── login/              # Página de acceso
│   │   ├── forgot-password/    # Recuperación de cuenta
│   │   └── update-password/    # Cambio de contraseña segura
│   ├── api/                    # Endpoints de Backend (IA, Export, Admin)
│   │   ├── admin/              # Gestión de usuarios y trabajadores
│   │   ├── export/             # Motor de generación de PDF/DOCX
│   │   └── projects/           # Operaciones técnicas de expedientes
│   ├── auth/
│   │   └── callback/           # Manejador de flujo OAuth y confirmaciones
│   ├── dashboard/              # Centro de control ejecutivo
│   │   ├── admin/              # Panel de administración de sistema
│   │   ├── calendar/           # Gestión unificada de plazos e hitos
│   │   ├── clients/            # CRM de clientes y expedientes
│   │   ├── history/            # Registro histórico de memorias
│   │   └── projects/           # Workspace de trabajo técnico
│   ├── layout.tsx              # Root Layout con Begitality Design System
│   └── middleware.ts           # Frontera de seguridad y redirección
├── components/                 # Módulos de interfaz reutilizables
│   ├── project/                # Componentes de lógica de negocio (Ficha IA, Diagnóstico)
│   ├── ui/                     # Componentes Premium (Atomic Design)
│   └── export/                 # Vistas de previsualización de exportación
├── lib/                        # Núcleo de lógica y utilidades
│   ├── ai.ts                   # Configuración Gemini 3 Flash
│   ├── audit.ts                # Sistema de trazabilidad (Audit Trail)
│   ├── auth.ts                 # Helpers de autorización y roles
│   ├── types.ts                # Definiciones globales de TypeScript
│   └── supabase/               # Clientes SSR (Server/Client)
├── supabase/                   # Infraestructura de base de datos
│   ├── functions/              # Edge Functions (IA Chat & Embed)
│   └── migrations/             # Historial de 37 migraciones (SQL)
├── scripts/                    # Scripts de utilidad (Extracción PDF)
├── tailwind.config.ts          # Tokens de diseño Squaads (Material Minimal)
└── next.config.ts              # Optimización de compilación y caché
```

### Notas Técnicas
- **Ubicación:** El proyecto usa la raíz `/app` (no `/src/app`) siguiendo la convención moderna de Next.js.
- **Seguridad:** El archivo `middleware.ts` gestiona la protección de rutas y la persistencia de sesiones de Supabase.
- **Tipado:** Los tipos están centralizados en `lib/types.ts` para asegurar coherencia entre el frontend y las APIs.
