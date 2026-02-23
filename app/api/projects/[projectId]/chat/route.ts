import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "@/lib/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { message, activeSectionId, history = [] } = await req.json();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*), sections(*)")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  
  const allSections = project.sections || [];
  const activeSection = allSections.find((s: any) => s.id === activeSectionId);
  const client = project.clients;

  // Resumen del proyecto para contexto global
  const projectSummary = allSections.map((s: any) => `[${s.title}]: ${s.content?.slice(0, 500) || "Sin redactar"}`).join("\n\n");

  // RAG: Retrieval Augmented Generation
  let contextText = "";
  try {
    const queryEmbedding = await generateEmbedding(message);
    
    // Call RPC to find similar chunks
    const { data: chunks, error } = await supabase.rpc("match_embeddings", {
      p_project_id: projectId,
      p_query_embedding: queryEmbedding,
      p_match_count: 5, // Retrieve top 5 most relevant chunks
      p_match_threshold: 0.5
    });

    if (error) {
      console.error("RAG RPC Error:", error);
      contextText = "Nota: No se pudo acceder a la base de conocimientos vectorial.";
    } else if (chunks && chunks.length > 0) {
      contextText = chunks.map((c: any) => `--- Fragmento Relevante (${c.metadata?.file_name || 'Doc'}) ---\n${c.content}`).join("\n\n");
    } else {
      contextText = "No se encontraron fragmentos relevantes en las bases para esta consulta.";
    }
  } catch (e) {
    console.error("Embedding generation failed:", e);
    contextText = "Error al procesar la búsqueda semántica.";
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: "IA no configurada" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: { 
        role: "system", 
        parts: [{ text: `Eres el Master Assist de Begitality, Consultor Senior experto en Subvenciones Públicas. 
        Tu objetivo es proporcionar asesoría estratégica de alto nivel, directa y técnica.

        REGLAS DE ORO:
        1. NO TE PRESENTES. Evita frases como "Hola, soy Master Assist" o "He analizado tu proyecto". Ve directamente a la respuesta.
        2. TONO EJECUTIVO. Usa un lenguaje profesional, preciso y sin adornos innecesarios.
        3. PRIORIDAD RAG. Si la consulta es sobre las bases de la convocatoria, utiliza exclusivamente la "INFORMACIÓN RECUPERADA" adjunta.
        4. CONTEXTO CLIENTE. Utiliza los datos del cliente y la memoria para personalizar la respuesta de forma técnica.
        5. BREVEDAD ESTRUCTURADA. Usa viñetas si la respuesta es compleja para facilitar la lectura al consultor.

        CONTEXTO DEL PROYECTO:
        CLIENTE: ${JSON.stringify(client)}
        RESUMEN MEMORIA: ${projectSummary}
        SECCIÓN ACTIVA: ${activeSection?.title || "Vista General"}

        INFORMACIÓN RECUPERADA DE LAS BASES (Prioridad Alta):
        ${contextText}` }] 
      }
    }, { apiVersion: 'v1' });

    const chat = model.startChat({
      history: history.slice(-6).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const answer = response.text();

    await supabase.from("ai_messages").insert([
      { project_id: projectId, role: 'user', content: message, section_id: activeSectionId || null },
      { project_id: projectId, role: 'assistant', content: answer, section_id: activeSectionId || null }
    ]);

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ 
      error: "Error en IA", 
      message: error.message 
    }, { status: 502 });
  }
}
