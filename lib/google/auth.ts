import { google } from "googleapis";

/**
 * Crea un cliente OAuth2 de Google configurado con las credenciales del entorno.
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

/**
 * Genera la URL de autorización de Google con scope de Drive.
 * @param state - Estado opaco para CSRF protection (ej: projectId o returnUrl)
 */
export function getAuthUrl(state?: string) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state: state ?? "",
  });
}
