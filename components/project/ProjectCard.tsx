"use client";

import Link from "next/link";
import { FileText, Calendar, Users, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: any;
  variant?: "large" | "compact";
}

export function ProjectCard({ project, variant = "compact" }: ProjectCardProps) {
  const isLarge = variant === "large";

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return { label: 'Borrador', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
      case 'in_progress': return { label: 'En curso', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' };
      case 'ready_export': return { label: 'Listo para Exportar', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' };
      case 'exported': return { label: 'Exportado', color: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' };
      case 'finished': return { label: 'Finalizado', color: 'bg-emerald-600 text-white', dot: 'bg-white' };
      case 'archived': return { label: 'Archivado', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' };
      default: return { label: 'En curso', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' };
    }
  };

  const statusInfo = getStatusLabel(project.status);

  return (
    <Link
      href={project.status === "ready_export" ? `/dashboard/projects/${project.id}/export` : `/dashboard/projects/${project.id}`}
      className={cn(
        "group relative bg-white border border-slate-200 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col justify-between",
        isLarge
          ? "p-8 rounded-[2.5rem] hover:shadow-blue-500/10 hover:-translate-y-2"
          : "p-6 rounded-[2.2rem] hover:shadow-slate-900/5 hover:-translate-y-1 h-[220px]"
      )}
    >
      {/* Decorative Aura */}
      <div className={cn(
        "absolute top-0 right-0 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50",
        isLarge ? "w-32 h-32 bg-blue-50" : "w-24 h-24 bg-slate-50"
      )} />

      <div className="relative z-10">
        <div className={cn("flex justify-between items-start", isLarge ? "mb-10" : "mb-6")}>
          <div className={cn(
            "rounded-2xl shadow-lg transition-transform group-hover:rotate-6",
            isLarge ? "p-4 bg-blue-600 text-white shadow-blue-600/30" : "p-3 bg-slate-900 text-white shadow-slate-900/20",
            !isLarge && "rounded-xl"
          )}>
            <FileText size={isLarge ? 32 : 20} />
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className={cn(
              "flex items-center flex-wrap justify-end gap-x-3 gap-y-1 font-black uppercase tracking-widest",
              isLarge ? "text-[9px]" : "text-[8px]"
            )}>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar size={isLarge ? 12 : 10} />
                ALTA: {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              {project.project_deadline && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/30">
                  <Clock size={isLarge ? 12 : 10} />
                  ENTREGA: {new Date(project.project_deadline + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              )}
            </div>

            {/* Client Badge */}
            {project.client && (
              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/50 font-black text-[8px] uppercase tracking-widest">
                <span>{project.client.name}</span>
              </div>
            )}
          </div>

        </div>

        <h3 className={cn(
          "font-black text-slate-900 tracking-tighter leading-tight mb-1 line-clamp-1",
          isLarge ? "text-3xl mb-2" : "text-lg"
        )}>
          {project.name}
        </h3>
        <p className={cn(
          "text-slate-400 font-bold uppercase tracking-wider truncate",
          isLarge ? "text-xs mb-8" : "text-[10px]"
        )}>
          {project.grant_name}
        </p>
      </div>

      <div className={cn(
        "relative z-10 flex items-center justify-between border-t border-slate-50",
        isLarge ? "pt-6" : "pt-4"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              statusInfo.dot
            )} />
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
              statusInfo.color
            )}>
              {statusInfo.label}
            </span>
          </div>

          {/* Team Avatars */}
          {project.collaborators && project.collaborators.length > 0 && (
            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
              <div className="flex -space-x-1.5">
                {project.collaborators.slice(0, 3).map((c: any, i: number) => (
                  <div 
                    key={i} 
                    className="w-5 h-5 rounded-md border border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center text-blue-600 ring-1 ring-slate-100"
                    title={c.profiles?.full_name}
                  >
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[7px] font-black uppercase">{c.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}</div>
                    )}
                  </div>
                ))}
              </div>
              {project.collaborators.length > 3 && (
                <span className="text-[8px] font-black text-slate-400">+{project.collaborators.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "flex items-center transition-all",
          isLarge ? "gap-2 text-blue-600 font-black text-sm group-hover:gap-3" : "gap-1.5 text-slate-300 group-hover:text-slate-900"
        )}>
          <span className={cn(
            "font-black uppercase tracking-widest transition-opacity",
            isLarge ? "" : "text-[9px] opacity-0 group-hover:opacity-100"
          )}>
            Abrir
          </span>
          <ChevronRight size={isLarge ? 18 : 16} />
        </div>
      </div>
    </Link>
  );
}
