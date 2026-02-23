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
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color =
        score >= 75
            ? "#10b981" // emerald
            : score >= 50
                ? "#f59e0b" // amber
                : "#ef4444"; // red

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
            </svg>
            <div className="text-center">
                <span className="text-2xl font-black text-slate-900">{score}</span>
                <span className="text-xs text-slate-400 block -mt-0.5">/ 100</span>
            </div>
        </div>
    );
}

function RiskBadge({ level }: { level: DiagnosticRisk["level"] }) {
    const config = {
        high: {
            icon: AlertTriangle,
            label: "Alto",
            className: "bg-red-50 text-red-700 border-red-200",
            iconClass: "text-red-500",
        },
        medium: {
            icon: AlertCircle,
            label: "Medio",
            className: "bg-amber-50 text-amber-700 border-amber-200",
            iconClass: "text-amber-500",
        },
        low: {
            icon: Info,
            label: "Bajo",
            className: "bg-blue-50 text-blue-700 border-blue-200",
            iconClass: "text-blue-500",
        },
    };
    const { icon: Icon, label, className, iconClass } = config[level];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
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
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className={cn("w-2 h-2 rounded-full shrink-0", colors[priority])} />
            {labels[priority]}
        </span>
    );
}

function ScoreLabel({ score }: { score: number }) {
    if (score >= 80) return <span className="text-emerald-600 font-bold text-sm">{score}</span>;
    if (score >= 60) return <span className="text-amber-600 font-bold text-sm">{score}</span>;
    return <span className="text-red-600 font-bold text-sm">{score}</span>;
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
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-slate-500" />
                    <span className="font-bold text-slate-800 text-sm">{title}</span>
                    {count !== undefined && (
                        <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                {open ? (
                    <ChevronDown size={16} className="text-slate-400" />
                ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                )}
            </button>
            {open && <div className="border-t border-slate-100 p-4 space-y-3">{children}</div>}
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
    // El prop es el valor inicial (del Server Component), pero puede cambiar
    // cuando el usuario añade secciones sin recargar la página completa
    const [localHasSections, setLocalHasSections] = useState(hasSectionsProp);

    // Si el Server Component re-renderiza (router.refresh), sincronizar
    useEffect(() => {
        setLocalHasSections(hasSectionsProp);
    }, [hasSectionsProp]);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Consultar el número actual de secciones (puede haber cambiado en el cliente)
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
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Activity size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-sm">Diagnóstico IA</h3>
                        {diagnostic && (
                            <p className="text-xs text-slate-400">
                                {new Date(diagnostic.generated_at).toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !localHasSections}
                    title={!localHasSections ? "Genera primero las secciones del proyecto" : undefined}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                        diagnostic
                            ? "text-slate-600 border border-slate-200 hover:bg-slate-50"
                            : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-md shadow-violet-500/20",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {loading ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : diagnostic ? (
                        <RefreshCw size={12} />
                    ) : (
                        <Sparkles size={12} />
                    )}
                    {loading ? "Analizando…" : diagnostic ? "Actualizar" : "Generar diagnóstico"}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs">
                    {error}
                </div>
            )}

            {/* Estado vacío */}
            {!diagnostic && !loading && (
                <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <TrendingUp size={24} className="text-violet-500" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Sin diagnóstico aún</p>
                    <p className="text-slate-400 text-xs max-w-[220px] mx-auto">
                        {localHasSections
                            ? "Genera un diagnóstico IA para detectar riesgos y mejorar tu memoria técnica."
                            : "Primero genera las secciones del proyecto para poder diagnosticar."}
                    </p>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-slate-100 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                            <div className="h-3 bg-slate-100 rounded-lg w-full" />
                            <div className="h-3 bg-slate-100 rounded-lg w-5/6" />
                        </div>
                    </div>
                    <div className="h-12 bg-slate-100 rounded-xl" />
                    <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
            )}

            {/* Resultado del diagnóstico */}
            {diagnostic && !loading && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {/* Score + resumen */}
                    <div className="flex items-start gap-4">
                        <ScoreRing score={diagnostic.overall_score} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className={cn(
                                        "text-sm font-black",
                                        diagnostic.overall_score >= 75
                                            ? "text-emerald-600"
                                            : diagnostic.overall_score >= 50
                                                ? "text-amber-600"
                                                : "text-red-600"
                                    )}
                                >
                                    {scoreLabel}
                                </span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-xs text-slate-400">{diagnostic.model_used}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{diagnostic.summary}</p>
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
                                <div key={i} className="flex items-start gap-2.5">
                                    <RiskBadge level={risk.level} />
                                    <p className="text-xs text-slate-600 leading-relaxed flex-1">{risk.message}</p>
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
                                    <div key={i} className="flex items-start gap-2.5">
                                        <PriorityDot priority={s.priority} />
                                        <p className="text-xs text-slate-600 leading-relaxed flex-1">
                                            {s.action}
                                            {s.section_title && (
                                                <span className="ml-1 text-violet-600 font-medium">
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
                            <div className="space-y-3">
                                {Object.entries(diagnostic.section_scores).map(([title, data]) => (
                                    <div key={title}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-slate-700 truncate flex-1 mr-2">
                                                {title}
                                            </span>
                                            <ScoreLabel score={data.score} />
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
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
                                        <p className="text-[11px] text-slate-400 leading-relaxed">{data.feedback}</p>
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
                            <ul className="space-y-1.5">
                                {diagnostic.requirements_found.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                        <span className="text-xs text-slate-600">{req}</span>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleSection>
                    )}

                    {/* ─── Botón mejora automática ─── */}
                    <div className="pt-1 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowImprove(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm hover:from-violet-500 hover:to-blue-500 transition-all shadow-md shadow-violet-500/20"
                        >
                            <Wand2 size={16} />
                            Mejora automática con IA
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-1.5">
                            La IA reescribe las secciones débiles según el diagnóstico
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de mejora automática */}
            <AutoImproveModal
                projectId={projectId}
                isOpen={showImprove}
                onClose={() => setShowImprove(false)}
                onComplete={() => {
                    // Sugerir al usuario que regenere el diagnóstico
                    setError(null);
                }}
            />
        </div>
    );
}
