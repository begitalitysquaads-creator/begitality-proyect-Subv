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
    Check,
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
    pending: { icon: Loader2, label: "En cola", color: "text-slate-300", bg: "bg-slate-50/50", border: "border-slate-100" },
    improving: { icon: Loader2, label: "Mejorando…", color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-200" },
    done: { icon: CheckCircle2, label: "Completada", color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-200" },
    error: { icon: XCircle, label: "Error", color: "text-red-600", bg: "bg-red-50/50", border: "border-red-200" },
};

function ScoreChip({ score }: { score: number }) {
    const color = score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-100"
        : score >= 50 ? "text-amber-700 bg-amber-50 border-amber-100"
            : "text-red-700 bg-red-50 border-red-100";
    return (
        <span className={cn(
            "font-black rounded-lg border text-[9px] px-2 py-0.5 uppercase tracking-wider",
            color,
        )}>
            {score}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={phase === "done" || phase === "idle" ? handleClose : undefined} />

            <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* ─── Header ─── */}
                <div className="bg-slate-900 px-8 py-7 shrink-0 relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                                {phase === "rediagnosing" ? (
                                    <RefreshCw size={22} className="text-blue-400 animate-spin" />
                                ) : phase === "done" && result ? (
                                    <CheckCircle2 size={22} className="text-emerald-400" />
                                ) : (
                                    <Wand2 size={22} className="text-blue-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-black text-white text-[10px] uppercase tracking-[0.25em]">
                                    {phase === "rediagnosing" ? "Re-analizando…" : phase === "done" ? "Mejora completada" : "Mejora Automática IA"}
                                </h2>
                                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                                    {phase === "running" && currentSection
                                        ? `Mejorando: ${currentSection.title}`
                                        : phase === "rediagnosing"
                                            ? "Calculando nueva puntuación…"
                                            : phase === "done"
                                                ? result?.summary
                                                : "Procesando secciones del proyecto"}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {(phase === "running" || phase === "rediagnosing") && totalCount > 0 && (
                        <div className="mt-5 relative z-10">
                            <div className="flex justify-between text-[8px] text-white/30 mb-2 font-black uppercase tracking-[0.2em]">
                                <span>{phase === "rediagnosing" ? "Re-diagnóstico" : `Sección ${doneCount + 1} de ${totalCount}`}</span>
                                <span>{Math.round(phase === "rediagnosing" ? 100 : progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700",
                                        phase === "rediagnosing" ? "bg-blue-400 animate-pulse w-full" : "bg-white"
                                    )}
                                    style={phase !== "rediagnosing" ? { width: `${progress}%` } : undefined}
                                />
                            </div>
                        </div>
                    )}

                    {/* Before/After score */}
                    {phase === "done" && result && (
                        <div className="mt-5 flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 relative z-10">
                            <div className="text-center">
                                <p className="text-white/30 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Antes</p>
                                <p className="text-2xl font-black text-white/40 tracking-tighter">{result.oldScore}</p>
                            </div>
                            <ArrowRight size={18} className="text-white/15 shrink-0" />
                            <div className="text-center">
                                <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-1", result.newScore && result.newScore > result.oldScore ? "text-emerald-400" : "text-white/30")}>
                                    Después
                                </p>
                                <p className={cn("text-2xl font-black tracking-tighter", result.newScore && result.newScore > result.oldScore ? "text-emerald-400" : "text-white/40")}>
                                    {result.newScore ?? "—"}
                                </p>
                            </div>
                            {result.newScore !== null && result.newScore > result.oldScore && (
                                <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                    <span className="text-emerald-400 font-black text-xs tracking-tighter">+{result.newScore - result.oldScore}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Content ─── */}
                <div className="flex-1 overflow-y-auto" ref={listRef}>
                    {/* Global error */}
                    {globalError && (
                        <div className="p-6">
                            <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-100 rounded-2xl">
                                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-black text-red-800 text-[10px] uppercase tracking-widest">Error</p>
                                    <p className="text-red-600 text-[11px] font-medium mt-1">{globalError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section list */}
                    {sections.length > 0 && (
                        <div className="p-5 space-y-2">
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
                                            section.status === "improving" && "ring-2 ring-blue-200"
                                        )}
                                    >
                                        <div className={cn("flex items-center gap-3 px-5 py-4", cfg.bg)}>
                                            <Icon
                                                size={16}
                                                className={cn(cfg.color, (section.status === "improving" || section.status === "pending") && "animate-spin")}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-black text-slate-800 truncate tracking-tight">{section.title}</p>
                                                    <ScoreChip score={section.score} />
                                                </div>
                                                <p className={cn("text-[9px] font-black uppercase tracking-widest mt-0.5", cfg.color)}>{cfg.label}</p>
                                            </div>

                                            {section.status === "done" && section.newContent && (
                                                <button
                                                    onClick={() => setSections(prev => prev.map(s =>
                                                        s.id === section.id ? { ...s, expanded: !s.expanded } : s
                                                    ))}
                                                    className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                                >
                                                    {section.expanded
                                                        ? <ChevronUp size={14} className="text-emerald-500" />
                                                        : <ChevronDown size={14} className="text-emerald-500" />
                                                    }
                                                </button>
                                            )}
                                        </div>

                                        {/* Problems */}
                                        {(section.status === "pending" || section.status === "improving") && section.problems.length > 0 && (
                                            <div className="px-5 py-3 bg-white border-t border-slate-100 space-y-1">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Problemas a resolver:</span>
                                                {section.problems.slice(0, 4).map((p, i) => (
                                                    <p key={i} className="text-[10px] text-slate-400 leading-relaxed pl-3 border-l-2 border-blue-200 font-medium">{p}</p>
                                                ))}
                                                {section.problems.length > 4 && (
                                                    <p className="text-[9px] text-slate-300 font-bold">+{section.problems.length - 4} más</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Improving indicator */}
                                        {section.status === "improving" && (
                                            <div className="h-0.5 bg-blue-100 overflow-hidden">
                                                <div className="h-full w-1/3 bg-blue-500 rounded-full" style={{ animation: "pulseSlide 1.5s ease-in-out infinite" }} />
                                            </div>
                                        )}

                                        {/* Expanded preview */}
                                        {section.expanded && section.newContent && (
                                            <div className="px-5 py-4 bg-white border-t border-emerald-100 animate-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles size={11} className="text-blue-400" />
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Contenido mejorado</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                                                    {section.newContent.slice(0, 600)}
                                                    {section.newContent.length > 600 && (
                                                        <span className="text-slate-300 font-black"> …ver resto en el editor</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* Error detail */}
                                        {section.status === "error" && section.error && (
                                            <div className="px-5 py-3 bg-white border-t border-red-100">
                                                <p className="text-[10px] text-red-600 font-medium">{section.error}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Rediagnosing state */}
                    {phase === "rediagnosing" && (
                        <div className="px-6 pb-5">
                            <div className="flex items-center gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                <RefreshCw size={16} className="text-blue-500 animate-spin shrink-0" />
                                <div>
                                    <p className="font-black text-blue-800 text-[10px] uppercase tracking-widest">Regenerando diagnóstico</p>
                                    <p className="text-blue-600 text-[10px] font-medium mt-0.5">Calculando nueva puntuación…</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Done summary */}
                    {phase === "done" && result && (
                        <div className="px-6 pb-5">
                            <div className="flex items-start gap-3 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <Zap size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-black text-emerald-800 text-[10px] uppercase tracking-widest">
                                        {result.improved === sections.length
                                            ? "¡Todas las secciones mejoradas!"
                                            : `${result.improved}/${sections.length} secciones mejoradas`}
                                    </p>
                                    <p className="text-emerald-700 text-[11px] mt-1 leading-relaxed font-medium">{result.summary}</p>
                                    {result.errors > 0 && (
                                        <p className="text-amber-600 text-[10px] mt-1 font-black uppercase tracking-wider">⚠️ {result.errors} errores</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="border-t border-slate-100 px-8 py-5 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
                    {phase === "done" ? (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => { window.location.reload(); }}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                            >
                                <RefreshCw size={14} />
                                Ver Cambios
                            </button>
                        </>
                    ) : phase === "running" || phase === "rediagnosing" ? (
                        <>
                            <div className="flex items-center gap-2 text-[9px] text-slate-300 font-black uppercase tracking-widest">
                                <Loader2 size={12} className="animate-spin" />
                                {phase === "rediagnosing" ? "Re-analizando…" : `${doneCount}/${totalCount}`}
                            </div>
                            <button
                                onClick={handleAbort}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all"
                            >
                                <X size={14} />
                                Detener
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            {globalError && (
                                <button
                                    onClick={handleStart}
                                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
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
                @keyframes pulseSlide {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(200%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
