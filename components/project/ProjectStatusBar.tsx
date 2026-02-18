"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    ChevronRight,
    Loader2,
    FileCheck,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectStatusBarProps {
    projectId: string;
    currentStatus: string;
    canMarkReady: boolean;
}

const statusMap: Record<string, { label: string; color: string; order: number }> = {
    draft: { label: "Borrador", color: "bg-slate-100 text-slate-600", order: 1 },
    in_progress: { label: "En Progreso", color: "bg-blue-100 text-blue-700", order: 2 },
    ready_export: { label: "Listo para Exportar", color: "bg-emerald-100 text-emerald-700", order: 3 },
    exported: { label: "Exportado", color: "bg-violet-100 text-violet-700", order: 4 },
};

export function ProjectStatusBar({
    projectId,
    currentStatus,
    canMarkReady,
}: ProjectStatusBarProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdateStatus = async (newStatus: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const statusInfo = statusMap[currentStatus] || statusMap.draft;

    return (
        <div className="flex items-center gap-3">
            <div
                className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                    statusInfo.color
                )}
            >
                <span className="w-2 h-2 rounded-full bg-current" />
                {statusInfo.label}
            </div>

            {currentStatus === "draft" && (
                <button
                    onClick={() => handleUpdateStatus("in_progress")}
                    disabled={loading}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : "Iniciar redacción"}
                    <ChevronRight size={14} />
                </button>
            )}

            {currentStatus === "in_progress" && (
                <div className="flex items-center gap-2">
                    {canMarkReady ? (
                        <button
                            onClick={() => handleUpdateStatus("ready_export")}
                            disabled={loading}
                            className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <FileCheck size={16} />
                            )}
                            Marcar como Listo
                        </button>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium px-2" title="Completa todas las secciones para finalizar">
                            <AlertCircle size={12} />
                            Completa todas las secciones
                        </span>
                    )}
                </div>
            )}

            {currentStatus === "ready_export" && (
                <button
                    onClick={() => router.push(`/dashboard/projects/${projectId}/export`)}
                    className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                    Ir a Exportar
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    );
}
