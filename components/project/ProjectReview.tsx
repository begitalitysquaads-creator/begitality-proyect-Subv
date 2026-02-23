"use client";

import { useState } from "react";
import { 
  Activity, 
  Loader2, 
  Award, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  RefreshCw,
  ClipboardCheck,
  ShieldCheck,
  Bot
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface AuditReport {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export function ProjectReview({ projectId, initialReport, hasContent }: { projectId: string, initialReport: string | null, hasContent: boolean }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{open: boolean, title: string, description: string}>({
    open: false, title: "", description: ""
  });
  
  const [report, setReport] = useState<AuditReport | null>(() => {
    if (!initialReport) return null;
    try {
      return JSON.parse(initialReport);
    } catch (e) {
      return null;
    }
  });
  
  const router = useRouter();

  const runAudit = async () => {
    if (!hasContent) return;
    setAnalyzing(true);
    setIsOpen(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("Error en auditoría");
      setReport(data);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/export/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Export fail");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Auditoria_${projectId.substring(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { 
      console.error(e);
      setAlertDialog({
        open: true,
        title: "Error de generación",
        description: "No se pudo generar el reporte oficial de calidad técnica en este momento."
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="font-black text-slate-900 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
          <Activity size={14} className="text-blue-600" />
          Calidad Técnica
        </h3>
        {report && (
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg", getScoreColor(report.score), "bg-slate-50 border border-current/10")}>
            {report.score}/100
          </span>
        )}
      </div>

      <div className="relative z-10 text-center space-y-6">
        {report ? (
          <div className="space-y-4">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  className={getScoreColor(report.score)}
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * report.score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-3xl font-black tracking-tighter", getScoreColor(report.score))}>{report.score}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Quality Score</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(true)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2"
            >
              Consultar Auditoría
            </button>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <ClipboardCheck size={28} className="text-slate-300" />
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-6 px-4">
              Analiza la calidad técnica y coherencia de tu redacción.
            </p>
            <button 
              onClick={runAudit}
              disabled={analyzing || !hasContent}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2",
                hasContent ? "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20" : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
              )}
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
              {analyzing ? "Escaneando..." : "Ejecutar Auditoría IA"}
            </button>
          </div>
        )}
      </div>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2.5rem] p-0 shadow-2xl z-[101] max-h-[85vh] flex flex-col overflow-hidden outline-none animate-in zoom-in-95">
            
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl", report ? getScoreBg(report.score) : "bg-blue-600")}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <Dialog.Title className="text-xl font-black text-slate-900 tracking-tighter leading-none">Reporte de Calidad IA</Dialog.Title>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Certificación Begitality Assist</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all shadow-sm border border-transparent hover:border-slate-100"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-white">
              {analyzing ? (
                <div className="py-20 text-center space-y-6">
                  <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Escaneando redacción técnica...</p>
                </div>
              ) : report && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 mb-10 shadow-inner">
                    <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Bot size={14} className="text-blue-600" /> Resumen Ejecutivo
                    </h4>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">{report.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <h5 className="font-black text-[10px] text-emerald-600 uppercase tracking-widest flex items-center gap-2">Puntos Fuertes</h5>
                      <div className="space-y-2">
                        {(report.strengths || []).map((s, i) => (
                          <div key={i} className="text-[11px] text-slate-600 font-bold bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="font-black text-[10px] text-red-500 uppercase tracking-widest flex items-center gap-2">Debilidades</h5>
                      <div className="space-y-2">
                        {(report.weaknesses || []).map((w, i) => (
                          <div key={i} className="text-[11px] text-slate-600 font-bold bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="font-black text-[10px] text-blue-600 uppercase tracking-widest flex items-center gap-2">Plan de Mejora Recomendado</h5>
                    <div className="grid grid-cols-1 gap-3">
                      {(report.improvements || []).map((imp, i) => (
                        <div key={i} className="flex gap-5 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-xs font-black text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">{i+1}</div>
                          <p className="text-xs text-slate-700 font-bold leading-relaxed">{imp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
              <button 
                onClick={runAudit}
                disabled={analyzing}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95 shadow-sm"
              >
                <RefreshCw size={14} className={cn(analyzing && "animate-spin")} /> Re-Auditar
              </button>
              <button 
                onClick={handleDownload}
                disabled={isDownloading || !report}
                className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                {isDownloading ? "Generando Reporte..." : "Descargar Reporte Oficial"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog 
        open={alertDialog.open}
        onOpenChange={(open: boolean) => setAlertDialog({...alertDialog, open})}
        title={alertDialog.title}
        description={alertDialog.description}
        confirmText="Entendido"
        showCancel={false}
        variant="danger"
        onConfirm={() => setAlertDialog({...alertDialog, open: false})}
      />
    </div>
  );
}
