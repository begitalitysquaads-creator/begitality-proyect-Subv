Estructura de Archivos Inicial (Next.js 16.1 + App Router)
Esta estructura aprovecha la estabilidad de Turbopack y el nuevo estándar proxy.ts para gestionar la autenticación y seguridad en la frontera de la aplicación.

begitality/
├── src/
│ ├── app/
│ │ ├── (auth)/ # Grupo de rutas para login/registro
│ │ │ ├── login/page.tsx
│ │ │ └── auth-callback/route.ts
│ │ ├── (dashboard)/ # Layout principal con Sidebar
│ │ │ ├── layout.tsx # Contiene la barra lateral de Squaads
│ │ │ ├── page.tsx # Dashboard principal con métricas
│ │ │ └── projects/ # Gestión de expedientes aislados
│ │ │ ├── [id]/page.tsx
│ │ │ └── new/page.tsx
│ │ ├── proxy.ts # Frontera de red (sustituye middleware.ts)  
│ │ ├── layout.tsx # Root Layout con Radix Theme Provider
│ │ └── globals.css # Tailwind + Material Minimal  
│ ├── components/
│ │ ├── ui/ # Componentes de Radix UI (Atomic Design)  
│ │ │ ├── button.tsx
│ │ │ ├── sidebar.tsx
│ │ │ └── card.tsx
│ │ └── shared/ # Componentes de negocio reutilizables
│ ├── lib/
│ │ ├── supabase/ # Configuración SSR  
│ │ │ ├── client.ts # createBrowserClient
│ │ │ └── server.ts # createServerClient
│ │ └── ai/ # Capa de integración con Gemini/Anthropic
│ │ └── context.ts # Lógica de inyección de contexto
│ └── types/ # Definiciones de TypeScript
├── supabase/ # Migraciones y Seed data
│ └── migrations/
├── tailwind.config.ts # Tokens de diseño Squaads
└── next.config.ts # Habilitación de Turbopack y Cache Components
