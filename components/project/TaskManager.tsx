"use client";

import { useState, useEffect, useRef } from "react";
import { PlusCircle, Trash2, CheckCircle2, Circle, Clock, Loader2, Calendar, ClipboardList, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";

export function TaskManager({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [deleting, setDeleting] = useState(false);
  
  const formRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchTasks();

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (formRef.current && !formRef.current.contains(target) && 
          toggleBtnRef.current && !toggleBtnRef.current.contains(target)) {
        setShowForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error("API did not return an array:", data);
        setTasks([]);
      }
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setNewTitle("");
        setShowForm(false);
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    // Optimistic Update: Update UI immediately
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: nextStatus as any } : t
    ));

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update task");
      }
      // Optional: re-fetch to ensure sync with server metadata if needed
      // fetchTasks(); 
    } catch (e) {
      console.error("Optimistic update failed, reverting:", e);
      setTasks(previousTasks); // Rollback on error
    }
  };

  const deleteTask = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks?id=${confirmDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete({ open: false, id: "", name: "" });
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  // HTML5 Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newTasks = [...tasks];
    const item = newTasks[draggedItemIndex];
    newTasks.splice(draggedItemIndex, 1);
    newTasks.splice(index, 0, item);
    
    setDraggedItemIndex(index);
    setTasks(newTasks);
  };

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
    // Update sort_order in database
    const updates = tasks.map((t, i) => ({ id: t.id, sort_order: i }));
    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updates })
      });
    } catch (e) {
      console.error("Failed to update sort order:", e);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Hoja de Ruta</h3>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5">Hitos del Expediente</p>
          </div>
        </div>
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
      </header>

      {showForm && (
        <div ref={formRef} className="animate-in slide-in-from-top-2 duration-300">
          <form onSubmit={addTask} className="mb-8 flex gap-3">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Ej. Revisar Anexo II con cliente"
              className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : "Crear Hito"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" /></div>
        ) : tasks.length === 0 ? (
          <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin hitos registrados</p>
        ) : (
          tasks.map((t, index) => (
            <div 
              key={t.id} 
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group flex items-center justify-between p-4 bg-slate-50/30 border border-slate-100/50 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 cursor-default",
                draggedItemIndex === index ? "opacity-40 border-blue-200 border-dashed" : ""
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="cursor-grab active:cursor-grabbing p-1 text-slate-200 hover:text-slate-400 transition-colors">
                  <GripVertical size={16} />
                </div>
                
                <button 
                  onClick={() => toggleTask(t.id, t.status)}
                  className={cn(
                    "transition-all shrink-0",
                    t.status === 'completed' ? "text-emerald-500" : "text-slate-300 hover:text-blue-500"
                  )}
                >
                  {t.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <span className={cn(
                  "text-sm font-bold tracking-tight transition-all truncate",
                  t.status === 'completed' ? "text-slate-300 line-through" : "text-slate-700"
                )}>
                  {t.title}
                </span>
              </div>
              <StyledTooltip content="Eliminar hito">
                <button 
                  onClick={() => setConfirmDelete({ open: true, id: t.id, name: t.title })}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </StyledTooltip>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({ ...confirmDelete, open })}
        title="Eliminar hito"
        description={`¿Estás seguro de que deseas eliminar "${confirmDelete.name}" de la hoja de ruta?`}
        confirmText="Eliminar hito"
        variant="danger"
        loading={deleting}
        onConfirm={deleteTask}
      />
    </div>
  );
}
