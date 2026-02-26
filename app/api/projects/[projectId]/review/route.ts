import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 1. Obtener contenido del proyecto
  const { data: project } = await supabase
    .from("projects")
    .select("*, sections(*)")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const sectionsContent = project.sections
    ?.map((s: any) => `## ${s.title}\n${s.content || "(Sección vacía)"}`)
    .join("\n\n");

  if (!sectionsContent) return NextResponse.json({ error: "No hay contenido para auditar." }, { status: 400 });

  // 2. IA Auditora
  try {
    const prompt = `Actúa como un Auditor Senior de Subvenciones Públicas.
    Evalúa la calidad técnica, coherencia y profundidad de la siguiente memoria.
    
    CRITERIOS DE EVALUACIÓN:
    - Claridad y estructura.
    - Densidad técnica (evitar generalidades).
    - Coherencia entre secciones.
    - Persuasión y justificación del proyecto.

    MEMORIA A AUDITAR:
    ${sectionsContent}
    
    Responde estrictamente en formato JSON con el siguiente esquema:
    {
      "score": 85,
      "summary": "Resumen de la auditoría",
      "strengths": ["punto fuerte 1", "punto fuerte 2"],
      "weaknesses": ["debilidad 1", "debilidad 2"],
      "improvements": ["mejora 1", "mejora 2"]
    }`;

    const result = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    const response = await result.response;
    const auditData = JSON.parse(response.text());

    // 3. Guardar resultados
    await supabase
      .from("projects")
      .update({
        review_report: JSON.stringify(auditData), // Guardamos el JSON completo
        success_score: auditData.score,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    return NextResponse.json(auditData);

  } catch (error) {
    console.error("Audit Error:", error);
    return NextResponse.json({ error: "Error en el motor de auditoría" }, { status: 502 });
  }
}
