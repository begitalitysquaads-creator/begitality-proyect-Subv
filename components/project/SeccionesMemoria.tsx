"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, Loader2, Sparkles, Save, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Clock, FileCheck,
  RotateCcw
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  content: string;
  is_completed: boolean;
  sort_order: number;
}

export function SeccionesMemoria({
  projectId,
  sections: initialSections,
  hasConvocatoriaFiles,
}: {
  projectId: string;
  sections: Section[];
  hasConvocatoriaFiles: boolean;
}) {
  const [sections, setSections] = useState(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-sections`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");
      
      const { data: newSections } = await supabase
        .from("sections")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      
      if (newSections) setSections(newSections);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateContent = async (id: string, content: string) => {
    setSaving(true);
    const { error: err } = await supabase
      .from("sections")
      .update({ content })
      .eq("id", id);
    
    if (!err) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    }
    setSaving(false);
  };

  const toggleComplete = async (id: string, current: boolean) => {
    const { error: err } = await supabase
      .from("sections")
      .update({ is_completed: !current })
      .eq("id", id);
    
    if (!err) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, is_completed: !current } : s));
      router.refresh();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER DE SECCIÓN */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="space-y-1">
          <h2 className="font-black text-slate-900 flex items-center gap-3 text-2xl tracking-tighter">
            <div className="p-2 bg-blue-50 rounded-2xl text-blue-600">
              <FileText size={24} />
            </div>
            Índice de la Memoria
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-12">Expediente Técnico Digital</p>
        </div>
        {hasConvocatoriaFiles && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[1.25rem] font-black text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? "Analizando..." : "Autocompletar con IA"}
          </button>
        )}
      </div>

      {!sections.length ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center shadow-sm">
          <BookOpen size={48} className="mx-auto text-slate-100 mb-6" />
          <p className="text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
            Pulsa el botón de autocompletar para que Begitality genere el índice y el borrador inicial.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((s, idx) => {
            const isSelected = selectedId === s.id;
            const words = s.content?.split(/\s+/).filter(Boolean).length || 0;
            return (
              <div 
                key={s.id} 
                className={cn(
                  "bg-white border transition-all duration-500",
                  isSelected 
                    ? "rounded-[2.5rem] border-blue-100 shadow-2xl shadow-blue-500/5 ring-1 ring-blue-100" 
                    : "rounded-3xl border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"
                )}
              >
                {/* CABECERA ACORDEÓN (CON INDICADORES DINÁMICOS SUPERIORES) */}
                <button
                  onClick={() => setSelectedId(isSelected ? null : s.id)}
                  className="w-full flex items-center justify-between p-7 text-left group"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all shrink-0",
                      s.is_completed ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : words > 0 ? "bg-blue-400" : "bg-slate-200"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-bold text-lg truncate block leading-tight tracking-tight",
                        isSelected ? "text-blue-600 font-black" : "text-slate-700"
                      )}>
                        {s.title}
                      </span>
                      {!isSelected && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{words} palabras</span>
                          {s.is_completed && (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={10} /> Revisado
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INDICADORES EN PARTE SUPERIOR (MODO ABIERTO) */}
                  <div className="flex items-center gap-6">
                    {isSelected && (
                      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-2 duration-500">
                        <div className="flex flex-col items-end border-r border-slate-100 pr-4">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Contenido</span>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{words} palabras</span>
                        </div>
                        {s.is_completed && (
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <CheckCircle2 size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Revisado</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "p-2 rounded-xl transition-all",
                      isSelected ? "bg-blue-50 text-blue-600" : "text-slate-300 group-hover:text-slate-500"
                    )}>
                      {isSelected ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </button>

                {/* EDITOR EXPANDIDO */}
                {isSelected && (
                  <div className="p-10 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white rounded-[2.2rem] p-1 border border-slate-100 shadow-inner">
                      <textarea
                        value={s.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSections(prev => prev.map(item => item.id === s.id ? { ...item, content: val } : item));
                        }}
                        onBlur={(e) => updateContent(s.id, e.target.value)}
                        className="w-full min-h-[400px] p-10 bg-transparent rounded-[2rem] border-none outline-none font-serif text-slate-800 leading-relaxed text-xl resize-y placeholder:text-slate-100"
                        placeholder="Comienza la redacción oficial..."
                      />
                      
                      {/* TOOLBAR INFERIOR ULTRA-COMPACTA */}
                      <div className="px-8 pb-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-50 pt-6 mt-4">
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                            {saving ? <Loader2 size={12} className="animate-spin text-blue-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{saving ? "Cloud sync" : "Sincronizado"}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => toggleComplete(s.id, s.is_completed)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border shrink-0 shadow-sm",
                              s.is_completed 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" 
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900"
                            )}
                          >
                            {s.is_completed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{s.is_completed ? "Sección Revisada" : "Pendiente de Revisión"}</span>
                          </button>
                          
                          <button 
                            onClick={() => updateContent(s.id, s.content)}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0"
                          >
                            <Save size={12} />
                            <span>Guardar</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
