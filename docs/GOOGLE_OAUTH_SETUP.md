# Guía de Configuración de Google OAuth para Begitality

Para habilitar el Inicio de Sesión Único (SSO) con Google en tu aplicación, sigue estos pasos:

## 1. Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un nuevo proyecto o selecciona uno existente.
3. Navega a **APIs & Services > Credentials**.
4. Haz clic en **Configure Consent Screen**:
   - Tipo de usuario: Externo.
   - Completa la información básica (App name, support email, etc.).
   - Agrega los alcances (scopes):
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `.../auth/drive.file` (Para crear y subir memorias técnicas)
     - `.../auth/drive.metadata.readonly` (Para listar carpetas)
5. Haz clic en **Create Credentials > OAuth Client ID**:
   - Application type: Web application.
   - **Authorized redirect URIs**: Agrega la URL de redirección de Supabase.
     - Formato: `https://[TU-PROJECT-ID].supabase.co/auth/v1/callback`

## 2. Panel de Supabase
1. Ve al Dashboard de tu proyecto en Supabase.
2. Navega a **Authentication > Providers**.
3. Busca **Google** y actívalo.
4. Introduce el **Client ID** y el **Client Secret** obtenidos en el paso anterior.
5. Guarda los cambios.

## 3. Variables de Entorno (.env.local)
Asegúrate de tener configuradas las variables base:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 4. Verificación
- El botón "Continuar con Google" en `/login` ahora debería redirigirte a la pantalla de selección de cuenta de Google.
- Tras el éxito, serás redirigido a `/dashboard`.
