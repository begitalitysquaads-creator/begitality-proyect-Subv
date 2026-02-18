import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/:projectId — editar nombre y/o convocatoria del proyecto
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

    let body: { name?: string; grant_name?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string" && body.name.trim()) {
        updates.name = body.name.trim().slice(0, 255);
    }
    if (typeof body.grant_name === "string" && body.grant_name.trim()) {
        updates.grant_name = body.grant_name.trim().slice(0, 500);
    }

    if (Object.keys(updates).length === 1) {
        return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId)
        .eq("user_id", user.id)
        .select("id, name, grant_name, status, updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    await logActivity({
        userId: user.id,
        projectId,
        action: "project_updated",
        description: `Proyecto actualizado: "${data.name}"`,
        metadata: { updated_fields: Object.keys(updates).filter(k => k !== "updated_at") },
    });

    return NextResponse.json({ ok: true, project: data });
}

// DELETE /api/projects/:projectId — eliminar un proyecto completo
export async function DELETE(
    _req: Request,
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

    // Verificar propiedad antes de borrar
    const { data: project } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
        userId: user.id,
        action: "project_deleted",
        description: `Proyecto eliminado: "${project.name}"`,
        metadata: { project_id: projectId, project_name: project.name },
    });

    return NextResponse.json({ ok: true });
}
