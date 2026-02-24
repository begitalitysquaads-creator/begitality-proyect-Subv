import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { extractTextFromPdf } from "@/lib/pdf-extract";

import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BUCKET = "convocatoria-files";
const MAX_TEXT_LENGTH = 20000;
const MAX_SECTION_CONTENT = 3000;

// ─── Helper: admin client (service_role) para evitar recursión RLS ───────────
function getAdmin() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ─── Helper: llamar a Gemini con reintentos para rate limits ─────────────────
async function callGemini(
    apiKey: string,
    prompt: string,
    options: { temperature?: number; jsonMode?: boolean; maxTokens?: number } = {}
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000];
    const { temperature = 0.3, jsonMode = false, maxTokens = 8192 } = options;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature,
                            maxOutputTokens: maxTokens,
                            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
                        },
                    }),
                }
            );

            if (res.status === 429 && attempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[attempt];
                console.log(`[GEMINI] Rate limit 429, esperando ${delay / 1000}s (intento ${attempt + 1}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = (err as any)?.error?.message || res.statusText;
                console.error(`[GEMINI] Error ${res.status}:`, msg);
                return { ok: false, error: msg, status: res.status };
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text || typeof text !== "string") {
                console.error("[GEMINI] Empty response:", JSON.stringify(data).slice(0, 300));
                return { ok: false, error: "La IA no devolvió contenido", status: 502 };
            }

            return { ok: true, text };
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }
            return { ok: false, error: (err as Error).message, status: 500 };
        }
    }

    return { ok: false, error: "Máximo de reintentos alcanzado", status: 429 };
}

// ─── Helper: parsear JSON de respuesta de IA con múltiples estrategias ───────
function parseAIJson<T>(raw: string): T | null {
    // Estrategia 1: parse directo
    try { return JSON.parse(raw.trim()); } catch { }

    // Estrategia 2: extraer de bloque markdown ```json ... ```
    try {
        const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (match) return JSON.parse(match[1].trim());
    } catch { }

    // Estrategia 3: buscar primer { y último }
    try {
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");
        if (first !== -1 && last > first) {
            return JSON.parse(raw.slice(first, last + 1));
        }
    } catch { }

    // Estrategia 4: limpiar caracteres extra antes/después
    try {
        const cleaned = raw.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
        if (cleaned.startsWith("{")) return JSON.parse(cleaned);
    } catch { }

    return null;
}

// ─── GET: devuelve el último diagnóstico del proyecto ────────────────────────
export async function GET(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar acceso al proyecto via RLS del usuario
    const { data: project } = await supabase
        .from("projects").select("id").eq("id", projectId).single();
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    // Leer diagnóstico con service_role (evita recursión RLS)
    const { data: diagnostic } = await getAdmin()
        .from("project_diagnostics")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return NextResponse.json({ diagnostic: diagnostic ?? null });
}

// ─── POST: genera un nuevo diagnóstico con IA ────────────────────────────────
export async function POST(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar acceso al proyecto
    const { data: project } = await supabase
        .from("projects").select("id, name, grant_name")
        .eq("id", projectId).single();
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

    // Obtener texto de las bases de convocatoria (opcional)
    let convocatoriaText = "";
    try {
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
                    if (text.length > 0) convocatoriaText += `\n--- ${b.name} ---\n${text}`;
                } catch { /* skip */ }
            }
            convocatoriaText = convocatoriaText.slice(0, MAX_TEXT_LENGTH);
        }
    } catch { /* non-critical */ }

    // Construir resumen de secciones
    const sectionsSummary = sections
        .map((s) => {
            const wordCount = s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
            const preview = s.content
                ? s.content.slice(0, MAX_SECTION_CONTENT) + (s.content.length > MAX_SECTION_CONTENT ? "…" : "")
                : "(vacía)";
            return `### Sección ${s.sort_order + 1}: ${s.title}\nEstado: ${s.is_completed ? "Completada" : "Pendiente"}\nPalabras: ${wordCount}\nContenido:\n${preview}`;
        })
        .join("\n\n");

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
    }

    const convocatoriaSection = convocatoriaText
        ? `\n\n## BASES DE LA CONVOCATORIA (extracto)\n${convocatoriaText}`
        : "";

    const sectionTitles = sections.map(s => `"${s.title}"`).join(", ");

    const prompt = `Eres un evaluador oficial de memorias tecnicas para subvenciones publicas en Espana. Analiza la calidad de esta memoria tecnica.

## PROYECTO
Nombre: ${project.name}
Convocatoria: ${project.grant_name}

## SECCIONES DE LA MEMORIA
${sectionsSummary}${convocatoriaSection}

## INSTRUCCIONES
Genera un diagnostico en formato JSON con esta estructura:

{
  "overall_score": <0-100>,
  "summary": "<resumen de 2-3 frases>",
  "risks": [
    { "level": "high" | "medium" | "low", "message": "<descripcion>", "section_id": "<titulo exacto de la seccion>" }
  ],
  "suggestions": [
    { "priority": 1 | 2 | 3, "action": "<accion concreta>", "section_title": "<titulo exacto>" }
  ],
  "section_scores": {
    "<titulo exacto>": { "score": <0-100>, "feedback": "<que falta o mejorar>" }
  },
  "requirements_found": ["<requisito>"]
}

## RUBRICA POR SECCION
- 0-20: Seccion vacia o irrelevante
- 20-40: Contenido breve (<100 palabras), generico
- 40-60: Aceptable pero faltan datos concretos
- 60-80: Buen contenido con datos y argumentacion
- 80-100: Excelente, extenso, con datos cuantitativos

## RUBRICA GLOBAL
overall_score = promedio ponderado de section_scores, ajustado +/- 10 por coherencia global.

## REGLAS
1. Los titulos DEBEN ser exactamente: ${sectionTitles}
2. TODAS las secciones deben aparecer en section_scores
3. El feedback debe ser ACCIONABLE
4. Responde SOLO con JSON valido, sin texto adicional`;

    console.log("[DIAGNOSTICS] Llamando a Gemini...");

    const geminiResult = await callGemini(geminiKey, prompt, {
        temperature: 0.3,
        jsonMode: true,
        maxTokens: 8192,
    });

    if (!geminiResult.ok) {
        return NextResponse.json(
            { error: `Error en la IA (${geminiResult.status}): ${geminiResult.error}` },
            { status: 502 }
        );
    }

    console.log("[DIAGNOSTICS] Respuesta recibida, parseando JSON...");

    // Parsear JSON
    type DiagnosticShape = {
        overall_score: number;
        summary: string;
        risks: Array<{ level: string; message: string; section_id?: string }>;
        suggestions: Array<{ priority: number; action: string; section_title?: string }>;
        section_scores: Record<string, { score: number; feedback: string }>;
        requirements_found: string[];
    };

    const diagnosticData = parseAIJson<DiagnosticShape>(geminiResult.text);

    if (!diagnosticData) {
        console.error("[DIAGNOSTICS] JSON parse failed. Raw:", geminiResult.text.slice(0, 1000));
        return NextResponse.json(
            { error: "No se pudo parsear la respuesta de la IA. Inténtalo de nuevo." },
            { status: 502 }
        );
    }

    // Validar y normalizar
    const overall_score = Math.max(0, Math.min(100, Math.round(diagnosticData.overall_score ?? 50)));
    const summary = diagnosticData.summary ?? "Diagnóstico generado.";
    const risks = Array.isArray(diagnosticData.risks) ? diagnosticData.risks : [];
    const suggestions = Array.isArray(diagnosticData.suggestions) ? diagnosticData.suggestions : [];
    const section_scores = diagnosticData.section_scores ?? {};
    const requirements_found = Array.isArray(diagnosticData.requirements_found)
        ? diagnosticData.requirements_found : [];

    // Guardar con service_role (evita recursión RLS)
    const admin = getAdmin();
    const { data: saved, error: insertErr } = await admin
        .from("project_diagnostics")
        .insert({
            project_id: projectId,
            overall_score,
            summary,
            risks,
            suggestions,
            section_scores,
            requirements_found,
            model_used: "gemini-3-flash-preview",
        })
        .select()
        .single();

    if (insertErr) {
        console.error("[DIAGNOSTICS] Error al guardar:", JSON.stringify(insertErr));
        return NextResponse.json(
            { error: `Error al guardar: ${insertErr.message}` },
            { status: 500 }
        );
    }

    console.log("[DIAGNOSTICS] Diagnóstico guardado — Score:", overall_score);

    await logAuditAction(projectId, user.id, "Diagnóstico IA", {
        description: `generó un nuevo diagnóstico técnico (Score: ${overall_score}/100)`,
        overall_score,
        model_used: "gemini-3-flash-preview"
    });

    return NextResponse.json({ diagnostic: saved });
}
