"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Loader2, Trash2, FileUp, Sparkles, CheckCircle2,
  AlertCircle, Database, RefreshCw, Euro, Clock, Users, Percent,
  Fingerprint, Edit2, Check
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { logClientAction } from "@/lib/audit-client";

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

  // Editing state
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditingData] = useState<any>(null);

  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string, name: string, path: string | null }>({ open: false, id: "", name: "", path: null });
  const [deleting, setDeleting] = useState(false);

  // Mount check to prevent hydration issues with icons/dynamic content
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  const handleSaveSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({ grant_summary: editedSummary })
        .eq("id", projectId);
      if (updateError) throw updateError;
      setSummary(editedSummary);
      setIsEditingSummary(false);
      await logClientAction(projectId, "Proyecto", "actualizó manualmente la ficha técnica del expediente");
    } catch (e) {
      console.error(e);
      setError("Error al guardar los cambios.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (files.length === 0) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-summary`, { method: "POST" });
      if (!res.ok) throw new Error("Error generando resumen");
      const data = await res.json();
      await logClientAction(projectId, "IA: Proyecto", "generó la ficha técnica automática del expediente");
      setSummary(data);
      setEditingData(data);
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

        await logClientAction(projectId, "Documentación", `subió el archivo "${file.name}"`);
      }

      await refreshFiles();
      setUploading(false);

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
    if (deleteErr) {
      setError(deleteErr.message);
    } else {
      await logClientAction(projectId, "Documentación", `eliminó el archivo "${confirmDelete.name}"`);
      await refreshFiles();
    }

    setConfirmDelete({ open: false, id: "", name: "", path: null });
    setDeleting(false);
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ═══ UPLOAD HEADER ═══ */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <FileUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Bases de Convocatoria</h2>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <FileText size={10} />
              Documentación Oficial (PDF)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {indexing && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl border border-amber-100 animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Sincronizando IA</span>
            </div>
          )}
          {files.length > 0 && !indexing && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
              <CheckCircle2 size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">{files.length} Docs Listos</span>
            </div>
          )}
        </div>
      </header>

      {/* ═══ UPLOAD & FILE LIST ═══ */}
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

      {/* ═══ FICHA TÉCNICA INTELIGENTE ═══ */}
      {(summary || files.length > 0) && (
        <div className="mt-10 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-700">

          {/* HEADER — compact with inline status */}
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none uppercase">Ficha Técnica</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Fingerprint size={9} />
                    RAG v2.0
                  </p>
                  {summary && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sincronizada</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary && (
                <button
                  onClick={() => {
                    if (isEditingSummary) handleSaveSummary();
                    else { setEditingData(summary); setIsEditingSummary(true); }
                  }}
                  disabled={generatingSummary}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                    isEditingSummary
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-500"
                      : "bg-white text-slate-400 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                  )}
                >
                  {isEditingSummary ? <Check size={13} strokeWidth={3} /> : <Edit2 size={13} />}
                  {isEditingSummary ? "Guardar" : "Editar"}
                </button>
              )}
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary || files.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-slate-900/15 disabled:opacity-50 active:scale-95"
              >
                {generatingSummary ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {summary ? "Re-Auditar" : "Generar"}
              </button>
            </div>
          </header>

          {summary || isEditingSummary ? (
            <div className="space-y-4">

              {/* KPI STRIP — tight, premium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'max_amount', label: "Presupuesto", value: summary?.max_amount, icon: Euro, accent: "from-blue-500 to-blue-600", iconBg: "bg-blue-50 text-blue-600", glow: "bg-blue-400" },
                  { id: 'intensity', label: "Intensidad", value: summary?.intensity, icon: Percent, accent: "from-amber-400 to-amber-500", iconBg: "bg-amber-50 text-amber-600", glow: "bg-amber-400" },
                  { id: 'deadline', label: "Vencimiento", value: summary?.deadline, icon: Clock, accent: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-50 text-emerald-600", glow: "bg-emerald-400" },
                ].map((item, i) => (
                  <div key={i} className="group bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-slate-200/50 relative">
                    <div className={cn("h-0.5 w-full bg-gradient-to-r opacity-50 group-hover:opacity-100 transition-opacity duration-500", item.accent)} />
                    <div className="px-5 py-4 relative z-10">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110", item.iconBg)}>
                          <item.icon size={16} />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      </div>
                      {isEditingSummary ? (
                        <input
                          value={editedSummary?.[item.id] || ""}
                          onChange={e => setEditingData({ ...editedSummary, [item.id]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 transition-all placeholder:text-slate-200"
                          placeholder="..."
                        />
                      ) : (
                        <p className={cn(
                          "font-black text-slate-900 tracking-tighter leading-tight",
                          (item.value?.length || 0) > 25 ? "text-sm" : "text-2xl"
                        )}>
                          {item.value || <span className="text-slate-200">—</span>}
                        </p>
                      )}
                    </div>
                    <div className={cn(
                      "absolute -right-3 -bottom-3 w-16 h-16 rounded-full blur-[40px] opacity-0 group-hover:opacity-15 transition-opacity duration-1000 pointer-events-none",
                      item.glow
                    )} />
                  </div>
                ))}
              </div>

              {/* NARRATIVE CARDS — clean, flat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'beneficiaries', label: "Beneficiarios", value: summary?.beneficiaries, icon: Users, iconBg: "bg-indigo-50 text-indigo-600", subtitle: "Elegibilidad técnica" },
                  { id: 'eligible_costs', label: "Gastos Elegibles", value: summary?.eligible_costs, icon: Database, iconBg: "bg-emerald-50 text-emerald-600", subtitle: "Conceptos financiables" },
                ].map((item, i) => (
                  <div key={i} className="group bg-white border border-slate-100 rounded-2xl p-5 transition-all duration-500 hover:shadow-lg hover:shadow-slate-200/50 relative overflow-hidden">
                    <div className="flex items-center gap-2.5 mb-3 relative z-10">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110", item.iconBg)}>
                        <item.icon size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block leading-none">{item.label}</span>
                        <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{item.subtitle}</span>
                      </div>
                    </div>
                    <div className="relative z-10">
                      {isEditingSummary ? (
                        <textarea
                          value={editedSummary?.[item.id] || ""}
                          onChange={e => setEditingData({ ...editedSummary, [item.id]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-700 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-300 transition-all min-h-[100px] resize-none placeholder:text-slate-300"
                          placeholder="Descripción técnica..."
                        />
                      ) : (
                        <p className="text-[12px] text-slate-600 font-medium leading-[1.7] whitespace-pre-wrap">
                          {item.value || (
                            <span className="text-slate-300 italic text-[11px]">Pendiente de análisis.</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.04] transition-all duration-1000 pointer-events-none">
                      <item.icon size={140} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="py-12 text-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500">
                  <Sparkles size={22} className="text-blue-300" />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[260px]">
                  {files.length > 0
                    ? "Pulsa «Generar» para auditar el expediente con IA."
                    : "Sube documentos para habilitar el análisis."}
                </p>
              </div>
              <div className="absolute inset-0 opacity-[0.01] pointer-events-none flex items-center justify-center">
                <FileText size={200} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONFIRM DELETE DIALOG ═══ */}
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
