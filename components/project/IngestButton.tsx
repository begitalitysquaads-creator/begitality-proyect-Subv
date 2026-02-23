"use client";

import { useState } from "react";
import { Database, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { StyledTooltip } from "@/components/ui/Tooltip";

export function IngestButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleIngest = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch(`/api/projects/${projectId}/ingest`, { method: "POST" });
      if (!res.ok) throw new Error("Error en la ingesta");
      
      setStatus('success');
      router.refresh();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledTooltip content="Actualizar base de conocimiento IA (RAG)">
      <button
        onClick={handleIngest}
        disabled={loading}
        className={cn(
          "flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-xl active:scale-95",
          status === 'success' ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20" :
          status === 'error' ? "bg-red-600 border-red-600 text-white shadow-red-600/20" :
          "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"
        )}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 size={18} />
        ) : status === 'error' ? (
          <AlertCircle size={18} />
        ) : (
          <Database size={18} />
        )}
        {loading ? "Indexando..." : status === 'success' ? "IA Actualizada" : status === 'error' ? "Error" : "Actualizar IA"}
      </button>
    </StyledTooltip>
  );
}
