import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { chatModel } from "@/lib/ai";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "convocatoria-files";
const MAX_TEXT_LENGTH = 30000;

export async function POST(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id, name, grant_name, writing_instructions").eq("id", projectId).single();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data: bases } = await supabase.from("convocatoria_bases").select("name, file_path").eq("project_id", projectId);
  let grantText = "";
  if (bases) {
    for (const b of bases) {
      try {
        const { data: blob } = await supabase.storage.from(BUCKET).download(b.file_path!);
        if (blob) grantText += await extractTextFromPdf(Buffer.from(await blob.arrayBuffer()));
      } catch (e) {}
    }
  }

  try {
    const prompt = `Analiza la convocatoria y genera la estructura de la memoria con borradores técnicos densos.
    Proyecto: ${project.name}
    Bases: ${grantText.slice(0, MAX_TEXT_LENGTH)}
    
    INSTRUCCIONES ADICIONALES DE REDACCIÓN:
    ${project.writing_instructions || "Utiliza un tono profesional y técnico estándar."}
    
    IMPORTANTE: No añadas numeración (ej: "1. Introducción") a los títulos de las secciones. Devuelve solo el nombre limpio.
    
    RESPONDE EXCLUSIVAMENTE EN FORMATO JSON PURO (ARRAY DE OBJETOS).
    Esquema: [{ "title": "string", "content": "string" }]`;

    const result = await chatModel.generateContent(prompt);
    const rawText = result.response.text().trim();
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const sectionsData = JSON.parse(cleanJson);

    const { data: existing } = await supabase.from("sections").select("title").eq("project_id", projectId);
    const existingTitles = new Set(existing?.map(s => s.title.toLowerCase()) || []);
    
    const toInsert = sectionsData
      .filter((s: any) => !existingTitles.has(s.title.toLowerCase()))
      .map((s: any, i: number) => ({
        project_id: projectId,
        title: s.title.slice(0, 500),
        content: s.content || "",
        sort_order: i,
        is_completed: false,
      }));

    if (toInsert.length > 0) {
      await supabase.from("sections").insert(toInsert);
      
      await logAuditAction(projectId, user.id, "IA: Memoria", {
        description: `generó la estructura de la memoria con ${toInsert.length} secciones nuevas.`,
        sections_count: toInsert.length
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Generate Sections Error:", error);
    return NextResponse.json({ error: "Error en IA", message: error.message }, { status: 502 });
  }
}
