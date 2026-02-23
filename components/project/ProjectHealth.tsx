"use client";

import { FileText, TrendingUp, Database, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  sectionsCompleted: number;
  totalSections: number;
  viabilityScore: number | null;
  budgetTotal: number;
  tasksPending: number;
  docsIndexed: boolean;
}

export function ProjectHealth({ stats }: { stats: Stats }) {
  const completionPercent = stats.totalSections > 0 
    ? Math.round((stats.sectionsCompleted / stats.totalSections) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
      
      {/* Progreso Memoria */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <FileText size={20} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Estatus Memoria</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{completionPercent}%</p>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
              {stats.sectionsCompleted}/{stats.totalSections} secciones
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 text-blue-600">
          <FileText size={100} />
        </div>
      </div>

      {/* Viabilidad IA */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500",
              stats.viabilityScore ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-300"
            )}>
              <Target size={20} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Éxito Estimado</span>
          </div>
          <div>
            <p className={cn(
              "text-4xl font-black tracking-tighter mb-1",
              stats.viabilityScore ? "text-slate-900" : "text-slate-300"
            )}>
              {stats.viabilityScore ? `${stats.viabilityScore}%` : "---"}
            </p>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
              {stats.viabilityScore ? "Auditoría IA" : "Pendiente"}
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 text-amber-600">
          <Sparkles size={100} />
        </div>
      </div>

      {/* Inversión Estimada */}
      <div className="bg-emerald-600 border border-emerald-500 rounded-[2rem] p-6 shadow-xl hover:shadow-emerald-600/20 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
              <Database size={20} />
            </div>
            <span className="text-[9px] font-black text-emerald-100 uppercase tracking-[0.2em]">Presupuesto</span>
          </div>
          <div>
            <p className="text-3xl font-black text-white tracking-tighter mb-1 leading-none">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.budgetTotal)}
            </p>
            <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest">Inversión Elegible</p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-1000 text-emerald-800">
          <Database size={100} />
        </div>
      </div>

    </div>
  );
}
