import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/project/ProfileClient";

export const metadata = {
    title: "Mi Perfil — Begitality",
    description: "Gestiona tu información personal y preferencias de cuenta",
};

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) notFound();

    // Cargar perfil
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, plan, created_at, updated_at")
        .eq("id", user.id)
        .single();

    if (!profile) notFound();

    // Estadísticas del usuario
    const { data: projects } = await supabase
        .from("projects")
        .select("id, status")
        .eq("user_id", user.id);

    const totalProjects = projects?.length ?? 0;
    const completedProjects = projects?.filter((p) => p.status === "ready_export" || p.status === "exported").length ?? 0;

    // Contar secciones completadas en todos sus proyectos
    let totalSections = 0;
    if (projects && projects.length > 0) {
        const projectIds = projects.map((p) => p.id);
        const { count } = await supabase
            .from("sections")
            .select("id", { count: "exact", head: true })
            .in("project_id", projectIds)
            .eq("is_completed", true);
        totalSections = count ?? 0;
    }

    return (
        <ProfileClient
            profile={profile}
            stats={{ totalProjects, completedProjects, totalSections }}
        />
    );
}
