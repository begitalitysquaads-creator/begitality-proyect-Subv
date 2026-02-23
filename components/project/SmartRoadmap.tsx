"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ClipboardList, Sparkles, Loader2, Plus, 
  CheckCircle2, Circle, Clock, Trash2, 
  GripVertical, FileUp, FileText, X, Save, ChevronRight, ShieldCheck,
  Target, AlertTriangle, PieChart, PlusCircle, Edit2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  required: boolean;
  is_ai_generated: boolean;
  sort_order: number;
  file_path: string | null;
  metadata?: any;
}

export function SmartRoadmap({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draggedItem, setDraggedId] = useState<string | null>(null);
  const [isOver, setIsOver] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Task Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Task['priority']>('medium');
  const [editMetadata, setEditMetadata] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  
  const formRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (formRef.current && !formRef.current.contains(target) && 
          toggleBtnRef.current && !toggleBtnRef.current.contains(target)) {
        setShowForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleGenerateIA = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-checklist`, { method: "POST" });
      if (!res.ok) throw new Error("Error generating roadmap");
      await fetchTasks();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally { setGenerating(false); }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) : -1;
      const { data, error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: projectId,
          title: newTitle.trim(),
          status: 'pending',
          required: false,
          is_ai_generated: false,
          sort_order: maxOrder + 1
        })
        .select()
        .single();

      if (!error && data) {
        setNewTitle("");
        setShowForm(false);
        fetchTasks();
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from("project_tasks")
      .update({ status: nextStatus })
      .eq("id", task.id);
    
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      router.refresh();
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("project_tasks").delete().eq("id", id);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id));
      router.refresh();
    }
  };

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSavingTask(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          title: editTitle,
          priority: editPriority,
          metadata: { ...tasks.find(t => t.id === editingId)?.metadata, notes: editMetadata }
        })
        .eq("id", editingId);

      if (!error) {
        setEditingId(null);
        fetchTasks();
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingTask(false);
    }
  };

  // --- Lógica Drag & Drop (Orden) ---
  const onDragStart = (id: string) => setDraggedId(id);
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setIsOver(id);
  };
  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setIsOver(null);
    if (!draggedItem || draggedItem === targetId) return;

    const newTasks = [...tasks];
    const draggedIdx = newTasks.findIndex(t => t.id === draggedItem);
    const targetIdx = newTasks.findIndex(t => t.id === targetId);
    
    const [removed] = newTasks.splice(draggedIdx, 1);
    newTasks.splice(targetIdx, 0, removed);
    
    setTasks(newTasks.map((t, i) => ({ ...t, sort_order: i })));

    const updates = newTasks.map((t, i) => ({ id: t.id, sort_order: i }));
    for (const up of updates) {
      await supabase.from("project_tasks").update({ sort_order: up.sort_order }).eq("id", up.id);
    }
    router.refresh();
  };

  const handleFileUpload = async (file: File, taskId: string) => {
    setUploading(taskId);
    try {
      const path = `${projectId}/tasks/${taskId}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("convocatoria-files").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      await supabase.from("project_tasks").update({ file_path: path, status: 'completed' }).eq("id", taskId);
      fetchTasks();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally { setUploading(null); }
  };

  const onFileDrop = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    setIsOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file, taskId);
  };

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col items-center justify-center min-h-[300px] animate-pulse">
      <Loader2 className="animate-spin text-slate-200 mb-4" size={32} />
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sincronizando Hoja de Ruta...</p>
    </div>
  );

  const priorities = [
    { id: 'low', label: 'Baja', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    { id: 'medium', label: 'Media', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'high', label: 'Alta', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'urgent', label: 'Urgente', color: 'bg-red-50 text-red-600 border-red-100' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in fade-in duration-1000">
      
      {/* HEADER (Matching BudgetManager) */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Hoja de Ruta</h3>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <Sparkles size={10} className="animate-pulse" />
              Planificación Inteligente
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerateIA}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {tasks.length > 0 ? "Sincronizar" : "Generar con IA"}
          </button>

          <button
            ref={toggleBtnRef}
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "p-2.5 rounded-xl transition-all shadow-lg active:scale-95",
              showForm ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white shadow-blue-600/20"
            )}
          >
            {showForm ? <X size={20} /> : <PlusCircle size={20} />}
          </button>
        </div>
      </header>

      {/* MANUAL ADD FORM */}
      {showForm && (
        <div ref={formRef} className="mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="p-1 bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-inner">
            <form onSubmit={handleAddManual} className="p-6 flex flex-col lg:flex-row items-center gap-4">
              <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex items-center px-5 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-200 transition-all w-full">
                <input
                  required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Título de la nueva tarea o hito..."
                  className="w-full py-4 bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                />
              </div>
              <button
                type="submit" disabled={adding}
                className="w-full lg:w-48 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {adding ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {adding ? "Guardando..." : "Añadir Hito"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST (Matching BudgetManager list style) */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="py-20 text-center bg-slate-50/30 rounded-[3rem] border border-dashed border-slate-200">
             <ClipboardList size={40} className="text-slate-200 mx-auto mb-4 opacity-50" />
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Sin hitos registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-premium">
            {tasks.map((task) => {
              const isEditing = editingId === task.id;
              const currentPriority = priorities.find(p => p.id === task.priority) || priorities[1];

              return (
                <div key={task.id} className="space-y-2">
                  <div
                    draggable={!isEditing}
                    onDragStart={() => onDragStart(task.id)}
                    onDragOver={(e) => onDragOver(e, task.id)}
                    onDrop={(e) => {
                      if (e.dataTransfer.files.length > 0) onFileDrop(e, task.id);
                      else onDrop(e, task.id);
                    }}
                    className={cn(
                      "group flex items-center justify-between p-5 bg-white border rounded-[2rem] transition-all duration-300",
                      isOver === task.id && "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/5 scale-[1.01]",
                      task.status === 'completed' ? "opacity-60 bg-slate-50/30 border-slate-100" : "border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5",
                      isEditing && "border-blue-500 ring-4 ring-blue-500/5 shadow-2xl"
                    )}
                  >
                    <div className="flex items-center gap-5 min-w-0 flex-1">
                      {!isEditing && (
                        <div className="cursor-grab active:cursor-grabbing p-1 text-slate-200 hover:text-slate-400 transition-colors hidden sm:block">
                          <GripVertical size={18} />
                        </div>
                      )}
                      
                      <button 
                        onClick={() => toggleStatus(task)}
                        className={cn(
                          "w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm shrink-0",
                          task.status === 'completed' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-50 text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                        )}
                      >
                        {task.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className={cn("text-base font-black text-slate-900 tracking-tight truncate", task.status === 'completed' && "line-through text-slate-400")}>
                            {task.title}
                          </p>
                          <span className={cn("text-[7px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest", currentPriority.color)}>
                            {currentPriority.label}
                          </span>
                          {task.required && (
                            <span className="text-[7px] font-black bg-red-50 text-red-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-red-100">
                              Crítico
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5">
                          {task.file_path ? (
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 px-2.5 py-1 rounded-full border border-blue-100/50">
                              <FileText size={10} /> Verificado
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                              {task.is_ai_generated ? "IA Begitality" : "Manual"} • {task.metadata?.notes ? "Con datos" : "Sin datos técnicos"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button 
                          onClick={() => {
                            setEditingId(task.id);
                            setEditTitle(task.title);
                            setEditPriority(task.priority);
                            setEditMetadata(task.metadata?.notes || "");
                          }}
                          className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      {uploading === task.id ? (
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                      ) : (
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FORMULARIO DE EDICIÓN EXPANDIDO */}
                  {isEditing && (
                    <div className="mx-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6 animate-in slide-in-from-top-4 duration-300 relative z-20">
                      <form onSubmit={updateTask} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Hito</label>
                            <input 
                              required value={editTitle} onChange={e => setEditTitle(e.target.value)}
                              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad Técnica</label>
                            <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl">
                              {priorities.map(p => (
                                <button
                                  key={p.id} type="button" 
                                  onClick={() => setEditPriority(p.id as any)}
                                  className={cn(
                                    "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                    editPriority === p.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                                  )}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Datos Técnicos y Notas</label>
                          <textarea 
                            value={editMetadata} onChange={e => setEditMetadata(e.target.value)}
                            placeholder="Introduce aquí datos relevantes, códigos de expediente o notas de seguimiento..."
                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 outline-none transition-all min-h-[100px] resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button 
                            type="button" onClick={() => setEditingId(null)}
                            className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit" disabled={savingTask}
                            className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {savingTask ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Guardar Cambios
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
