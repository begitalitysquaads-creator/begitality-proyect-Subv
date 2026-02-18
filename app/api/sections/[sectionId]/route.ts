import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/sections/:sectionId — actualizar contenido y/o estado de una sección
export async function PATCH(
    req: Request,
    context: { params: Promise<{ sectionId: string }> }
) {
    const { sectionId } = await context.params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: { content?: string; title?: string; is_completed?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Construir objeto de actualización solo con campos proporcionados
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.content === "string") updates.content = body.content;
    if (typeof body.title === "string") updates.title = body.title;
    if (typeof body.is_completed === "boolean") updates.is_completed = body.is_completed;

    const { data, error } = await supabase
        .from("sections")
        .update(updates)
        .eq("id", sectionId)
        .select("id, title, content, is_completed, sort_order, updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
        return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, section: data });
}
