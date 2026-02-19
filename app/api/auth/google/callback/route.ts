import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuth2Client } from "@/lib/google/auth";
import { saveTokens } from "@/lib/google/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 * Callback de Google OAuth. Intercambia el code por tokens y los guarda.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  // Si el usuario denegó el acceso
  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard?google_error=access_denied", req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?google_error=no_code", req.url)
    );
  }

  // Decodificar state
  let returnUrl = "/dashboard";
  let stateUserId: string | null = null;
  if (stateParam) {
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      );
      returnUrl = decoded.returnUrl || "/dashboard";
      stateUserId = decoded.userId || null;
    } catch {
      // State inválido, usar valores por defecto
    }
  }

  // Verificar que el usuario está autenticado en Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=session_expired", req.url)
    );
  }

  // Verificar que el userId del state coincide con el usuario actual
  if (stateUserId && stateUserId !== user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?google_error=user_mismatch", req.url)
    );
  }

  // Intercambiar code por tokens
  try {
    const oauth2 = createOAuth2Client();
    console.log("[Google OAuth Callback] Exchanging code for tokens...");
    const { tokens } = await oauth2.getToken(code);
    console.log("[Google OAuth Callback] Tokens received:", {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard?google_error=missing_access_token", req.url)
      );
    }

    // Google puede no enviar refresh_token si ya se autorizó antes.
    // En ese caso usamos un placeholder y el usuario deberá re-autorizar si expira.
    const refreshToken = tokens.refresh_token ?? "";

    console.log("[Google OAuth Callback] Saving tokens for user:", user.id);
    await saveTokens({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    });
    console.log("[Google OAuth Callback] Tokens saved successfully");

    // Añadir indicador de éxito a la URL de retorno
    const redirectUrl = new URL(returnUrl, req.url);
    redirectUrl.searchParams.set("google_connected", "true");

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[Google OAuth Callback] ERROR:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`/dashboard?google_error=token_exchange_failed&detail=${encodeURIComponent(message)}`, req.url)
    );
  }
}
