import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "convocatoria-files";
const MAX_CONTEXT_LENGTH = 20000;

// POST /api/sections/:sectionId/generate — generar contenido para una sección con IA
export async function POST(
    req: Request,
    context: { params: Promise<{ sectionId: string }> }
) {
    const { sectionId } = await context.params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener la sección con su proyecto
    const { data: section } = await supabase
        .from("sections")
        .select("id, title, content, project_id, sort_order")
        .eq("id", sectionId)
        .single();

    if (!section) {
        return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
        .from("projects")
        .select("id, name, grant_name")
        .eq("id", section.project_id)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    // Obtener todas las secciones del proyecto para contexto
    const { data: allSections } = await supabase
        .from("sections")
        .select("title, content, sort_order")
        .eq("project_id", section.project_id)
        .order("sort_order");

    // Obtener texto de las bases de convocatoria
    const { data: bases } = await supabase
        .from("convocatoria_bases")
        .select("id, name, file_path")
        .eq("project_id", section.project_id)
        .not("file_path", "is", null);

    let convocatoriaText = "";
    if (bases?.length) {
        for (const b of bases) {
            if (!b.file_path) continue;
            const { data: blob } = await supabase.storage
                .from(BUCKET)
                .download(b.file_path);
            if (!blob || blob.size === 0) continue;
            const buffer = Buffer.from(await blob.arrayBuffer());
            try {
                const text = await extractTextFromPdf(buffer);
                if (text.length > 0) {
                    convocatoriaText += `\n--- ${b.name} ---\n${text}`;
                }
            } catch {
                // Continuar con el siguiente archivo
            }
        }
    }

    const contextText = convocatoriaText.slice(0, MAX_CONTEXT_LENGTH).trim();

    // Leer instrucciones opcionales del body
    let instructions = "";
    try {
        const body = await req.json();
        if (body.instructions) instructions = body.instructions;
    } catch {
        // No hay body, está bien
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return NextResponse.json(
            { error: "GEMINI_API_KEY no configurada en el servidor" },
            { status: 500 }
        );
    }

    // Construir contexto de secciones ya redactadas
    const sectionsContext = (allSections ?? [])
        .filter((s) => s.content && s.content.trim().length > 0)
        .map((s) => `### ${s.title}\n${s.content}`)
        .join("\n\n");

    const prompt = `Eres un experto en redacción de memorias técnicas para subvenciones públicas en España. Tu tarea es redactar el contenido de la sección "${section.title}" de la memoria técnica.

PROYECTO: ${project.name}
CONVOCATORIA: ${project.grant_name}

${contextText ? `TEXTO DE LA CONVOCATORIA (para contexto y requisitos):\n${contextText}\n` : ""}

${sectionsContext ? `SECCIONES YA REDACTADAS (para coherencia):\n${sectionsContext}\n` : ""}

${instructions ? `INSTRUCCIONES ADICIONALES DEL USUARIO:\n${instructions}\n` : ""}

${section.content ? `CONTENIDO ACTUAL DE LA SECCIÓN (mejora o completa):\n${section.content}\n` : ""}

INSTRUCCIONES:
- Redacta un contenido profesional, técnico y bien estructurado para la sección "${section.title}".
- Usa un tono formal y técnico apropiado para una memoria de subvención.
- Si hay texto de convocatoria, asegúrate de que el contenido cumple con los requisitos mencionados.
- Si ya hay contenido, mejóralo y amplíalo manteniendo la coherencia.
- Si hay secciones ya redactadas, mantén coherencia con ellas.
- Escribe en español.
- NO uses markdown, escribe texto plano con párrafos separados por líneas en blanco.
- Extensión: entre 200 y 500 palabras salvo que la sección requiera más detalle.

Responde ÚNICAMENTE con el texto de la sección, sin títulos ni prefijos.`;

    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
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
    const generatedContent =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent || typeof generatedContent !== "string") {
        return NextResponse.json(
            { error: "La IA no devolvió una respuesta válida" },
            { status: 502 }
        );
    }

    // Guardar el contenido generado en la sección
    const { error: updateErr } = await supabase
        .from("sections")
        .update({
            content: generatedContent.trim(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", sectionId);

    if (updateErr) {
        return NextResponse.json(
            { error: "Error al guardar", message: updateErr.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        content: generatedContent.trim(),
    });
}
