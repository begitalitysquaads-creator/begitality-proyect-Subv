import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all projects the user owns that have a deadline
    const { data: projects, error } = await supabase
        .from("projects")
        .select(`
      id, name, grant_name, status,
      project_deadline, project_description,
      grant_entity, grant_amount,
      company_name, company_sector
    `)
        .eq("user_id", user.id)
        .not("project_deadline", "is", null)
        .order("project_deadline", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add section progress for each project
    const enriched = await Promise.all(
        (projects ?? []).map(async (p) => {
            const { data: sections } = await supabase
                .from("sections")
                .select("id, is_completed")
                .eq("project_id", p.id);
            const total = sections?.length ?? 0;
            const completed = sections?.filter((s) => s.is_completed).length ?? 0;
            return { ...p, sections_total: total, sections_completed: completed };
        })
    );

    return NextResponse.json({ projects: enriched });
}
