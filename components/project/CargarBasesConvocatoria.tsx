"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, Trash2, FileUp, Sparkles, CheckCircle2, AlertCircle, Database, RefreshCw, Euro, Clock, Users, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";

const BUCKET = "convocatoria-files";
const MAX_SIZE_MB = 50;
const ACCEPT = "application/pdf";

interface BaseFile {
  id: string;
  name: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
}

export function CargarBasesConvocatoria({
  projectId,
  files: initialFiles,
  initialSummary,
}: {
  projectId: string;
  files: BaseFile[];
  initialSummary?: any;
}) {
  const [files, setFiles] = useState<BaseFile[]>(initialFiles);
  const [summary, setSummary] = useState<any>(initialSummary);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string, path: string | null}>({open: false, id: "", name: "", path: null});
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const refreshFiles = useCallback(async () => {
    const { data } = await supabase
      .from("convocatoria_bases")
      .select("id, name, file_path, file_size, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
    router.refresh();
  }, [projectId, router, supabase]);

  const handleGenerateSummary = async () => {
    if (files.length === 0) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-summary`, { method: "POST" });
      if (!res.ok) throw new Error("Error generando resumen");
      const data = await res.json();
      setSummary(data);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("No se pudo generar la ficha resumen.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      const filesToUpload = fileList ? Array.from(fileList) : [];
      if (filesToUpload.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }
      
      setError(null);
      setUploading(true);

      for (const file of filesToUpload) {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`El archivo ${file.name} es demasiado grande (máx ${MAX_SIZE_MB}MB).`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${fileExt}`;
        const path = `${user.id}/${projectId}/${fileName}`;
        
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);

        if (uploadErr) {
          setError(`Error en ${file.name}: ${uploadErr.message}`);
          break;
        }

        const { error: insertErr } = await supabase.from("convocatoria_bases").insert({
          project_id: projectId,
          name: file.name,
          file_path: path,
          file_size: file.size,
        });

        if (insertErr) {
          setError(`Error al registrar ${file.name}: ${insertErr.message}`);
          break;
        }
      }
      
      await refreshFiles();
      setUploading(false);
      
      // IA Auto-Sync: Indexación automática
      setIndexing(true);
      try {
        await fetch(`/api/projects/${projectId}/ingest`, { method: "POST" });
        router.refresh();
      } catch (e) {
        console.error("Auto-ingest failed:", e);
      } finally {
        setIndexing(false);
      }
    },
    [projectId, supabase, refreshFiles, router]
  );

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    if (confirmDelete.path) {
      await supabase.storage.from(BUCKET).remove([confirmDelete.path]);
    }
    const { error: deleteErr } = await supabase.from("convocatoria_bases").delete().eq("id", confirmDelete.id);
    if (deleteErr) setError(deleteErr.message);
    else await refreshFiles();
    
    setConfirmDelete({ open: false, id: "", name: "", path: null });
    setDeleting(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="font-black text-slate-900 flex items-center gap-4 text-2xl tracking-tighter">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
              <FileUp size={24} />
            </div>
            Bases de Convocatoria
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-16">Documentación Oficial (PDF)</p>
        </div>
        <div className="flex items-center gap-3">
          {indexing && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl border border-amber-100 animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando IA</span>
            </div>
          )}
          {files.length > 0 && !indexing && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
               <CheckCircle2 size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest">{files.length} Docs Listos</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        <div className="flex flex-col h-full">
          <div className="h-[20px] mb-4 invisible">Listado</div>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
            className={cn(
              "relative group flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all duration-500 overflow-hidden",
              dragging ? "border-blue-400 bg-blue-50/50" : "border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50"
            )}
          >
            <input
              type="file" accept={ACCEPT} multiple className="hidden" disabled={uploading || indexing}
              onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }}
            />
            
            <div className="relative z-10 space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-[1.5rem] mx-auto flex items-center justify-center transition-all duration-500",
                dragging ? "bg-blue-600 text-white scale-110 shadow-xl shadow-blue-600/20" : "bg-white text-slate-300 group-hover:text-blue-500 group-hover:scale-110 shadow-sm"
              )}>
                {uploading || indexing ? <Loader2 size={32} className="animate-spin text-blue-600" /> : <Upload size={32} />}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 tracking-tight">
                  {uploading ? "Subiendo..." : indexing ? "Indexando IA..." : "Subir bases"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Arrastra PDFs aquí</p>
              </div>
            </div>

            <div className="absolute inset-0 opacity-[0.02] pointer-events-none flex items-center justify-center">
              <Sparkles size={240} />
            </div>
          </label>
          
          {error && (
            <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col h-full">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={12} /> Listado de Expedientes
          </h3>
          <div className="space-y-3">
            {files.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center border-2 border-slate-50 border-dashed rounded-[2.5rem] opacity-30">
                <FileText size={40} className="text-slate-200 mb-2" />
                <p className="text-[9px] font-black uppercase tracking-widest">Sin documentos</p>
              </div>
            ) : (
              <div className="max-h-[285px] overflow-y-auto pr-2 space-y-3">
                {files.map((f) => (
                  <div key={f.id} className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-600 transition-colors shadow-inner">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-black text-slate-900 truncate tracking-tight">{f.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {(f.file_size! / 1024).toFixed(1)} KB • PDF Oficial
                        </p>
                      </div>
                    </div>
                    <StyledTooltip content="Eliminar documento">
                      <button
                        onClick={() => setConfirmDelete({ open: true, id: f.id, name: f.name, path: f.file_path })}
                        className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </StyledTooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FICHA RESUMEN IA (Fase 2) */}
      {(summary || files.length > 0) && (
        <div className="mt-10 pt-10 border-t border-slate-100 animate-in fade-in duration-1000">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600" />
              Ficha Resumen Técnica (Quick-Read)
            </h3>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary || files.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              {generatingSummary ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {summary ? "Actualizar Ficha" : "Generar Ficha con IA"}
            </button>
          </div>

          {summary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[
                { label: "Importe Máximo", value: summary.max_amount, icon: Euro },
                { label: "% Intensidad", value: summary.intensity, icon: TrendingUp },
                { label: "Fecha Límite", value: summary.deadline, icon: Clock },
                { label: "Beneficiarios", value: summary.beneficiaries, icon: Users },
                { label: "Costes Elegibles", value: summary.eligible_costs, icon: Database }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm group hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                      <item.icon size={14} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 leading-tight tracking-tighter line-clamp-2">{item.value || "—"}</p>
                  </div>
                  {/* Subtle Background Aura */}
                  <div className="absolute -right-2 -bottom-2 opacity-[0.02] text-blue-600 group-hover:scale-110 transition-transform duration-700">
                    <item.icon size={64} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50/30 rounded-3xl border border-dashed border-slate-100">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {files.length > 0 ? "Pulsa 'Generar Ficha' para extraer los datos clave del BOE." : "Sube las bases para habilitar el resumen IA."}
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({ ...confirmDelete, open })}
        title="Eliminar documento"
        description={`¿Estás seguro de que deseas eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer y afectará al conocimiento de la IA.`}
        confirmText="Eliminar permanentemente"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
