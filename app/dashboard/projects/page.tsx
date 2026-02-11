import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, grant_name, status, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Proyectos
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            Todas tus convocatorias y memorias
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <PlusCircle size={20} />
          Nuevo proyecto
        </Link>
      </header>

      {!projects?.length ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Sin proyectos aún
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Crea tu primer proyecto y carga las bases de la convocatoria para
            empezar a redactar con IA.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500"
          >
            <PlusCircle size={18} />
            Crear proyecto
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={
                  p.status === "ready_export"
                    ? `/dashboard/projects/${p.id}/export`
                    : `/dashboard/projects/${p.id}`
                }
                className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <FileText size={22} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.grant_name}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    p.status === "ready_export"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.status === "ready_export" ? "Listo" : "En curso"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
