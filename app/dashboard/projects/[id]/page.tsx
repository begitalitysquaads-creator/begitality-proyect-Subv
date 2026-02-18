import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User, Mail, Phone, ExternalLink, RefreshCw, Archive, RotateCcw, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SeccionesMemoria } from "@/components/project/SeccionesMemoria";
import { AnalisisViabilidadIA } from "@/components/project/AnalisisViabilidadIA";
import { MasterChatIA } from "@/components/project/MasterChatIA";
import { ClientSelector } from "@/components/project/ClientSelector";
import { ProjectReview } from "@/components/project/ProjectReview";
import { cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const isArchived = project.status === 'archived';

  // "Touch" al proyecto para que aparezca en Recientes SOLO si no está archivado ni exportado
  if (project.status !== 'archived' && project.status !== 'exported') {
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
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
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const client = project.clients;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{project.name}</h1>
              {isArchived && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Archivado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm font-medium">{project.grant_name}</p>
              {client && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                  {client.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <form action={async () => {
          "use server";
          const sb = await createClient();
          const nextStatus = isArchived ? 'draft' : 'archived';
          await sb.from("projects").update({ status: nextStatus }).eq("id", id);
          revalidatePath(`/dashboard/projects/${id}`);
          revalidatePath("/dashboard");
        }}>
          <button 
            type="submit"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border shadow-sm",
              isArchived 
                ? "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100" 
                : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-100"
            )}
          >
            {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {isArchived ? "Restaurar Proyecto" : "Archivar Proyecto"}
          </button>
        </form>
      </header>

      {/* Grid Principal con Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
        {/* Columna Izquierda: Workspace */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
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
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{client.tax_id || "ID PENDIENTE"}</p>
                  </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
