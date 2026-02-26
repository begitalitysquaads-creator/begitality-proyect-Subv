# Guía de Configuración de Google OAuth para Begitality

Para habilitar el Inicio de Sesión Único (SSO) con Google y la integración con Google Drive, sigue estos pasos:

## 1. Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto llamado "Begitality".
3. Navega a **APIs & Services > Credentials**.
4. **Configure Consent Screen**:
   - Tipo de usuario: **Externo**.
   - Scopes (Alcances) obligatorios para Begitality:
     - `.../auth/userinfo.email` (Identidad)
     - `.../auth/userinfo.profile` (Nombre y Foto)
     - `https://www.googleapis.com/auth/drive.file` (Para crear y subir las memorias técnicas)
     - `https://www.googleapis.com/auth/drive.metadata.readonly` (Para organizar carpetas)
5. **Create Credentials > OAuth Client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs**: Introduce la URL de callback de tu proyecto de Supabase.
     - Formato: `https://[TU-PROJECT-ID].supabase.co/auth/v1/callback`

## 2. Panel de Supabase
1. Ve a **Authentication > Providers > Google**.
2. Activa el provider.
3. Introduce el **Client ID** y el **Client Secret** generados en Google Cloud.
4. **IMPORTANTE**: Asegúrate de que la opción "Skip nonce check" esté configurada según los requerimientos de tu versión de Supabase (normalmente desactivada).

## 3. ⚠️ Política de Acceso (Plataforma Cerrada)
Begitality está configurada como una plataforma de alta seguridad por invitación. 
- **No basta con tener una cuenta de Google.**
- El usuario **debe ser invitado previamente** desde el Panel de Administración de Begitality (o vía `auth.admin.inviteUserByEmail`).
- Si un usuario no invitado intenta entrar con Google, el sistema **borrará su cuenta automáticamente** y le denegará el acceso en el callback de autenticación.

## 4. Variables de Entorno (.env.local)
Verifica que estas variables apunten a tu instancia activa:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 5. Verificación
1. Ve a `/login`.
2. Pulsa "Continuar con Google".
3. Tras autorizar, deberías ser redirigido a `/dashboard` si tu email ya estaba registrado en el sistema.
