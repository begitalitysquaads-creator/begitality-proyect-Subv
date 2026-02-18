import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();

    // Datos del proyecto (público para compartir)
    const { data: project } = await supabase
        .from("projects")
        .select("id, name, grant_name, status, created_at, updated_at")
        .eq("id", projectId)
        .single();

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const { data: sections } = await supabase
        .from("sections")
        .select("id, title, content, is_completed, sort_order")
        .eq("project_id", projectId)
        .order("sort_order");

    const { data: files } = await supabase
        .from("convocatoria_bases")
        .select("id, name, file_size, created_at")
        .eq("project_id", projectId);

    const sectionsList = sections ?? [];
    const completedSections = sectionsList.filter((s) => s.is_completed).length;
    const totalWords = sectionsList.reduce((acc, s) => {
        return acc + (s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0);
    }, 0);
    const completedWords = sectionsList
        .filter((s) => s.is_completed)
        .reduce((acc, s) => {
            return acc + (s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0);
        }, 0);

    const totalChars = sectionsList.reduce(
        (acc, s) => acc + (s.content?.length ?? 0),
        0
    );

    return NextResponse.json({
        project: {
            id: project.id,
            name: project.name,
            grant_name: project.grant_name,
            status: project.status,
            created_at: project.created_at,
        },
        stats: {
            totalSections: sectionsList.length,
            completedSections,
            pendingSections: sectionsList.length - completedSections,
            progressPercent:
                sectionsList.length > 0
                    ? Math.round((completedSections / sectionsList.length) * 100)
                    : 0,
            totalWords,
            completedWords,
            totalChars,
            totalFiles: files?.length ?? 0,
        },
        sections: sectionsList.map((s) => ({
            id: s.id,
            title: s.title,
            is_completed: s.is_completed,
            wordCount: s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0,
            sort_order: s.sort_order,
        })),
    });
}
