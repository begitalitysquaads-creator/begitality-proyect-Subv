"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Activity,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    Loader2,
    Sparkles,
    ChevronDown,
    ChevronRight,
    Target,
    Lightbulb,
    ClipboardList,
    RefreshCw,
    TrendingUp,
    Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectDiagnostic, DiagnosticRisk, DiagnosticSuggestion } from "@/lib/types";
import { AutoImproveModal } from "@/components/project/AutoImproveModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
            </svg>
            <div className="text-center">
                <span className="text-3xl font-black text-slate-900 tracking-tighter">{score}</span>
                <span className="text-[9px] text-slate-300 block font-black uppercase tracking-widest">/ 100</span>
            </div>
        </div>
    );
}

function RiskBadge({ level }: { level: DiagnosticRisk["level"] }) {
    const config = {
        high: {
            icon: AlertTriangle,
            label: "Alto",
            className: "bg-red-50 text-red-700 border-red-100",
            iconClass: "text-red-400",
        },
        medium: {
            icon: AlertCircle,
            label: "Medio",
            className: "bg-amber-50 text-amber-700 border-amber-100",
            iconClass: "text-amber-400",
        },
        low: {
            icon: Info,
            label: "Bajo",
            className: "bg-blue-50 text-blue-600 border-blue-100",
            iconClass: "text-blue-400",
        },
    };
    const { icon: Icon, label, className, iconClass } = config[level];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                className
            )}
        >
            <Icon size={10} className={iconClass} />
            {label}
        </span>
    );
}

function PriorityDot({ priority }: { priority: DiagnosticSuggestion["priority"] }) {
    const colors = {
        1: "bg-red-500",
        2: "bg-amber-400",
        3: "bg-slate-300",
    };
    const labels = { 1: "Urgente", 2: "Importante", 3: "Opcional" };
    return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <span className={cn("w-2 h-2 rounded-full shrink-0", colors[priority])} />
            {labels[priority]}
        </span>
    );
}

function ScoreLabel({ score }: { score: number }) {
    const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
    return <span className={cn(color, "font-black text-xs tracking-tight")}>{score}</span>;
}

// ─── Sección colapsable ───────────────────────────────────────────────────────

function CollapsibleSection({
    title,
    icon: Icon,
    count,
    children,
    defaultOpen = false,
}: {
    title: string;
    icon: React.ElementType;
    count?: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5">
                    <Icon size={14} className="text-slate-400" />
                    <span className="font-black text-slate-700 text-[10px] uppercase tracking-[0.15em]">{title}</span>
                    {count !== undefined && (
                        <span className="bg-white text-slate-400 text-[9px] font-black px-2 py-0.5 rounded-lg border border-slate-100">
                            {count}
                        </span>
                    )}
                </div>
                {open ? (
                    <ChevronDown size={14} className="text-slate-300" />
                ) : (
                    <ChevronRight size={14} className="text-slate-300" />
                )}
            </button>
            {open && <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-white/50">{children}</div>}
        </div>
    );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

interface DiagnosticPanelProps {
    projectId: string;
    initialDiagnostic?: ProjectDiagnostic | null;
    hasSections: boolean;
}

export function DiagnosticPanel({
    projectId,
    initialDiagnostic,
    hasSections: hasSectionsProp,
}: DiagnosticPanelProps) {
    const [diagnostic, setDiagnostic] = useState<ProjectDiagnostic | null>(
        initialDiagnostic ?? null
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showImprove, setShowImprove] = useState(false);
    const [localHasSections, setLocalHasSections] = useState(hasSectionsProp);

    useEffect(() => {
        setLocalHasSections(hasSectionsProp);
    }, [hasSectionsProp]);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const sectionsCheck = await fetch(`/api/projects/${projectId}/sections-count`, {
                credentials: "include",
            }).then((r) => r.json()).catch(() => null);

            const currentHasSections = sectionsCheck?.count > 0;
            if (sectionsCheck !== null) setLocalHasSections(currentHasSections);

            if (!currentHasSections) {
                setError("Necesitas tener al menos una sección en el proyecto para generar el diagnóstico.");
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/projects/${projectId}/diagnostics`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.diagnostic) {
                setDiagnostic(data.diagnostic);
            } else {
                setError(data.error || "Error al generar el diagnóstico");
            }
        } catch {
            setError("Error de conexión. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const scoreLabel =
        !diagnostic
            ? null
            : diagnostic.overall_score >= 75
                ? "Excelente"
                : diagnostic.overall_score >= 50
                    ? "Mejorable"
                    : "Necesita trabajo";

    const highRisks = diagnostic?.risks.filter((r) => r.level === "high") ?? [];
    const mediumRisks = diagnostic?.risks.filter((r) => r.level === "medium") ?? [];
    const lowRisks = diagnostic?.risks.filter((r) => r.level === "low") ?? [];

    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group overflow-hidden animate-in fade-in duration-700">
            
            {/* Background Icon */}
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                    <Activity size={280} />
                </div>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                        <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
                            <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse" />
                            Diagnóstico IA
                        </h3>
                        {diagnostic && (
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-[18px]">
                                {new Date(diagnostic.generated_at).toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading || !localHasSections}
                        title={!localHasSections ? "Genera primero las secciones del proyecto" : undefined}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                            diagnostic
                                ? "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-900/10",
                            "disabled:opacity-40 disabled:cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : diagnostic ? (
                            <RefreshCw size={14} />
                        ) : (
                            <Sparkles size={14} />
                        )}
                        {loading ? "Analizando…" : diagnostic ? "Actualizar" : "Generar"}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold mb-6">
                        {error}
                    </div>
                )}

                {/* Estado vacío */}
                {!diagnostic && !loading && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                            <TrendingUp size={24} className="text-blue-400" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sin diagnóstico</p>
                        <p className="text-[9px] text-slate-300 font-bold max-w-[200px] mx-auto leading-relaxed">
                            {localHasSections
                                ? "Genera un diagnóstico IA para detectar riesgos y mejorar tu memoria técnica."
                                : "Primero genera las secciones del proyecto para poder diagnosticar."}
                        </p>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-4 animate-pulse py-4">
                        <div className="flex items-center gap-5">
                            <div className="w-28 h-28 bg-slate-100 rounded-full shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-3 bg-slate-100 rounded-xl w-3/4" />
                                <div className="h-2.5 bg-slate-100 rounded-xl w-full" />
                                <div className="h-2.5 bg-slate-100 rounded-xl w-5/6" />
                            </div>
                        </div>
                        <div className="h-14 bg-slate-100 rounded-2xl" />
                        <div className="h-14 bg-slate-100 rounded-2xl" />
                    </div>
                )}

                {/* Resultado del diagnóstico */}
                {diagnostic && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Score + resumen */}
                        <div className="flex items-center gap-5">
                            <ScoreRing score={diagnostic.overall_score} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">Puntuación global</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className={cn(
                                            "text-xs font-black uppercase tracking-widest",
                                            diagnostic.overall_score >= 75
                                                ? "text-emerald-600"
                                                : diagnostic.overall_score >= 50
                                                    ? "text-amber-600"
                                                    : "text-red-600"
                                        )}
                                    >
                                        {scoreLabel}
                                    </span>
                                    <span className="text-[8px] text-slate-200 font-bold">·</span>
                                    <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">{diagnostic.model_used}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{diagnostic.summary}</p>
                            </div>
                        </div>

                        {/* Riesgos */}
                        {diagnostic.risks.length > 0 && (
                            <CollapsibleSection
                                title="Riesgos detectados"
                                icon={AlertTriangle}
                                count={diagnostic.risks.length}
                                defaultOpen={highRisks.length > 0}
                            >
                                {[...highRisks, ...mediumRisks, ...lowRisks].map((risk, i) => (
                                    <div key={i} className="flex items-start gap-3 py-1">
                                        <RiskBadge level={risk.level} />
                                        <p className="text-[11px] text-slate-600 leading-relaxed flex-1 font-medium">{risk.message}</p>
                                    </div>
                                ))}
                            </CollapsibleSection>
                        )}

                        {/* Sugerencias */}
                        {diagnostic.suggestions.length > 0 && (
                            <CollapsibleSection
                                title="Sugerencias de mejora"
                                icon={Lightbulb}
                                count={diagnostic.suggestions.length}
                                defaultOpen
                            >
                                {[...diagnostic.suggestions]
                                    .sort((a, b) => a.priority - b.priority)
                                    .map((s, i) => (
                                        <div key={i} className="flex items-start gap-3 py-1">
                                            <PriorityDot priority={s.priority} />
                                            <p className="text-[11px] text-slate-600 leading-relaxed flex-1 font-medium">
                                                {s.action}
                                                {s.section_title && (
                                                    <span className="ml-1 text-blue-500 font-black text-[9px] uppercase tracking-wider">
                                                        ({s.section_title})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                            </CollapsibleSection>
                        )}

                        {/* Puntuación por sección */}
                        {Object.keys(diagnostic.section_scores).length > 0 && (
                            <CollapsibleSection
                                title="Puntuación por sección"
                                icon={Target}
                                count={Object.keys(diagnostic.section_scores).length}
                            >
                                <div className="space-y-4">
                                    {Object.entries(diagnostic.section_scores).map(([title, data]) => (
                                        <div key={title}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-black text-slate-700 truncate flex-1 mr-3 uppercase tracking-wider">
                                                    {title}
                                                </span>
                                                <ScoreLabel score={data.score} />
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-700",
                                                        data.score >= 80
                                                            ? "bg-emerald-500"
                                                            : data.score >= 60
                                                                ? "bg-amber-400"
                                                                : "bg-red-400"
                                                    )}
                                                    style={{ width: `${data.score}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{data.feedback}</p>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* Requisitos encontrados */}
                        {diagnostic.requirements_found.length > 0 && (
                            <CollapsibleSection
                                title="Requisitos de la convocatoria"
                                icon={ClipboardList}
                                count={diagnostic.requirements_found.length}
                            >
                                <ul className="space-y-2">
                                    {diagnostic.requirements_found.map((req, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                                            <span className="text-[11px] text-slate-600 font-medium">{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}

                        {/* ─── Botón mejora automática ─── */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowImprove(true)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Wand2 size={16} />
                                Mejora Automática con IA
                            </button>
                            <p className="text-center text-[8px] text-slate-300 font-black uppercase tracking-widest mt-2">
                                La IA reescribe las secciones débiles
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de mejora automática */}
            <AutoImproveModal
                projectId={projectId}
                isOpen={showImprove}
                onClose={() => setShowImprove(false)}
                onComplete={() => {
                    setError(null);
                }}
            />
        </div>
    );
}
