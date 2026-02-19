import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidTokens } from "@/lib/google/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/status
 * Verifica si el usuario tiene una conexión válida con Google Drive.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await getValidTokens(user.id);

  return NextResponse.json({
    connected: tokens !== null,
  });
}

/**
 * DELETE /api/auth/google/status
 * Desconecta Google Drive (revoca y elimina tokens).
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { revokeTokens } = await import("@/lib/google/drive");
  await revokeTokens(user.id);

  return NextResponse.json({ disconnected: true });
}
