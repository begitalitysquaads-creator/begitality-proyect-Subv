import Link from "next/link";
import {
  PlusCircle,
  FileText,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, grant_name, status, updated_at")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(10);

  const recentProjects = projects?.slice(0, 2) ?? [];
  const otherProjects = projects?.slice(2) ?? [];

  const readyCount = projects?.filter((p) => p.status === "ready_export").length ?? 0;
  const greeting =
    readyCount > 0
      ? `Tienes ${readyCount} memoria${readyCount > 1 ? "s" : ""} lista${readyCount > 1 ? "s" : ""} para exportar.`
      : "Gestiona tus memorias técnicas desde aquí.";

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Hola, {user.user_metadata?.full_name?.split(" ")[0] ?? "Consultor"}
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">{greeting}</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
          aria-label="Nuevo proyecto"
        >
          <PlusCircle size={24} />
        </Link>
      </header>

      {/* SECCIÓN RECIENTES */}
      <section className="space-y-6">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <span className="w-8 h-px bg-slate-200"></span>
          Últimos Trabajos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={
                project.status === "ready_export"
                  ? `/dashboard/projects/${project.id}/export`
                  : `/dashboard/projects/${project.id}`
              }
              className="group relative bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50" />
              <div className="relative">
                <div className="flex justify-between items-start mb-12">
                  <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 group-hover:rotate-12 transition-transform">
                    <FileText size={32} />
                  </div>
                  {project.status === "ready_export" && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Listo para Envío
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
                  {project.name}
                </h3>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-6">
                  {project.grant_name}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500"
                      >
                        AI
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-black text-sm">
                    {project.status === "ready_export"
                      ? "Revisar y Exportar"
                      : "Continuar"}
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {recentProjects.length < 2 && (
            <Link
              href="/dashboard/projects/new"
              className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 group hover:border-blue-400 hover:bg-white transition-all cursor-pointer min-h-[280px]"
            >
              <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                <Wand2 size={40} />
              </div>
              <span className="mt-4 font-bold">Crear nueva memoria</span>
            </Link>
          )}
        </div>
      </section>

      {/* RESTO DE PROYECTOS */}
      {otherProjects.length > 0 && (
        <section className="space-y-6 pt-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-8 h-px bg-slate-200"></span>
            Explorar otros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-blue-200 transition-all group"
              >
                <div className="p-3 bg-slate-50 rounded-xl w-fit mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <FileText size={20} />
                </div>
                <h4 className="font-bold text-slate-900 truncate mb-1">
                  {project.name}
                </h4>
                <p className="text-xs text-slate-400 font-bold uppercase truncate">
                  {project.grant_name}
                </p>
                <div className="mt-4 flex justify-between items-center">
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
