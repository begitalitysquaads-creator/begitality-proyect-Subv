"use client";

import { useState, useRef, useEffect } from "react";
import { Edit3, Trash2, Check, X, Loader2, CheckCircle, Archive, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

import { logClientAction } from "@/lib/audit-client";

interface ProjectInlineActionsProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
}

export function ProjectInlineActions({ projectId, projectName, projectStatus }: ProjectInlineActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Sincronizar estado local si el prop cambia
  useEffect(() => {
    setNewName(projectName);
  }, [projectName]);

  const isArchived = projectStatus === 'archived';
  const isFinished = projectStatus === 'finished';

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'finished') {
        updateData.finished_at = new Date().toISOString();
      } else {
        updateData.finished_at = null;
      }

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

      if (error) throw error;
      
      let actionLabel = "Proyecto";
      let desc = `cambió el estado del proyecto a ${newStatus}`;
      
      if (newStatus === 'finished') {
        actionLabel = "Proyecto: Finalizado";
        desc = "marcó el proyecto como finalizado oficialmente";
      } else if (newStatus === 'archived') {
        actionLabel = "Proyecto: Archivado";
        desc = "archivó el expediente";
      } else {
        actionLabel = "Proyecto: Restaurado";
        desc = "restauró el proyecto a estado activo";
      }

      await logClientAction(projectId, actionLabel, desc);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === projectName) {
      setIsEditing(false);
      setNewName(projectName);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("projects")
      .update({ name: newName.trim() })
      .eq("id", projectId);

    if (!error) {
      await logClientAction(projectId, "Proyecto", `renombró el expediente a "${newName.trim()}"`);
      setIsEditing(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      setDeleteOpen(false);
      router.push("/dashboard/projects");
    }
    setLoading(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
        <div className="relative group">
          <input 
            ref={inputRef}
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            className="text-2xl font-black text-slate-900 tracking-tighter leading-none bg-white/50 border-b-2 border-blue-600 outline-none pb-1 min-w-[300px] md:min-w-[450px] transition-all focus:bg-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setNewName(projectName);
              }
            }}
          />
          {loading && (
            <div className="absolute -right-10 top-1/2 -translate-y-1/2">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRename}
            disabled={loading}
            className="p-2.5 bg-blue-600 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-600/20 active:scale-90"
          >
            <Check size={18} />
          </button>
          <button 
            onClick={() => {
              setIsEditing(false);
              setNewName(projectName);
            }}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 group/title">
      <h1 
        className="text-2xl font-black text-slate-900 tracking-tighter leading-none cursor-pointer hover:text-blue-600 transition-all duration-300"
        onClick={() => setIsEditing(true)}
      >
        {projectName}
      </h1>
      
      <div className="flex items-center relative h-10">
        {/* Etiqueta Estado: Se desplaza y desaparece al hacer hover */}
        {(isArchived || isFinished) && (
          <div className="transition-all duration-500 group-hover/title:translate-x-10 group-hover/title:opacity-0 group-hover/title:scale-90 pointer-events-none">
            <span className={cn(
              "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap border shadow-sm",
              isArchived 
                ? "bg-amber-100 text-amber-700 border-amber-200" 
                : "bg-emerald-100 text-emerald-700 border-emerald-200"
            )}>
              {isArchived ? "Archivado" : "Finalizado"}
            </span>
          </div>
        )}

        {/* Acciones Inline: Aparecen deslizándose desde la izquierda */}
        <div className={cn(
          "flex items-center gap-1 opacity-0 group-hover/title:opacity-100 transition-all duration-500 translate-x-[-20px] group-hover/title:translate-x-0",
          (isArchived || isFinished) ? "absolute left-0" : "relative"
        )}>
          <StyledTooltip content="Renombrar expediente">
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all active:scale-90"
            >
              <Edit3 size={16} />
            </button>
          </StyledTooltip>

          {!isFinished && !isArchived && (
            <StyledTooltip content="Finalizar Proyecto">
              <button
                onClick={() => handleStatusChange('finished')}
                disabled={loading}
                className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all active:scale-90"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              </button>
            </StyledTooltip>
          )}

          {!isArchived ? (
            <StyledTooltip content="Archivar Proyecto">
              <button
                onClick={() => handleStatusChange('archived')}
                disabled={loading}
                className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all active:scale-90"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
              </button>
            </StyledTooltip>
          ) : (
            <StyledTooltip content="Restaurar Proyecto">
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={loading}
                className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all active:scale-90"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              </button>
            </StyledTooltip>
          )}

          <StyledTooltip content="Eliminar permanentemente">
            <button 
              onClick={() => setDeleteOpen(true)}
              className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all active:scale-90"
            >
              <Trash2 size={16} />
            </button>
          </StyledTooltip>
        </div>
      </div>

      <ConfirmDialog 
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ELIMINAR EXPEDIENTE"
        description={`¿Estás ABSOLUTAMENTE SEGURO de eliminar "${projectName}"? Esta acción es irreversible y borrará todos los documentos, secciones y embeddings de IA asociados.`}
        confirmText="Eliminar permanentemente"
        variant="danger"
        loading={loading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
