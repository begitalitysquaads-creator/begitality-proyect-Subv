import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/sections/:sectionId — actualizar contenido, título y/o estado de una sección
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
        .select("id, title, content, is_completed, sort_order, updated_at, project_id")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
        return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", data.project_id)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, section: data });
}

// DELETE /api/sections/:sectionId — eliminar una sección
export async function DELETE(
    _req: Request,
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

    // Obtener la sección para verificar pertenencia
    const { data: section } = await supabase
        .from("sections")
        .select("id, title, project_id")
        .eq("id", sectionId)
        .single();

    if (!section) {
        return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", section.project_id)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { error } = await supabase
        .from("sections")
        .delete()
        .eq("id", sectionId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
        userId: user.id,
        projectId: section.project_id,
        action: "section_deleted",
        description: `Sección eliminada: "${section.title}"`,
        metadata: { section_id: sectionId, section_title: section.title },
    });

    return NextResponse.json({ ok: true });
}
