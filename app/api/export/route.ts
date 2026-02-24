import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ExportFormat = "pdf" | "docx";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId: string; format: ExportFormat };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, format } = body;
  if (!projectId || !format || !["pdf", "docx"].includes(format)) {
    return NextResponse.json(
      { error: "projectId and format (pdf|docx) required" },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name, viability_report, review_report")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, content, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  const sectionsList = sections ?? [];

  if (format === "pdf") {
    const { generatePdf } = await import("@/lib/export/pdf");
    const buffer = await generatePdf({
      title: project.name,
      grantName: project.grant_name,
      viabilityReport: project.viability_report,
      reviewReport: project.review_report,
      sections: sectionsList.map((s) => ({ title: s.title, content: s.content })),
    });
    const filename = `Memoria_Tecnica_${project.name.replace(/\s+/g, "_")}.pdf`;

    // Nota: No marcamos como 'exported' automáticamente para permitir múltiples exportaciones interactivas
    /*
    await supabase
      .from("projects")
      .update({ status: "exported" })
      .eq("id", projectId);
    */

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "docx") {
    const { generateDocx } = await import("@/lib/export/docx");
    const buffer = await generateDocx({
      title: project.name,
      grantName: project.grant_name,
      sections: sectionsList.map((s) => ({ title: s.title, content: s.content })),
    });
    const filename = `Memoria_Tecnica_${project.name.replace(/\s+/g, "_")}.docx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
