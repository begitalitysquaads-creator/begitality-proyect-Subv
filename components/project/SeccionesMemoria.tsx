"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Loader2, Sparkles, Save, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Clock, FileCheck,
  RotateCcw, Wand2, FileSearch, Target, Trash2, Edit2, Plus, Check, X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [optimizing, setOptimizing] = useState<string | null>(null);
  
  // Deletion States
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, title: string}>({ open: false, id: "", title: "" });
  const [deleting, setDeleting] = useState(false);

  // Title Edit States
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitleValue, setNewTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-sections`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al generar");
      }
      
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

  const handleOptimize = async (id: string, currentContent: string) => {
    setOptimizing(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al optimizar");
      
      if (data.improvedText) {
        setSections(prev => prev.map(s => s.id === id ? { ...s, content: data.improvedText } : s));
        await updateContent(id, data.improvedText);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setOptimizing(null);
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

  const handleEmptyIndex = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("sections")
        .delete()
        .eq("project_id", projectId);
      
      if (!error) {
        setSections([]);
        setConfirmEmpty(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSection = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("sections")
        .delete()
        .eq("id", confirmDelete.id);
      
      if (!error) {
        setSections(prev => prev.filter(s => s.id !== confirmDelete.id));
        setConfirmDelete({ open: false, id: "", title: "" });
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveTitle = async (id: string) => {
    if (!newTitleValue.trim()) return;
    setSavingTitle(true);
    try {
      const { error } = await supabase
        .from("sections")
        .update({ title: newTitleValue.trim() })
        .eq("id", id);
      
      if (!error) {
        setSections(prev => prev.map(s => s.id === id ? { ...s, title: newTitleValue.trim() } : s));
        setEditingTitleId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTitle(false);
    }
  };

  const totalWords = sections.reduce((acc, s) => acc + (s.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const completedCount = sections.filter(s => s.is_completed).length;

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in fade-in duration-1000">
      
      {/* HEADER (Matching Budget & Roadmap) */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Índice de Memoria</h3>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <Sparkles size={10} className="animate-pulse" />
              Expediente Técnico Digital
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {sections.length > 0 && (
            <button
              onClick={() => setConfirmEmpty(true)}
              className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-red-100"
              title="Vaciar índice"
            >
              <Trash2 size={20} />
            </button>
          )}
          <Link
            href={`/dashboard/projects/${projectId}/export`}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Save size={14} />
            Exportar
          </Link>
          {hasConvocatoriaFiles && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {sections.length > 0 ? "Actualizar" : "Autocompletar"}
            </button>
          )}
        </div>
      </header>

      {/* KPI QUICK SUMMARY (Integrated internal style) */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target size={16} className="text-blue-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso Global</span>
            </div>
            <p className="text-sm font-black text-slate-900">{completedCount} / {sections.length} secciones</p>
          </div>
          <div className="px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSearch size={16} className="text-indigo-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Densidad Técnica</span>
            </div>
            <p className="text-sm font-black text-slate-900">{totalWords.toLocaleString()} palabras</p>
          </div>
        </div>
      )}

      {!sections.length ? (
        <div className="py-24 text-center bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
          <BookOpen size={48} className="mx-auto text-slate-100 mb-6 opacity-50" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">
            Pulsa el botón de autocompletar para que Begitality genere el índice y el borrador inicial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => {
            const isSelected = selectedId === s.id;
            const words = s.content?.split(/\s+/).filter(Boolean).length || 0;
            return (
              <div 
                key={s.id} 
                className={cn(
                  "bg-white border transition-all duration-500 overflow-hidden",
                  isSelected 
                    ? "rounded-[2rem] border-blue-200 shadow-xl ring-4 ring-blue-500/5 scale-[1.01]" 
                    : "rounded-2xl border-slate-100 hover:border-blue-100 hover:shadow-md"
                )}
              >
                {/* CABECERA ACORDEÓN */}
                <div
                  className="w-full flex items-center justify-between p-5 text-left group cursor-default"
                >
                  <div 
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedId(isSelected ? null : s.id)}
                  >
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all shrink-0",
                      s.is_completed ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : words > 0 ? "bg-blue-400" : "bg-slate-200"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      {editingTitleId === s.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            autoFocus
                            value={newTitleValue}
                            onChange={(e) => setNewTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle(s.id);
                              if (e.key === 'Escape') setEditingTitleId(null);
                            }}
                            className="w-full bg-slate-50 border border-blue-200 rounded-xl px-3 py-1.5 text-sm font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                          />
                          <button 
                            onClick={() => handleSaveTitle(s.id)}
                            disabled={savingTitle}
                            className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-500 active:scale-90 transition-all disabled:opacity-50"
                          >
                            {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button 
                            onClick={() => setEditingTitleId(null)}
                            className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={cn(
                          "text-base tracking-tight block leading-tight truncate",
                          isSelected ? "text-blue-600 font-black" : "text-slate-800 font-bold"
                        )}>
                          {s.title}
                        </span>
                      )}
                      {!isSelected && !editingTitleId && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{words} palabras</span>
                          {s.is_completed && (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={10} /> Verificado
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!editingTitleId && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitleId(s.id);
                            setNewTitleValue(s.title);
                          }}
                          className="p-2 text-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                          title="Editar título"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ open: true, id: s.id, title: s.title });
                          }}
                          className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                          title="Eliminar sección"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setSelectedId(isSelected ? null : s.id)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-50 text-slate-300 hover:text-blue-600"
                      )}
                    >
                      {isSelected ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* EDITOR EXPANDIDO */}
                {isSelected && (
                  <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 rounded-[1.75rem] p-1 border border-slate-100 shadow-inner">
                      <textarea
                        value={s.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSections(prev => prev.map(item => item.id === s.id ? { ...item, content: val } : item));
                        }}
                        onBlur={(e) => updateContent(s.id, e.target.value)}
                        className="w-full min-h-[350px] p-8 bg-transparent rounded-[1.5rem] border-none outline-none font-serif text-slate-800 leading-relaxed text-lg resize-y placeholder:text-slate-200"
                        placeholder="Comienza la redacción oficial..."
                      />
                      
                      {/* TOOLBAR REFINADA (2026 UX) */}
                      <div className="px-6 py-5 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-sm border-t border-slate-100 rounded-b-[1.5rem]">
                        
                        {/* Estado Sync & Guardar Manual (Izquierda) */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                            {saving ? (
                              <Loader2 size={12} className="animate-spin text-blue-500" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {saving ? "Sincronizando..." : "Sincronizado"}
                            </span>
                          </div>
                          
                          <StyledTooltip content="Guardar ahora">
                            <button 
                              onClick={() => updateContent(s.id, s.content)}
                              className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                            >
                              <Save size={16} />
                            </button>
                          </StyledTooltip>
                        </div>
                        
                        {/* IA & Flujo (Derecha) */}
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                          <button 
                            onClick={() => handleOptimize(s.id, s.content)}
                            disabled={optimizing === s.id}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border",
                              optimizing === s.id 
                                ? "bg-slate-50 text-slate-400" 
                                : "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                            )}
                          >
                            {optimizing === s.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {optimizing === s.id ? "Optimizando..." : "Optimizar con IA"}
                          </button>
                          
                          <button 
                            onClick={() => toggleComplete(s.id, s.is_completed)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border shadow-sm",
                              s.is_completed 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600" 
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900"
                            )}
                          >
                            {s.is_completed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {s.is_completed ? "Verificado" : "Marcar Revisado"}
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

      {/* CONFIRM EMPTY INDEX */}
      <ConfirmDialog 
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title="Vaciar Índice"
        description="¿Estás seguro de que deseas eliminar todas las secciones de esta memoria? Esta acción borrará todo el contenido redactado y no se puede deshacer."
        confirmText="Vaciar todo"
        variant="danger"
        loading={deleting}
        onConfirm={handleEmptyIndex}
      />

      {/* CONFIRM DELETE SECTION */}
      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ ...confirmDelete, open })}
        title="Eliminar Sección"
        description={`¿Estás seguro de que deseas eliminar la sección "${confirmDelete.title}"? Perderás todo el contenido escrito en ella.`}
        confirmText="Eliminar sección"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteSection}
      />
    </div>
  );
}
