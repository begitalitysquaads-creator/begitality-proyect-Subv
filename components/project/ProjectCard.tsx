"use client";

import Link from "next/link";
import { FileText, Calendar, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: any;
  variant?: "large" | "compact";
}

export function ProjectCard({ project, variant = "compact" }: ProjectCardProps) {
  const isLarge = variant === "large";
  
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
          <div className="text-right space-y-2">
            {project.status === "ready_export" && (
              <span className="block bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Listo
              </span>
            )}
            <div className={cn(
              "flex items-center gap-1.5 font-black text-slate-300 uppercase tracking-widest",
              isLarge ? "text-[9px]" : "text-[8px]"
            )}>
              <Calendar size={isLarge ? 12 : 10} />
              {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
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
        <div className="flex items-center gap-3">
          <div className={cn("flex", isLarge ? "-space-x-3" : "-space-x-2")}>
            {project.collaborators?.length > 0 ? (
              project.collaborators.slice(0, 3).map((c: any, i: number) => (
                <div 
                  key={i} 
                  className={cn(
                    "rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center text-blue-600 transition-transform group-hover:translate-x-1",
                    isLarge ? "w-10 h-10" : "w-7 h-7 rounded-lg border-2"
                  )}
                >
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className={cn("font-black uppercase", isLarge ? "text-[10px]" : "text-[8px]")}>
                      {c.profiles?.full_name?.split(" ").map((n:any) => n[0]).join("")}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className={cn(
                "rounded-2xl border-4 border-white bg-slate-50 flex items-center justify-center text-slate-300",
                isLarge ? "w-10 h-10" : "w-7 h-7 rounded-lg border-2"
              )}>
                <Users size={isLarge ? 18 : 12} />
              </div>
            )}
            {isLarge && project.collaborators?.length > 3 && (
              <div className="w-10 h-10 rounded-2xl border-4 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                +{project.collaborators.length - 3}
              </div>
            )}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className={cn("font-black text-slate-300 uppercase tracking-widest leading-none", isLarge ? "text-[10px]" : "text-[8px]")}>Asignación</p>
            <p className={cn(
              "font-bold text-slate-700 mt-1 truncate",
              isLarge ? "text-xs max-w-[120px]" : "text-[10px] max-w-[80px]"
            )}>
              {project.collaborators?.length === 1 
                ? project.collaborators[0].profiles?.full_name 
                : project.collaborators?.length > 1 
                  ? `${isLarge ? 'Equipo: ' : ''}${project.collaborators.length} pers.`
                  : "Sin equipo"}
            </p>
          </div>
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
