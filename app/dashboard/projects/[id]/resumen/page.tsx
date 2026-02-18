import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectSummaryView } from "@/components/project/ProjectSummaryView";
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();
    const { data: project } = await supabase
        .from("projects")
        .select("name, grant_name")
        .eq("id", id)
        .single();

    return {
        title: project
            ? `Resumen · ${project.name}`
            : "Resumen del proyecto",
        description: project
            ? `Progreso y estadísticas de la memoria técnica para ${project.grant_name}`
            : "Resumen estadístico del proyecto",
    };
}

export default async function ProjectSummaryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Intentar autenticar (opcional — la vista es pública si el proyecto existe)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: project } = await supabase
        .from("projects")
        .select("id, name, grant_name, status, created_at")
        .eq("id", id)
        .single();

    if (!project) notFound();

    const { data: sections } = await supabase
        .from("sections")
        .select("id, title, content, is_completed, sort_order")
        .eq("project_id", id)
        .order("sort_order");

    const { data: files } = await supabase
        .from("convocatoria_bases")
        .select("id, name, file_size, created_at")
        .eq("project_id", id);

    const sectionsList = sections ?? [];
    const completedSections = sectionsList.filter((s) => s.is_completed).length;
    const totalWords = sectionsList.reduce(
        (acc, s) =>
            acc + (s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0),
        0
    );
    const completedWords = sectionsList
        .filter((s) => s.is_completed)
        .reduce(
            (acc, s) =>
                acc + (s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0),
            0
        );

    return (
        <div className="-m-10">
            <ProjectSummaryView
                project={{
                    id: project.id,
                    name: project.name,
                    grant_name: project.grant_name,
                    status: project.status,
                    created_at: project.created_at,
                }}
                stats={{
                    totalSections: sectionsList.length,
                    completedSections,
                    pendingSections: sectionsList.length - completedSections,
                    progressPercent:
                        sectionsList.length > 0
                            ? Math.round((completedSections / sectionsList.length) * 100)
                            : 0,
                    totalWords,
                    completedWords,
                    totalFiles: files?.length ?? 0,
                }}
                sections={sectionsList.map((s) => ({
                    id: s.id,
                    title: s.title,
                    is_completed: s.is_completed,
                    wordCount:
                        s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0,
                    sort_order: s.sort_order,
                }))}
                isOwner={!!user}
                projectWorkspaceUrl={`/dashboard/projects/${id}`}
            />
        </div>
    );
}
