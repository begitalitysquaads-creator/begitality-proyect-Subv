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
    Search,
    Filter,
    Users as UsersIcon,
    User as UserIcon,
    ChevronDown,
    Flag,
    Briefcase,
    ShieldCheck,
    Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumSelector } from "@/components/ui/PremiumSelector";

// ── Types ────────────────────────────────────────────────────────────────────
interface CalendarEvent {
    id: string;
    projectId: string;
    title: string;
    date: string; // YYYY-MM-DD
    type: string; // 'project_start', 'project_deadline', 'deliverable', 'meeting', 'review', etc.
    client?: string;
    status?: string; // Estado del hito individual
    projectStatus?: string; // Estado del proyecto padre
    collaborators?: { id: string; name: string }[];
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    project_start: { label: "Inicio", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
    project_deadline: { label: "Plazo Máximo", color: "text-red-700", bg: "bg-red-100", icon: Target },
    deliverable: { label: "Entregable", color: "text-blue-700", bg: "bg-blue-100", icon: FileText },
    project_finished: { label: "Finalizado", color: "text-emerald-700", bg: "bg-emerald-100", icon: ShieldCheck },
    meeting: { label: "Reunión", color: "text-amber-700", bg: "bg-amber-100", icon: Clock },
    review: { label: "Revisión", color: "text-blue-700", bg: "bg-blue-100", icon: Search },
    other: { label: "Otro", color: "text-slate-700", bg: "bg-slate-100", icon: Flag },
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

function getDaysUntil(date: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [viewMode, setViewMode] = useState<"month" | "week">("month");

    // Header interaction states
    const [showHeaderPicker, setShowHeaderPicker] = useState<"none" | "months" | "years">("none");
    const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

    // Filter states
    const [search, setSearch] = useState("");
    const [filterMode, setFilterMode] = useState<"all" | "clients" | "workers">("all");

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        fetch("/api/projects/timeline")
            .then((r) => r.json())
            .then((data) => {
                setEvents(data.events ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);



    // Filter logic
    const filteredEvents = useMemo(() => {
        return events.filter((e) => {
            const matchesSearch =
                e.title.toLowerCase().includes(search.toLowerCase()) ||
                e.client?.toLowerCase().includes(search.toLowerCase());

            let matchesFilter = true;
            if (filterMode === 'clients') {
                matchesFilter = !!e.client;
            } else if (filterMode === 'workers') {
                matchesFilter = !!(e.collaborators && e.collaborators.length > 0);
            }

            return matchesSearch && matchesFilter;
        });
    }, [events, search, filterMode]);

    // Build a map: "YYYY-MM-DD" → CalendarEvent[]
    const eventMap = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const e of filteredEvents) {
            const key = e.date; // "YYYY-MM-DD"
            if (!map[key]) map[key] = [];
            map[key].push(e);
        }
        return map;
    }, [filteredEvents]);

    // Calendar grid helpers
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const today = new Date();

    // Events for selected date
    const selectedDateKey = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : null;
    const selectedEvents = selectedDateKey ? eventMap[selectedDateKey] ?? [] : [];

    // Stats
    const overdue = filteredEvents.filter((e) => {
        const isOverdue = getDaysUntil(e.date) < 0;
        const isProjectFinished = e.projectStatus === 'finished';
        const isHitoCompleted = e.status === 'completed';
        const isFinishedEvent = e.type === 'project_finished';
        
        return isOverdue && !isProjectFinished && !isHitoCompleted && !isFinishedEvent;
    }).length;
    const thisWeek = filteredEvents.filter((e) => {
        const d = getDaysUntil(e.date);
        return d >= 0 && d <= 7;
    }).length;
    const thisMonth = filteredEvents.filter((e) => {
        const dl = new Date(e.date);
        return dl.getMonth() === today.getMonth() && dl.getFullYear() === today.getFullYear() && getDaysUntil(e.date) >= 0;
    }).length;

    function prevMonth() {
        if (viewMode === "month") {
            setCurrentDate(new Date(year, month - 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
        }
        setSelectedDate(null);
    }
    function nextMonth() {
        if (viewMode === "month") {
            setCurrentDate(new Date(year, month + 1, 1));
        } else {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
        }
        setSelectedDate(null);
    }
    function goToday() {
        const d = new Date();
        setCurrentDate(d);
        setSelectedDate(d);
        setPickerYear(d.getFullYear());
    }

    // Weekly View Helpers
    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - (day === 0 ? 6 : day - 1); // Monday start
        start.setDate(diff);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="space-y-8">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                        Calendario
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        Gestión Cronológica de Expedientes
                    </p>
                </div>

                {/* Main Controls Row */}
                <div className="flex flex-wrap items-center gap-4 w-full">
                    <div className="bg-slate-100/80 p-1 rounded-2xl flex gap-1 border border-slate-200/50 backdrop-blur-sm shadow-inner h-[46px] items-center w-full sm:w-auto min-w-[190px]">
                        <button
                            onClick={() => setViewMode("month")}
                            className={cn(
                                "flex-1 px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-full flex items-center justify-center",
                                viewMode === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setViewMode("week")}
                            className={cn(
                                "flex-1 px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-full flex items-center justify-center",
                                viewMode === "week" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Semanal
                        </button>
                    </div>

                    <div className="relative group flex-1 min-w-[280px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar evento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm h-[46px]"
                        />
                    </div>

                    <div className="bg-slate-100/80 p-1 rounded-2xl flex gap-1 border border-slate-200/50 backdrop-blur-sm shadow-inner h-[46px] items-center">
                        {[
                            { id: 'all', label: 'Todos', icon: Filter },
                            { id: 'clients', label: 'Clientes', icon: Building2 },
                            { id: 'workers', label: 'Equipo', icon: UsersIcon }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setFilterMode(m.id as any)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 h-full",
                                    filterMode === m.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <m.icon size={12} />
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Vencidos", value: overdue, icon: AlertTriangle, color: overdue > 0 ? "text-red-600" : "text-slate-400", bg: overdue > 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-300" },
                    { label: "Próximos 7 días", value: thisWeek, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 text-blue-500" },
                    { label: "Este mes", value: thisMonth, icon: CalendarDays, color: "text-slate-900", bg: "bg-slate-100 text-slate-600" },
                ].map((s) => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-sm group hover:shadow-xl transition-all">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", s.bg)}>
                            <s.icon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className={cn("text-3xl font-black tracking-tighter", s.color)}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm relative">
                        {/* Interactive Navigation Header */}
                        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={prevMonth} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-100 transition-all shadow-sm active:scale-90"><ChevronLeft size={20} className="text-slate-600" /></button>

                                <div className="flex items-center gap-2 min-w-[240px] justify-center relative">
                                    {viewMode === "month" ? (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setShowHeaderPicker(showHeaderPicker === "months" ? "none" : "months")}
                                                className={cn(
                                                    "text-2xl font-black tracking-tighter px-3 py-1 rounded-xl transition-all",
                                                    showHeaderPicker === "months" ? "bg-blue-600 text-white shadow-lg" : "text-slate-900 hover:bg-blue-50 hover:text-blue-600"
                                                )}
                                            >
                                                {MONTHS_ES[month]}
                                            </button>
                                            <button
                                                onClick={() => setShowHeaderPicker(showHeaderPicker === "years" ? "none" : "years")}
                                                className={cn(
                                                    "text-2xl font-black tracking-tighter px-3 py-1 rounded-xl transition-all",
                                                    showHeaderPicker === "years" ? "bg-blue-600 text-white shadow-lg" : "text-blue-600 hover:bg-blue-50"
                                                )}
                                            >
                                                {year}
                                            </button>
                                        </div>
                                    ) : (
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                                            Semana del <span className="text-blue-600">{weekDays[0].toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </h2>
                                    )}

                                    {/* HEADER PICKERS (ABSOLUTE) */}
                                    {showHeaderPicker !== "none" && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[100] p-4 min-w-[280px] animate-in zoom-in-95 duration-200">
                                            {showHeaderPicker === "months" ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {MONTHS_SHORT.map((m, idx) => (
                                                        <button
                                                            key={m}
                                                            onClick={() => { setCurrentDate(new Date(year, idx, 1)); setShowHeaderPicker("none"); }}
                                                            className={cn(
                                                                "py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                                                idx === month ? "bg-blue-600 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between px-2">
                                                        <button onClick={() => setPickerYear(y => y - 12)} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft size={16} /></button>
                                                        <span className="text-xs font-black text-slate-400">{pickerYear} — {pickerYear + 11}</span>
                                                        <button onClick={() => setPickerYear(y => y + 12)} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight size={16} /></button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {Array.from({ length: 12 }, (_, i) => pickerYear + i).map(y => (
                                                            <button
                                                                key={y}
                                                                onClick={() => { setCurrentDate(new Date(y, month, 1)); setShowHeaderPicker("none"); }}
                                                                className={cn(
                                                                    "py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                                                    y === year ? "bg-blue-600 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                {y}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button type="button" onClick={nextMonth} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-100 transition-all shadow-sm active:scale-90"><ChevronRight size={20} className="text-slate-600" /></button>
                            </div>
                            <button type="button" onClick={goToday} className="px-6 py-3 text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all uppercase tracking-widest shadow-sm active:scale-95">Hoy</button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
                            {DAYS_ES.map((d) => <div key={d} className="py-4 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{d}</div>)}
                        </div>

                        {/* Calendar cells */}
                        <div className={cn("grid grid-cols-7 bg-white", viewMode === "week" && "min-h-[450px]")}>
                            {viewMode === "month" ? (
                                <>
                                    {Array.from({ length: firstDay }, (_, i) => (
                                        <div key={`prev-${i}`} className="min-h-[110px] p-4 border-b border-r border-slate-50 bg-slate-50/10 text-slate-200 text-xs font-black opacity-50">{prevMonthDays - firstDay + i + 1}</div>
                                    ))}
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const date = new Date(year, month, day);
                                        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                        const dayEvents = eventMap[dateKey] ?? [];
                                        const isToday = isSameDay(date, today);
                                        const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => setSelectedDate(date)}
                                                className={cn(
                                                    "min-h-[110px] p-4 border-b border-r border-slate-50 text-left transition-all relative group",
                                                    isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                                                )}
                                            >
                                                {/* Visual Selection: Premium Card Elevation & Inset */}
                                                {isSelected && (
                                                    <div className="absolute inset-2 bg-blue-500/[0.04] border border-blue-500/10 rounded-3xl z-10 animate-in fade-in zoom-in-95 duration-300 pointer-events-none" />
                                                )}
                                                {/* Cohesive Bottom Accent Pill */}
                                                {isSelected && (
                                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-blue-600 rounded-full z-20 animate-in slide-in-from-bottom-2 duration-400" />
                                                )}

                                                <span className={cn(
                                                    "inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black transition-all relative z-20 shadow-sm",
                                                    isToday ? "bg-slate-900 text-white scale-110 shadow-slate-900/20 shadow-xl" : "",
                                                    isSelected && !isToday ? "bg-blue-600 text-white shadow-blue-600/30 shadow-lg" : "",
                                                    isSelected && isToday ? "ring-2 ring-blue-600 ring-offset-2 ring-offset-white" : "",
                                                    !isToday && !isSelected ? "text-slate-400 group-hover:text-slate-900 bg-white border border-slate-100" : ""
                                                )}>
                                                    {day}
                                                </span>
                                                <div className="mt-2 space-y-1 relative z-20">
                                                    {dayEvents.slice(0, 3).map((e) => (
                                                        <div
                                                            key={e.id}
                                                            className={cn("w-full h-1.5 rounded-full transition-all group-hover:h-2 shadow-sm", EVENT_TYPE_CONFIG[e.type]?.bg || "bg-slate-100")}
                                                            title={e.title}
                                                        />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <p className="text-[7px] font-black text-blue-600 uppercase mt-1">+{dayEvents.length - 3} Eventos</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }, (_, i) => (
                                        <div key={`next-${i}`} className="min-h-[110px] p-4 border-b border-r border-slate-50 bg-slate-50/10 text-slate-200 text-xs font-black opacity-50">{i + 1}</div>
                                    ))}
                                </>
                            ) : (
                                weekDays.map((date) => {
                                    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                                    const dayEvents = eventMap[dateKey] ?? [];
                                    const isToday = isSameDay(date, today);
                                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                                    return (
                                        <button
                                            key={dateKey}
                                            type="button"
                                            onClick={() => setSelectedDate(date)}
                                            className={cn(
                                                "min-h-[450px] p-6 border-r border-slate-50 text-left transition-all relative group overflow-hidden",
                                                isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                                            )}
                                        >
                                            {/* Visual Selection (Week Mode - Premium Inset & Left Accent) */}
                                            {isSelected && (
                                                <div className="absolute inset-y-4 inset-x-2 bg-blue-500/[0.04] border-l-4 border-blue-600 z-10 rounded-r-[2rem] rounded-l-lg animate-in slide-in-from-left-2 duration-300 shadow-sm" />
                                            )}

                                            <div className="flex flex-col items-center mb-8 relative z-20">
                                                <span className={cn(
                                                    "w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black transition-all",
                                                    isToday ? "bg-slate-900 text-white shadow-xl scale-110" : isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-slate-400"
                                                )}>
                                                    {date.getDate()}
                                                </span>
                                            </div>
                                            <div className="space-y-3 relative z-20">
                                                {dayEvents.map((e) => (
                                                    <div key={e.id} className={cn(
                                                        "p-3 rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all hover:scale-[1.02] shadow-sm border",
                                                        EVENT_TYPE_CONFIG[e.type]?.bg,
                                                        EVENT_TYPE_CONFIG[e.type]?.color,
                                                        "border-transparent hover:border-blue-200",
                                                        e.projectStatus === 'archived' && "opacity-40 grayscale-[0.5]",
                                                        e.projectStatus === 'finished' && "opacity-80"
                                                    )}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="truncate">{e.title}</span>
                                                            {e.projectStatus === 'archived' && <Archive size={8} className="shrink-0" />}
                                                            {e.projectStatus === 'finished' && <ShieldCheck size={8} className="shrink-0" />}
                                                        </div>
                                                        <p className="opacity-50 truncate">{e.client || 'Sin cliente'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Day Detail View */}
                    {selectedDate && (
                        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                                <div>
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tighter flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><CalendarDays size={20} /></div>
                                        {selectedDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-11 mt-1">Eventos Programados</p>
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl uppercase tracking-widest border border-blue-100">{selectedEvents.length} Entradas</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedEvents.map((e) => {
                                    const Config = EVENT_TYPE_CONFIG[e.type] || EVENT_TYPE_CONFIG.other;
                                    const isArchived = e.projectStatus === 'archived';
                                    const isFinished = e.projectStatus === 'finished';

                                    return (
                                        <Link 
                                            key={e.id} 
                                            href={isFinished ? `/dashboard/projects/${e.projectId}/export` : `/dashboard/projects/${e.projectId}`} 
                                            className={cn(
                                                "flex items-start justify-between p-6 border rounded-3xl hover:shadow-xl transition-all group",
                                                isArchived ? "bg-slate-50 border-slate-100 opacity-60" : "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-blue-100"
                                            )}
                                        >
                                            <div className="flex items-start gap-4 min-w-0">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0", 
                                                    Config.bg, Config.color,
                                                    isArchived && "grayscale"
                                                )}>
                                                    <Config.icon size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{Config.label}</p>
                                                        {isArchived && <span className="text-[7px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Archivado</span>}
                                                        {isFinished && <span className="text-[7px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Cerrado</span>}
                                                    </div>
                                                    <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors tracking-tight">{e.title}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">{e.client || "Infraestructura Begitality"}</p>
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-full bg-white text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight size={14} />
                                            </div>
                                        </Link>
                                    );
                                })}
                                {selectedEvents.length === 0 && (
                                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-50 rounded-[2.5rem]">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Canal libre de hitos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-8 lg:sticky lg:top-8">
                    {/* Summary of Urgency */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] mb-8 flex items-center gap-3 relative z-10">
                            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                            Leyenda Técnica
                        </h3>
                        <div className="space-y-4 relative z-10">
                            {Object.entries(EVENT_TYPE_CONFIG)
                                .filter(([key]) => ['project_start', 'project_finished', 'deliverable', 'meeting', 'review', 'other'].includes(key))
                                .map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-4 group/item">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5", cfg.bg, cfg.color)}>
                                        <cfg.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{cfg.label}</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Categoría de Evento</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1 h-3 bg-blue-600 rounded-full" />
                            Próximos Hitos
                        </h4>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-premium">
                            {events
                                .filter(e => 
                                    getDaysUntil(e.date) >= 0 && 
                                    ['deliverable', 'meeting', 'review', 'other'].includes(e.type)
                                )
                                .slice(0, 10)
                                .map((e) => (
                                <div key={e.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all">
                                    <div className={cn("w-2 h-2 rounded-full", EVENT_TYPE_CONFIG[e.type]?.color.replace('text', 'bg'))} />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-900 truncate tracking-tight">{e.title}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Deadline Card (for selected-date list) ───────────────────────────────────
function DeadlineCard({
    project,
    onSelect,
}: {
    project: any;
    onSelect: () => void;
}) {
    const statusInfo = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
    const progress =
        project.sections_total > 0
            ? Math.round((project.sections_completed / project.sections_total) * 100)
            : 0;

    return (
        <div
            onClick={onSelect}
            className="border border-slate-100 rounded-3xl p-6 cursor-pointer transition-all hover:shadow-xl group bg-white"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors tracking-tight">
                            {project.name}
                        </h4>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 truncate mb-4 uppercase tracking-widest">{project.grant_name}</p>

                    <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg", statusInfo.bg, statusInfo.color)}>
                            {statusInfo.label}
                        </span>
                    </div>

                    {/* Progress */}
                    {project.sections_total > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">
                                    {project.sections_completed}/{project.sections_total} secciones
                                </span>
                                <span className="text-slate-900">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white shadow-inner rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        progress === 100 ? "bg-emerald-500" : "bg-blue-600"
                                    )}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <ArrowRight size={14} />
                    </div>
                </div>
            </div>
        </div>
    );
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
        color: "text-blue-700",
        bg: "bg-blue-100",
        dot: "bg-blue-500",
    },
    finished: {
        label: "Finalizado",
        color: "text-emerald-700",
        bg: "bg-emerald-100",
        dot: "bg-emerald-500",
    },
    archived: {
        label: "Archivado",
        color: "text-amber-700",
        bg: "bg-amber-100",
        dot: "bg-amber-500",
    },
};
