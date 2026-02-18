import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateViabilityCertificate } from "@/lib/export/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "ProjectId required" }, { status: 400 });

  // Obtener datos del proyecto y reporte guardado
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("id", projectId)
    .single();

  if (!project || !project.viability_report) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  const viabilityData = JSON.parse(project.viability_report);

  const buffer = await generateViabilityCertificate({
    title: project.name,
    clientName: project.clients?.name || "Sin Nombre",
    grantName: project.grant_name,
    ...viabilityData
  });

  const filename = `Certificado_Viabilidad_${project.name.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
