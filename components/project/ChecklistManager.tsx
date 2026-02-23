"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ClipboardCheck, Loader2, Sparkles, RefreshCw, 
  CheckCircle2, Circle, AlertCircle, Trash2,
  FileText, ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";

export function ChecklistManager({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  const fetchChecklist = useCallback(async () => {
    const { data } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    
    setItems(data || []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = async (id: string, current: boolean) => {
    setUpdating(id);
    const { error } = await supabase
      .from("checklist_items")
      .update({ checked: !current })
      .eq("id", id);
    
    if (!error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !current } : item));
    }
    setUpdating(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-checklist`, { method: "POST" });
      if (!res.ok) throw new Error("Error generating checklist");
      await fetchChecklist();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const completedCount = items.filter(i => i.checked).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 animate-pulse flex flex-col items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-slate-200 mb-4" size={32} />
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cargando Hoja de Ruta...</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative group overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <h2 className="font-black text-slate-900 flex items-center gap-4 text-2xl tracking-tighter uppercase">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <ClipboardCheck size={24} />
            </div>
            Hoja de Ruta IA
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-16">Requisitos de Documentación</p>
        </div>
        
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-900 leading-none">{progress}%</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Completado</p>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-slate-100 flex items-center justify-center relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-indigo-500 transition-all duration-1000" 
                  style={{ height: `${progress}%` }}
                />
                <ShieldCheck size={14} className="relative z-10 text-slate-400" />
              </div>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {items.length > 0 ? "Actualizar" : "Generar con IA"}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 pr-2 overflow-y-auto scrollbar-premium min-h-[300px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-100">
            <FileText size={48} className="text-slate-100 mb-4" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest max-w-[200px] text-center leading-relaxed">
              Sube las bases de la convocatoria y pulsa "Generar con IA" para crear tu lista de control.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id, item.checked)}
              disabled={updating === item.id}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-3xl transition-all duration-300 group/item border",
                item.checked 
                  ? "bg-emerald-50/30 border-emerald-100 text-slate-400" 
                  : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 text-slate-700"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                  item.checked ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-300 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600"
                )}>
                  {updating === item.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : item.checked ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </div>
                <div className="text-left truncate">
                  <p className={cn(
                    "text-sm font-bold tracking-tight truncate",
                    item.checked && "line-through opacity-50"
                  )}>
                    {item.label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.required && (
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded">Obligatorio</span>
                    )}
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Documentación Técnica</span>
                  </div>
                </div>
              </div>
              
              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                <ChevronRight size={16} className="text-slate-200" />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="absolute -right-10 -bottom-10 opacity-[0.015] pointer-events-none text-indigo-600">
        <ClipboardCheck size={350} />
      </div>
    </div>
  );
}

// Para usar ChevronRight necesitamos importarlo
import { ChevronRight } from "lucide-react";
