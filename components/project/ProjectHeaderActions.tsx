"use client";

import { useState } from "react";
import { Archive, RotateCcw, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { logClientAction } from "@/lib/audit-client";

interface ProjectHeaderActionsProps {
  projectId: string;
  projectName: string;
  isArchived: boolean;
}

export function ProjectHeaderActions({ projectId, projectName, isArchived }: ProjectHeaderActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleToggleArchive = async () => {
    setLoading(true);
    const nextStatus = isArchived ? 'draft' : 'archived';
    
    const { error } = await supabase
      .from("projects")
      .update({ status: nextStatus })
      .eq("id", projectId);

    if (!error) {
      const actionDesc = nextStatus === 'archived' ? 'archivó' : 'restauró';
      await logClientAction(projectId, "Proyecto", `${actionDesc} el expediente "${projectName}"`);
      setConfirmOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setConfirmOpen(true)}
        className={cn(
          "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border shrink-0",
          isArchived 
            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-500" 
            : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-500 hover:shadow-amber-500/10 shadow-sm"
        )}
      >
        {isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
        {isArchived ? "Restaurar" : "Archivar"}
      </button>

      <ConfirmDialog 
        open={confirmOpen}
        onOpenChange={(open: boolean) => setConfirmOpen(open)}
        title={isArchived ? "Restaurar Proyecto" : "Archivar Proyecto"}
        description={isArchived 
          ? `¿Deseas restaurar "${projectName}" para que vuelva al panel de proyectos activos?`
          : `¿Estás seguro de que deseas archivar "${projectName}"? Se moverá a tu histórico de expedientes.`
        }
        confirmText={isArchived ? "Restaurar proyecto" : "Archivar proyecto"}
        variant={isArchived ? "info" : "warning"}
        loading={loading}
        onConfirm={handleToggleArchive}
      />
    </>
  );
}
