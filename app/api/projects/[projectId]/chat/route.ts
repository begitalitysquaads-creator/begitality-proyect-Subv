import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "convocatoria-files";
const MAX_CONTEXT_TEXT = 20000;

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
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

  const { data: bases } = await supabase
    .from("convocatoria_bases")
    .select("name, file_path")
    .eq("project_id", projectId)
    .not("file_path", "is", null);

  let grantText = "";
  if (bases) {
    for (const b of bases) {
      try {
        const { data: blob } = await supabase.storage.from(BUCKET).download(b.file_path!);
        if (blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          const text = await extractTextFromPdf(buffer);
          grantText += `\n--- Archivo: ${b.name} ---\n${text}`;
        }
      } catch (e) {}
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: "IA no configurada" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    // Volvemos al modelo solicitado por el usuario con la versión v1beta
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: { 
        role: "system", 
        parts: [{ text: `Eres el Master Assist de Begitality. Consultor experto.
        CLIENTE: ${JSON.stringify(client)}
        BASES: ${grantText.slice(0, MAX_CONTEXT_TEXT)}
        PROYECTO ACTUAL: ${projectSummary}
        ENFOQUE ACTUAL: ${activeSection?.title || "Vista General"}` }] 
      }
    }, { apiVersion: "v1beta" });

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
    console.error("Gemini 3 Error:", error);
    return NextResponse.json({ 
      error: "Límite de IA alcanzado", 
      message: error.message.includes("429") 
        ? "Has agotado las 20 consultas diarias gratuitas de Gemini 3. Por favor, espera a mañana o usa otra API Key."
        : "Error en el servicio de IA. Inténtalo de nuevo.",
      technical: error.message 
    }, { status: 502 });
  }
}
