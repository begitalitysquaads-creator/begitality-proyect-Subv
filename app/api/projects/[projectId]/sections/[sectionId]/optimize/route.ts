import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai";
import { generateEmbedding } from "@/lib/embeddings";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> }
) {
  const { projectId, sectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, instruction } = await req.json();

  // 0. Fetch Writing Instructions
  const { data: project } = await supabase.from("projects").select("writing_instructions").eq("id", projectId).single();

  // 1. Fetch relevant context via RAG
  let contextText = "";
  try {
    const queryEmbedding = await generateEmbedding(instruction || content || "Contexto para esta sección");
    const { data: chunks } = await supabase.rpc("match_embeddings", {
      p_project_id: projectId,
      p_query_embedding: queryEmbedding,
      p_match_count: 5,
      p_match_threshold: 0.4
    });

    if (chunks && chunks.length > 0) {
      // Using a safe separator to avoid parsing errors with literal newlines
      contextText = chunks.map((c: any) => c.content).join("\n\n");
    }
  } catch (e) {
    console.error("RAG Context failed for optimization:", e);
  }

  // 2. IA Optimization
  try {
    const prompt = `
      Eres un Redactor Senior de Subvenciones de Begitality. 
      Tu objetivo es modificar el texto del usuario basándote en instrucciones específicas y el contexto de las bases.
      
      BASES DE REFERENCIA (CONTEXTO):
      ${contextText}
      
      INSTRUCCIONES DE ESTILO DEL PROYECTO:
      ${project?.writing_instructions || "Usa un tono formal, técnico y ejecutivo."}
      
      INSTRUCCIÓN ESPECÍFICA DEL USUARIO (MÁXIMA PRIORIDAD):
      ${instruction || "Mejora la redacción, hazla más técnica y profesional."}

      TEXTO ORIGINAL A MODIFICAR:
      ${content}

      Responde ÚNICAMENTE con el nuevo texto modificado. No incluyas introducciones, ni comentarios, ni explicaciones.
    `;

    const result = await chatModel.generateContent(prompt);
    const improvedText = result.response.text();

    await logAuditAction(projectId, user.id, "IA: Modificación", {
      section_id: sectionId,
      instruction: instruction || "Optimización general",
      description: "modificó el texto de una sección mediante instrucciones IA."
    });

    return NextResponse.json({ improvedText });
  } catch (error: any) {
    console.error("Optimization Error:", error);
    return NextResponse.json({ error: "Error en el motor de optimización" }, { status: 502 });
  }
}
