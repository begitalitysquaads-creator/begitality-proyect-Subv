"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Building2,
    FileText,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Banknote,
    Target,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface ProjectDeadline {
    id: string;
    name: string;
    grant_name: string;
    status: string;
    project_deadline: string;
    project_description: string | null;
    grant_entity: string | null;
    grant_amount: string | null;
    company_name: string | null;
    company_sector: string | null;
    sections_total: number;
    sections_completed: number;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; dot: string }
> = {
    draft: {
        label: "Borrador",
        color: "text-slate-600",
        bg: "bg-slate-100",
        dot: "bg-slate-400",
    },
    in_progress: {
        label: "En progreso",
        color: "text-blue-700",
        bg: "bg-blue-100",
        dot: "bg-blue-500",
    },
    ready_export: {
        label: "Listo",
        color: "text-emerald-700",
        bg: "bg-emerald-100",
        dot: "bg-emerald-500",
    },
    exported: {
        label: "Exportado",
        color: "text-violet-700",
        bg: "bg-violet-100",
        dot: "bg-violet-500",
    },
};

const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function isSameDay(d1: Date, d2: Date) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function getDaysUntil(deadline: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    dl.setHours(0, 0, 0, 0);
    return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineUrgency(days: number): {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
} {
    if (days < 0) return { label: "Vencido", color: "text-red-600", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle };
    if (days === 0) return { label: "¡Hoy!", color: "text-red-600", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle };
    if (days <= 3) return { label: `${days}d`, color: "text-red-600", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle };
    if (days <= 7) return { label: `${days}d`, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", icon: Clock };
    if (days <= 30) return { label: `${days}d`, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", icon: Clock };
    return { label: `${days}d`, color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 };
}

// ── Deadline dot colors for calendar cells ───────────────────────────────────
function getDotColor(days: number) {
    if (days < 0) return "bg-red-500";
    if (days <= 3) return "bg-red-500 animate-pulse";
    if (days <= 7) return "bg-amber-500";
    if (days <= 30) return "bg-blue-500";
    return "bg-emerald-500";
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage() {
    const [projects, setProjects] = useState<ProjectDeadline[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectDeadline | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        fetch("/api/projects/deadlines")
            .then((r) => r.json())
            .then((data) => {
                setProjects(data.projects ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Build a map: "YYYY-MM-DD" → ProjectDeadline[]
    const deadlineMap = useMemo(() => {
        const map: Record<string, ProjectDeadline[]> = {};
        for (const p of projects) {
            const key = p.project_deadline; // already "YYYY-MM-DD"
            if (!map[key]) map[key] = [];
            map[key].push(p);
        }
        return map;
    }, [projects]);

    // Calendar grid
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const today = new Date();

    // Projects for selected date
    const selectedDateKey = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : null;
    const selectedProjects = selectedDateKey ? deadlineMap[selectedDateKey] ?? [] : [];

    // Upcoming deadlines (sorted by date)
    const upcoming = useMemo(() => {
        return [...projects]
            .sort((a, b) => new Date(a.project_deadline).getTime() - new Date(b.project_deadline).getTime());
    }, [projects]);

    // Stats
    const overdue = projects.filter((p) => getDaysUntil(p.project_deadline) < 0).length;
    const thisWeek = projects.filter((p) => {
        const d = getDaysUntil(p.project_deadline);
        return d >= 0 && d <= 7;
    }).length;
    const thisMonth = projects.filter((p) => {
        const dl = new Date(p.project_deadline);
        return dl.getMonth() === today.getMonth() && dl.getFullYear() === today.getFullYear() && getDaysUntil(p.project_deadline) >= 0;
    }).length;

    function prevMonth() {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    }
    function nextMonth() {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    }
    function goToday() {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                    Calendario
                </h1>
                <p className="text-slate-500 font-medium mt-2 text-lg">
                    Fechas de entrega de tus proyectos
                </p>
            </header>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: "Vencidos",
                        value: overdue,
                        color: overdue > 0 ? "text-red-600" : "text-slate-400",
                        bg: overdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",
                        icon: AlertTriangle,
                        iconColor: overdue > 0 ? "text-red-500" : "text-slate-300",
                    },
                    {
                        label: "Esta semana",
                        value: thisWeek,
                        color: thisWeek > 0 ? "text-amber-600" : "text-slate-400",
                        bg: thisWeek > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
                        icon: Clock,
                        iconColor: thisWeek > 0 ? "text-amber-500" : "text-slate-300",
                    },
                    {
                        label: "Este mes",
                        value: thisMonth,
                        color: thisMonth > 0 ? "text-blue-600" : "text-slate-400",
                        bg: thisMonth > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200",
                        icon: CalendarDays,
                        iconColor: thisMonth > 0 ? "text-blue-500" : "text-slate-300",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className={cn(
                            "rounded-2xl border p-5 flex items-center gap-4 transition-all",
                            s.bg
                        )}
                    >
                        <div className={cn("p-2.5 rounded-xl bg-white/80")}>
                            <s.icon size={20} className={s.iconColor} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {s.label}
                            </p>
                            <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar grid */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={prevMonth}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-slate-600" />
                                </button>
                                <h2 className="text-xl font-black text-slate-900 min-w-[200px] text-center">
                                    {MONTHS_ES[month]} {year}
                                </h2>
                                <button
                                    type="button"
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <ChevronRight size={20} className="text-slate-600" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={goToday}
                                className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            >
                                Hoy
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-slate-100">
                            {DAYS_ES.map((d) => (
                                <div
                                    key={d}
                                    className="py-3 text-center text-xs font-black text-slate-400 uppercase tracking-wider"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar cells */}
                        <div className="grid grid-cols-7">
                            {/* Previous month trailing days */}
                            {Array.from({ length: firstDay }, (_, i) => (
                                <div
                                    key={`prev-${i}`}
                                    className="min-h-[90px] p-2 border-b border-r border-slate-50"
                                >
                                    <span className="text-xs font-medium text-slate-200">
                                        {prevMonthDays - firstDay + i + 1}
                                    </span>
                                </div>
                            ))}

                            {/* Current month days */}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const date = new Date(year, month, day);
                                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const dayProjects = deadlineMap[dateKey] ?? [];
                                const isToday = isSameDay(date, today);
                                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                                const hasDeadlines = dayProjects.length > 0;

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            "min-h-[90px] p-2 border-b border-r border-slate-50 text-left transition-all relative group",
                                            isSelected
                                                ? "bg-blue-50 ring-2 ring-blue-500 ring-inset"
                                                : hasDeadlines
                                                    ? "hover:bg-slate-50 cursor-pointer"
                                                    : "hover:bg-slate-50/50"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors",
                                                isToday
                                                    ? "bg-blue-600 text-white"
                                                    : isSelected
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "text-slate-600"
                                            )}
                                        >
                                            {day}
                                        </span>

                                        {/* Deadline indicators */}
                                        {hasDeadlines && (
                                            <div className="mt-1 space-y-1">
                                                {dayProjects.slice(0, 3).map((p) => {
                                                    const days = getDaysUntil(p.project_deadline);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            className={cn(
                                                                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate cursor-pointer transition-opacity",
                                                                days < 0
                                                                    ? "bg-red-100 text-red-700"
                                                                    : days <= 3
                                                                        ? "bg-red-50 text-red-600"
                                                                        : days <= 7
                                                                            ? "bg-amber-50 text-amber-700"
                                                                            : "bg-blue-50 text-blue-700"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedProject(p);
                                                            }}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                                    getDotColor(days)
                                                                )}
                                                            />
                                                            <span className="truncate">{p.name}</span>
                                                        </div>
                                                    );
                                                })}
                                                {dayProjects.length > 3 && (
                                                    <span className="text-[9px] font-bold text-slate-400 pl-1">
                                                        +{dayProjects.length - 3} más
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}

                            {/* Next month trailing days */}
                            {Array.from(
                                { length: (7 - ((firstDay + daysInMonth) % 7)) % 7 },
                                (_, i) => (
                                    <div
                                        key={`next-${i}`}
                                        className="min-h-[90px] p-2 border-b border-r border-slate-50"
                                    >
                                        <span className="text-xs font-medium text-slate-200">
                                            {i + 1}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Selected date projects */}
                    {selectedDate && selectedProjects.length > 0 && (
                        <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-900 flex items-center gap-2">
                                    <CalendarDays size={18} className="text-blue-500" />
                                    {selectedDate.toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </h3>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {selectedProjects.length} entrega{selectedProjects.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {selectedProjects.map((p) => (
                                    <DeadlineCard
                                        key={p.id}
                                        project={p}
                                        onSelect={() => setSelectedProject(p)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedDate && selectedProjects.length === 0 && (
                        <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-8 text-center animate-in fade-in duration-300">
                            <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-medium">
                                Sin entregas programadas para{" "}
                                {selectedDate.toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "long",
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right sidebar: upcoming timeline */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6">
                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Target size={16} className="text-blue-500" />
                            Próximas entregas
                        </h3>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse space-y-2">
                                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : upcoming.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarDays size={32} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400 font-medium">
                                    No hay entregas programadas
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                    Añade fechas de entrega en tus proyectos
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {upcoming.map((p, i) => {
                                    const days = getDaysUntil(p.project_deadline);
                                    const urgency = getDeadlineUrgency(days);
                                    const UrgencyIcon = urgency.icon;
                                    const progress =
                                        p.sections_total > 0
                                            ? Math.round((p.sections_completed / p.sections_total) * 100)
                                            : 0;

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedProject(p)}
                                            className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Timeline dot */}
                                                <div className="flex flex-col items-center mt-1">
                                                    <div
                                                        className={cn(
                                                            "w-3 h-3 rounded-full shrink-0",
                                                            getDotColor(days)
                                                        )}
                                                    />
                                                    {i < upcoming.length - 1 && (
                                                        <div className="w-px h-8 bg-slate-100 mt-1" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                        {p.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {p.grant_name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                                                urgency.bgColor
                                                            )}
                                                        >
                                                            <UrgencyIcon size={10} className={urgency.color} />
                                                            <span className={urgency.color}>{urgency.label}</span>
                                                        </span>
                                                        {p.sections_total > 0 && (
                                                            <span className="text-[10px] text-slate-300 font-medium">
                                                                {progress}% completado
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Mini progress bar */}
                                                    {p.sections_total > 0 && (
                                                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                                                            <div
                                                                className={cn(
                                                                    "h-full rounded-full transition-all",
                                                                    progress === 100
                                                                        ? "bg-emerald-500"
                                                                        : progress >= 50
                                                                            ? "bg-blue-500"
                                                                            : "bg-amber-500"
                                                                )}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
                            Leyenda
                        </h4>
                        <div className="space-y-2.5">
                            {[
                                { color: "bg-red-500", label: "Vencido o ≤3 días" },
                                { color: "bg-amber-500", label: "4–7 días" },
                                { color: "bg-blue-500", label: "8–30 días" },
                                { color: "bg-emerald-500", label: "> 30 días" },
                            ].map((l) => (
                                <div key={l.label} className="flex items-center gap-2.5">
                                    <span className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                                    <span className="text-xs text-slate-500 font-medium">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Project Detail Modal ──────────────────────────────────────────────── */}
            {selectedProject && (
                <ProjectDetailModal
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                />
            )}
        </div>
    );
}

// ── Deadline Card (for selected-date list) ───────────────────────────────────
function DeadlineCard({
    project,
    onSelect,
}: {
    project: ProjectDeadline;
    onSelect: () => void;
}) {
    const days = getDaysUntil(project.project_deadline);
    const urgency = getDeadlineUrgency(days);
    const UrgencyIcon = urgency.icon;
    const statusInfo = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
    const progress =
        project.sections_total > 0
            ? Math.round((project.sections_completed / project.sections_total) * 100)
            : 0;

    return (
        <div
            onClick={onSelect}
            className={cn(
                "border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md group",
                urgency.bgColor
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {project.name}
                        </h4>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-2">{project.grant_name}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusInfo.bg, statusInfo.color)}>
                            {statusInfo.label}
                        </span>
                        {project.company_name && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Building2 size={10} />
                                {project.company_name}
                            </span>
                        )}
                        {project.grant_entity && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Sparkles size={10} />
                                {project.grant_entity}
                            </span>
                        )}
                    </div>

                    {/* Progress */}
                    {project.sections_total > 0 && (
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-slate-400 font-medium">
                                    {project.sections_completed}/{project.sections_total} secciones
                                </span>
                                <span className="font-bold text-slate-600">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                            urgency.bgColor
                        )}
                    >
                        <UrgencyIcon size={12} className={urgency.color} />
                        <span className={urgency.color}>
                            {days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? "¡Hoy!" : `En ${days}d`}
                        </span>
                    </span>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
            </div>
        </div>
    );
}

// ── Project Detail Modal ─────────────────────────────────────────────────────
function ProjectDetailModal({
    project,
    onClose,
}: {
    project: ProjectDeadline;
    onClose: () => void;
}) {
    const days = getDaysUntil(project.project_deadline);
    const urgency = getDeadlineUrgency(days);
    const UrgencyIcon = urgency.icon;
    const statusInfo = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
    const progress =
        project.sections_total > 0
            ? Math.round((project.sections_completed / project.sections_total) * 100)
            : 0;

    const deadlineDate = new Date(project.project_deadline).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header gradient */}
                <div className="relative bg-gradient-to-br from-blue-600 to-violet-600 p-6 text-white overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400/10 rounded-full blur-xl" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="relative">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/20 mb-3", statusInfo.color)}>
                            <span className="text-white">{statusInfo.label}</span>
                        </span>
                        <h2 className="text-xl font-black truncate">{project.name}</h2>
                        <p className="text-blue-100 text-sm mt-1 truncate">{project.grant_name}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Deadline countdown */}
                    <div className={cn("border rounded-2xl p-4 flex items-center gap-4", urgency.bgColor)}>
                        <div className={cn("p-3 rounded-xl bg-white/80")}>
                            <UrgencyIcon size={24} className={urgency.color} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Fecha de entrega
                            </p>
                            <p className="text-sm font-black text-slate-900 capitalize">{deadlineDate}</p>
                            <p className={cn("text-xs font-bold mt-0.5", urgency.color)}>
                                {days < 0
                                    ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`
                                    : days === 0
                                        ? "¡La entrega es hoy!"
                                        : `Faltan ${days} día${days !== 1 ? "s" : ""}`}
                            </p>
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {project.company_name && (
                            <DetailItem icon={Building2} label="Empresa" value={project.company_name} />
                        )}
                        {project.grant_entity && (
                            <DetailItem icon={Sparkles} label="Organismo" value={project.grant_entity} />
                        )}
                        {project.grant_amount && (
                            <DetailItem icon={Banknote} label="Importe" value={project.grant_amount} />
                        )}
                        {project.company_sector && (
                            <DetailItem
                                icon={FileText}
                                label="Sector"
                                value={project.company_sector}
                            />
                        )}
                    </div>

                    {/* Description */}
                    {project.project_description && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                Descripción
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                {project.project_description}
                            </p>
                        </div>
                    )}

                    {/* Progress */}
                    {project.sections_total > 0 && (
                        <div>
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="font-bold text-slate-500">
                                    Progreso de la memoria
                                </span>
                                <span className="font-black text-slate-900">{progress}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        progress === 100
                                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                            : "bg-gradient-to-r from-blue-400 to-blue-600"
                                    )}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                {project.sections_completed} de {project.sections_total} secciones completadas
                            </p>
                        </div>
                    )}

                    {/* Action */}
                    <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-sm hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25"
                    >
                        Ir al proyecto
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Detail Item ──────────────────────────────────────────────────────────────
function DetailItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
        </div>
    );
}
