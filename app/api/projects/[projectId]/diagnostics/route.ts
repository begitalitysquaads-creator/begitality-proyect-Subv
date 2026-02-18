import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "convocatoria-files";
const MAX_TEXT_LENGTH = 20000;
const MAX_SECTION_CONTENT = 3000;

// ─── GET: devuelve el último diagnóstico del proyecto ────────────────────────
export async function GET(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const { data: diagnostic } = await supabase
        .from("project_diagnostics")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

    return NextResponse.json({ diagnostic: diagnostic ?? null });
}

// ─── POST: genera un nuevo diagnóstico con IA ────────────────────────────────
export async function POST(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar proyecto
    const { data: project } = await supabase
        .from("projects")
        .select("id, name, grant_name")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    // Obtener secciones
    const { data: sections } = await supabase
        .from("sections")
        .select("id, title, content, is_completed, sort_order")
        .eq("project_id", projectId)
        .order("sort_order");

    if (!sections || sections.length === 0) {
        return NextResponse.json(
            { error: "El proyecto no tiene secciones. Genera primero la estructura de la memoria." },
            { status: 400 }
        );
    }

    // Obtener texto de las bases de convocatoria (opcional, enriquece el diagnóstico)
    let convocatoriaText = "";
    const { data: bases } = await supabase
        .from("convocatoria_bases")
        .select("id, name, file_path")
        .eq("project_id", projectId)
        .not("file_path", "is", null);

    if (bases?.length) {
        for (const b of bases) {
            if (!b.file_path) continue;
            const { data: blob } = await supabase.storage.from(BUCKET).download(b.file_path);
            if (!blob || blob.size === 0) continue;
            const buffer = Buffer.from(await blob.arrayBuffer());
            try {
                const text = await extractTextFromPdf(buffer);
                if (text.length > 0) {
                    convocatoriaText += `\n--- ${b.name} ---\n${text}`;
                }
            } catch {
                // Ignorar errores de extracción
            }
        }
        convocatoriaText = convocatoriaText.slice(0, MAX_TEXT_LENGTH);
    }

    // Construir resumen de secciones para el prompt
    const sectionsSummary = sections
        .map((s) => {
            const wordCount = s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
            const preview = s.content
                ? s.content.slice(0, MAX_SECTION_CONTENT) + (s.content.length > MAX_SECTION_CONTENT ? "…" : "")
                : "(vacía)";
            return `### Sección ${s.sort_order + 1}: ${s.title}
Estado: ${s.is_completed ? "Completada ✓" : "Pendiente"}
Palabras: ${wordCount}
Contenido:
${preview}`;
        })
        .join("\n\n");

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
    }

    const convocatoriaSection = convocatoriaText
        ? `\n\n## BASES DE LA CONVOCATORIA (extracto)\n${convocatoriaText}`
        : "";

    const prompt = `Eres un consultor experto en subvenciones y ayudas públicas. Analiza la memoria técnica del siguiente proyecto y genera un diagnóstico completo de calidad.

## PROYECTO
Nombre: ${project.name}
Convocatoria: ${project.grant_name}

## SECCIONES DE LA MEMORIA
${sectionsSummary}${convocatoriaSection}

## INSTRUCCIONES
Genera un diagnóstico exhaustivo en formato JSON con exactamente esta estructura:

{
  "overall_score": <número entero 0-100 que refleja la calidad global de la memoria>,
  "summary": "<resumen ejecutivo de 2-3 frases sobre el estado del proyecto y sus puntos clave>",
  "risks": [
    { "level": "high"|"medium"|"low", "message": "<descripción del riesgo>", "section_id": "<opcional: título de la sección afectada>" }
  ],
  "suggestions": [
    { "priority": 1|2|3, "action": "<acción concreta a tomar>", "section_title": "<opcional: título de la sección>" }
  ],
  "section_scores": {
    "<título exacto de la sección>": { "score": <0-100>, "feedback": "<feedback específico de 1-2 frases>" }
  },
  "requirements_found": ["<requisito detectado en la convocatoria>"]
}

Criterios de puntuación:
- overall_score: Pondera completitud (secciones completadas), profundidad del contenido, coherencia y alineación con la convocatoria
- risks high: secciones vacías, inconsistencias graves, requisitos no cubiertos
- risks medium: secciones con poco contenido, posibles mejoras importantes
- risks low: sugerencias de estilo o formato
- suggestions priority 1: urgente (secciones vacías críticas), priority 2: importante, priority 3: mejora opcional
- requirements_found: lista los requisitos clave detectados en las bases (si hay texto de convocatoria)

Responde ÚNICAMENTE con el JSON, sin texto adicional ni bloques de código markdown.`;

    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json",
                },
            }),
        }
    );

    if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        const msg = (err as { error?: { message?: string } })?.error?.message || geminiRes.statusText;
        return NextResponse.json({ error: "Error en la IA", message: msg }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent || typeof rawContent !== "string") {
        return NextResponse.json({ error: "La IA no devolvió una respuesta válida" }, { status: 502 });
    }

    // Parsear JSON (con fallback si viene con markdown)
    let diagnosticData: {
        overall_score: number;
        summary: string;
        risks: Array<{ level: string; message: string; section_id?: string }>;
        suggestions: Array<{ priority: number; action: string; section_title?: string }>;
        section_scores: Record<string, { score: number; feedback: string }>;
        requirements_found: string[];
    };

    try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawContent.trim();
        diagnosticData = JSON.parse(jsonStr);
    } catch {
        return NextResponse.json(
            { error: "No se pudo parsear la respuesta de la IA", raw: rawContent.slice(0, 500) },
            { status: 502 }
        );
    }

    // Validar y normalizar
    const overall_score = Math.max(0, Math.min(100, Math.round(diagnosticData.overall_score ?? 0)));
    const summary = diagnosticData.summary ?? "";
    const risks = Array.isArray(diagnosticData.risks) ? diagnosticData.risks : [];
    const suggestions = Array.isArray(diagnosticData.suggestions) ? diagnosticData.suggestions : [];
    const section_scores = diagnosticData.section_scores ?? {};
    const requirements_found = Array.isArray(diagnosticData.requirements_found)
        ? diagnosticData.requirements_found
        : [];

    // Guardar en Supabase
    const { data: saved, error: insertErr } = await supabase
        .from("project_diagnostics")
        .insert({
            project_id: projectId,
            overall_score,
            summary,
            risks,
            suggestions,
            section_scores,
            requirements_found,
            model_used: "gemini-2.5-flash",
        })
        .select()
        .single();

    if (insertErr) {
        return NextResponse.json(
            { error: "Error al guardar el diagnóstico", detail: insertErr.message },
            { status: 500 }
        );
    }

    await logActivity({
        userId: user.id,
        projectId,
        action: "diagnostic_generated",
        description: `Diagnóstico IA generado — puntuación: ${overall_score}/100`,
        metadata: { overall_score, risks_count: risks.length, suggestions_count: suggestions.length },
    });

    return NextResponse.json({ diagnostic: saved });
}
