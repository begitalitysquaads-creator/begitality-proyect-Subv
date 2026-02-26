"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Loader2, Sparkles, Save, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Clock, FileCheck,
  RotateCcw, Wand2, FileSearch, Target, Trash2, Edit2, Plus, Check, X,
  GripVertical
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { logClientAction } from "@/lib/audit-client";

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
  const [customInstruction, setCustomInstruction] = useState("");
  
  // Deletion States
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, title: string}>({ open: false, id: "", title: "" });
  const [deleting, setDeleting] = useState(false);

  // Title Edit States
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitleValue, setNewTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  
  // Reset instruction when section selection changes
  useEffect(() => {
    setCustomInstruction("");
  }, [selectedId]);

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
      
      if (newSections) {
        await logClientAction(projectId, "Memoria", "generó la estructura de la memoria con IA");
        setSections(newSections);
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimize = async (id: string, currentContent: string, instruction?: string) => {
    setOptimizing(id);
    try {
      const section = sections.find(s => s.id === id);
      const res = await fetch(`/api/projects/${projectId}/sections/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent, instruction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al optimizar");
      
      if (data.improvedText) {
        const actionLabel = instruction ? "modificó" : "optimizó";
        await logClientAction(projectId, "Memoria", `${actionLabel} con IA la sección "${section?.title}"`);
        setSections(prev => prev.map(s => s.id === id ? { ...s, content: data.improvedText } : s));
        await updateContent(id, data.improvedText, true); 
        setCustomInstruction(""); // Limpiar tras éxito
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setOptimizing(null);
    }
  };

  const updateContent = async (id: string, content: string, skipLog = false) => {
    setSaving(true);
    const section = sections.find(s => s.id === id);
    const { error: err } = await supabase
      .from("sections")
      .update({ content })
      .eq("id", id);
    
    if (!err) {
      if (!skipLog) {
        await logClientAction(projectId, "Memoria", `actualizó el contenido de "${section?.title}"`);
      }
      setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    }
    setSaving(false);
  };

  const toggleComplete = async (id: string, current: boolean) => {
    const section = sections.find(s => s.id === id);
    const { error: err } = await supabase
      .from("sections")
      .update({ is_completed: !current })
      .eq("id", id);
    
    if (!err) {
      const actionDesc = !current ? 'marcó como revisada' : 'reabrió';
      await logClientAction(projectId, "Memoria", `${actionDesc} la sección "${section?.title}"`);
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
        await logClientAction(projectId, "Memoria", "vació el índice de la memoria");
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
        await logClientAction(projectId, "Memoria", `eliminó la sección "${confirmDelete.title}"`);
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
    const oldTitle = sections.find(s => s.id === id)?.title;
    setSavingTitle(true);
    try {
      const { error } = await supabase
        .from("sections")
        .update({ title: newTitleValue.trim() })
        .eq("id", id);
      
      if (!error) {
        await logClientAction(projectId, "Memoria", `renombró la sección "${oldTitle}" a "${newTitleValue.trim()}"`);
        setSections(prev => prev.map(s => s.id === id ? { ...s, title: newTitleValue.trim() } : s));
        setEditingTitleId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleAddSection = async () => {
    setIsAddingSection(true);
    try {
      const nextOrder = sections.length > 0 
        ? Math.max(...sections.map(s => s.sort_order)) + 1 
        : 0;

      const { data, error } = await supabase
        .from("sections")
        .insert({
          project_id: projectId,
          title: "Nueva Sección",
          content: "",
          sort_order: nextOrder,
          is_completed: false
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await logClientAction(projectId, "Memoria", "añadió una nueva sección manualmente");
        setSections(prev => [...prev, data]);
        setSelectedId(data.id);
        // Activar edición de título inmediatamente
        setEditingTitleId(data.id);
        setNewTitleValue("Nueva Sección");
      }
    } catch (e) {
      console.error("Error adding section:", e);
    } finally {
      setIsAddingSection(false);
    }
  };

  const moveSection = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    setIsReordering(true);
    const currentSection = sections[currentIndex];
    const targetSection = sections[targetIndex];

    try {
      // Intercambiar órdenes de ordenación
      const currentOrder = currentSection.sort_order;
      const targetOrder = targetSection.sort_order;

      // Actualización local inmediata
      const newSections = [...sections];
      newSections[currentIndex] = { ...currentSection, sort_order: targetOrder };
      newSections[targetIndex] = { ...targetSection, sort_order: currentOrder };
      
      // Actualizar el array local para reflejar el cambio en la UI
      newSections.sort((a, b) => a.sort_order - b.sort_order);
      setSections(newSections);

      // Actualizar DB con dos updates independientes (más robusto que upsert para RLS)
      const update1 = supabase
        .from("sections")
        .update({ sort_order: targetOrder })
        .eq("id", currentSection.id);

      const update2 = supabase
        .from("sections")
        .update({ sort_order: currentOrder })
        .eq("id", targetSection.id);

      const results = await Promise.all([update1, update2]);
      const error = results.find(r => r.error)?.error;

      if (error) throw error;
      
      await logClientAction(projectId, "Memoria", `reorganizó el índice de secciones`);
    } catch (e) {
      console.error("Error reordering:", e);
      // Recargar de la DB si falla para asegurar consistencia
      const { data } = await supabase.from("sections").select("*").eq("project_id", projectId).order("sort_order");
      if (data) setSections(data);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    const currentIndex = sections.findIndex(s => s.id === draggedId);
    const targetIndex = sections.findIndex(s => s.id === targetId);
    
    if (currentIndex === -1 || targetIndex === -1) return;

    setIsReordering(true);
    const newSections = [...sections];
    const [draggedItem] = newSections.splice(currentIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);

    // Re-asignar sort_order basado en la nueva posición
    const updatedSections = newSections.map((s, i) => ({ ...s, sort_order: i }));
    setSections(updatedSections);

    try {
      const updates = updatedSections.map(s => ({
        id: s.id,
        sort_order: s.sort_order
      }));

      const { error } = await supabase
        .from("sections")
        .upsert(updates);

      if (error) {
        const promises = updates.map(u => 
          supabase.from("sections").update({ sort_order: u.sort_order }).eq("id", u.id)
        );
        await Promise.all(promises);
      }
      
      await logClientAction(projectId, "Memoria", "reorganizó el orden de las secciones");
    } catch (e) {
      console.error("Error updating order:", e);
    } finally {
      setDraggedId(null);
      setIsReordering(false);
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
          <button
            onClick={handleAddSection}
            disabled={isAddingSection}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isAddingSection ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Añadir Sección
          </button>
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
          {sections.map((s, index) => {
            const isSelected = selectedId === s.id;
            const words = s.content?.split(/\s+/).filter(Boolean).length || 0;
            return (
              <div 
                key={s.id}
                draggable={!editingTitleId && !generating}
                onDragStart={() => handleDragStart(s.id)}
                onDragOver={(e) => handleDragOver(e, s.id)}
                onDrop={(e) => handleDrop(e, s.id)}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                className={cn(
                  "bg-white border transition-all duration-500 overflow-hidden",
                  isSelected 
                    ? "rounded-[2rem] border-blue-200 shadow-xl ring-4 ring-blue-500/5 scale-[1.01]" 
                    : "rounded-2xl border-slate-100 hover:border-blue-100 hover:shadow-md",
                  dragOverId === s.id && "border-t-4 border-t-blue-500",
                  draggedId === s.id && "opacity-40 grayscale"
                )}
              >
                {/* CABECERA ACORDEÓN */}
                <div
                  className="w-full flex items-center justify-between p-5 text-left group cursor-default"
                >
                  <div className="flex items-center gap-2 mr-4 shrink-0 border-r border-slate-50 pr-4">
                    <div className="cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-blue-600 transition-colors">
                      <GripVertical size={18} />
                    </div>
                  </div>

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
                        <div className="flex items-center gap-2 pr-6" onClick={(e) => e.stopPropagation()}>
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
                          <span className="text-slate-400 mr-2">{index + 1}.</span>
                          {s.title}
                        </span>
                      )}
                      {!isSelected && !editingTitleId && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{words} palabras</span>
                          {s.is_completed && (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={10} /> REVISADO
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

                      {/* IA COMMAND INPUT (Comandos de Voz/Texto Premium) */}
                      <div className="px-8 py-4 bg-white/40 border-t border-slate-100 flex items-center gap-4 group/ia transition-all focus-within:bg-blue-50/30">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                          <Wand2 size={18} />
                        </div>
                        <input 
                          value={customInstruction}
                          onChange={(e) => setCustomInstruction(e.target.value)}
                          placeholder="Instrucción IA: 'Hazlo más técnico', 'Reduce a la mitad', 'Enfócate en software'..."
                          className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customInstruction.trim()) {
                              handleOptimize(s.id, s.content, customInstruction);
                            }
                          }}
                        />
                        <button 
                          onClick={() => handleOptimize(s.id, s.content, customInstruction)}
                          disabled={optimizing === s.id || !customInstruction.trim()}
                          className={cn(
                            "p-2 rounded-xl transition-all shadow-sm active:scale-95",
                            customInstruction.trim() ? "bg-blue-600 text-white shadow-blue-600/20" : "bg-slate-100 text-slate-300 opacity-0"
                          )}
                        >
                          <Check size={18} strokeWidth={3} />
                        </button>
                      </div>
                      
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
                            {s.is_completed ? "REVISADO" : "MARCAR COMO REVISADO"}
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
