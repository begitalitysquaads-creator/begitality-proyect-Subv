import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { extractTextFromPdf } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "convocatoria-files";
const MAX_CONVOCATORIA = 12000;
const MAX_SECTION_CONTENT = 3000;
const DELAY_BETWEEN_SECTIONS = 3000; // 3s entre secciones para evitar rate limits

// ─── SSE types ───
type SSEEvent =
    | { type: "start"; total: number; sections: { id: string; title: string; score: number; feedback: string; problems: string[] }[] }
    | { type: "progress"; sectionId: string; title: string; status: "analyzing" | "improving" | "done" | "error"; newContent?: string; oldScore?: number; error?: string }
    | { type: "rediagnosing" }
    | { type: "complete"; improved: number; errors: number; oldScore: number; newScore: number | null; summary: string }
    | { type: "error"; message: string };

function send(c: ReadableStreamDefaultController, e: SSEEvent) {
    c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`));
}

// ─── Helper: admin client ───
function getAdmin() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ─── Helper: llamar a Gemini con reintentos ───
async function callGemini(
    apiKey: string,
    prompt: string,
    opts: { temperature?: number; maxTokens?: number } = {}
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000];
    const { temperature = 0.4, maxTokens = 8192 } = opts;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { temperature, maxOutputTokens: maxTokens },
                    }),
                }
            );

            if (res.status === 429 && attempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[attempt];
                console.log(`[GEMINI] Rate limit, esperando ${delay / 1000}s (intento ${attempt + 1})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { ok: false, error: (err as any)?.error?.message || res.statusText, status: res.status };
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!text) return { ok: false, error: "Sin contenido", status: 502 };

            return { ok: true, text };
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                continue;
            }
            return { ok: false, error: (err as Error).message, status: 500 };
        }
    }
    return { ok: false, error: "Máximo de reintentos", status: 429 };
}

// ─── Title matching ───
function norm(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}

function titleMatch(a: string, b: string): boolean {
    const na = norm(a), nb = norm(b);
    if (na === nb) return true;
    if (na.length > 4 && nb.includes(na)) return true;
    if (nb.length > 4 && na.includes(nb)) return true;
    const wa = new Set(na.split(/\s+/).filter(w => w.length > 2));
    const wb = new Set(nb.split(/\s+/).filter(w => w.length > 2));
    const common = [...wa].filter(w => wb.has(w)).length;
    return Math.max(wa.size, wb.size) > 0 && common / Math.max(wa.size, wb.size) > 0.5;
}

export async function POST(
    req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return new Response("GEMINI_API_KEY no configurada", { status: 500 });

    const admin = getAdmin();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // ── 1. Project + Client ──
                const { data: project } = await supabase
                    .from("projects")
                    .select(`id, name, grant_name, grant_type, grant_summary,
                   clients(name, tax_id, contact_email, industry, employee_count, annual_turnover, cnae, fiscal_region, constitution_date)`)
                    .eq("id", projectId).single();
                if (!project) { send(controller, { type: "error", message: "Proyecto no encontrado" }); controller.close(); return; }

                // ── 2. Latest diagnostic (admin para evitar recursión RLS) ──
                const { data: diagnostic } = await admin
                    .from("project_diagnostics")
                    .select("overall_score, summary, risks, suggestions, section_scores, requirements_found")
                    .eq("project_id", projectId)
                    .order("generated_at", { ascending: false })
                    .limit(1).maybeSingle();
                if (!diagnostic) { send(controller, { type: "error", message: "Genera primero el diagnóstico IA." }); controller.close(); return; }

                // ── 3. All sections ──
                const { data: sections } = await supabase
                    .from("sections")
                    .select("id, title, content, sort_order, is_completed")
                    .eq("project_id", projectId)
                    .order("sort_order");
                if (!sections?.length) { send(controller, { type: "error", message: "No hay secciones." }); controller.close(); return; }

                // ── 4. Convocatoria ──
                let convocatoriaText = "";
                try {
                    const { data: bases } = await supabase
                        .from("convocatoria_bases").select("name, file_path")
                        .eq("project_id", projectId).not("file_path", "is", null);
                    if (bases?.length) {
                        for (const b of bases) {
                            if (!b.file_path) continue;
                            const { data: blob } = await supabase.storage.from(BUCKET).download(b.file_path);
                            if (!blob || blob.size === 0) continue;
                            try {
                                const text = await extractTextFromPdf(Buffer.from(await blob.arrayBuffer()));
                                if (text.length > 0) convocatoriaText += `\n--- ${b.name} ---\n${text}`;
                            } catch { /* skip */ }
                        }
                        convocatoriaText = convocatoriaText.slice(0, MAX_CONVOCATORIA).trim();
                    }
                } catch { /* non-critical */ }

                // ── 5. Parse diagnostic data ──
                const diagScores = (diagnostic.section_scores ?? {}) as Record<string, { score: number; feedback: string }>;
                const diagRisks = (diagnostic.risks ?? []) as { level: string; message: string; section_id?: string }[];
                const diagSuggestions = (diagnostic.suggestions ?? []) as { priority: number; action: string; section_title?: string }[];
                const diagRequirements = (diagnostic.requirements_found ?? []) as string[];
                const diagSummary = diagnostic.summary as string;
                const oldScore = diagnostic.overall_score as number;

                // Build per-section problem lists
                const sectionsAnalysis = sections.map((s) => {
                    const problems: string[] = [];
                    const scoreEntry = Object.entries(diagScores).find(([title]) => titleMatch(title, s.title));
                    const score = scoreEntry?.[1]?.score ?? (s.content?.trim() ? 30 : 0);
                    const feedback = scoreEntry?.[1]?.feedback ?? "";
                    if (feedback) problems.push(`FEEDBACK: ${feedback}`);

                    for (const r of diagRisks) {
                        if (r.section_id && titleMatch(r.section_id, s.title)) {
                            problems.push(`RIESGO [${r.level.toUpperCase()}]: ${r.message}`);
                        }
                    }
                    for (const sg of diagSuggestions) {
                        if (sg.section_title && titleMatch(sg.section_title, s.title)) {
                            problems.push(`SUGERENCIA [P${sg.priority}]: ${sg.action}`);
                        }
                    }

                    const wordCount = s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
                    if (wordCount === 0) problems.push("CRITICO: Seccion completamente vacia.");
                    else if (wordCount < 50) problems.push(`PROBLEMA: Solo ${wordCount} palabras, necesita desarrollo.`);
                    else if (wordCount < 150) problems.push(`ADVERTENCIA: Solo ${wordCount} palabras, conviene ampliar.`);

                    if (problems.length === 0) problems.push("Mejorar calidad general.");

                    return { ...s, score, feedback, problems };
                });

                const sorted = [...sectionsAnalysis].sort((a, b) => a.score - b.score);

                // ── 6. Emit start ──
                send(controller, {
                    type: "start",
                    total: sorted.length,
                    sections: sorted.map(s => ({ id: s.id, title: s.title, score: s.score, feedback: s.feedback, problems: s.problems })),
                });

                // ── 7. Build context ──
                const client = (project as any).clients;
                const grantSummary = (project as any).grant_summary;
                const companyCtx = client ? [
                    client.name && `Empresa: ${client.name}`,
                    client.tax_id && `CIF/NIF: ${client.tax_id}`,
                    client.industry && `Sector: ${client.industry}`,
                    client.cnae && `CNAE: ${client.cnae}`,
                    client.employee_count && `Empleados: ${client.employee_count}`,
                    client.annual_turnover && `Facturacion: ${client.annual_turnover}`,
                    client.fiscal_region && `Region fiscal: ${client.fiscal_region}`,
                ].filter(Boolean).join("\n") : "";

                const grantCtx = [
                    `Convocatoria: ${project.grant_name}`,
                    project.grant_type && `Tipo: ${project.grant_type}`,
                    grantSummary?.max_amount && `Importe maximo: ${grantSummary.max_amount}`,
                    grantSummary?.deadline && `Fecha limite: ${grantSummary.deadline}`,
                ].filter(Boolean).join("\n");

                const allSectionsCtx = sections
                    .map(s => `### ${s.title}\n${(s.content || "(vacia)").slice(0, MAX_SECTION_CONTENT)}`)
                    .join("\n\n");

                let improved = 0;
                let errors = 0;
                const improvedContents = new Map<string, string>();

                // ── 8. Process each section ──
                for (let i = 0; i < sorted.length; i++) {
                    const section = sorted[i];

                    send(controller, {
                        type: "progress", sectionId: section.id, title: section.title,
                        status: "improving", oldScore: section.score,
                    });

                    const problemChecklist = section.problems.map((p, idx) => `${idx + 1}. ${p}`).join("\n");

                    const alreadyDone = [...improvedContents.entries()]
                        .map(([t, c]) => `### ${t}\n${c.slice(0, 500)}`)
                        .join("\n\n");

                    const prompt = `Eres un redactor experto de memorias tecnicas para subvenciones publicas espanolas. Tu trabajo es SOLUCIONAR TODOS los problemas detectados en una seccion.

DIAGNOSTICO DEL PROYECTO (puntuacion actual: ${oldScore}/100)
Resumen: "${diagSummary}"

PROBLEMAS EN "${section.title}":
${problemChecklist}

CONTEXTO:
Proyecto: ${project.name}
${grantCtx}
${companyCtx ? `\nEmpresa:\n${companyCtx}` : ""}
${convocatoriaText ? `\nBases de la convocatoria:\n${convocatoriaText.slice(0, 3000)}` : ""}
${diagRequirements.length > 0 ? `\nRequisitos:\n${diagRequirements.map(r => `- ${r}`).join("\n")}` : ""}

CONTENIDO ACTUAL DE TODAS LAS SECCIONES:
${allSectionsCtx}

${alreadyDone ? `SECCIONES YA MEJORADAS:\n${alreadyDone}` : ""}

CONTENIDO ACTUAL DE "${section.title}":
${section.content?.trim() || "(VACIA)"}

INSTRUCCIONES:
- Reescribe COMPLETAMENTE la seccion "${section.title}"
- SOLUCIONA todos los problemas listados arriba
- Minimo 300 palabras (idealmente 400-600)
- Usa datos reales de la empresa si estan disponibles
- Referencia la convocatoria y sus requisitos
- Argumentacion solida con datos cuantitativos
- NO incluyas el titulo de la seccion
- NO uses encabezados markdown (# ## ###)
- NO envuelvas en bloques de codigo
- Empieza directamente con el primer parrafo`;

                    const result = await callGemini(geminiKey, prompt, { temperature: 0.4, maxTokens: 8192 });

                    if (!result.ok) {
                        errors++;
                        send(controller, {
                            type: "progress", sectionId: section.id, title: section.title,
                            status: "error", error: `Error IA (${result.status}): ${result.error}`,
                        });
                        // Wait before next section even on error
                        if (i < sorted.length - 1) await new Promise(r => setTimeout(r, DELAY_BETWEEN_SECTIONS));
                        continue;
                    }

                    // Clean up response
                    let newContent = result.text
                        .replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "")
                        .replace(/^#+\s+.+\n?/gm, "")
                        .replace(/^\*\*(Contenido|Sección|Texto)\s*(mejorad[oa]|reescrit[oa])?\**:?\s*/i, "")
                        .trim();

                    if (newContent.length < 100) {
                        errors++;
                        send(controller, {
                            type: "progress", sectionId: section.id, title: section.title,
                            status: "error", error: "Contenido generado demasiado corto",
                        });
                        if (i < sorted.length - 1) await new Promise(r => setTimeout(r, DELAY_BETWEEN_SECTIONS));
                        continue;
                    }

                    // Save to DB
                    const { error: updateErr } = await admin
                        .from("sections")
                        .update({
                            content: newContent,
                            is_completed: true,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", section.id);

                    if (updateErr) {
                        errors++;
                        send(controller, {
                            type: "progress", sectionId: section.id, title: section.title,
                            status: "error", error: `Error BD: ${updateErr.message}`,
                        });
                        if (i < sorted.length - 1) await new Promise(r => setTimeout(r, DELAY_BETWEEN_SECTIONS));
                        continue;
                    }

                    improved++;
                    improvedContents.set(section.title, newContent);
                    send(controller, {
                        type: "progress", sectionId: section.id, title: section.title,
                        status: "done", newContent, oldScore: section.score,
                    });

                    // Delay between sections to avoid rate limits
                    if (i < sorted.length - 1) {
                        await new Promise(r => setTimeout(r, DELAY_BETWEEN_SECTIONS));
                    }
                }

                // ── 9. Auto-rediagnose ──
                let newScore: number | null = null;
                if (improved > 0) {
                    send(controller, { type: "rediagnosing" });
                    try {
                        // Wait a bit before rediagnosing to avoid rate limits
                        await new Promise(r => setTimeout(r, 3000));
                        const diagRes = await fetch(
                            `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/projects/${projectId}/diagnostics`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") ?? "" },
                            }
                        );
                        if (diagRes.ok) {
                            const d = await diagRes.json();
                            newScore = d.diagnostic?.overall_score ?? null;
                        }
                    } catch { /* non-critical */ }
                }

                // ── 10. Complete ──
                const delta = newScore !== null ? newScore - oldScore : null;
                const deltaText = delta !== null
                    ? delta > 0 ? ` Puntuacion: ${oldScore} -> ${newScore} (+${delta}).` : ` Nueva puntuacion: ${newScore}/100.`
                    : " Recarga para ver cambios.";

                send(controller, {
                    type: "complete",
                    improved, errors, oldScore, newScore,
                    summary: `${improved}/${sorted.length} secciones mejoradas.${errors > 0 ? ` ${errors} errores.` : ""}${deltaText}`,
                });
                controller.close();

            } catch (err) {
                console.error("[AUTO-IMPROVE] Error:", err);
                send(controller, { type: "error", message: err instanceof Error ? err.message : "Error interno" });
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
}
