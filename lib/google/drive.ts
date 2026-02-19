import { google } from "googleapis";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createOAuth2Client } from "./auth";
import { Readable } from "stream";

interface GoogleTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Obtiene un cliente de Supabase con service_role para manejar tokens.
 */
function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Obtiene los tokens de Google de un usuario desde Supabase.
 * Si el access_token está expirado, lo renueva automáticamente con el refresh_token.
 */
export async function getValidTokens(
  userId: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single<GoogleTokenRow>();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at);
  const now = new Date();

  // Si el token expira en menos de 5 minutos, renovar
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const oauth2 = createOAuth2Client();
      oauth2.setCredentials({ refresh_token: data.refresh_token });
      const { credentials } = await oauth2.refreshAccessToken();

      const newAccessToken = credentials.access_token!;
      const newExpiresAt = new Date(credentials.expiry_date!).toISOString();

      await admin
        .from("google_tokens")
        .update({
          access_token: newAccessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return {
        accessToken: newAccessToken,
        refreshToken: data.refresh_token,
      };
    } catch (err) {
      console.error("Failed to refresh Google token:", err);
      // Token de refresco inválido, eliminar registro para forzar re-autenticación
      await admin.from("google_tokens").delete().eq("user_id", userId);
      return null;
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Sube un archivo a Google Drive.
 * Crea una carpeta "Begitality - Memorias Técnicas" si no existe.
 */
export async function uploadToDrive({
  userId,
  fileName,
  mimeType,
  fileBuffer,
}: {
  userId: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const tokens = await getValidTokens(userId);
  if (!tokens) {
    throw new Error("GOOGLE_NOT_CONNECTED");
  }

  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  const drive = google.drive({ version: "v3", auth: oauth2 });

  // Buscar o crear la carpeta de Begitality
  const folderName = "Begitality - Memorias Técnicas";
  let folderId: string;

  const folderSearch = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id!;
  } else {
    const folderRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = folderRes.data.id!;
  }

  // Subir el archivo
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const fileRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: fileRes.data.id!,
    webViewLink: fileRes.data.webViewLink!,
  };
}

/**
 * Guarda los tokens de Google OAuth para un usuario en Supabase.
 */
export async function saveTokens({
  userId,
  accessToken,
  refreshToken,
  expiresAt,
}: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}) {
  const admin = getAdminClient();

  // Upsert: si ya existe, actualizar
  const { error } = await admin.from("google_tokens").upsert(
    {
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to save Google tokens:", error);
    throw new Error("Failed to save Google tokens");
  }
}

/**
 * Elimina los tokens de Google de un usuario (desconexión).
 */
export async function revokeTokens(userId: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from("google_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  if (data?.access_token) {
    try {
      const oauth2 = createOAuth2Client();
      await oauth2.revokeToken(data.access_token);
    } catch {
      // Ignorar errores de revocación
    }
  }

  await admin.from("google_tokens").delete().eq("user_id", userId);
}
