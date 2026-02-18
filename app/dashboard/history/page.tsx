import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText, Building2, Calendar, Award, ChevronRight, Archive } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cargamos proyectos finalizados o archivados con datos de cliente
  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("user_id", user.id)
    .in("status", ["exported", "archived"])
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
          Histórico
        </h1>
        <p className="text-slate-500 font-medium mt-2 text-lg">
          Registro de memorias finalizadas y expedientes archivados
        </p>
      </header>

      {!projects?.length ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText size={40} className="text-slate-200" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Historial vacío
          </h2>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">
            Aquí aparecerán tus memorias una vez exportadas o cuando decidas archivar un proyecto en curso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}/export`}
              className="group bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3",
                  p.status === 'archived' ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white shadow-blue-600/20"
                )}>
                  {p.status === 'archived' ? <Archive size={28} /> : <FileText size={28} />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{p.name}</h3>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                      p.status === 'exported' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                      p.status === 'archived' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                    )}>
                      {p.status === 'exported' ? 'Finalizado' : p.status === 'archived' ? 'Archivado' : 'Listo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <Building2 size={12} className="text-slate-300" />
                      {p.clients?.name || "Sin cliente"}
                    </div>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <Calendar size={12} className="text-slate-300" />
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {p.success_score > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Quality Score</span>
                    <div className="flex items-center gap-2">
                      <Award size={16} className={cn(p.success_score >= 80 ? "text-emerald-500" : "text-amber-500")} />
                      <span className="text-xl font-black text-slate-900 tracking-tighter">{p.success_score}</span>
                    </div>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
