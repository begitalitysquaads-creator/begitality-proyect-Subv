import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/:projectId/status — actualizar estado del proyecto
export async function PATCH(
    req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: { status: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const validStatuses = ["draft", "in_progress", "ready_export", "exported"];
    if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
            { error: `Estado inválido. Valores permitidos: ${validStatuses.join(", ")}` },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("projects")
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("user_id", user.id)
        .select("id, status, updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, project: data });
}
