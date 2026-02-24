import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { count } = await supabase
        .from("sections")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

    return NextResponse.json({ count: count ?? 0 });
}
