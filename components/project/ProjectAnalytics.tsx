"use client";

import { TrendingUp, Award, BarChart3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsProps {
  qualityScore: number;
  roiEstimated: number;
  budgetTotal: number;
}

export function ProjectAnalytics({ qualityScore, roiEstimated, budgetTotal }: AnalyticsProps) {
  const roiPercent = budgetTotal > 0 ? Math.round((roiEstimated / budgetTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* QUALITY SCORE CARD */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-500">
              <Award size={24} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Calidad Técnica</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <p className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{qualityScore || 0}</p>
              <span className="text-lg font-bold text-slate-300 mb-1">/ 100</span>
            </div>
            
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", 
                  qualityScore >= 80 ? "bg-emerald-500" : qualityScore >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${qualityScore}%` }} 
              />
            </div>
            
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              {qualityScore >= 80 ? (
                <span className="text-emerald-600">Excelencia Técnica</span>
              ) : qualityScore >= 50 ? (
                <span className="text-amber-600">Requiere Mejoras</span>
              ) : (
                <span className="text-red-600">Riesgo Alto</span>
              )}
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 text-indigo-600">
          <Award size={180} />
        </div>
      </div>

      {/* ROI ANALYTICS CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-500">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ROI Estimado</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Retorno Potencial</p>
            <p className="text-5xl font-black text-white tracking-tighter leading-none">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(roiEstimated)}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                +{roiPercent}% Retorno
              </div>
              <p className="text-[9px] text-slate-500 font-medium">Sobre inversión total</p>
            </div>
          </div>
        </div>
        
        {/* Background Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 text-white">
          <BarChart3 size={180} />
        </div>
      </div>

    </div>
  );
}
