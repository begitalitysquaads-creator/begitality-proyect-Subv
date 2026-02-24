"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ShieldCheck, ChevronRight, X, FileSearch, Zap, Fingerprint, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { logClientAction } from "@/lib/audit-client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ViabilityData {
  status: string;
  summary: string;
  strengths: string[];
  risks: string[];
  critical_gaps: string[];
  recommendations: string[];
  probability: number;
}

export function AnalisisViabilidadIA({ projectId, hasClient, initialReport }: { projectId: string, hasClient: boolean, initialReport?: string | null }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{open: boolean, title: string, description: string}>({
    open: false, title: "", description: ""
  });
  
  const [data, setData] = useState<ViabilityData | null>(() => {
    if (!initialReport) return null;
    try {
      return JSON.parse(initialReport);
    } catch (e) {
      return null;
    }
  });
  
  const router = useRouter();

  const handleAnalyze = async (force = false) => {
    if (!hasClient) return;
    if (data && !force) { setIsOpen(true); return; }
    
    setAnalyzing(true);
    setIsOpen(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/check-eligibility`, { method: "POST" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      
      await logClientAction(projectId, "Viabilidad", `generó un nuevo análisis de viabilidad (Score: ${resData.probability}/100)`);
      
      setData(resData);
      router.refresh();
    } catch (e) { console.error(e); } finally { setAnalyzing(false); }
  };

  const handleDownload = async () => {
    if (!data) return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/export/viability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Error generando PDF");
      
      await logClientAction(projectId, "Viabilidad", "descargó el certificado oficial de viabilidad");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificado_Viabilidad_${projectId.substring(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setAlertDialog({
        open: true,
        title: "Error de descarga",
        description: "No se pudo generar el certificado oficial de viabilidad en este momento."
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
          <div className={cn("w-2 h-2 rounded-full", data ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-indigo-500 animate-pulse")} />
          Viabilidad
        </h3>
        {data && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">IA Certified</span>}
      </div>

      <div className="relative z-10 space-y-4">
        <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
          {data ? `Éxito Estimado: ${data.probability}%` : "Audita el encaje estratégico del expediente."}
        </p>
        <button
          onClick={() => handleAnalyze()}
          disabled={analyzing || !hasClient}
          className={cn(
            "w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95",
            hasClient ? "bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-900/10" : "bg-slate-50 text-slate-300 border border-slate-100"
          )}
        >
          {analyzing ? <Loader2 className="animate-spin" size={14} /> : data ? <FileSearch size={14} /> : <Sparkles size={14} />}
          {analyzing ? "Procesando..." : data ? "Ver Certificado IA" : "Auditar Elegibilidad"}
        </button>
      </div>

      <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
        <Fingerprint size={180} />
      </div>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2.5rem] p-0 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] z-[101] max-h-[85vh] flex flex-col overflow-hidden outline-none animate-in zoom-in-95">
            
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><ShieldCheck size={24} /></div>
                <div>
                  <Dialog.Title className="text-xl font-black text-slate-900 tracking-tighter leading-none">Certificado de Viabilidad</Dialog.Title>
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1.5">Begitality Intelligence Audit</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white">
              {analyzing ? (
                <div className="py-20 text-center space-y-6">
                  <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">Auditando Requisitos Legales...</p>
                </div>
              ) : data && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dictamen</p>
                      <p className={cn("text-xl font-black tracking-tighter", 
                        data.status === 'APTO' ? "text-emerald-600" : data.status === 'CONDICIONADO' ? "text-amber-600" : "text-red-600"
                      )}>{data.status}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score Técnico</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">{data.probability}/100</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-10 px-2">
                    <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest flex items-center gap-2 text-indigo-600"><Zap size={14} fill="currentColor" /> Análisis Ejecutivo</h4>
                    <p className="text-sm text-slate-600 font-bold leading-relaxed">{data.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <h5 className="font-black text-[10px] text-emerald-600 uppercase tracking-widest flex items-center gap-2">Puntos Favorables</h5>
                      <div className="space-y-2">
                        {(data.strengths || []).map((s, i) => (
                          <div key={i} className="text-[11px] text-slate-600 font-bold bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="font-black text-[10px] text-red-500 uppercase tracking-widest flex items-center gap-2">Riesgos Críticos</h5>
                      <div className="space-y-2">
                        {(data.risks || []).map((r, i) => (
                          <div key={i} className="text-[11px] text-slate-600 font-bold bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* GAP ANALYSIS (Puntos Críticos) */}
                  {data.critical_gaps && data.critical_gaps.length > 0 && (
                    <div className="mb-10 p-8 bg-red-50 border border-red-100 rounded-[2.5rem] space-y-4">
                      <h5 className="font-black text-[10px] text-red-600 uppercase tracking-[0.25em] flex items-center gap-2">
                        <AlertTriangle size={14} /> Gap Analysis: Impedimentos detectados
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        {(data.critical_gaps || []).map((gap, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                            <p className="text-xs text-red-900 font-bold leading-tight">{gap}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20">
                    <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><TrendingUp size={16} /> Hoja de Ruta Sugerida</h5>
                    <div className="space-y-3">
                      {(data.recommendations || []).map((rec, i) => (
                        <div key={i} className="flex gap-3 items-start bg-white/10 p-3 rounded-xl border border-white/10">
                          <div className="w-5 h-5 bg-white text-indigo-600 rounded flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                          <p className="text-[11px] font-bold leading-tight">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
              <button 
                onClick={() => handleAnalyze(true)} 
                className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3 transition-all active:scale-95 shadow-sm" 
                disabled={analyzing}
              >
                <RefreshCw size={14} className={cn(analyzing && "animate-spin")} /> Re-Auditar Expediente
              </button>
              <button 
                onClick={handleDownload} 
                disabled={isDownloading}
                className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {isDownloading ? "Generando PDF..." : "Descargar Certificado Oficial"}
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
