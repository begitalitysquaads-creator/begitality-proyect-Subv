import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { extractTextFromPdf } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "convocatoria-files";
const MAX_CONTEXT = 15000;

/* ── GET: cargar historial de mensajes ── */
export async function GET(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}

/* ── POST: enviar mensaje y recibir respuesta IA ── */
export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const userMessage: string = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  /* ── Admin client para escritura sin RLS ── */
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* ── Guardar mensaje del usuario ── */
  await admin.from("ai_messages").insert({
    project_id: projectId,
    role: "user",
    content: userMessage,
  });

  /* ── Obtener historial reciente (últimos 20 mensajes) ── */
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(20);

  /* ── Extraer contexto de la convocatoria ── */
  const { data: bases } = await supabase
    .from("convocatoria_bases")
    .select("name, file_path")
    .eq("project_id", projectId)
    .not("file_path", "is", null);

  let convocatoriaText = "";
  if (bases?.length) {
    for (const b of bases) {
      if (!b.file_path) continue;
      const { data: blob } = await supabase.storage
        .from(BUCKET)
        .download(b.file_path);
      if (!blob || blob.size === 0) continue;
      try {
        const buffer = Buffer.from(await blob.arrayBuffer());
        const text = await extractTextFromPdf(buffer);
        if (text.length > 0) {
          convocatoriaText += `\n--- ${b.name} ---\n${text}`;
        }
      } catch {
        // Skip file
      }
    }
  }
  convocatoriaText = convocatoriaText.slice(0, MAX_CONTEXT).trim();

  /* ── Obtener secciones para contexto ── */
  const { data: sections } = await supabase
    .from("sections")
    .select("title, content")
    .eq("project_id", projectId)
    .order("sort_order");

  const sectionsContext = (sections ?? [])
    .filter((s) => s.content?.trim())
    .map((s) => `- ${s.title}: ${s.content!.slice(0, 200)}...`)
    .join("\n");

  /* ── Construir prompt del sistema ── */
  const systemPrompt = `Eres el asistente IA de Begitality, experto en subvenciones públicas y memorias técnicas en España. Tu trabajo es ayudar al usuario con su proyecto de subvención.

PROYECTO: ${project.name}
CONVOCATORIA: ${project.grant_name}

${convocatoriaText ? `TEXTO DE LA CONVOCATORIA:\n${convocatoriaText}\n` : "No hay documentos de convocatoria cargados aún."}

${sectionsContext ? `SECCIONES DE LA MEMORIA (resumen):\n${sectionsContext}\n` : ""}

INSTRUCCIONES:
- Responde siempre en español.
- Sé conciso pero útil. Si el usuario pregunta algo sobre la convocatoria, responde basándote en el texto proporcionado.
- Puedes ayudar con: dudas sobre requisitos, criterios de evaluación, presupuesto, plazos, cómo enfocar secciones, recomendaciones de redacción, estrategia general.
- Si no tienes información suficiente para responder, dilo honestamente.
- Usa un tono profesional pero cercano.
- NO uses markdown excesivo. Usa párrafos claros y listas simples cuando sea necesario.`;

  /* ── Llamar a Gemini ── */
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no configurada" },
      { status: 500 }
    );
  }

  const chatMessages = (history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatMessages,
        system_instruction: { parts: [{ text: systemPrompt }] },
      }),
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.json().catch(() => ({}));
    const msg = err?.error?.message || geminiRes.statusText;
    return NextResponse.json(
      { error: "Error en la IA", message: msg },
      { status: 502 }
    );
  }

  const geminiData = await geminiRes.json();
  const aiContent =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!aiContent) {
    return NextResponse.json(
      { error: "La IA no devolvió respuesta" },
      { status: 502 }
    );
  }

  /* ── Guardar respuesta del asistente ── */
  await admin.from("ai_messages").insert({
    project_id: projectId,
    role: "assistant",
    content: aiContent,
  });

  return NextResponse.json({ ok: true, content: aiContent });
}

/* ── DELETE: limpiar historial de chat ── */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("ai_messages").delete().eq("project_id", projectId);

  return NextResponse.json({ ok: true });
}
