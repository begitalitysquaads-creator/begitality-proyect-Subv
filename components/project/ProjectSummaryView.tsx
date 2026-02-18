"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Share2,
    Check,
    FileText,
    CheckCircle2,
    Clock,
    BookOpen,
    Layers,
    TrendingUp,
    ExternalLink,
    Copy,
    Sparkles,
    Award,
    Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionSummary {
    id: string;
    title: string;
    is_completed: boolean;
    wordCount: number;
    sort_order: number;
}

interface ProjectSummaryViewProps {
    project: {
        id: string;
        name: string;
        grant_name: string;
        status: string;
        created_at: string;
    };
    stats: {
        totalSections: number;
        completedSections: number;
        pendingSections: number;
        progressPercent: number;
        totalWords: number;
        completedWords: number;
        totalFiles: number;
    };
    sections: SectionSummary[];
    isOwner: boolean;
    projectWorkspaceUrl: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "text-slate-500" },
    in_progress: { label: "En Progreso", color: "text-blue-600" },
    ready_export: { label: "Listo para Exportar", color: "text-emerald-600" },
    exported: { label: "Exportado", color: "text-violet-600" },
};

// Anillo de progreso SVG animado
function ProgressRing({
    percent,
    size = 160,
    strokeWidth = 12,
}: {
    percent: number;
    size?: number;
    strokeWidth?: number;
}) {
    const [animatedPercent, setAnimatedPercent] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedPercent / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedPercent(percent), 100);
        return () => clearTimeout(timer);
    }, [percent]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(148,163,184,0.15)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white leading-none">{animatedPercent}%</span>
                <span className="text-xs text-slate-400 font-medium mt-1">completado</span>
            </div>
        </div>
    );
}

// Tarjeta de métrica
function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    gradient,
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    gradient: string;
    delay?: number;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    return (
        <div
            className={cn(
                "relative rounded-2xl p-5 overflow-hidden transition-all duration-700",
                gradient,
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
        >
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-black text-white leading-none mb-1">
                    {typeof value === "number" ? value.toLocaleString("es-ES") : value}
                </div>
                <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</div>
                {sub && <div className="text-xs text-white/50 mt-1">{sub}</div>}
            </div>
        </div>
    );
}

// Barra de progreso de sección
function SectionBar({
    section,
    index,
    maxWords,
}: {
    section: SectionSummary;
    index: number;
    maxWords: number;
}) {
    const [width, setWidth] = useState(0);
    const pct = maxWords > 0 ? (section.wordCount / maxWords) * 100 : 0;

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), 200 + index * 60);
        return () => clearTimeout(t);
    }, [pct, index]);

    return (
        <div className="flex items-center gap-3 group">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {section.is_completed ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span
                        className={cn(
                            "text-sm font-medium truncate",
                            section.is_completed ? "text-slate-200" : "text-slate-400"
                        )}
                    >
                        {section.sort_order + 1}. {section.title}
                    </span>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                        {section.wordCount.toLocaleString("es-ES")} pal.
                    </span>
                </div>
                <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-700",
                            section.is_completed
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : "bg-gradient-to-r from-slate-600 to-slate-500"
                        )}
                        style={{ width: `${width}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export function ProjectSummaryView({
    project,
    stats,
    sections,
    isOwner,
    projectWorkspaceUrl,
}: ProjectSummaryViewProps) {
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    useEffect(() => {
        setShareUrl(window.location.href);
    }, []);

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = shareUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const maxWords = Math.max(...sections.map((s) => s.wordCount), 1);
    const statusInfo = statusLabels[project.status] || statusLabels.draft;
    const createdDate = new Date(project.created_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const avgWordsPerSection =
        stats.completedSections > 0
            ? Math.round(stats.completedWords / stats.completedSections)
            : 0;

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor: "#0a0f1e",
                backgroundImage: `
                    radial-gradient(circle at 25% 0%, rgba(99,102,241,0.08) 0%, transparent 50%),
                    radial-gradient(circle at 75% 100%, rgba(6,182,212,0.06) 0%, transparent 50%),
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(148,163,184,0.07)'/%3E%3C/svg%3E")
                `,
            }}
        >
            {/* Vignette border — difumina los bordes para romper el efecto cuadrado */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    boxShadow: "inset 0 0 120px 40px rgba(10,15,30,0.85)",
                }}
            />
            {/* Fondo animado */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
                {/* Líneas de borde con gradiente */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-violet-500/20 to-transparent" />
                <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 py-8">
                <div
                    className="rounded-3xl space-y-8 p-6 md:p-8"
                    style={{
                        background: "rgba(15,20,40,0.75)",
                        border: "1px solid rgba(148,163,184,0.08)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 0 0 1px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.5)",
                    }}
                >
                    {/* Header */}
                    <header className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            {isOwner && (
                                <Link
                                    href={projectWorkspaceUrl}
                                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <ArrowLeft size={18} />
                                </Link>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles size={14} className="text-violet-400" />
                                    <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                                        Resumen del proyecto
                                    </span>
                                </div>
                                <h1 className="text-2xl font-black text-white leading-tight">{project.name}</h1>
                                <p className="text-slate-400 text-sm mt-0.5">{project.grant_name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Estado */}
                            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <span className={cn("text-xs font-bold", statusInfo.color)}>
                                    {statusInfo.label}
                                </span>
                            </div>

                            {/* Compartir */}
                            <button
                                onClick={handleCopyUrl}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                                    copied
                                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                                        : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {copied ? <Check size={14} /> : <Share2 size={14} />}
                                {copied ? "¡URL copiada!" : "Compartir"}
                            </button>

                            {isOwner && (
                                <Link
                                    href={projectWorkspaceUrl}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all"
                                >
                                    <ExternalLink size={14} />
                                    Ir al proyecto
                                </Link>
                            )}
                        </div>
                    </header>

                    {/* Hero: Anillo + stats principales */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Anillo de progreso */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-white/8 rounded-3xl p-8 flex flex-col items-center justify-center gap-4">
                            <ProgressRing percent={stats.progressPercent} size={180} strokeWidth={14} />
                            <div className="text-center">
                                <div className="text-slate-300 text-sm font-medium">
                                    {stats.completedSections} de {stats.totalSections} secciones completadas
                                </div>
                                {stats.progressPercent === 100 && (
                                    <div className="flex items-center justify-center gap-1.5 mt-2 text-emerald-400 text-xs font-bold">
                                        <Award size={14} />
                                        ¡Memoria completada!
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={11} />
                                Creado el {createdDate}
                            </div>
                        </div>

                        {/* Grid de métricas */}
                        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                            <StatCard
                                icon={Layers}
                                label="Secciones totales"
                                value={stats.totalSections}
                                sub={`${stats.pendingSections} pendientes`}
                                gradient="bg-gradient-to-br from-violet-600 to-purple-700"
                                delay={100}
                            />
                            <StatCard
                                icon={CheckCircle2}
                                label="Completadas"
                                value={stats.completedSections}
                                sub={`${stats.progressPercent}% del total`}
                                gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                                delay={200}
                            />
                            <StatCard
                                icon={BookOpen}
                                label="Palabras escritas"
                                value={stats.totalWords}
                                sub={`${avgWordsPerSection} de media por sección`}
                                gradient="bg-gradient-to-br from-blue-600 to-cyan-600"
                                delay={300}
                            />
                            <StatCard
                                icon={FileText}
                                label="Bases cargadas"
                                value={stats.totalFiles}
                                sub="PDFs de convocatoria"
                                gradient="bg-gradient-to-br from-orange-500 to-rose-500"
                                delay={400}
                            />
                        </div>
                    </div>

                    {/* Barra de progreso global */}
                    <div className="bg-slate-800/60 backdrop-blur-sm border border-white/8 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-violet-400" />
                                <h2 className="font-bold text-white text-sm">Progreso global</h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                {stats.completedWords.toLocaleString("es-ES")} / {stats.totalWords.toLocaleString("es-ES")} palabras en secciones completadas
                            </span>
                        </div>
                        <div className="h-3 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 transition-all duration-1000"
                                style={{ width: `${stats.progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-500">0%</span>
                            <span className="text-xs text-slate-500">100%</span>
                        </div>
                    </div>

                    {/* Lista de secciones */}
                    {sections.length > 0 && (
                        <div className="bg-slate-800/60 backdrop-blur-sm border border-white/8 rounded-3xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Target size={16} className="text-violet-400" />
                                <h2 className="font-bold text-white text-sm">Desglose por sección</h2>
                                <span className="ml-auto text-xs text-slate-500">
                                    Palabras escritas por sección
                                </span>
                            </div>
                            <div className="space-y-4">
                                {sections.map((section, i) => (
                                    <SectionBar
                                        key={section.id}
                                        section={section}
                                        index={i}
                                        maxWords={maxWords}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer: compartir */}
                    <div className="bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/20 rounded-3xl p-6 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Share2 size={14} className="text-violet-400" />
                                <span className="text-sm font-bold text-white">Comparte este resumen</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Cualquier persona con el enlace puede ver el progreso de este proyecto.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 max-w-xs w-full">
                            <span className="text-xs text-slate-400 truncate flex-1">{shareUrl}</span>
                            <button
                                onClick={handleCopyUrl}
                                className={cn(
                                    "flex-shrink-0 p-1.5 rounded-lg transition-all",
                                    copied
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "hover:bg-white/10 text-slate-400 hover:text-white"
                                )}
                                title="Copiar URL"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

