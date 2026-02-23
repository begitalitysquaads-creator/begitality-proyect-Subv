import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { chatModel } from "@/lib/ai";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: bases } = await supabase.from("convocatoria_bases").select("file_path").eq("project_id", projectId);
    if (!bases || bases.length === 0) return NextResponse.json({ error: "No hay bases subidas." }, { status: 400 });

    let contextText = "";
    const { data: blob } = await supabase.storage.from("convocatoria-files").download(bases[0].file_path!);
    if (blob) contextText = await extractTextFromPdf(Buffer.from(await blob.arrayBuffer()));

    const prompt = `
      Actúa como un Gestor Senior de Begitality. Genera una Hoja de Ruta Técnica para este proyecto basándote en el BOE.
      Responde EXCLUSIVAMENTE en JSON puro: { "tasks": [{ "title": "string", "required": boolean, "description": "string" }] }
      
      Texto del BOE:
      ${contextText.substring(0, 30000)}
    `;

    const result = await chatModel.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const { tasks } = JSON.parse(cleanJson);

    // Obtener datos del cliente para auto-completar
    const { data: project } = await supabase.from("projects").select("clients(*)").eq("id", projectId).single();
    const client: any = project?.clients;

    // Insertar en la tabla unificada project_tasks
    const insertData = tasks.map((t: any, i: number) => {
      let isDone = false;
      const title = t.title.toLowerCase();
      if (client) {
        if (title.includes("cnae") && client.cnae) isDone = true;
        if ((title.includes("constitución") || title.includes("escritura")) && client.constitution_date) isDone = true;
        if ((title.includes("facturación") || title.includes("volumen")) && client.annual_turnover > 0) isDone = true;
      }

      return {
        project_id: projectId,
        title: t.title,
        description: t.description,
        required: t.required,
        status: isDone ? 'completed' : 'pending',
        sort_order: i,
        is_ai_generated: true
      };
    });

    await supabase.from("project_tasks").delete().eq("project_id", projectId).eq("is_ai_generated", true);
    const { error: insErr } = await supabase.from("project_tasks").insert(insertData);
    if (insErr) throw insErr;

    // Log Audit
    await logAuditAction(projectId, user.id, "Generación IA", {
      description: "generó una nueva hoja de ruta basada en las bases.",
      items_count: insertData.length
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
