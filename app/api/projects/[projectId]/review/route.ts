import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    const genAI = new GoogleGenerativeAI(geminiKey!);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          description: "Informe de auditoría de calidad de memoria técnica",
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER, description: "Puntuación de 0 a 100" },
            summary: { type: SchemaType.STRING, description: "Resumen ejecutivo de la calidad" },
            strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Acciones concretas para mejorar" },
          },
          required: ["score", "summary", "strengths", "weaknesses", "improvements"],
        },
      },
    }, { apiVersion: "v1beta" });

    const prompt = `Actúa como un Auditor Senior de Subvenciones Públicas.
    Evalúa la calidad técnica, coherencia y profundidad de la siguiente memoria.
    
    CRITERIOS DE EVALUACIÓN:
    - Claridad y estructura.
    - Densidad técnica (evitar generalidades).
    - Coherencia entre secciones.
    - Persuasión y justificación del proyecto.

    MEMORIA A AUDITAR:
    ${sectionsContent}
    `;

    const result = await model.generateContent(prompt);
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
