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
    Archive,
    Loader2
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

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; dot: string }> = {
    project_start: { label: "Inicio", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2, dot: "bg-emerald-500" },
    project_deadline: { label: "Plazo Máximo", color: "text-red-700", bg: "bg-red-100", icon: Target, dot: "bg-red-500" },
    deliverable: { label: "Entregable", color: "text-blue-700", bg: "bg-blue-100", icon: FileText, dot: "bg-blue-500" },
    project_finished: { label: "Finalizado", color: "text-emerald-700", bg: "bg-emerald-100", icon: ShieldCheck, dot: "bg-emerald-500" },
    meeting: { label: "Reunión", color: "text-amber-700", bg: "bg-amber-100", icon: Clock, dot: "bg-amber-500" },
    review: { label: "Revisión", color: "text-blue-700", bg: "bg-blue-100", icon: Search, dot: "bg-blue-500" },
    other: { label: "Otro", color: "text-slate-700", bg: "bg-slate-100", icon: Flag, dot: "bg-slate-500" },
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
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar en el cronograma..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm h-[46px]"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-3 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all active:scale-90"><ChevronLeft size={20} /></button>
                        <button onClick={goToday} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95">Hoy</button>
                        <button onClick={nextMonth} className="p-3 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all active:scale-90"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Calendar Viewport (Left) */}
                <div className="lg:col-span-3 space-y-10 order-2 lg:order-1">
                    <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                            {DAYS_ES.map((d) => (
                                <div key={d} className="py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-100 last:border-0">{d}</div>
                            ))}
                        </div>

                        {/* Calendar Body */}
                        <div className="grid grid-cols-7 flex-1">
                            {loading ? (
                                <div className="col-span-7 h-[600px] flex items-center justify-center">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                </div>
                            ) : viewMode === "month" ? (
                                <>
                                    {Array.from({ length: firstDay }, (_, i) => {
                                        const d = prevMonthDays - firstDay + i + 1;
                                        return <div key={`prev-${i}`} className="min-h-[140px] p-4 border-b border-r border-slate-50 bg-slate-50/10 text-slate-200 text-xs font-black opacity-50">{d}</div>;
                                    })}
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const d = i + 1;
                                        const dateObj = new Date(year, month, d);
                                        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                                        const dayEvents = eventMap[dateKey] ?? [];
                                        const isToday = isSameDay(dateObj, today);
                                        const isSelected = selectedDate ? isSameDay(dateObj, selectedDate) : false;

                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setSelectedDate(dateObj)}
                                                className={cn(
                                                    "min-h-[140px] p-4 border-b border-r border-slate-50 text-left transition-all relative group overflow-hidden",
                                                    isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/20",
                                                    (firstDay + d) % 7 === 0 ? "border-r-0" : ""
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-2 relative z-20">
                                                    <span className={cn(
                                                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                                                        isToday ? "bg-slate-900 text-white shadow-lg" : isSelected ? "bg-blue-600 text-white" : "text-slate-400 group-hover:text-slate-900"
                                                    )}>
                                                        {d}
                                                    </span>
                                                    {dayEvents.length > 0 && (
                                                        <span className="flex gap-1">
                                                            {dayEvents.slice(0, 3).map((e, idx) => (
                                                                <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", EVENT_TYPE_CONFIG[e.type]?.dot || "bg-blue-500")} />
                                                            ))}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 relative z-20">
                                                    {dayEvents.slice(0, 2).map((e) => (
                                                        <div key={e.id} className={cn(
                                                            "px-2 py-1 rounded-lg text-[8px] font-bold truncate border", 
                                                            EVENT_TYPE_CONFIG[e.type]?.bg, 
                                                            EVENT_TYPE_CONFIG[e.type]?.color,
                                                            "border-transparent",
                                                            e.projectStatus === 'archived' && "opacity-40 grayscale"
                                                        )}>
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest pl-1">+{dayEvents.length - 2} más</div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }, (_, i) => (
                                        <div key={`next-${i}`} className="min-h-[140px] p-4 border-b border-r border-slate-50 bg-slate-50/10 text-slate-200 text-xs font-black opacity-50">{i + 1}</div>
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
                                            {/* Visual Selection */}
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
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Stats & Legend (Right) */}
                <div className="lg:col-span-1 space-y-10 order-1 lg:order-2">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <CalendarDays size={120} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter mb-1 relative z-10">{MONTHS_ES[month]}</h2>
                        <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-10 relative z-10">{year}</p>

                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-inner">
                                    <AlertTriangle size={20} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tracking-tighter">{overdue}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vencidos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                                    <Clock size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tracking-tighter">{thisWeek}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Esta Semana</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                    <CheckCircle2 size={20} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tracking-tighter">{thisMonth}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Mes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 text-slate-900">
                            <Flag size={120} />
                        </div>
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
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{cfg.label}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight opacity-0 group-hover/item:opacity-100 transition-opacity">Hito de control</p>
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
