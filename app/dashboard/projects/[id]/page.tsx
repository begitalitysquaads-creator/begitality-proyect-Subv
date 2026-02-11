import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SeccionesMemoria } from "@/components/project/SeccionesMemoria";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, content, is_completed, sort_order")
    .eq("project_id", id)
    .order("sort_order");

  const { data: convocatoriaFiles } = await supabase
    .from("convocatoria_bases")
    .select("id, name, file_path, file_size, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{project.name}</h1>
            <p className="text-slate-500 text-sm">{project.grant_name}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CargarBasesConvocatoria
            projectId={id}
            files={convocatoriaFiles ?? []}
          />

          <SeccionesMemoria
            projectId={id}
            sections={sections ?? []}
            hasConvocatoriaFiles={(convocatoriaFiles?.length ?? 0) > 0}
          />
        </div>
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h3 className="font-bold mb-2">Asistente IA</h3>
            <p className="text-slate-400 text-sm">
              El chat contextual para redactar por secciones estará disponible
              en la Etapa 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
