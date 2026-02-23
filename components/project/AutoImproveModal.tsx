"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    Wand2,
    X,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    TrendingUp,
    ArrowRight,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionStatus = "pending" | "improving" | "done" | "error";

interface SectionState {
    id: string;
    title: string;
    score: number;
    feedback: string;
    problems: string[];
    status: SectionStatus;
    newContent?: string;
    error?: string;
    expanded?: boolean;
}

type SSEEvent =
    | { type: "start"; total: number; sections: { id: string; title: string; score: number; feedback: string; problems: string[] }[] }
    | { type: "progress"; sectionId: string; title: string; status: "analyzing" | "improving" | "done" | "skipped" | "error"; newContent?: string; oldScore?: number; error?: string }
    | { type: "rediagnosing" }
    | { type: "complete"; improved: number; skipped?: number; errors: number; oldScore: number; newScore: number | null; summary: string }
    | { type: "error"; message: string };

interface AutoImproveModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

const STATUS_CONFIG: Record<SectionStatus, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
    pending: { icon: Loader2, label: "En cola", color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-100" },
    improving: { icon: Loader2, label: "Mejorando…", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
    done: { icon: CheckCircle2, label: "Completada ✓", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    error: { icon: XCircle, label: "Error", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

function ScoreChip({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
    const color = score >= 80 ? "text-emerald-700 bg-emerald-100 border-emerald-200"
        : score >= 50 ? "text-amber-700 bg-amber-100 border-amber-200"
            : "text-red-700 bg-red-100 border-red-200";
    return (
        <span className={cn(
            "font-black rounded-lg border",
            color,
            size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
        )}>
            {score}/100
        </span>
    );
}

export function AutoImproveModal({ projectId, isOpen, onClose, onComplete }: AutoImproveModalProps) {
    const [phase, setPhase] = useState<"idle" | "running" | "rediagnosing" | "done">("idle");
    const [sections, setSections] = useState<SectionState[]>([]);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [result, setResult] = useState<{ improved: number; errors: number; oldScore: number; newScore: number | null; summary: string } | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-start when opened
    useEffect(() => {
        if (isOpen && phase === "idle") {
            handleStart();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleStart = useCallback(async () => {
        setPhase("running");
        setSections([]);
        setGlobalError(null);
        setResult(null);

        abortRef.current = new AbortController();

        try {
            const res = await fetch(`/api/projects/${projectId}/auto-improve`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: "{}",
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) {
                const err = await res.text();
                setGlobalError(err || "Error al iniciar la mejora");
                setPhase("idle");
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const event = JSON.parse(line.slice(6)) as SSEEvent;

                        if (event.type === "start") {
                            setSections(event.sections.map(s => ({
                                id: s.id,
                                title: s.title,
                                score: s.score,
                                feedback: s.feedback,
                                problems: s.problems ?? [],
                                status: "pending",
                            })));
                        } else if (event.type === "progress") {
                            setSections(prev => prev.map(s =>
                                s.id === event.sectionId
                                    ? { ...s, status: event.status as SectionStatus, newContent: event.newContent, error: event.error }
                                    : s
                            ));
                            // Auto-scroll to current section
                            setTimeout(() => {
                                const el = document.getElementById(`section-${event.sectionId}`);
                                el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                            }, 100);
                        } else if (event.type === "rediagnosing") {
                            setPhase("rediagnosing");
                        } else if (event.type === "complete") {
                            setResult({
                                improved: event.improved,
                                errors: event.errors,
                                oldScore: event.oldScore,
                                newScore: event.newScore,
                                summary: event.summary,
                            });
                            setPhase("done");
                            onComplete?.();
                        } else if (event.type === "error") {
                            setGlobalError(event.message);
                            setPhase("idle");
                        }
                    } catch { /* skip malformed */ }
                }
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                setGlobalError("Error de conexión. Inténtalo de nuevo.");
                setPhase("idle");
            }
        }
    }, [projectId, onComplete]);

    function handleAbort() {
        abortRef.current?.abort();
        setPhase("idle");
    }

    function handleClose() {
        if (phase === "running" || phase === "rediagnosing") handleAbort();
        onClose();
        setTimeout(() => {
            setPhase("idle");
            setSections([]);
            setResult(null);
            setGlobalError(null);
        }, 300);
    }

    const doneCount = sections.filter(s => s.status === "done").length;
    const totalCount = sections.length;
    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    const currentSection = sections.find(s => s.status === "improving");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={phase === "done" || phase === "idle" ? handleClose : undefined} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* ─── Header ─── */}
                <div className="bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 px-6 py-5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                {phase === "rediagnosing" ? (
                                    <RefreshCw size={22} className="text-white animate-spin" />
                                ) : phase === "done" && result ? (
                                    <CheckCircle2 size={22} className="text-white" />
                                ) : (
                                    <Wand2 size={22} className="text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-black text-white text-lg tracking-tight">
                                    {phase === "rediagnosing" ? "Re-analizando proyecto…" : phase === "done" ? "¡Mejora completada!" : "Mejora automática con IA"}
                                </h2>
                                <p className="text-white/60 text-xs mt-0.5">
                                    {phase === "running" && currentSection
                                        ? `Mejorando "${currentSection.title}"…`
                                        : phase === "rediagnosing"
                                            ? "Calculando nueva puntuación…"
                                            : phase === "done"
                                                ? result?.summary
                                                : "Analizando todas las secciones del proyecto…"}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {(phase === "running" || phase === "rediagnosing") && totalCount > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between text-[10px] text-white/60 mb-1.5 font-bold uppercase tracking-wider">
                                <span>{phase === "rediagnosing" ? "Re-diagnóstico en curso…" : `Sección ${doneCount + 1} de ${totalCount}`}</span>
                                <span>{Math.round(phase === "rediagnosing" ? 100 : progress)}%</span>
                            </div>
                            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700",
                                        phase === "rediagnosing" ? "bg-amber-300 animate-pulse w-full" : "bg-white"
                                    )}
                                    style={phase !== "rediagnosing" ? { width: `${progress}%` } : undefined}
                                />
                            </div>
                        </div>
                    )}

                    {/* Before/After score */}
                    {phase === "done" && result && (
                        <div className="mt-4 flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-3">
                            <div className="text-center">
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Antes</p>
                                <p className="text-2xl font-black text-white/60">{result.oldScore}</p>
                            </div>
                            <ArrowRight size={20} className="text-white/30 shrink-0" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: result.newScore && result.newScore > result.oldScore ? "#86efac" : "#fca5a5" }}>
                                    Después
                                </p>
                                <p className="text-2xl font-black" style={{ color: result.newScore && result.newScore > result.oldScore ? "#86efac" : "#fca5a5" }}>
                                    {result.newScore ?? "—"}
                                </p>
                            </div>
                            {result.newScore !== null && result.newScore > result.oldScore && (
                                <div className="ml-auto flex items-center gap-1.5 bg-emerald-400/20 rounded-xl px-3 py-1.5">
                                    <TrendingUp size={14} className="text-emerald-300" />
                                    <span className="text-emerald-300 font-black text-sm">+{result.newScore - result.oldScore}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Content ─── */}
                <div className="flex-1 overflow-y-auto" ref={listRef}>
                    {/* Global error */}
                    {globalError && (
                        <div className="p-5">
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-800 text-sm">No se pudo iniciar</p>
                                    <p className="text-red-600 text-xs mt-0.5">{globalError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section list */}
                    {sections.length > 0 && (
                        <div className="p-4 space-y-2">
                            {sections.map((section) => {
                                const cfg = STATUS_CONFIG[section.status];
                                const Icon = cfg.icon;

                                return (
                                    <div
                                        key={section.id}
                                        id={`section-${section.id}`}
                                        className={cn(
                                            "border rounded-2xl overflow-hidden transition-all duration-300",
                                            cfg.border,
                                            section.status === "improving" && "ring-2 ring-violet-300/50"
                                        )}
                                    >
                                        <div className={cn("flex items-center gap-3 px-4 py-3", cfg.bg)}>
                                            <Icon
                                                size={16}
                                                className={cn(cfg.color, (section.status === "improving" || section.status === "pending") && "animate-spin")}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{section.title}</p>
                                                    <ScoreChip score={section.score} />
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={cn("text-[11px] font-bold", cfg.color)}>{cfg.label}</span>
                                                    {section.feedback && section.status !== "done" && (
                                                        <span className="text-[10px] text-slate-400 truncate max-w-[250px]">· {section.feedback}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expand toggle for completed sections */}
                                            {section.status === "done" && section.newContent && (
                                                <button
                                                    onClick={() => setSections(prev => prev.map(s =>
                                                        s.id === section.id ? { ...s, expanded: !s.expanded } : s
                                                    ))}
                                                    className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                                >
                                                    {section.expanded
                                                        ? <ChevronUp size={14} className="text-emerald-600" />
                                                        : <ChevronDown size={14} className="text-emerald-600" />
                                                    }
                                                </button>
                                            )}
                                        </div>

                                        {/* Problems being fixed (show when pending or improving) */}
                                        {(section.status === "pending" || section.status === "improving") && section.problems.length > 0 && (
                                            <div className="px-4 py-2 bg-white/50 border-t border-slate-100 space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Problemas a resolver:</span>
                                                {section.problems.slice(0, 4).map((p, i) => (
                                                    <p key={i} className="text-[10px] text-slate-500 leading-relaxed pl-2 border-l-2 border-violet-200">{p}</p>
                                                ))}
                                                {section.problems.length > 4 && (
                                                    <p className="text-[10px] text-slate-400">+{section.problems.length - 4} más</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Improving pulse line */}
                                        {section.status === "improving" && (
                                            <div className="h-0.5 bg-violet-200 overflow-hidden">
                                                <div className="h-full w-1/3 bg-violet-500 rounded-full animate-pulse-slide" />
                                            </div>
                                        )}

                                        {/* Expanded preview */}
                                        {section.expanded && section.newContent && (
                                            <div className="px-4 py-3 bg-white border-t border-emerald-100 animate-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles size={11} className="text-violet-500" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contenido mejorado</span>
                                                </div>
                                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                                    {section.newContent.slice(0, 600)}
                                                    {section.newContent.length > 600 && (
                                                        <span className="text-slate-400 font-bold"> …ver resto en el editor</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* Error detail */}
                                        {section.status === "error" && section.error && (
                                            <div className="px-4 py-2 bg-white border-t border-red-100">
                                                <p className="text-[11px] text-red-600">{section.error}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Rediagnosing state */}
                    {phase === "rediagnosing" && (
                        <div className="px-5 pb-4">
                            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <RefreshCw size={16} className="text-amber-500 animate-spin shrink-0" />
                                <div>
                                    <p className="font-bold text-amber-800 text-sm">Regenerando diagnóstico…</p>
                                    <p className="text-amber-600 text-xs mt-0.5">Calculando la nueva puntuación con las secciones mejoradas</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Done summary */}
                    {phase === "done" && result && (
                        <div className="px-5 pb-4">
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <Zap size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-emerald-800 text-sm">
                                        {result.improved === sections.length
                                            ? "¡Todas las secciones mejoradas!"
                                            : `${result.improved} de ${sections.length} secciones mejoradas`}
                                    </p>
                                    <p className="text-emerald-700 text-xs mt-1 leading-relaxed">{result.summary}</p>
                                    {result.errors > 0 && (
                                        <p className="text-amber-600 text-xs mt-1 font-bold">⚠️ {result.errors} secciones tuvieron errores</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
                    {phase === "done" ? (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => { window.location.reload(); }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/25"
                            >
                                <RefreshCw size={14} />
                                Ver cambios en el editor
                            </button>
                        </>
                    ) : phase === "running" || phase === "rediagnosing" ? (
                        <>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 size={12} className="animate-spin" />
                                {phase === "rediagnosing" ? "Re-analizando…" : `${doneCount}/${totalCount} secciones`}
                            </div>
                            <button
                                onClick={handleAbort}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
                            >
                                <X size={14} />
                                Detener
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            {globalError && (
                                <button
                                    onClick={handleStart}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/25"
                                >
                                    <RefreshCw size={14} />
                                    Reintentar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Pulse slide animation */}
            <style jsx>{`
        @keyframes pulse-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
        .animate-pulse-slide {
          animation: pulse-slide 1.5s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
