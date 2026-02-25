"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileText, Building2, Calendar, Award, ChevronRight, 
  Archive, Search, Loader2, Download, ShieldCheck,
  MoreVertical, FileDown, FileEdit, Globe, Layout, X, ChevronDown,
  Trash2, RotateCcw, BarChart3, Target, Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { logClientAction } from "@/lib/audit-client";

export default function HistoryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "finished" | "archived">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [isActionLoading, setIsActionLoading] = useState(false);
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .in("status", ["exported", "archived", "finished"])
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading history:", error.message);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadHistory();

    // SUSCRIPCIÓN REALTIME
    const channel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          console.log("Detectado cambio en histórico, recargando...");
          loadHistory();
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [supabase, loadHistory]);

  const handleRestore = async (projectId: string, name: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: 'in_progress' })
        .eq("id", projectId);
      
      if (error) throw error;
      await logClientAction(projectId, "Proyecto: Restaurado", `restauró el proyecto "${name}" desde el histórico`);
      
      // Forzar recarga inmediata para evitar latencia de Realtime
      await loadHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", confirmDelete.id);
      
      if (error) throw error;
      await logClientAction(null, "Proyecto", `eliminó permanentemente el expediente "${confirmDelete.name}" desde el histórico`);
      setConfirmDelete({ open: false, id: "", name: "" });
      
      // Forzar recarga inmediata
      await loadHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const downloadReport = async (projectId: string, projectName: string, format: string) => {
    if (format === 'drive') {
      alert("Para guardar en Google Drive, descarga el PDF y arrástralo a tu unidad de Drive. Próximamente integración directa.");
      return;
    }

    setDownloadingId(projectId);
    setOpenMenuId(null);
    
    try {
      const res = await fetch("/api/export/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format }),
      });
      
      if (!res.ok) throw new Error("Error al exportar");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === 'pdf' ? 'pdf' : 'docx';
      a.href = url;
      a.download = `Conclusion_Tecnica_${projectName.replace(/\s+/g, "_")}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el archivo. Verifica que el proyecto tenga auditoría.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    let result = projects;
    
    // Filtro por Tab
    if (activeTab === 'finished') {
      result = result.filter(p => p.status === 'finished' || p.status === 'exported');
    } else if (activeTab === 'archived') {
      result = result.filter(p => p.status === 'archived');
    }

    const s = search.toLowerCase().trim();
    if (!s) return result;

    return result.filter(p => 
      p.name.toLowerCase().includes(s) || 
      (p.client?.name || "").toLowerCase().includes(s)
    );
  }, [projects, search, activeTab]);

  const stats = useMemo(() => {
    const finished = projects.filter(p => p.status === 'finished' || p.status === 'exported').length;
    const archived = projects.filter(p => p.status === 'archived').length;
    
    // Calculamos el número de clientes únicos atendidos en este histórico
    const uniqueClientIds = new Set(projects.map(p => p.client_id).filter(Boolean));
    const totalClients = uniqueClientIds.size;
    
    return { finished, archived, totalClients };
  }, [projects]);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-end gap-6 flex-wrap px-2">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
            Histórico
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            Archivo central de expedientes finalizados y archivados
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Buscar expediente o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memorias Cerradas</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.finished}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Archive size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En el Archivo</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.archived}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Atendidos</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              {stats.totalClients}
            </p>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'Todo el Historial', icon: Layout },
          { id: 'finished', label: 'Finalizados', icon: ShieldCheck },
          { id: 'archived', label: 'Archivados', icon: Archive }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-white text-slate-900 shadow-md" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Archive size={40} className="text-slate-200" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {search ? "Sin resultados" : "Historial vacío"}
          </h2>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">
            {search 
              ? "No hemos encontrado coincidencias para ese proyecto o cliente." 
              : "Aquí aparecerán tus memorias una vez exportadas o archivadas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-blue-500/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <Link href={`/dashboard/projects/${p.id}/export`} className="flex items-center gap-6 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3",
                  p.status === 'archived' ? "bg-slate-100 text-slate-400 shadow-none border border-slate-200" : 
                  p.status === 'finished' ? "bg-emerald-600 text-white shadow-emerald-600/20" :
                  "bg-blue-600 text-white shadow-blue-600/20"
                )}>
                  {p.status === 'archived' ? <Archive size={28} /> : 
                   p.status === 'finished' ? <ShieldCheck size={28} /> : 
                   <FileText size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{p.name}</h3>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                      p.status === 'finished' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      p.status === 'exported' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {p.status === 'finished' ? 'Finalizado' : 
                       p.status === 'exported' ? 'Exportado' : 
                       'Archivado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <Building2 size={12} className="text-slate-300" />
                      {p.client?.name || "Sin cliente"}
                    </div>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <Calendar size={12} className="text-slate-300" />
                      {new Date(p.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {/* Export Options Menu */}
                {p.review_report && (
                  <div className="relative" ref={openMenuId === p.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                      disabled={downloadingId === p.id}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm group/btn",
                        downloadingId === p.id ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                      )}
                    >
                      {downloadingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Conclusión
                      <ChevronDown size={12} className={cn("ml-1 transition-transform", openMenuId === p.id && "rotate-180")} />
                    </button>

                    {openMenuId === p.id && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in zoom-in-95 duration-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 border-b border-slate-50 mb-1">Seleccionar Formato</p>
                        
                        <button onClick={() => downloadReport(p.id, p.name, 'pdf')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-all">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shadow-inner"><FileDown size={16} /></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900">Adobe PDF</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Certificado Oficial</p>
                          </div>
                        </button>

                        <button onClick={() => downloadReport(p.id, p.name, 'docx')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left transition-all">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner"><FileEdit size={16} /></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900">Microsoft Word</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Documento Editable</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {p.success_score > 0 && (
                  <div className="flex flex-col items-end hidden sm:flex min-w-[60px]">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Score</span>
                    <div className="flex items-center gap-2">
                      <Award size={16} className={cn(p.success_score >= 80 ? "text-emerald-500" : "text-amber-500")} />
                      <span className="text-xl font-black text-slate-900 tracking-tighter">{p.success_score}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                  <StyledTooltip content="Restaurar Proyecto">
                    <button 
                      onClick={() => handleRestore(p.id, p.name)}
                      disabled={isActionLoading}
                      className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </StyledTooltip>

                  <StyledTooltip content="Eliminar permanentemente">
                    <button 
                      onClick={() => setConfirmDelete({open: true, id: p.id, name: p.name})}
                      disabled={isActionLoading}
                      className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </StyledTooltip>

                  <Link href={`/dashboard/projects/${p.id}/export`} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 active:scale-90 ml-2">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({...confirmDelete, open})}
        title="Eliminar Expediente"
        description={`¿Estás seguro de que deseas eliminar permanentemente "${confirmDelete.name}"? Esta acción no se puede deshacer y borrará toda la actividad asociada.`}
        confirmText="Eliminar permanentemente"
        variant="danger"
        loading={isActionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
