"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, X, Calendar, Clock, Target, 
  Trash2, Loader2, Check, AlertCircle, CheckCircle2, Edit3 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { PremiumSelector } from "@/components/ui/PremiumSelector";
import { logClientAction } from "@/lib/audit-client";
import { Activity } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  type: string;
  status: string;
}

export function MilestoneManager({ projectId, onUpdate }: { projectId: string, onUpdate?: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("deliverable");
  const [status, setStatus] = useState("pending");

  const supabase = createClient();

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  useEffect(() => {
    if (editingMilestone) {
      setTitle(editingMilestone.title);
      setDate(editingMilestone.due_date);
      setType(editingMilestone.type);
      setStatus(editingMilestone.status);
    } else {
      setTitle("");
      setDate("");
      setType("deliverable");
      setStatus("pending");
    }
  }, [editingMilestone]);

  async function fetchMilestones() {
    const { data } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });
    
    setMilestones(data || []);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    
    if (editingMilestone) {
      // 1. Update the milestone
      const { error: updateError } = await supabase
        .from("project_milestones")
        .update({
          title,
          due_date: date,
          type,
          status
        })
        .eq("id", editingMilestone.id);

      if (!updateError) {
        await logClientAction(projectId, "Hito", `actualizó el hito "${title}"`);
        
        // Sync project deadline if type is deliverable or was deliverable
        const allMilestones = [...milestones.filter(m => m.id !== editingMilestone.id), { ...editingMilestone, title, due_date: date, type, status }];
        const deliverables = allMilestones.filter(m => m.type === 'deliverable');
        const nextDeadline = deliverables.length > 0 
          ? deliverables.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0].due_date
          : null;

        await supabase
          .from("projects")
          .update({ project_deadline: nextDeadline })
          .eq("id", projectId);

        setEditingMilestone(null);
        await fetchMilestones();
        router.refresh();
        if (onUpdate) onUpdate();
      }
    } else {
      // 1. Insert the milestone
      const { error: milestoneError } = await supabase
        .from("project_milestones")
        .insert({
          project_id: projectId,
          title,
          due_date: date,
          type
        });

      if (!milestoneError) {
        await logClientAction(projectId, "Hito", `creó el hito "${title}"`);

        if (type === 'deliverable') {
          const { error: updateError } = await supabase
            .from("projects")
            .update({ project_deadline: date })
            .eq("id", projectId);
            
          if (updateError) {
            console.error("Error al sincronizar deadline:", updateError.message || updateError);
          }
        }

        setIsAddOpen(false);
        setTitle("");
        setDate("");
        await fetchMilestones();
        router.refresh();
        if (onUpdate) onUpdate();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const milestoneToDelete = milestones.find(m => m.id === id);
    const { error } = await supabase
      .from("project_milestones")
      .delete()
      .eq("id", id);
    
    if (!error) {
      // Registrar en el historial
      await logClientAction(projectId, "Hito", `eliminó el hito "${milestoneToDelete?.title}"`);

      // Si borramos un entregable, actualizar la fecha límite del proyecto recalculando el próximo
      if (milestoneToDelete?.type === 'deliverable') {
        const remainingDeliverables = milestones.filter(m => m.id !== id && m.type === 'deliverable');
        const nextDeadline = remainingDeliverables.length > 0 
          ? remainingDeliverables.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0].due_date
          : null;

        await supabase
          .from("projects")
          .update({ project_deadline: nextDeadline })
          .eq("id", projectId);
      }

      await fetchMilestones();
      router.refresh(); // Crucial para actualizar el <header> (Server Component)
      if (onUpdate) onUpdate();
    }
  }

  async function toggleStatus(m: Milestone) {
    const nextStatus = m.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from("project_milestones")
      .update({ status: nextStatus })
      .eq("id", m.id);
    
    if (!error) {
      const actionDesc = nextStatus === 'completed' ? 'completó' : 'reabrió';
      await logClientAction(projectId, "Hito", `${actionDesc} el hito "${m.title}"`);
      fetchMilestones();
      if (onUpdate) onUpdate();
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group animate-in fade-in duration-700 overflow-hidden">
      
      {/* Background Icon */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
        <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
          <Calendar size={280} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
          <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          Cronograma de Hitos
        </h3>
        <button 
          onClick={() => { setEditingMilestone(null); setIsAddOpen(true); }}
          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      <div className="space-y-3 relative z-10">
        {milestones.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4 min-w-0">
              <button 
                onClick={() => toggleStatus(m)}
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                  m.status === 'completed' ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-200 hover:border-blue-500 hover:text-blue-500"
                )}
              >
                <Check size={12} strokeWidth={4} />
              </button>
              <div className="min-w-0">
                <p className={cn("text-xs font-black truncate tracking-tight", m.status === 'completed' ? "text-slate-400 line-through" : "text-slate-900")}>
                  {m.title}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {new Date(m.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100">
              <button 
                onClick={() => { setEditingMilestone(m); setIsAddOpen(true); }}
                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl"
              >
                <Edit3 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(m.id)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {milestones.length === 0 && !loading && (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] opacity-40">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin hitos programados</p>
          </div>
        )}
      </div>

      <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl z-[101] outline-none animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <Dialog.Title className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                {editingMilestone ? "Editar Hito / Evento" : "Nuevo Hito / Evento"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Evento</label>
                <input 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Ej: Entrega de borrador inicial" 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Límite</label>
                  <PremiumDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                  <PremiumSelector
                    options={[
                      { value: "pending", label: "Pendiente" },
                      { value: "completed", label: "Completado" }
                    ]}
                    value={status}
                    onChange={setStatus}
                    icon={Activity}
                    className="h-[46px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Evento</label>
                <PremiumSelector
                  options={[
                    { value: 'deliverable', label: 'Entregable' },
                    { value: 'meeting', label: 'Reunión' },
                    { value: 'review', label: 'Revisión' },
                    { value: 'other', label: 'Otro' },
                  ]}
                  value={type}
                  onChange={setType}
                  icon={type === 'deliverable' ? Target : type === 'meeting' ? Clock : type === 'review' ? CheckCircle2 : AlertCircle}
                  className="h-[46px]"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !title || !date}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                {editingMilestone ? "Guardar Cambios" : "Programar Evento"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
