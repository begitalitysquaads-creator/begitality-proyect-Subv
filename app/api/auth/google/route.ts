import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google
 * Inicia el flujo OAuth con Google para autorizar acceso a Drive.
 * Acepta un query param `returnUrl` para redirigir al usuario después del callback.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const returnUrl = searchParams.get("returnUrl") ?? "/dashboard";

  // Codificamos returnUrl en el state para recuperarlo en el callback
  const state = JSON.stringify({ returnUrl, userId: user.id });
  const stateEncoded = Buffer.from(state).toString("base64url");

  const authUrl = getAuthUrl(stateEncoded);

  // Debug: ver la URL generada y el redirect_uri que se está usando
  console.log("[Google OAuth] GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
  console.log("[Google OAuth] Auth URL:", authUrl);

  return NextResponse.redirect(authUrl);
}
