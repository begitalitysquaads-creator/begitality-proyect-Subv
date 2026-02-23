import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { chatModel } from "@/lib/ai";

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
    // 1. Obtener las bases
    const { data: bases, error: fetchError } = await supabase
      .from("convocatoria_bases")
      .select("id, name, file_path")
      .eq("project_id", projectId)
      .limit(1);

    if (fetchError || !bases || bases.length === 0) {
      return NextResponse.json({ error: "No se encontraron documentos de bases subidos." }, { status: 404 });
    }

    // 2. Extraer texto
    const { data: blob, error: downloadError } = await supabase.storage
      .from("convocatoria-files")
      .download(bases[0].file_path!);

    if (downloadError || !blob) throw new Error("Error al descargar el PDF de la convocatoria.");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const text = await extractTextFromPdf(buffer);

    if (!text) throw new Error("No se pudo extraer texto del documento subido.");

    // 3. IA: Generar Ficha Resumen
    const prompt = `
      Actúa como un experto en subvenciones públicas. Analiza el siguiente extracto de una convocatoria oficial y extrae una ficha resumen técnica.
      
      RESPONDE EXCLUSIVAMENTE EN FORMATO JSON PURO (sin markdown, sin bloques de código).
      El objeto debe tener exactamente estas claves:
      - max_amount: Importe máximo por beneficiario.
      - intensity: Porcentaje de intensidad de la ayuda.
      - deadline: Fecha límite de presentación.
      - beneficiaries: Quiénes pueden solicitarla.
      - eligible_costs: Qué gastos se cubren.

      Texto de la convocatoria:
      ${text.substring(0, 30000)} 
    `;

    const result = await chatModel.generateContent(prompt);
    const rawText = result.response.text().trim();
    
    // Limpiar respuesta si la IA incluye bloques de código
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let summary;
    try {
      summary = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Summary JSON:", rawText);
      throw new Error("La IA no devolvió un formato de resumen válido.");
    }

    // 4. Guardar en DB
    const { error: updateError } = await supabase
      .from("projects")
      .update({ grant_summary: summary })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error("Generate Summary Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
