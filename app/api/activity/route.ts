import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST: registrar actividad desde el cliente */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, action, description, metadata } = body;

  if (!action) {
    return NextResponse.json({ error: "action requerido" }, { status: 400 });
  }

  await logActivity({
    userId: user.id,
    projectId,
    action,
    description,
    metadata,
  });

  return NextResponse.json({ ok: true });
}
