import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("id", projectId)
    .single();

  if (!project || !project.clients) return NextResponse.json({ error: "Contexto insuficiente" }, { status: 400 });

  const client = project.clients;
  const { data: bases } = await supabase.from("convocatoria_bases").select("name, file_path").eq("project_id", projectId);

  let grantText = "";
  if (bases) {
    for (const b of bases) {
      const { data: blob } = await supabase.storage.from(BUCKET).download(b.file_path!);
      if (blob) grantText += await extractTextFromPdf(Buffer.from(await blob.arrayBuffer()));
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    const genAI = new GoogleGenerativeAI(geminiKey!);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            status: { type: SchemaType.STRING, description: "Estatus final: APTO, CONDICIONADO o NO APTO" },
            summary: { type: SchemaType.STRING },
            strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            probability: { type: SchemaType.INTEGER, description: "Probabilidad de éxito 0-100" }
          },
          required: ["status", "summary", "strengths", "risks", "recommendations", "probability"],
        },
      },
    }, { apiVersion: "v1beta" });

    const prompt = `Analiza la elegibilidad de ${client.name} para la convocatoria. 
    DOCS: ${grantText.slice(0, MAX_TEXT_LENGTH)}
    CLIENTE: ${JSON.stringify(client)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Validar que la respuesta es un JSON válido antes de guardar
    try {
      JSON.parse(text);
    } catch (e) {
      console.error("Respuesta de IA no es JSON:", text);
      return NextResponse.json({ error: "La IA no devolvió un formato válido estructurado.", detail: text }, { status: 502 });
    }

    await supabase.from("projects").update({ viability_report: text }).eq("id", projectId);

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Critical Eligibility Error:", error);
    return NextResponse.json({ 
      error: "Error en el motor de IA", 
      message: error.message,
      status: error.status 
    }, { status: 502 });
  }
}
