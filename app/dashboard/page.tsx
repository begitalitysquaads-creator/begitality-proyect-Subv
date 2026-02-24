"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  PlusCircle, FileText, ChevronRight, Wand2, Search,
  Calendar, Users, Loader2, Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/project/ProjectCard";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "Consultor");

      // Cargar todos los proyectos activos (Visibilidad total Begitality)
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          clients (
            id,
            name
          ),
          collaborators:project_collaborators (
            profiles!user_id (
              avatar_url,
              full_name
            )
          )
        `)
        .not("status", "eq", "archived")
        .order("last_accessed_at", { ascending: false });

      if (error) {
        console.error("Error loading projects:", error.message || error);
      }

      if (mounted) {
        const mappedProjects = (data || []).map(p => ({
          ...p,
          client: Array.isArray(p.clients) ? p.clients[0] : (p.clients || null)
        }));
        setProjects(mappedProjects);
        setLoading(false);
      }
    }

    loadDashboardData();

    // SUSCRIPCIÓN REALTIME
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          console.log("Detectado cambio en proyectos, recargando...");
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredProjects = useMemo(() => {
    const s = search.toLowerCase().trim();
    return projects.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.grant_name.toLowerCase().includes(s)
    );
  }, [projects, search]);

  const recentProjects = filteredProjects.slice(0, 2);
  const otherProjects = filteredProjects.slice(2);

  const readyCount = projects.filter((p) => p.status === "ready_export").length;
  const greeting = readyCount > 0
    ? `Tienes ${readyCount} memoria${readyCount > 1 ? "s" : ""} lista${readyCount > 1 ? "s" : ""} para exportar.`
    : "Gestiona tus memorias técnicas y expedientes desde aquí. ";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER PREMIUM */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Workspace Activo</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Hola, {userName}
          </h1>
          <p className="text-slate-400 font-bold text-lg tracking-tight">{greeting}</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar expediente activo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm placeholder:text-slate-300 placeholder:font-medium"
            />
          </div>
          <Link
            href="/dashboard/projects/new"
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center group"
            title="Nueva Memoria"
          >
            <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />
          </Link>
        </div>
      </header>

      {/* SECCIÓN RECIENTES */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
            <span className="text-blue-500">-</span>
            Últimas Memorias en Curso
            <div className="w-24 h-px bg-slate-100 hidden sm:block"></div>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} variant="large" />
          ))}

          {filteredProjects.length < 2 && !search && (
            <Link
              href="/dashboard/projects/new"
              className="border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 group hover:border-blue-200 hover:bg-white transition-all cursor-pointer min-h-[320px] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6 bg-slate-50 rounded-3xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all group-hover:scale-110 shadow-inner relative z-10">
                <Wand2 size={42} />
              </div>
              <span className="mt-6 font-black uppercase tracking-[0.2em] text-[10px] relative z-10 group-hover:text-slate-600">Crear Nueva Memoria Técnica</span>
            </Link>
          )}
        </div>
      </section>

      {/* RESTO DE PROYECTOS */}
      {otherProjects.length > 0 && (
        <section className="space-y-8 pt-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
            <span className="text-blue-500">-</span>
            Resto de Proyectos
            <div className="w-24 h-px bg-slate-100 hidden sm:block"></div>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProjects.map((project) => (
              <ProjectCard key={project.id} project={project} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY STATE COMPLETO */}
      {projects.length === 0 && !loading && (
        <div className="py-20 text-center bg-white border border-slate-100 rounded-[3.5rem] shadow-sm border-dashed">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-50">
            <Sparkles size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Comienza tu primer expediente</h3>
          <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8 text-sm">
            Begitality te ayuda a redactar memorias técnicas profesionales con el poder de la IA contextual.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            <PlusCircle size={18} />
            Crear mi primer proyecto
          </Link>
        </div>
      )}
    </div>
  );
}
