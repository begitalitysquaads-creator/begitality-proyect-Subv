import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SectionEditor } from "@/components/project/SectionEditor";
import { ProjectStatusBar } from "@/components/project/ProjectStatusBar";
import { AIChatPanel } from "@/components/project/AIChatPanel";

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

  const sectionsList = sections ?? [];
  const completedSections = sectionsList.filter((s) => s.is_completed).length;
  const hasSections = sectionsList.length > 0;
  const allCompleted = hasSections && completedSections === sectionsList.length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
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
        <ProjectStatusBar
          projectId={id}
          currentStatus={project.status}
          canMarkReady={allCompleted}
          hasSections={hasSections}
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CargarBasesConvocatoria
            projectId={id}
            files={convocatoriaFiles ?? []}
          />

          <SectionEditor
            projectId={id}
            sections={sectionsList}
            hasConvocatoriaFiles={(convocatoriaFiles?.length ?? 0) > 0}
          />
        </div>

        <div className="space-y-6">
          {/* Panel de estado del proyecto */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <h3 className="font-bold mb-3 text-lg">Asistente IA</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Usa el botón <span className="text-violet-400 font-bold">"Redactar con IA"</span> en
              cada sección o abre el <span className="text-violet-400 font-bold">chat IA</span> para
              resolver dudas sobre tu convocatoria.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-slate-300">Sube los PDFs de la convocatoria</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-slate-300">Genera la estructura de secciones</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-slate-300">Redacta cada sección con IA</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-slate-300">Pregunta dudas en el chat IA</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span className="text-slate-300">Exporta en PDF o Word</span>
              </div>
            </div>
          </div>

          {/* Resumen rápido */}
          {hasSections && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">
                Resumen
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Secciones</span>
                  <span className="text-sm font-bold text-slate-900">
                    {sectionsList.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Completadas</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {completedSections}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Pendientes</span>
                  <span className="text-sm font-bold text-amber-600">
                    {sectionsList.length - completedSections}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Bases cargadas</span>
                  <span className="text-sm font-bold text-slate-900">
                    {convocatoriaFiles?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat IA flotante */}
      <AIChatPanel projectId={id} />
    </div>
  );
}
