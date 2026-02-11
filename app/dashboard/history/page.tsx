import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, grant_name, status, updated_at")
    .eq("user_id", user.id)
    .in("status", ["ready_export", "exported"])
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
          Histórico
        </h1>
        <p className="text-slate-500 font-medium mt-2 text-lg">
          Memorias finalizadas y exportadas
        </p>
      </header>

      {!projects?.length ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Sin historial aún
          </h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            Cuando exportes memorias, aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}/export`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 transition-all"
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
                <span className="text-xs text-slate-400">
                  {new Date(p.updated_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
