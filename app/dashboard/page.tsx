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
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "Consultor");

      // Cargar todos los proyectos activos (Visibilidad total Begitality)
      const { data } = await supabase
        .from("projects")
        .select(`
          id, 
          name, 
          grant_name, 
          status, 
          created_at, 
          updated_at,
          collaborators:project_collaborators (
            profiles!user_id (
              avatar_url,
              full_name
            )
          )

        `)
        .not("status", "in", "(archived,exported)")
        .order("updated_at", { ascending: false });

      setProjects(data || []);
      setLoading(false);
    }
    loadDashboardData();
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
    : "Gestiona tus memorias técnicas y expedientes desde aquí.";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Hola, {userName}
          </h1>
          <p className="text-slate-500 font-medium text-lg">{greeting}</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar proyecto activo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
            />
          </div>
          <Link
            href="/dashboard/projects/new"
            className="p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <PlusCircle size={24} />
          </Link>
        </div>
      </header>

      {/* SECCIÓN RECIENTES */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
          <div className="w-8 h-px bg-slate-200"></div>
          Últimas Memorias en Curso
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} variant="large" />
          ))}

          {filteredProjects.length < 2 && !search && (
            <Link
              href="/dashboard/projects/new"
              className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 group hover:border-blue-400 hover:bg-white transition-all cursor-pointer min-h-[320px]"
            >
              <div className="p-5 bg-slate-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-all group-hover:scale-110">
                <Wand2 size={40} />
              </div>
              <span className="mt-4 font-black uppercase tracking-widest text-xs">Nueva Memoria Técnica</span>
            </Link>
          )}
        </div>
      </section>

      {/* EXPLORAR OTROS */}
      {otherProjects.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="w-8 h-px bg-slate-200"></div>
            Resto de Proyectos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherProjects.map((project) => (
              <ProjectCard key={project.id} project={project} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
