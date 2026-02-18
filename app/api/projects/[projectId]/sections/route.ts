import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/projects/:projectId/sections — añadir una sección manualmente
export async function POST(
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

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    let body: { title: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const title = body.title?.trim();
    if (!title) {
        return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    // Obtener el sort_order máximo actual
    const { data: lastSection } = await supabase
        .from("sections")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (lastSection?.sort_order ?? -1) + 1;

    const { data: newSection, error } = await supabase
        .from("sections")
        .insert({
            project_id: projectId,
            title: title.slice(0, 500),
            content: "",
            sort_order: nextOrder,
            is_completed: false,
        })
        .select("id, title, content, is_completed, sort_order")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
        userId: user.id,
        projectId,
        action: "section_added",
        description: `Sección añadida manualmente: "${title}"`,
        metadata: { section_id: newSection.id, section_title: title },
    });

    return NextResponse.json({ ok: true, section: newSection });
}
