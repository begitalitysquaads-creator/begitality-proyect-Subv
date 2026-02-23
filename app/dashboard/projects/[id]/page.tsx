import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User, Mail, Phone, ExternalLink, RefreshCw, Archive, RotateCcw, UserPlus, FileText, TrendingUp, Database, AlertTriangle, HelpCircle, Calendar, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SeccionesMemoria } from "@/components/project/SeccionesMemoria";
import { AnalisisViabilidadIA } from "@/components/project/AnalisisViabilidadIA";
import { MasterChatIA } from "@/components/project/MasterChatIA";
import { ClientSelector } from "@/components/project/ClientSelector";
import { ProjectReview } from "@/components/project/ProjectReview";
import { ProjectAnalytics } from "@/components/project/ProjectAnalytics";
import { AuditLogViewer } from "@/components/project/AuditLogViewer";
import { BudgetManager } from "@/components/project/BudgetManager";
import { ProjectHealth } from "@/components/project/ProjectHealth";
import { IngestButton } from "@/components/project/IngestButton";
import { SmartRoadmap } from "@/components/project/SmartRoadmap";
import { IAContextPanel } from "@/components/project/IAContextPanel";
import { HelpGuide } from "@/components/project/HelpGuide";
import { CollaboratorManager } from "@/components/project/CollaboratorManager";
import { ProjectHeaderActions } from "@/components/project/ProjectHeaderActions";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";

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

  // Cargar proyecto con cliente
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const isArchived = project.status === 'archived';

  // "Touch" al proyecto para que aparezca en Recientes SOLO si no está archivado ni exportado
  if (project.status !== 'archived' && project.status !== 'exported') {
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
  }

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

  let viabilityScore = null;
  try {
    if (project.viability_report) {
      const report = JSON.parse(project.viability_report);
      viabilityScore = report.probability || null;
    }
  } catch (e) {}

  const stats = {
    sectionsCompleted: sections?.filter(s => s.is_completed).length || 0,
    totalSections: sections?.length || 0,
    viabilityScore,
    budgetTotal,
    tasksPending: tasksPending || 0,
    docsIndexed
  };

  const client = project.clients;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <BackButton 
            variant="minimal" 
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all" 
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{project.name}</h1>
              {isArchived && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Archivado
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-slate-500 text-sm font-medium">{project.grant_name}</p>
              <div className="w-1 h-1 rounded-full bg-slate-200" />
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Calendar size={12} className="text-slate-300" />
                {new Date(project.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              {client && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                  {client.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <HelpGuide />
           <ProjectHeaderActions 
             projectId={id}
             projectName={project.name}
             isArchived={isArchived}
           />
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

            {/* Equipo de Trabajo */}
            <CollaboratorManager projectId={id} />

            {/* Contexto de Redacción IA */}
            <IAContextPanel 
              projectId={id}
              initialInstructions={project.writing_instructions}
            />

            {/* Análisis de Elegibilidad IA */}
            <AnalisisViabilidadIA 
              projectId={id} 
              hasClient={!!client} 
              initialReport={project.viability_report}
            />

            {/* Auditoría de Calidad */}
            <ProjectReview 
              projectId={id}
              initialReport={project.review_report}
              hasContent={(sections?.length ?? 0) > 0 && sections!.some((s) => s.content && s.content.length > 50)}
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
