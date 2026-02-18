import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SectionEditor } from "@/components/project/SectionEditor";
import { ProjectStatusBar } from "@/components/project/ProjectStatusBar";
import { AIChatPanel } from "@/components/project/AIChatPanel";
import { EditableProjectHeader } from "@/components/project/EditableProjectHeader";
import { DeleteProjectButton } from "@/components/project/DeleteProjectButton";
import { DiagnosticPanel } from "@/components/project/DiagnosticPanel";
import type { ProjectDiagnostic } from "@/lib/types";

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

  // Cargar el último diagnóstico (si existe)
  const { data: latestDiagnostic } = await supabase
    .from("project_diagnostics")
    .select("*")
    .eq("project_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
          <EditableProjectHeader
            projectId={id}
            name={project.name}
            grantName={project.grant_name}
          />
        </div>
        <div className="flex items-center gap-2">
          <ProjectStatusBar
            projectId={id}
            currentStatus={project.status}
            canMarkReady={allCompleted}
            hasSections={hasSections}
          />
          {hasSections && (
            <Link
              href={`/dashboard/projects/${id}/resumen`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-violet-600 border border-violet-200 hover:bg-violet-50 transition-colors"
              title="Ver resumen estadístico del proyecto"
            >
              <BarChart2 size={15} />
              Ver Resumen
            </Link>
          )}
          <DeleteProjectButton projectId={id} projectName={project.name} />
        </div>
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
          {/* Diagnóstico IA */}
          <DiagnosticPanel
            projectId={id}
            initialDiagnostic={latestDiagnostic as ProjectDiagnostic | null}
            hasSections={hasSections}
          />

          {/* Panel de estado del proyecto */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <h3 className="font-bold mb-3 text-lg">Asistente IA</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Usa el botón <span className="text-violet-400 font-bold">&quot;Redactar con IA&quot;</span> en
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
                <span className="text-slate-300">Diagnostica tu memoria con IA</span>
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
