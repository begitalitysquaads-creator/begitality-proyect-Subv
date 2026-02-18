"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PlusCircle, FileText, Search, Building2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/lib/types";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const supabase = createClient();

  useEffect(() => {
    async function loadProjects() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("projects")
        .select("*, clients(*)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      const mappedProjects = (data || []).map(p => ({
        ...p,
        client: p.clients || null
      })) as Project[];

      setProjects(mappedProjects);
      setLoading(false);
    }
    loadProjects();
  }, [supabase]);

  const stats = useMemo(() => {
    return {
      active: projects.filter(p => p.status !== 'archived').length,
      archived: projects.filter(p => p.status === 'archived').length
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase();
    return projects.filter(p => {
      const matchesStatus = activeTab === 'active' 
        ? p.status !== 'archived' 
        : p.status === 'archived';

      const matchesSearch = 
        p.name.toLowerCase().includes(s) || 
        p.grant_name.toLowerCase().includes(s) ||
        (p.client?.name || "").toLowerCase().includes(s);

      return matchesStatus && matchesSearch;
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
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar proyecto o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
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
        <Tabs.List className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <Tabs.Trigger
            value="active"
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
              activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Activos
            <span className="ml-1 opacity-50 font-medium text-[10px]">{stats.active}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="archived"
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
              activeTab === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Archivados
            <span className="ml-1 opacity-50 font-medium text-[10px]">{stats.archived}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} className="outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {search ? "No hay resultados para tu búsqueda" : "Sin proyectos aún"}
              </h2>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto font-medium">
                {search ? "Prueba con otros términos." : "Crea tu primer proyecto y empieza a redactar con IA."}
              </p>
              {activeTab === 'active' && (
                <Link
                  href="/dashboard/projects/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-600/20"
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
                    href={
                      p.status === "ready_export"
                        ? `/dashboard/projects/${p.id}/export`
                        : `/dashboard/projects/${p.id}`
                    }
                    className={cn(
                      "group flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all gap-4",
                      activeTab === 'archived' ? "opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0" : "hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        activeTab === 'active' ? "bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600" : "bg-slate-50 text-slate-400"
                      )}>
                        <FileText size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          {p.client && (
                            <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                              <Building2 size={10} /> {p.client.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium">{p.grant_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <span
                        className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                          p.status === "ready_export" ? "bg-emerald-100 text-emerald-700" : 
                          p.status === "archived" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {p.status === "ready_export" ? "Listo" : p.status === "archived" ? "Archivado" : "En curso"}
                      </span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
