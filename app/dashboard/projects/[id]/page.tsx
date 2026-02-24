import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User, Mail, Phone, ExternalLink, RefreshCw, Archive, RotateCcw, UserPlus, FileText, TrendingUp, Database, AlertTriangle, HelpCircle, Calendar, Users, Clock, FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SeccionesMemoria } from "@/components/project/SeccionesMemoria";
import { DiagnosticPanel } from "@/components/project/DiagnosticPanel";
import { MasterChatIA } from "@/components/project/MasterChatIA";
import { ClientSelector } from "@/components/project/ClientSelector";
import { AuditLogViewer } from "@/components/project/AuditLogViewer";
import { BudgetManager } from "@/components/project/BudgetManager";
import { ProjectHealth } from "@/components/project/ProjectHealth";
import { IngestButton } from "@/components/project/IngestButton";
import { SmartRoadmap } from "@/components/project/SmartRoadmap";
import { IAContextPanel } from "@/components/project/IAContextPanel";
import { HelpGuide } from "@/components/project/HelpGuide";
import { CollaboratorManager } from "@/components/project/CollaboratorManager";
import { ProjectHeaderActions } from "@/components/project/ProjectHeaderActions";
import { ProjectInlineActions } from "@/components/project/ProjectInlineActions";
import { ProjectDeadlinePicker } from "@/components/project/ProjectDeadlinePicker";
import { MilestoneManager } from "@/components/project/MilestoneManager";
import { ProjectTouch } from "@/components/project/ProjectTouch";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";
import type { ProjectDiagnostic } from "@/lib/types";

// Workspace de Gestión Técnica de Proyectos (Begitality 2026)
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

  // Cargar proyecto con cliente y equipo
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*), project_collaborators(user_id, role, profiles(full_name, avatar_url))")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Actualizar último acceso (Background update)
  // No necesitamos esperar a que termine para mostrar la página
  supabase
    .from("projects")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", id)
    .then();

  const isArchived = project.status === 'archived';

  // Obtener secciones y otros datos
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

  // Solo mostrar clientes activos para asignación
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  // Fetch Budget Data
  const { data: budgets } = await supabase
    .from("project_budgets")
    .select("amount")
    .eq("project_id", id);
  const budgetTotal = budgets?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  // Fetch Tasks Pending
  const { count: tasksPending } = await supabase
    .from("project_tasks")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", id)
    .neq("status", "completed");

  // Check Embeddings
  const { count: embeddingsCount } = await supabase
    .from("document_embeddings")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", id);
  const docsIndexed = (embeddingsCount || 0) > 0;

  // Fetch latest AI diagnostic
  const { data: latestDiagnostic } = await supabase
    .from("project_diagnostics")
    .select("*")
    .eq("project_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stats = {
    sectionsCompleted: sections?.filter(s => s.is_completed).length || 0,
    totalSections: sections?.length || 0,
    viabilityScore: latestDiagnostic?.overall_score ?? null,
    budgetTotal,
    tasksPending: tasksPending || 0,
    docsIndexed
  };

  // Supabase join with table 'clients' might return an object or an array of one element
  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Scroll-to-top safeguard */}
      <script dangerouslySetInnerHTML={{ __html: 'window.scrollTo(0,0)' }} />
      
      {/* Client-side touch to avoid server blocking */}
      {!isArchived && project.status !== 'exported' && <ProjectTouch projectId={id} />}

      <header className="mb-12 flex items-start gap-4">
        <BackButton
          variant="minimal"
          className="p-2 hover:bg-slate-100 rounded-full transition-all mt-1.5 border border-transparent hover:border-slate-200 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <ProjectInlineActions projectId={id} projectName={project.name} isArchived={isArchived} />
            
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/dashboard/projects/${id}/export`}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 group"
              >
                <FileUp size={16} className="group-hover:translate-y-[-1px] transition-transform" />
                Exportar
              </Link>
              <HelpGuide />
              <ProjectHeaderActions
                projectId={id}
                projectName={project.name}
                isArchived={isArchived}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Badge Ayuda */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{project.grant_name}</p>
            </div>

            <div className="h-3 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Fecha Alta */}
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <Calendar size={12} className="text-slate-300" />
              <span className="text-slate-300">Alta:</span> {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>

            {/* Fecha Entrega */}
            {project.project_deadline ? (
              <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/30 uppercase tracking-widest leading-none">
                <Clock size={12} className="text-blue-500" />
                <span>Entrega:</span> {new Date(project.project_deadline + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none bg-slate-50 px-3 py-1 rounded-full border border-slate-100 italic">
                <Clock size={12} className="text-slate-200" />
                Plazo no definido
              </div>
            )}

            {/* Cliente Link */}
            {client && (
              <>
                <div className="h-3 w-px bg-slate-200 mx-1 hidden sm:block" />
                <Link 
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest leading-none group/client hover:bg-white px-3 py-1 rounded-full transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                >
                  <Building2 size={12} className="text-slate-300 group-hover/client:text-blue-500 transition-colors" />
                  <span className="text-slate-400 group-hover/client:text-blue-600 transition-colors">{client.name}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Project Health Dashboard */}
      <ProjectHealth stats={stats} />

      {/* Grid Principal con Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
        {/* Columna Izquierda: Workspace */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <CargarBasesConvocatoria
            projectId={id}
            files={convocatoriaFiles ?? []}
            initialSummary={project.grant_summary}
          />

          <SmartRoadmap projectId={id} />

          <BudgetManager projectId={id} />

          <SeccionesMemoria
            projectId={id}
            sections={sections ?? []}
            hasConvocatoriaFiles={(convocatoriaFiles?.length ?? 0) > 0}
          />
        </div>

        {/* Columna Derecha: Inteligencia y Gestión (Fija) */}
        <div className="lg:col-span-1">
          <div className="space-y-6 lg:sticky lg:top-8">
            {/* Tarjeta de Gestión de Cliente Premium */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group">
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                  <User size={280} />
                </div>
              </div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
                  <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                  Cliente
                </h3>
                {client && (
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 group/btn"
                  >
                    Ficha completa
                    <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              {client ? (
                <div className="space-y-6 relative z-10">
                  <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
                    <p className="font-black text-slate-900 text-2xl tracking-tighter leading-none mb-2">{client.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{client.tax_id || "ID PENDIENTE"}</p>
                      {client.industry && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{client.industry}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Persona de Contacto */}
                  {(client.contact_name || client.contact_position) && (
                    <div className="px-2 space-y-1">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Responsable del Proyecto</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-none">{client.contact_name || "Nombre no definido"}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{client.contact_position || "Cargo pendiente"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {client.contact_email && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                        <Mail size={12} className="text-blue-400" />
                        {client.contact_email}
                      </div>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                        <Phone size={12} className="text-blue-400" />
                        {client.contact_phone}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 relative z-10 text-center text-slate-400">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    Expediente sin asignar.
                  </p>
                </div>
              )}

              <div className="mt-8 relative z-20">
                <ClientSelector
                  projectId={id}
                  initialClient={client}
                  availableClients={clients || []}
                />
              </div>
            </div>

            {/* Hoja de Ruta del Proyecto */}
            <MilestoneManager projectId={id} />

            {/* Equipo de Trabajo */}
            <CollaboratorManager projectId={id} />

            {/* Contexto de Redacción IA */}
            <IAContextPanel
              projectId={id}
              initialInstructions={project.writing_instructions}
            />

            {/* Diagnóstico IA */}
            <DiagnosticPanel
              projectId={id}
              initialDiagnostic={latestDiagnostic as ProjectDiagnostic | null}
              hasSections={(sections?.length ?? 0) > 0}
            />

            {/* MASTER CHAT IA */}
            <MasterChatIA
              projectId={id}
            />

            {/* HISTORIAL DE ACTIVIDAD */}
            <AuditLogViewer projectId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
