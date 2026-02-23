import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { chatModel } from "@/lib/ai";

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

  try {
    const prompt = `Actúa como un Consultor Senior de Ayudas Públicas experto en BOE y normativas de subvenciones.
    Analiza exhaustivamente si el siguiente cliente es ELEGIBLE para la subvención basándote en su perfil técnico-financiero y la documentación oficial.
    
    PERFIL DEL CLIENTE:
    - Razón Social: ${client.name}
    - CNAE: ${client.cnae || "No definido"}
    - Facturación: ${client.annual_turnover || 0}€
    - Empleados: ${client.employee_count || 0}
    - Constitución: ${client.constitution_date || "No definido"}
    - Región: ${client.fiscal_region || "No definido"}
    - Minimis Recibido: ${client.de_minimis_received || 0}€
    - Sector: ${client.industry || "No definido"}

    DOCUMENTACIÓN DE LA CONVOCATORIA (BOE/BASES): 
    ${grantText.slice(0, MAX_TEXT_LENGTH) || "No se han subido bases técnicas aún."}
    
    INSTRUCCIONES CRÍTICAS:
    1. Compara estrictamente los requisitos de la convocatoria (CNAE, antigüedad, tamaño empresa, etc.) con el perfil del cliente.
    2. Si detectas cualquier discrepancia, lístala en 'critical_gaps'.
    3. Calcula la 'probability' del 0 al 100. Solo pon 100 si no hay ningún gap crítico.
    
    Responde estrictamente en formato JSON con el siguiente esquema:
    {
      "status": "APTO" | "CONDICIONADO" | "NO APTO",
      "summary": "Resumen ejecutivo del análisis",
      "strengths": ["punto 1", "punto 2"],
      "risks": ["riesgo 1", "riesgo 2"],
      "critical_gaps": ["gap 1", "gap 2"],
      "recommendations": ["recomendación 1", "recomendación 2"],
      "probability": 85
    }`;

    const result = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
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
