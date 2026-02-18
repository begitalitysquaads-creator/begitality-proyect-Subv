import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReviewReport } from "@/lib/export/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();
  const { data: project } = await supabase.from("projects").select("*, clients(*)").eq("id", projectId).single();

  if (!project || !project.review_report) return NextResponse.json({ error: "No audit data" }, { status: 404 });

  const auditData = JSON.parse(project.review_report);

  const buffer = await generateReviewReport({
    title: project.name,
    clientName: project.clients?.name || "Empresa Cliente",
    ...auditData
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Auditoria_${project.name.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
