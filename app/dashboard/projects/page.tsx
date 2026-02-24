"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { PlusCircle, FileText, Search, Building2, ChevronRight, User, Zap, Archive, Layers, Calendar, Loader2, Clock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/lib/types";
import * as Tabs from "@radix-ui/react-tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  // Confirmation state
  const [confirmArchive, setConfirmArchive] = useState<{ open: boolean, id: string, name: string }>({ open: false, id: "", name: "" });
  const [archiving, setArchiving] = useState(false);

  const supabase = createClient();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        clients (*),
        collaborators:project_collaborators (
          profiles!user_id (
            avatar_url,
            full_name
          )
        )
      `)
      .order("updated_at", { ascending: false });

    const mappedProjects = (data || []).map(p => ({
      ...p,
      client: Array.isArray(p.clients) ? p.clients[0] : (p.clients || null)
    })) as Project[];

    setProjects(mappedProjects);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleArchive = async () => {
    setArchiving(true);
    const { error } = await supabase
      .from("projects")
      .update({ status: 'archived' })
      .eq("id", confirmArchive.id);

    if (!error) {
      setConfirmArchive({ open: false, id: "", name: "" });
      loadProjects();
    }
    setArchiving(false);
  };

  const stats = useMemo(() => {
    return {
      all: projects.length,
      active: projects.filter(p => !['archived', 'finished', 'exported'].includes(p.status)).length,
      archived: projects.filter(p => p.status === 'archived').length,
      finished: projects.filter(p => p.status === 'finished' || p.status === 'exported').length
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase().trim();
    return projects.filter(p => {
      // 1. Filtrado por Pestaña
      const matchesTab =
        activeTab === 'all' ? true :
          activeTab === 'active' ? !['archived', 'finished', 'exported'].includes(p.status) :
            activeTab === 'archived' ? p.status === 'archived' :
              p.status === 'finished' || p.status === 'exported';

      // 2. Filtrado por Búsqueda
      const matchesSearch =
        p.name.toLowerCase().includes(s) ||
        p.grant_name.toLowerCase().includes(s) ||
        (p.client?.name || "").toLowerCase().includes(s);

      return matchesTab && matchesSearch;
    });
  }, [projects, search, activeTab]);

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Proyectos
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            Todas tus convocatorias y memorias
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Buscar proyecto o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm h-[46px]"
            />
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <PlusCircle size={20} />
            Nuevo proyecto
          </Link>
        </div>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <Tabs.List className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-sm">
          <Tabs.Trigger
            value="all"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Layers size={14} className={cn("transition-colors", activeTab === "all" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
            Todos
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.all}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="active"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Zap size={14} className={cn("transition-colors", activeTab === "active" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
            Activos
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "active" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.active}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="archived"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Archive size={14} className={cn("transition-colors", activeTab === "archived" ? "text-amber-600" : "text-slate-300 group-hover:text-slate-400")} />
            Archivados
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "archived" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.archived}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="finished"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "finished" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ShieldCheck size={14} className={cn("transition-colors", activeTab === "finished" ? "text-emerald-600" : "text-slate-300 group-hover:text-slate-400")} />
            Finalizados
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "finished" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.finished}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} className="outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <FileText size={32} className="text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">
                {search ? "Sin coincidencias" : "Sin proyectos registrados"}
              </h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                {search ? "Prueba con otros términos de búsqueda." : "Inicia tu primera memoria técnica para que aparezca aquí."}
              </p>
              {activeTab === 'active' && !search && (
                <Link
                  href="/dashboard/projects/new"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20"
                >
                  <PlusCircle size={18} />
                  Crear proyecto
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.status === "ready_export" ? `/dashboard/projects/${p.id}/export` : `/dashboard/projects/${p.id}`}
                    className={cn(
                      "group flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all gap-4",
                      p.status === 'archived' ? "opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0" : "hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors shadow-inner",
                        p.status === 'archived' ? "bg-slate-100 text-slate-400" : 
                        p.status === 'finished' ? "bg-emerald-50 text-emerald-600" :
                        "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                      )}>
                        {p.status === 'archived' ? <Archive size={22} /> : 
                         p.status === 'finished' ? <ShieldCheck size={22} /> : 
                         <FileText size={22} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          {p.client && (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-slate-100">
                                <Building2 size={10} /> {p.client.name}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-sm text-slate-500 font-medium">{p.grant_name}</p>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <Calendar size={12} className="text-slate-300" />
                            {new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>

                          {p.project_deadline && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50 uppercase tracking-widest">
                                <Clock size={12} />
                                {new Date(p.project_deadline + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </div>
                            </>
                          )}
                          {/* TEAM ASSIGNMENT */}
                          <div className="hidden sm:flex items-center gap-3 ml-4 border-l border-slate-100 pl-4">
                            <div className="flex -space-x-2">
                              {p.collaborators && p.collaborators.length > 0 ? (
                                p.collaborators.slice(0, 3).map((c: any, i: number) => (
                                  <div
                                    key={i}
                                    className="w-7 h-7 rounded-lg border-2 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center text-blue-600"
                                    title={c.profiles?.full_name}
                                  >
                                    {c.profiles?.avatar_url ? (
                                      <img src={c.profiles.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-[8px] font-black uppercase">{c.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}</div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="w-7 h-7 rounded-lg border-2 border-white bg-slate-50 flex items-center justify-center text-slate-300">
                                  <User size={12} />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              {p.collaborators && p.collaborators.length > 0
                                ? p.collaborators.length === 1
                                  ? (p.collaborators[0].profiles as any)?.full_name
                                  : `Equipo: ${p.collaborators.length}`
                                : "Sin equipo"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end md:self-auto">
                      {p.status !== 'archived' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmArchive({ open: true, id: p.id, name: p.name });
                          }}
                          className="p-2.5 text-slate-200 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        >
                          <Archive size={18} />
                        </button>
                      )}
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                        p.status === "finished" ? "bg-emerald-50 text-emerald-700" :
                        p.status === "ready_export" ? "bg-emerald-50 text-emerald-700" :
                          p.status === "archived" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {p.status === "finished" ? "Finalizado" : 
                         p.status === "ready_export" ? "Listo" : 
                         p.status === "archived" ? "Archivado" : "En curso"}
                      </span>
                      <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-inner">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={confirmArchive.open}
        onOpenChange={(open: boolean) => setConfirmArchive({ ...confirmArchive, open })}
        title="Archivar Proyecto"
        description={`¿Estás seguro de que deseas archivar "${confirmArchive.name}"? El expediente se moverá al histórico de memorias.`}
        confirmText="Archivar ahora"
        variant="warning"
        loading={archiving}
        onConfirm={handleArchive}
      />
    </div>
  );
}
