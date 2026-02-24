"use client";

import { useEffect, useState } from "react";
import { Clock, Target, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
    id: string;
    projectId: string;
    title: string;
    date: string;
    type: string;
    status?: string;
    client?: string;
}

export function ProjectTimeline({ projectId }: { projectId: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/projects/timeline?projectId=${projectId}`)
            .then(r => r.json())
            .then(data => {
                setEvents(data.events || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/4 mb-10" />
                <div className="space-y-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-6">
                            <div className="w-10 h-10 rounded-xl bg-slate-50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-2 bg-slate-50 rounded w-1/4" />
                                <div className="h-3 bg-slate-50 rounded w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 text-center opacity-50">
                <Calendar size={40} className="mx-auto mb-4 text-slate-200" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin cronograma definido</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                <div className="absolute -right-8 -top-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                    <Clock size={280} />
                </div>
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3 relative z-10">
                <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                Cronograma de Hitos
            </h3>

            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent relative z-10">
                {events.map((event) => (
                    <div key={event.id} className="relative flex items-center justify-between group/item">
                        <div className="flex items-center w-full">
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-xl border-4 border-white shadow-sm z-10 transition-all duration-500 group-hover/item:scale-110",
                                event.type === 'project_deadline' 
                                    ? "bg-red-500 text-white shadow-red-500/20" 
                                    : event.type === 'project_start'
                                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                        : "bg-blue-50 text-blue-600 border-slate-50"
                            )}>
                                {event.type === 'project_deadline' ? <Target size={16} /> : 
                                 event.type === 'project_start' ? <CheckCircle2 size={16} /> :
                                 <Clock size={16} />}
                            </div>
                            <div className="ml-6 flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    {new Date(event.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    {event.status === 'completed' && <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded uppercase text-[7px]">Completado</span>}
                                </p>
                                <h4 className={cn(
                                    "font-black tracking-tight transition-colors group-hover/item:text-blue-600",
                                    event.type === 'project_deadline' ? "text-slate-900" : "text-slate-700"
                                )}>
                                    {event.title}
                                </h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
