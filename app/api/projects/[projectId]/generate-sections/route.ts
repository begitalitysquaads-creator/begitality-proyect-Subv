import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "convocatoria-files";
const MAX_TEXT_LENGTH = 25000;

export async function POST(
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
    .select("id, name, grant_name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const { data: bases } = await supabase
    .from("convocatoria_bases")
    .select("id, name, file_path")
    .eq("project_id", projectId)
    .not("file_path", "is", null);

  if (!bases?.length) {
    return NextResponse.json(
      { error: "No hay bases de convocatoria cargadas. Sube al menos un PDF." },
      { status: 400 }
    );
  }

  let fullText = "";
  const errors: string[] = [];
  for (const b of bases) {
    if (!b.file_path) continue;
    const { data: blob, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(b.file_path);
    if (downloadErr) {
      errors.push(`Descarga de "${b.name}": ${downloadErr.message}`);
      continue;
    }
    if (!blob || blob.size === 0) {
      errors.push(`El archivo "${b.name}" está vacío.`);
      continue;
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      const text = await extractTextFromPdf(buffer);
      if (text.length > 0) {
        fullText += `\n--- ${b.name} ---\n${text}`;
      } else {
        errors.push(`No se pudo extraer texto de "${b.name}" (puede ser un PDF escaneado o con solo imágenes).`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Error al procesar "${b.name}": ${msg}`);
    }
  }

  const textToSend = fullText.slice(0, MAX_TEXT_LENGTH).trim();
  if (!textToSend) {
    const detail = errors.length > 0 ? ` ${errors.join(" ")}` : "";
    return NextResponse.json(
      {
        error:
          "No se pudo extraer texto de los PDFs." +
          (detail || " Comprueba que los archivos no estén protegidos o dañados."),
        details: errors.length > 0 ? errors : undefined,
      },
      { status: 400 }
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  let accessToken = session?.access_token;

  if (!accessToken) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    accessToken = refreshed?.access_token;
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Sesión no válida o expirada.",
        message: "Cierra sesión y vuelve a iniciar sesión para usar la IA.",
      },
      { status: 401 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada en el servidor" }, { status: 500 });
  }

  const prompt = `Analiza el siguiente texto extraído de documentos de una convocatoria de subvenciones y lista las secciones que debe tener la memoria técnica según los requisitos.

Responde ÚNICAMENTE con un JSON array de strings en español. Cada string es el título exacto de una sección. Sin explicaciones ni texto adicional.
Ejemplo: ["Resumen ejecutivo","Descripción del proyecto","Capacidad técnica y equipo","Plan de internacionalización","Presupuesto y viabilidad"]

Texto de la convocatoria:

${textToSend}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        system_instruction: { 
          parts: [{ text: `Eres un asistente experto en redacción de memorias técnicas para subvenciones. Proyecto: ${project.name}. Convocatoria: ${project.grant_name}. Responde exclusivamente con el JSON array solicitado.` }] 
        },
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
  const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "La IA no devolvió una respuesta válida" },
      { status: 502 }
    );
  }

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  const raw = jsonMatch ? jsonMatch[0] : content.trim();
  let titles: string[];
  try {
    titles = JSON.parse(raw) as string[];
    if (!Array.isArray(titles) || titles.some((t) => typeof t !== "string")) {
      titles = [content.trim()];
    }
  } catch {
    titles = content
      .split(/\n/)
      .map((s) => s.replace(/^[-*]\s*|^\d+\.\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  if (titles.length === 0) {
    return NextResponse.json(
      { error: "No se pudieron extraer secciones. Intenta con otros documentos." },
      { status: 400 }
    );
  }

  await supabase.from("sections").delete().eq("project_id", projectId);

  const { error: insertErr } = await supabase.from("sections").insert(
    titles.map((title, i) => ({
      project_id: projectId,
      title: title.slice(0, 500),
      content: "",
      sort_order: i,
      is_completed: false,
    }))
  );

  if (insertErr) {
    return NextResponse.json(
      { error: "Error al guardar secciones", detail: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    count: titles.length,
    sections: titles,
  });
}
