"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileText, Search, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    name: string;
    grant_name: string;
    status: string;
    created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    draft: { label: "Borrador", className: "bg-slate-100 text-slate-600" },
    in_progress: { label: "En progreso", className: "bg-blue-100 text-blue-700" },
    ready_export: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
    exported: { label: "Exportado", className: "bg-violet-100 text-violet-700" },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function ProjectsListClient({ projects }: { projects: Project[] }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filtered = useMemo(() => {
        return projects.filter((p) => {
            const matchesQuery =
                !query ||
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.grant_name.toLowerCase().includes(query.toLowerCase());
            const matchesStatus =
                statusFilter === "all" || p.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [projects, query, statusFilter]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: projects.length };
        for (const p of projects) {
            counts[p.status] = (counts[p.status] ?? 0) + 1;
        }
        return counts;
    }, [projects]);

    return (
        <div className="space-y-6">
            {/* Barra de búsqueda y filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Búsqueda */}
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por nombre o convocatoria…"
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtros de estado */}
                <div className="flex gap-1.5 flex-wrap">
                    {[
                        { key: "all", label: "Todos" },
                        { key: "draft", label: "Borrador" },
                        { key: "in_progress", label: "En progreso" },
                        { key: "ready_export", label: "Listos" },
                        { key: "exported", label: "Exportados" },
                    ].map(({ key, label }) => {
                        const count = statusCounts[key] ?? 0;
                        if (key !== "all" && count === 0) return null;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setStatusFilter(key)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                    statusFilter === key
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                                )}
                            >
                                {label}
                                {count > 0 && (
                                    <span
                                        className={cn(
                                            "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                                            statusFilter === key
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 text-slate-500"
                                        )}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Resultados */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Search size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">
                        {query
                            ? `No se encontraron proyectos para "${query}"`
                            : "No hay proyectos con ese estado"}
                    </p>
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="mt-3 text-sm text-blue-600 font-bold hover:underline"
                        >
                            Limpiar búsqueda
                        </button>
                    )}
                </div>
            ) : (
                <ul className="space-y-3">
                    {filtered.map((p) => {
                        const statusInfo = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
                        return (
                            <li key={p.id}>
                                <Link
                                    href={
                                        p.status === "ready_export"
                                            ? `/dashboard/projects/${p.id}/export`
                                            : `/dashboard/projects/${p.id}`
                                    }
                                    className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                            <FileText
                                                size={22}
                                                className="text-slate-600 group-hover:text-blue-600 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{p.name}</p>
                                            <p className="text-sm text-slate-500">{p.grant_name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                <Clock size={11} />
                                                <span>Creado el {formatDate(p.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-xs font-bold px-3 py-1.5 rounded-full",
                                            statusInfo.className
                                        )}
                                    >
                                        {statusInfo.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Resumen */}
            {query || statusFilter !== "all" ? (
                <p className="text-xs text-slate-400 text-center">
                    Mostrando {filtered.length} de {projects.length} proyectos
                </p>
            ) : null}
        </div>
    );
}
